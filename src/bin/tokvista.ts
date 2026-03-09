import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import path from 'node:path';
import { createInterface, type Interface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { FigmaTokens, TokenCategory, TokvistaConfig, TokvistaThemePreference } from '../types';
import { generateCSS, generateSCSS, generateJS, generateTailwind } from '../utils/exportUtils';
import { detectTokenFormat } from '../utils/formatDetector';
import { normalizeTokenFormat } from '../utils/formatNormalizers';
import { HotReloadServer } from './hotreload';
import { validateTokens } from './validator';
import { diffTokens } from './differ';
import { convertTokenFormat, type ConvertFormat } from './converter';
import { watchFile } from './watcher';

const DEFAULT_PORT = 3000;
const MAX_PORT_ATTEMPTS = 25;
const SHUTDOWN_TIMEOUT_MS = 1500;
const DEFAULT_INIT_CONFIG_FILE = 'tokvista.config.ts';
const DEFAULT_INIT_SUBTITLE = 'Interactive design tokens documentation';
const ALL_CATEGORIES: TokenCategory[] = ['foundation', 'semantic', 'components'];
const DEFAULT_CONFIG_FILENAMES = [
  DEFAULT_INIT_CONFIG_FILE,
  'tokvista.config.mjs',
  'tokvista.config.js',
  'tokvista.config.cjs',
  'tokvista.config.json',
];

interface ServeCliOptions {
  command: 'serve';
  tokenFileArg?: string;
  configPathArg?: string;
  port: number;
  openBrowser: boolean;
  watch: boolean;
}

interface InitCliOptions {
  command: 'init';
  force: boolean;
  port: number;
  openBrowser: boolean;
  startPreview: boolean;
}

interface ExportCliOptions {
  command: 'export';
  tokenFileArg: string;
  format: 'css' | 'scss' | 'json' | 'tailwind';
  output?: string;
}

interface ValidateCliOptions {
  command: 'validate';
  tokenFileArg: string;
}

interface DiffCliOptions {
  command: 'diff';
  oldFileArg: string;
  newFileArg: string;
}

interface ConvertCliOptions {
  command: 'convert';
  tokenFileArg: string;
  to: ConvertFormat;
  output?: string;
}

interface BuildCliOptions {
  command: 'build';
  tokenFileArg: string;
  outputDir: string;
  skipValidation?: boolean;
}

type CliOptions = ServeCliOptions | InitCliOptions | ExportCliOptions | ValidateCliOptions | DiffCliOptions | ConvertCliOptions | BuildCliOptions;

interface RuntimeConfigPayload {
  title?: string;
  subtitle?: string;
  logo?: string;
  theme?: TokvistaThemePreference;
  brandColor?: string;
  categories?: TokenCategory[];
  defaultTab?: TokenCategory;
  showSearch?: boolean;
}

interface ConfigLoadResult {
  config: TokvistaConfig;
  configPath: string | null;
}

function printHelp() {
  console.log(`TokVista CLI

Usage:
  tokvista [tokens.json] [--config tokvista.config.ts] [--port 3000] [--no-open]
  tokvista init [--force] [--port 3000] [--no-open] [--no-preview]
  tokvista export <tokens.json> --format <css|scss|json|tailwind> [--output <file>]
  tokvista validate <tokens.json>
  tokvista diff <old.json> <new.json>
  tokvista convert <tokens.json> --to <w3c|style-dictionary|supernova> [--output <file>]
  tokvista build <tokens.json> --output-dir <dir> [--skip-validation]

Arguments:
  tokens.json       Path to your tokens file (overrides config.tokens)

Options:
  -c, --config      Path to TokVista config file
  -f, --force       Overwrite existing tokvista.config.ts (init only)
  -p, --port        Preferred server port (default: 3000)
  --format          Export format: css, scss, json, tailwind (export only)
  --output, -o      Output file path (export only)
  --no-open         Do not automatically open the browser
  --no-watch        Disable live reload (serve only)
  --no-preview      Skip starting live preview after init
  -h, --help        Show this help message
`);
}

function parsePort(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid port: "${value}". Use a number between 1 and 65535.`);
  }
  return parsed;
}

function parseServeArgs(args: string[]): ServeCliOptions {
  let tokenFileArg: string | undefined;
  let configPathArg: string | undefined;
  let port = DEFAULT_PORT;
  let openBrowser = true;
  let watch = true;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--no-open') {
      openBrowser = false;
      continue;
    }

    if (arg === '--no-watch') {
      watch = false;
      continue;
    }

    if (arg === '--port' || arg === '-p') {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`Missing value for ${arg}.`);
      }
      port = parsePort(next);
      index += 1;
      continue;
    }

    if (arg === '--config' || arg === '-c') {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`Missing value for ${arg}.`);
      }
      configPathArg = next;
      index += 1;
      continue;
    }

    if (arg.startsWith('--port=')) {
      port = parsePort(arg.slice('--port='.length));
      continue;
    }

    if (arg.startsWith('--config=')) {
      configPathArg = arg.slice('--config='.length);
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (tokenFileArg) {
      throw new Error(`Only one token file is supported. Unexpected value: "${arg}"`);
    }

    tokenFileArg = arg;
  }

  return { command: 'serve', tokenFileArg, configPathArg, port, openBrowser, watch };
}

function parseInitArgs(args: string[]): InitCliOptions {
  let force = false;
  let port = DEFAULT_PORT;
  let openBrowser = true;
  let startPreview = true;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }

    if (arg === '-f' || arg === '--force') {
      force = true;
      continue;
    }

    if (arg === '--no-open') {
      openBrowser = false;
      continue;
    }

    if (arg === '--no-preview') {
      startPreview = false;
      continue;
    }

    if (arg === '--port' || arg === '-p') {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`Missing value for ${arg}.`);
      }
      port = parsePort(next);
      index += 1;
      continue;
    }

    if (arg.startsWith('--port=')) {
      port = parsePort(arg.slice('--port='.length));
      continue;
    }

    throw new Error(`Unknown option for init: ${arg}`);
  }

  return { command: 'init', force, port, openBrowser, startPreview };
}

function parseArgs(args: string[]): CliOptions {
  if (args[0] === 'init') {
    return parseInitArgs(args.slice(1));
  }
  if (args[0] === 'export') {
    return parseExportArgs(args.slice(1));
  }
  if (args[0] === 'validate') {
    return parseValidateArgs(args.slice(1));
  }
  if (args[0] === 'diff') {
    return parseDiffArgs(args.slice(1));
  }
  if (args[0] === 'convert') {
    return parseConvertArgs(args.slice(1));
  }
  if (args[0] === 'build') {
    return parseBuildArgs(args.slice(1));
  }
  return parseServeArgs(args);
}

function parseValidateArgs(args: string[]): ValidateCliOptions {
  let tokenFileArg: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (tokenFileArg) {
      throw new Error(`Only one token file is supported. Unexpected value: "${arg}"`);
    }

    tokenFileArg = arg;
  }

  if (!tokenFileArg) throw new Error('Token file is required for validate');

  return { command: 'validate', tokenFileArg };
}

function parseDiffArgs(args: string[]): DiffCliOptions {
  let oldFileArg: string | undefined;
  let newFileArg: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (!oldFileArg) {
      oldFileArg = arg;
    } else if (!newFileArg) {
      newFileArg = arg;
    } else {
      throw new Error(`Too many arguments. Expected: tokvista diff <old.json> <new.json>`);
    }
  }

  if (!oldFileArg) throw new Error('Old token file is required');
  if (!newFileArg) throw new Error('New token file is required');

  return { command: 'diff', oldFileArg, newFileArg };
}

function parseConvertArgs(args: string[]): ConvertCliOptions {
  let tokenFileArg: string | undefined;
  let to: ConvertFormat | undefined;
  let output: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--to') {
      const next = args[index + 1];
      if (!next) throw new Error('Missing value for --to');
      if (!['w3c', 'style-dictionary', 'supernova', 'token-studio'].includes(next)) {
        throw new Error('Format must be: w3c, style-dictionary, supernova, or token-studio');
      }
      to = next as ConvertFormat;
      index += 1;
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      const next = args[index + 1];
      if (!next) throw new Error('Missing value for --output');
      output = next;
      index += 1;
      continue;
    }

    if (arg.startsWith('--to=')) {
      const val = arg.slice('--to='.length);
      if (!['w3c', 'style-dictionary', 'supernova', 'token-studio'].includes(val)) {
        throw new Error('Format must be: w3c, style-dictionary, supernova, or token-studio');
      }
      to = val as ConvertFormat;
      continue;
    }

    if (arg.startsWith('--output=')) {
      output = arg.slice('--output='.length);
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (tokenFileArg) {
      throw new Error(`Only one token file is supported. Unexpected value: "${arg}"`);
    }

    tokenFileArg = arg;
  }

  if (!tokenFileArg) throw new Error('Token file is required for convert');
  if (!to) throw new Error('--to is required (w3c, style-dictionary, supernova, or token-studio)');

  return { command: 'convert', tokenFileArg, to, output };
}

function parseBuildArgs(args: string[]): BuildCliOptions {
  let tokenFileArg: string | undefined;
  let outputDir: string | undefined;
  let skipValidation = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--output-dir' || arg === '-o') {
      const next = args[index + 1];
      if (!next) throw new Error('Missing value for --output-dir');
      outputDir = next;
      index += 1;
      continue;
    }

    if (arg.startsWith('--output-dir=')) {
      outputDir = arg.slice('--output-dir='.length);
      continue;
    }

    if (arg === '--skip-validation') {
      skipValidation = true;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (tokenFileArg) {
      throw new Error(`Only one token file is supported. Unexpected value: "${arg}"`);
    }

    tokenFileArg = arg;
  }

  if (!tokenFileArg) throw new Error('Token file is required for build');
  if (!outputDir) throw new Error('--output-dir is required');

  return { command: 'build', tokenFileArg, outputDir, skipValidation };
}

function parseExportArgs(args: string[]): ExportCliOptions {
  let tokenFileArg: string | undefined;
  let format: 'css' | 'scss' | 'json' | 'tailwind' | undefined;
  let output: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--format') {
      const next = args[index + 1];
      if (!next) throw new Error('Missing value for --format');
      if (!['css', 'scss', 'json', 'tailwind'].includes(next)) {
        throw new Error('Format must be: css, scss, json, or tailwind');
      }
      format = next as 'css' | 'scss' | 'json' | 'tailwind';
      index += 1;
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      const next = args[index + 1];
      if (!next) throw new Error('Missing value for --output');
      output = next;
      index += 1;
      continue;
    }

    if (arg.startsWith('--format=')) {
      const val = arg.slice('--format='.length);
      if (!['css', 'scss', 'json', 'tailwind'].includes(val)) {
        throw new Error('Format must be: css, scss, json, or tailwind');
      }
      format = val as 'css' | 'scss' | 'json' | 'tailwind';
      continue;
    }

    if (arg.startsWith('--output=')) {
      output = arg.slice('--output='.length);
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (tokenFileArg) {
      throw new Error(`Only one token file is supported. Unexpected value: "${arg}"`);
    }

    tokenFileArg = arg;
  }

  if (!tokenFileArg) throw new Error('Token file is required for export');
  if (!format) throw new Error('--format is required (css, scss, json, or tailwind)');

  return { command: 'export', tokenFileArg, format, output };
}

function formatTitleFromPackageName(packageName: string): string {
  const trimmed = packageName.trim();
  if (!trimmed) return 'My Design System';
  const parts = trimmed.split('/');
  const withoutScope = trimmed.includes('/') ? parts[parts.length - 1] || trimmed : trimmed;
  const words = withoutScope
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (words.length === 0) return 'My Design System';
  return words
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

async function resolveDefaultInitTitle(cwd: string): Promise<string> {
  const packageJsonPath = path.resolve(cwd, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return 'My Design System';
  }

  try {
    const raw = await readFile(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as { name?: unknown };
    if (typeof parsed.name === 'string') {
      return formatTitleFromPackageName(parsed.name);
    }
  } catch {
    // Ignore package.json parsing issues and fall back to a safe default.
  }

  return 'My Design System';
}

function escapeSingleQuotedString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function askRawQuestion(rl: Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

function createCompleter(cwd: string) {
  return (line: string) => {
    try {
      const files = readdirSync(cwd);
      const hits = files.filter((f) => f.startsWith(line));
      return [hits.length ? hits : files, line];
    } catch {
      return [[], line];
    }
  };
}

async function askWithDefault(
  rl: Interface,
  label: string,
  defaultValue?: string
): Promise<string> {
  const suffix = defaultValue != null && defaultValue !== '' ? ` [${defaultValue}]` : '';
  const answer = await askRawQuestion(rl, `${label}${suffix}: `);
  if (answer) return answer;
  return defaultValue ?? '';
}

function parseThemeSelection(value: string): TokvistaThemePreference {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'system' || normalized === 's') return 'system';
  if (normalized === 'light' || normalized === 'l') return 'light';
  if (normalized === 'dark' || normalized === 'd') return 'dark';
  throw new Error('Theme must be one of: system, light, dark.');
}

function parseCategoriesSelection(value: string): TokenCategory[] {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'all') return [...ALL_CATEGORIES];

  const selected = new Set<TokenCategory>();
  const segments = normalized
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    if (segment === 'foundation' || segment === 'f') {
      selected.add('foundation');
      continue;
    }
    if (segment === 'semantic' || segment === 's') {
      selected.add('semantic');
      continue;
    }
    if (segment === 'components' || segment === 'c') {
      selected.add('components');
      continue;
    }
    throw new Error(`Invalid category "${segment}". Use foundation, semantic, components, or all.`);
  }

  if (selected.size === 0) {
    return [...ALL_CATEGORIES];
  }

  return ALL_CATEGORIES.filter((category) => selected.has(category));
}

function parseYesNoSelection(value: string, defaultValue: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (normalized === 'y' || normalized === 'yes') return true;
  if (normalized === 'n' || normalized === 'no') return false;
  throw new Error('Please enter yes/y or no/n.');
}

async function askWithParser<T>(
  rl: Interface,
  label: string,
  defaultValue: string,
  parser: (value: string) => T
): Promise<T> {
  while (true) {
    const answer = await askWithDefault(rl, label, defaultValue);
    try {
      return parser(answer);
    } catch (error) {
      console.log((error as Error).message);
    }
  }
}

async function buildInitConfigFromPrompt(
  cwd: string,
  askPreviewQuestion: boolean
): Promise<{ config: TokvistaConfig; preview: boolean }> {
  const defaultTitle = await resolveDefaultInitTitle(cwd);
  const defaults = {
    title: defaultTitle,
    subtitle: DEFAULT_INIT_SUBTITLE,
    logo: '',
    tokens: './tokens.json',
    theme: 'system' as TokvistaThemePreference,
    brandColor: '',
    categories: [...ALL_CATEGORIES],
  };

  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  if (!interactive) {
    return {
      config: {
        title: defaults.title,
        subtitle: defaults.subtitle,
        tokens: defaults.tokens,
        theme: defaults.theme,
        categories: defaults.categories,
      },
      preview: askPreviewQuestion,
    };
  }

  console.log('TokVista init');
  console.log('Press Enter to accept defaults.\n');

  const rl = createInterface({ 
    input: process.stdin, 
    output: process.stdout,
    completer: createCompleter(cwd),
    tabSize: 2
  });
  try {
    const title = await askWithDefault(rl, 'Title', defaults.title);
    const subtitle = await askWithDefault(rl, 'Subtitle', defaults.subtitle);
    const logo = await askWithDefault(rl, 'Logo path/url (optional)', defaults.logo);
    const tokens = await askWithDefault(rl, 'Tokens path', defaults.tokens);
    const theme = await askWithParser(
      rl,
      'Theme (system/light/dark)',
      defaults.theme,
      parseThemeSelection
    );
    const brandColor = await askWithDefault(rl, 'Brand color (optional)', defaults.brandColor);
    const categories = await askWithParser(
      rl,
      'Categories (all or comma list: foundation,semantic,components)',
      'all',
      parseCategoriesSelection
    );
    const preview = askPreviewQuestion
      ? await askWithParser(
          rl,
          'Start live preview now? (Y/n)',
          'y',
          (value) => parseYesNoSelection(value, true)
        )
      : false;

    return {
      config: {
        title,
        subtitle,
        ...(logo ? { logo } : {}),
        tokens,
        theme,
        ...(brandColor ? { brandColor } : {}),
        categories,
      },
      preview,
    };
  } finally {
    rl.close();
  }
}

function buildInitConfigTemplate(config: TokvistaConfig): string {
  const tokensValue = config.tokens?.trim() || './tokens.json';
  const lines = ['export default {'];

  if (config.title?.trim()) {
    lines.push(`  title: '${escapeSingleQuotedString(config.title.trim())}',`);
  }
  if (config.subtitle?.trim()) {
    lines.push(`  subtitle: '${escapeSingleQuotedString(config.subtitle.trim())}',`);
  }
  if (config.logo?.trim()) {
    lines.push(`  logo: '${escapeSingleQuotedString(config.logo.trim())}',`);
  }
  lines.push(`  tokens: '${escapeSingleQuotedString(tokensValue)}',`);
  lines.push(`  theme: '${config.theme || 'system'}',`);
  if (config.brandColor?.trim()) {
    lines.push(`  brandColor: '${escapeSingleQuotedString(config.brandColor.trim())}',`);
  }

  const categories = config.categories && config.categories.length > 0
    ? config.categories
    : ALL_CATEGORIES;
  const categoryList = categories.map((item) => `'${item}'`).join(', ');
  lines.push(`  categories: [${categoryList}],`);
  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

async function runInitCommand(cwd: string, options: InitCliOptions): Promise<ServeCliOptions | null> {
  const configPath = path.resolve(cwd, DEFAULT_INIT_CONFIG_FILE);
  if (existsSync(configPath) && !options.force) {
    throw new Error(
      `${DEFAULT_INIT_CONFIG_FILE} already exists at ${configPath}. Re-run with --force to overwrite.`
    );
  }

  const { config, preview } = await buildInitConfigFromPrompt(cwd, options.startPreview);
  const template = buildInitConfigTemplate(config);
  await writeFile(configPath, template, 'utf8');

  console.log(`Created ${configPath}`);

  if (!preview || !options.startPreview) {
    console.log('Run `npx tokvista` to start the docs server.');
    return null;
  }

  const resolvedTokens = resolveTokenPath(undefined, config, cwd, configPath);
  if (!existsSync(resolvedTokens)) {
    console.log(`Tokens file not found at ${resolvedTokens}.`);
    console.log('Update tokvista.config.ts and run `npx tokvista` when ready.');
    return null;
  }

  console.log('');
  console.log('Starting live preview...');
  return {
    command: 'serve',
    tokenFileArg: undefined,
    configPathArg: configPath,
    port: options.port,
    openBrowser: options.openBrowser,
    watch: true,
  };
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeInlineTag(value: string, tagName: 'script' | 'style'): string {
  return value.replace(new RegExp(`</${tagName}`, 'gi'), `<\\/${tagName}`);
}

function toDataUrlMimeType(logoPath: string): string {
  const ext = path.extname(logoPath).toLowerCase();
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.ico') return 'image/x-icon';
  return 'application/octet-stream';
}

async function resolveLogoForRuntime(
  logoPathValue: string | undefined,
  configDir: string | null,
  cwd: string
): Promise<string | undefined> {
  if (!logoPathValue) return undefined;
  const logoPath = logoPathValue.trim();
  if (!logoPath) return undefined;
  if (/^https?:\/\//i.test(logoPath) || logoPath.startsWith('data:')) {
    return logoPath;
  }

  const baseDir = configDir || cwd;
  const resolvedLogoPath = path.resolve(baseDir, logoPath);
  if (!existsSync(resolvedLogoPath)) {
    throw new Error(`Logo file not found: ${resolvedLogoPath}`);
  }

  const content = await readFile(resolvedLogoPath);
  const mimeType = toDataUrlMimeType(resolvedLogoPath);
  return `data:${mimeType};base64,${content.toString('base64')}`;
}

function parseCategories(value: unknown): TokenCategory[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed: TokenCategory[] = ['foundation', 'semantic', 'components'];
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is TokenCategory => allowed.includes(item as TokenCategory));
  const unique = normalized.filter((item, index) => normalized.indexOf(item) === index);
  return unique.length > 0 ? unique : undefined;
}

function parseDefaultTab(value: unknown): TokenCategory | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'foundation' || normalized === 'semantic' || normalized === 'components') {
    return normalized;
  }
  return undefined;
}

function normalizeThemePreference(value: unknown): TokvistaThemePreference | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'light' || normalized === 'dark' || normalized === 'system') {
    return normalized;
  }
  return undefined;
}

function normalizeConfigObject(raw: unknown, sourceLabel: string): TokvistaConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${sourceLabel} must export a plain object.`);
  }

  const record = raw as Record<string, unknown>;
  const readOptionalString = (key: keyof TokvistaConfig): string | undefined => {
    const value = record[key];
    if (value == null) return undefined;
    if (typeof value !== 'string') {
      throw new Error(`Invalid "${String(key)}" in ${sourceLabel}. Expected a string.`);
    }
    const trimmed = value.trim();
    return trimmed || undefined;
  };

  const theme = normalizeThemePreference(record.theme);
  if (record.theme != null && !theme) {
    throw new Error(`Invalid "theme" in ${sourceLabel}. Use "light", "dark", or "system".`);
  }

  const categories = parseCategories(record.categories);
  if (record.categories != null && !categories) {
    throw new Error(`Invalid "categories" in ${sourceLabel}. Use foundation/semantic/components.`);
  }

  const defaultTab = parseDefaultTab(record.defaultTab);
  if (record.defaultTab != null && !defaultTab) {
    throw new Error(`Invalid "defaultTab" in ${sourceLabel}. Use foundation/semantic/components.`);
  }

  if (record.showSearch != null && typeof record.showSearch !== 'boolean') {
    throw new Error(`Invalid "showSearch" in ${sourceLabel}. Expected a boolean.`);
  }

  return {
    title: readOptionalString('title'),
    subtitle: readOptionalString('subtitle'),
    logo: readOptionalString('logo'),
    tokens: readOptionalString('tokens'),
    theme,
    brandColor: readOptionalString('brandColor'),
    categories,
    defaultTab,
    showSearch: record.showSearch as boolean | undefined,
  };
}

function parseTsConfigSource(source: string, sourceLabel: string): unknown {
  const trimmed = source.replace(/^\uFEFF/, '').trim();
  const exportMatch = trimmed.match(/^\s*export\s+default\s+([\s\S]+)$/);
  if (!exportMatch) {
    throw new Error(`${sourceLabel} must use "export default { ... }".`);
  }
  let expression = exportMatch[1].trim();
  if (expression.endsWith(';')) {
    expression = expression.slice(0, -1).trim();
  }
  try {
    return new Function(`return (${expression});`)();
  } catch (error) {
    throw new Error(`Failed to evaluate ${sourceLabel}: ${(error as Error).message}`);
  }
}

async function loadConfigFromFile(configPath: string): Promise<TokvistaConfig> {
  const sourceLabel = path.basename(configPath);
  const extension = path.extname(configPath).toLowerCase();

  if (extension === '.json') {
    const raw = await readFile(configPath, 'utf8');
    try {
      return normalizeConfigObject(JSON.parse(raw), sourceLabel);
    } catch (error) {
      throw new Error(`Failed to parse ${sourceLabel}: ${(error as Error).message}`);
    }
  }

  if (extension === '.ts') {
    const raw = await readFile(configPath, 'utf8');
    const parsed = parseTsConfigSource(raw, sourceLabel);
    return normalizeConfigObject(parsed, sourceLabel);
  }

  const moduleUrl = pathToFileURL(configPath).href;
  const imported = await import(moduleUrl);
  const maybeDefault = imported.default ?? imported;
  return normalizeConfigObject(maybeDefault, sourceLabel);
}

function resolveConfigPath(cwd: string, explicitConfigPath?: string): string | null {
  if (explicitConfigPath) {
    const resolved = path.resolve(cwd, explicitConfigPath);
    if (!existsSync(resolved)) {
      throw new Error(`Config file not found: ${resolved}`);
    }
    return resolved;
  }

  for (const filename of DEFAULT_CONFIG_FILENAMES) {
    const candidate = path.resolve(cwd, filename);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function resolveCliConfig(cwd: string, explicitConfigPath?: string): Promise<ConfigLoadResult> {
  const configPath = resolveConfigPath(cwd, explicitConfigPath);
  if (!configPath) return { config: {}, configPath: null };
  const config = await loadConfigFromFile(configPath);
  return { config, configPath };
}

function resolveTokenPath(
  tokenFileArg: string | undefined,
  config: TokvistaConfig,
  cwd: string,
  configPath: string | null
): string {
  const baseDir = tokenFileArg ? cwd : configPath ? path.dirname(configPath) : cwd;
  const configuredTokenPath = typeof config.tokens === 'string' ? config.tokens.trim() : '';
  const input = tokenFileArg || configuredTokenPath || 'tokens.json';
  return path.resolve(baseDir, input);
}

async function buildRuntimeConfig(
  config: TokvistaConfig,
  configPath: string | null,
  cwd: string
): Promise<RuntimeConfigPayload> {
  const logo = await resolveLogoForRuntime(config.logo, configPath ? path.dirname(configPath) : null, cwd);
  return {
    ...(config.title ? { title: config.title } : {}),
    ...(config.subtitle ? { subtitle: config.subtitle } : {}),
    ...(logo ? { logo } : {}),
    ...(config.theme ? { theme: config.theme } : {}),
    ...(config.brandColor ? { brandColor: config.brandColor } : {}),
    ...(config.categories && config.categories.length > 0 ? { categories: config.categories } : {}),
    ...(config.defaultTab ? { defaultTab: config.defaultTab } : {}),
    ...(typeof config.showSearch === 'boolean' ? { showSearch: config.showSearch } : {}),
  };
}

function buildHtml(
  tokens: unknown,
  runtimeConfig: RuntimeConfigPayload,
  css: string,
  appBundle: string,
  enableHotReload: boolean
): string {
  const serializedTokens = serializeForInlineScript(tokens);
  const serializedConfig = serializeForInlineScript(runtimeConfig);
  const safeCss = escapeInlineTag(css, 'style');
  const safeAppBundle = escapeInlineTag(appBundle, 'script');
  const pageTitle = runtimeConfig.title || 'TokVista';
  const hotReloadScript = enableHotReload ? `<script>(function(){const ws=new WebSocket('ws://'+location.host+'/__tokvista_ws');ws.onmessage=()=>location.reload();ws.onerror=()=>setTimeout(()=>location.reload(),1000);})();</script>` : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${pageTitle}</title>
    <style>${safeCss}</style>
  </head>
  <body>
    <div id="tokvista-root"></div>
    <script>window.__TOKVISTA_TOKENS__ = ${serializedTokens};</script>
    <script>window.__TOKVISTA_CONFIG__ = ${serializedConfig};</script>
    <script type="module">${safeAppBundle}</script>
    ${hotReloadScript}
  </body>
</html>`;
}

function resolveDistAsset(relativePath: string): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const binDir = path.dirname(currentFilePath);
  return path.resolve(binDir, '..', relativePath);
}

function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  getHtml: () => string
) {
  const requestUrl = request.url ?? '/';
  const pathname = requestUrl.split('?')[0];

  if (pathname === '/' || pathname === '') {
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(getHtml());
    return;
  }

  if (pathname === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }

  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('Not found');
}

function isPortInUse(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'EADDRINUSE'
  );
}

async function startServer(getHtml: () => string, preferredPort: number) {
  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    const port = preferredPort + attempt;
    const server = createServer((request, response) =>
      handleRequest(request, response, getHtml)
    );

    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => resolve());
      });
      return { server, port };
    } catch (error) {
      server.close();
      if (isPortInUse(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Could not find an open port in range ${preferredPort}-${preferredPort + MAX_PORT_ATTEMPTS - 1}.`
  );
}

function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  const command =
    platform === 'darwin'
      ? { cmd: 'open', args: [url] }
      : platform === 'win32'
        ? { cmd: 'cmd', args: ['/c', 'start', '', url] }
        : { cmd: 'xdg-open', args: [url] };

  return new Promise((resolve, reject) => {
    const child = spawn(command.cmd, command.args, {
      stdio: 'ignore',
      detached: true,
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

async function readTokens(tokenPath: string): Promise<unknown> {
  const raw = await readFile(tokenPath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Token file must contain valid JSON.');
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from ${tokenPath}: ${(error as Error).message}`
    );
  }
}

async function runServeCommand(cwd: string, options: ServeCliOptions): Promise<void> {
  const { config, configPath } = await resolveCliConfig(cwd, options.configPathArg);
  const resolvedTokenPath = resolveTokenPath(options.tokenFileArg, config, cwd, configPath);

  if (!existsSync(resolvedTokenPath)) {
    throw new Error(`Token file not found: ${resolvedTokenPath}`);
  }

  const runtimeConfig = await buildRuntimeConfig(config, configPath, cwd);
  const [css, appBundle] = await Promise.all([
    readFile(resolveDistAsset('styles.css'), 'utf8'),
    readFile(resolveDistAsset('cli/browser.js'), 'utf8'),
  ]);

  let cachedTokens = await readTokens(resolvedTokenPath);
  const getHtml = () => buildHtml(cachedTokens, runtimeConfig, css, appBundle, options.watch);
  
  const { server, port } = await startServer(getHtml, options.port);
  const openSockets = new Set<Socket>();
  let isShuttingDown = false;
  const hotReload = options.watch ? new HotReloadServer() : null;

  server.on('connection', (socket) => {
    openSockets.add(socket);
    socket.on('close', () => {
      openSockets.delete(socket);
    });
  });

  if (hotReload) {
    server.on('upgrade', (req, socket, head) => hotReload.handleUpgrade(req, socket, head));
  }

  const url = `http://localhost:${port}`;

  console.log(`TokVista running at ${url}`);
  console.log(`Using tokens: ${resolvedTokenPath}`);
  if (configPath) {
    console.log(`Using config: ${configPath}`);
  }
  if (options.watch) {
    console.log('Watching for changes...');
    const watcher = watchFile(resolvedTokenPath, async () => {
      try {
        cachedTokens = await readTokens(resolvedTokenPath);
        hotReload?.reload();
        console.log('Tokens reloaded');
      } catch (error) {
        console.error('Failed to reload tokens:', (error as Error).message);
      }
    });
    const cleanup = () => {
      watcher.close();
      hotReload?.close();
    };
    process.on('exit', cleanup);
  }

  if (options.openBrowser) {
    try {
      await openBrowser(url);
    } catch (error) {
      console.warn(
        `Could not auto-open browser. Open this URL manually: ${url}\n${(error as Error).message}`
      );
    }
  } else {
    console.log('Browser auto-open disabled (--no-open).');
  }

  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\nReceived ${signal}, shutting down TokVista...`);
    const timeout = setTimeout(() => {
      for (const socket of openSockets) {
        socket.destroy();
      }
      process.exit(0);
    }, SHUTDOWN_TIMEOUT_MS);
    timeout.unref();

    // Available in modern Node.js; closes keep-alive sockets immediately.
    (server as unknown as { closeAllConnections?: () => void }).closeAllConnections?.();

    server.close(() => {
      clearTimeout(timeout);
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function runExportCommand(cwd: string, options: ExportCliOptions): Promise<void> {
  const resolvedTokenPath = path.resolve(cwd, options.tokenFileArg);
  
  if (!existsSync(resolvedTokenPath)) {
    throw new Error(`Token file not found: ${resolvedTokenPath}`);
  }

  const tokens = await readTokens(resolvedTokenPath) as FigmaTokens;
  
  let output: string;
  let defaultFilename: string;
  
  switch (options.format) {
    case 'css':
      output = generateCSS(tokens);
      defaultFilename = 'tokens.css';
      break;
    case 'scss':
      output = generateSCSS(tokens);
      defaultFilename = '_tokens.scss';
      break;
    case 'json':
      output = generateJS(tokens);
      defaultFilename = 'tokens.js';
      break;
    case 'tailwind':
      output = generateTailwind(tokens);
      defaultFilename = 'tailwind.config.js';
      break;
  }

  if (options.output) {
    const outputPath = path.resolve(cwd, options.output);
    await writeFile(outputPath, output, 'utf8');
    console.log(`Exported ${options.format} to ${outputPath}`);
  } else {
    console.log(output);
  }
}

async function runValidateCommand(cwd: string, options: ValidateCliOptions): Promise<void> {
  const resolvedTokenPath = path.resolve(cwd, options.tokenFileArg);
  
  if (!existsSync(resolvedTokenPath)) {
    throw new Error(`Token file not found: ${resolvedTokenPath}`);
  }

  const tokens = await readTokens(resolvedTokenPath);
  const result = validateTokens(tokens);

  console.log(`\nValidating ${resolvedTokenPath}...\n`);

  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    result.errors.forEach(err => {
      console.log(`  ${err.path}: ${err.message}`);
    });
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach(warn => {
      console.log(`  ${warn.path}: ${warn.message}`);
    });
    console.log('');
  }

  console.log(`Total tokens: ${result.totalTokens}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  if (result.valid) {
    console.log('\n✅ All tokens are valid!\n');
    process.exit(0);
  } else {
    console.log('\n❌ Validation failed\n');
    process.exit(1);
  }
}

async function runDiffCommand(cwd: string, options: DiffCliOptions): Promise<void> {
  const oldPath = path.resolve(cwd, options.oldFileArg);
  const newPath = path.resolve(cwd, options.newFileArg);
  
  if (!existsSync(oldPath)) {
    throw new Error(`Old token file not found: ${oldPath}`);
  }
  if (!existsSync(newPath)) {
    throw new Error(`New token file not found: ${newPath}`);
  }

  const [oldTokens, newTokens] = await Promise.all([
    readTokens(oldPath),
    readTokens(newPath)
  ]);

  const diff = diffTokens(oldTokens, newTokens);

  console.log(`\nComparing tokens:\n  Old: ${oldPath}\n  New: ${newPath}\n`);

  if (diff.added.length > 0) {
    console.log(`✅ Added (${diff.added.length}):`);
    diff.added.forEach(path => console.log(`  + ${path}`));
    console.log('');
  }

  if (diff.removed.length > 0) {
    console.log(`❌ Removed (${diff.removed.length}):`);
    diff.removed.forEach(path => console.log(`  - ${path}`));
    console.log('');
  }

  if (diff.modified.length > 0) {
    console.log(`🔄 Modified (${diff.modified.length}):`);
    diff.modified.forEach(({ path, oldValue, newValue }) => {
      console.log(`  ~ ${path}`);
      console.log(`    - ${oldValue}`);
      console.log(`    + ${newValue}`);
    });
    console.log('');
  }

  console.log(`Unchanged: ${diff.unchanged}`);
  console.log(`Total changes: ${diff.added.length + diff.removed.length + diff.modified.length}\n`);
}

async function runConvertCommand(cwd: string, options: ConvertCliOptions): Promise<void> {
  const resolvedTokenPath = path.resolve(cwd, options.tokenFileArg);
  
  if (!existsSync(resolvedTokenPath)) {
    throw new Error(`Token file not found: ${resolvedTokenPath}`);
  }

  const tokens = await readTokens(resolvedTokenPath);
  const detection = detectTokenFormat(tokens);
  
  // Normalize to Token Studio first if needed
  let normalizedTokens = tokens;
  if (detection.format !== 'token-studio' && detection.format !== 'unknown') {
    normalizedTokens = normalizeTokenFormat(tokens, detection.format);
  }

  const converted = convertTokenFormat(normalizedTokens, options.to);
  const output = JSON.stringify(converted, null, 2);

  if (options.output) {
    const outputPath = path.resolve(cwd, options.output);
    await writeFile(outputPath, output, 'utf8');
    console.log(`Converted ${detection.format} → ${options.to}`);
    console.log(`Output: ${outputPath}`);
  } else {
    console.log(output);
  }
}

async function runBuildCommand(cwd: string, options: BuildCliOptions): Promise<void> {
  const resolvedTokenPath = path.resolve(cwd, options.tokenFileArg);
  const outputDir = path.resolve(cwd, options.outputDir);
  
  if (!existsSync(resolvedTokenPath)) {
    throw new Error(`Token file not found: ${resolvedTokenPath}`);
  }

  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    await import('node:fs/promises').then(fs => fs.mkdir(outputDir, { recursive: true }));
  }

  const tokens = await readTokens(resolvedTokenPath) as FigmaTokens;

  // Validate first unless skipped
  if (!options.skipValidation) {
    console.log('\nValidating tokens...');
    const result = validateTokens(tokens);
    
    if (!result.valid) {
      console.log(`❌ Found ${result.errors.length} errors`);
      result.errors.slice(0, 5).forEach(err => {
        console.log(`  ${err.path}: ${err.message}`);
      });
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more errors`);
      }
      throw new Error('Validation failed. Fix errors or use --skip-validation');
    }
    console.log('✅ Validation passed\n');
  }

  // Export all formats
  console.log('Building tokens...');
  
  const formats = [
    { name: 'CSS', ext: 'css', generator: generateCSS },
    { name: 'SCSS', ext: 'scss', generator: generateSCSS },
    { name: 'JavaScript', ext: 'js', generator: generateJS },
    { name: 'Tailwind', ext: 'tailwind.config.js', generator: generateTailwind },
  ];

  for (const format of formats) {
    const content = format.generator(tokens);
    const filename = format.ext.includes('.') ? format.ext : `tokens.${format.ext}`;
    const outputPath = path.join(outputDir, filename);
    await writeFile(outputPath, content, 'utf8');
    console.log(`  ✓ ${format.name} → ${filename}`);
  }

  console.log(`\n✅ Build complete: ${outputDir}\n`);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const cwd = process.cwd();
    
    if (options.command === 'init') {
      const serveOptions = await runInitCommand(cwd, options);
      if (serveOptions) {
        await runServeCommand(cwd, serveOptions);
      }
      return;
    }

    if (options.command === 'export') {
      await runExportCommand(cwd, options);
      return;
    }

    if (options.command === 'validate') {
      await runValidateCommand(cwd, options);
      return;
    }

    if (options.command === 'diff') {
      await runDiffCommand(cwd, options);
      return;
    }

    if (options.command === 'convert') {
      await runConvertCommand(cwd, options);
      return;
    }

    if (options.command === 'build') {
      await runBuildCommand(cwd, options);
      return;
    }

    await runServeCommand(cwd, options);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

void main();
