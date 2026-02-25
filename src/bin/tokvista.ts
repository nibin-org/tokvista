import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PORT = 3000;
const MAX_PORT_ATTEMPTS = 25;
const SHUTDOWN_TIMEOUT_MS = 1500;

interface CliOptions {
  tokenFile: string;
  port: number;
  openBrowser: boolean;
}

function printHelp() {
  console.log(`TokVista CLI

Usage:
  tokvista [tokens.json] [--port 3000] [--no-open]

Arguments:
  tokens.json       Path to your tokens file (default: ./tokens.json)

Options:
  -p, --port        Preferred server port (default: 3000)
  --no-open         Do not automatically open the browser
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

function parseArgs(args: string[]): CliOptions {
  let tokenFile = 'tokens.json';
  let tokenFileSet = false;
  let port = DEFAULT_PORT;
  let openBrowser = true;

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

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (tokenFileSet) {
      throw new Error(`Only one token file is supported. Unexpected value: "${arg}"`);
    }

    tokenFile = arg;
    tokenFileSet = true;
  }

  return { tokenFile, port, openBrowser };
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

function buildHtml(tokens: unknown, css: string, appBundle: string): string {
  const serializedTokens = serializeForInlineScript(tokens);
  const safeCss = escapeInlineTag(css, 'style');
  const safeAppBundle = escapeInlineTag(appBundle, 'script');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TokVista</title>
    <style>${safeCss}</style>
  </head>
  <body>
    <div id="tokvista-root"></div>
    <script>window.__TOKVISTA_TOKENS__ = ${serializedTokens};</script>
    <script type="module">${safeAppBundle}</script>
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
  html: string
) {
  const requestUrl = request.url ?? '/';
  const pathname = requestUrl.split('?')[0];

  if (pathname === '/' || pathname === '') {
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(html);
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

async function startServer(html: string, preferredPort: number) {
  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    const port = preferredPort + attempt;
    const server = createServer((request, response) =>
      handleRequest(request, response, html)
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
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Token file must contain a JSON object at the root.');
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from ${tokenPath}: ${(error as Error).message}`
    );
  }
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const resolvedTokenPath = path.resolve(process.cwd(), options.tokenFile);

    if (!existsSync(resolvedTokenPath)) {
      throw new Error(`Token file not found: ${resolvedTokenPath}`);
    }

    const [tokens, css, appBundle] = await Promise.all([
      readTokens(resolvedTokenPath),
      readFile(resolveDistAsset('styles.css'), 'utf8'),
      readFile(resolveDistAsset('cli/browser.js'), 'utf8'),
    ]);

    const html = buildHtml(tokens, css, appBundle);
    const { server, port } = await startServer(html, options.port);
    const openSockets = new Set<Socket>();
    let isShuttingDown = false;

    server.on('connection', (socket) => {
      openSockets.add(socket);
      socket.on('close', () => {
        openSockets.delete(socket);
      });
    });

    const url = `http://localhost:${port}`;

    console.log(`TokVista running at ${url}`);
    console.log(`Using tokens: ${resolvedTokenPath}`);

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
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

void main();
