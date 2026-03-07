import React from 'react';
import { createRoot } from 'react-dom/client';
import { TokenDocumentation } from '../components/TokenDocumentation';
import type {
  SnapshotHistoryOptions,
  ThemeColors,
  ThemeConfig,
  TokenCategory,
  TokvistaThemePreference,
} from '../types';

type CliRuntimeConfig = {
  title?: string;
  subtitle?: string;
  logo?: string;
  theme?: TokvistaThemePreference;
  brandColor?: string;
  themeColors?: ThemeColors;
  categories?: string[];
  defaultTab?: string;
  showSearch?: boolean;
  snapshotHistory?: SnapshotHistoryOptions;
};

declare global {
  interface Window {
    __TOKVISTA_TOKENS__?: unknown;
    __TOKVISTA_CONFIG__?: unknown;
  }
}

function getSystemThemeMode(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function normalizeCategories(input: unknown): TokenCategory[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const allowed: TokenCategory[] = ['foundation', 'semantic', 'components'];
  const normalized = input
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is TokenCategory => allowed.includes(item as TokenCategory));
  const unique = normalized.filter((item, index) => normalized.indexOf(item) === index);
  return unique.length > 0 ? unique : undefined;
}

function normalizeDefaultTab(input: unknown): TokenCategory | undefined {
  if (typeof input !== 'string') return undefined;
  const normalized = input.trim().toLowerCase();
  if (normalized === 'foundation' || normalized === 'semantic' || normalized === 'components') {
    return normalized;
  }
  return undefined;
}

function normalizeThemeColors(input: unknown): ThemeColors | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const record = input as Record<string, unknown>;
  const colors: ThemeColors = {};

  if (typeof record.primary === 'string' && record.primary.trim()) colors.primary = record.primary.trim();
  if (typeof record.background === 'string' && record.background.trim()) colors.background = record.background.trim();
  if (typeof record.surface === 'string' && record.surface.trim()) colors.surface = record.surface.trim();
  if (typeof record.border === 'string' && record.border.trim()) colors.border = record.border.trim();
  if (typeof record.text === 'string' && record.text.trim()) colors.text = record.text.trim();
  if (typeof record.textSecondary === 'string' && record.textSecondary.trim()) colors.textSecondary = record.textSecondary.trim();

  return Object.keys(colors).length > 0 ? colors : undefined;
}

function normalizeSnapshotHistory(input: unknown): SnapshotHistoryOptions | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const record = input as Record<string, unknown>;
  if (typeof record.enabled !== 'boolean') return undefined;

  const normalized: SnapshotHistoryOptions = {
    enabled: record.enabled,
  };

  if (record.accessMode === 'preview' || record.accessMode === 'full') {
    normalized.accessMode = record.accessMode;
  }
  if (typeof record.historyEndpoint === 'string' && record.historyEndpoint.trim()) {
    normalized.historyEndpoint = record.historyEndpoint.trim();
  }
  if (typeof record.sourceUrl === 'string' && record.sourceUrl.trim()) {
    normalized.sourceUrl = record.sourceUrl.trim();
  }
  if (typeof record.title === 'string' && record.title.trim()) {
    normalized.title = record.title.trim();
  }
  if (typeof record.maxPreviewSnapshots === 'number' && Number.isFinite(record.maxPreviewSnapshots)) {
    normalized.maxPreviewSnapshots = record.maxPreviewSnapshots;
  }
  if (typeof record.maxPreviewDiffs === 'number' && Number.isFinite(record.maxPreviewDiffs)) {
    normalized.maxPreviewDiffs = record.maxPreviewDiffs;
  }

  return normalized;
}

function buildTheme(config: CliRuntimeConfig): ThemeConfig | undefined {
  const hasBrandColor = typeof config.brandColor === 'string' && config.brandColor.trim().length > 0;
  const themeColors = normalizeThemeColors(config.themeColors);
  const themePreference = typeof config.theme === 'string' ? config.theme.trim().toLowerCase() : '';
  const mode =
    themePreference === 'light' || themePreference === 'dark'
      ? themePreference
      : themePreference === 'system'
        ? getSystemThemeMode()
        : undefined;

  const colors = themeColors ? { ...themeColors } : undefined;
  if (hasBrandColor) {
    const nextColors = colors || {};
    nextColors.primary = config.brandColor?.trim();
    return {
      ...(mode ? { mode } : {}),
      colors: nextColors,
    };
  }

  if (!mode && !colors) return undefined;

  return {
    ...(mode ? { mode } : {}),
    ...(colors ? { colors } : {}),
  };
}

function getRuntimeConfig(): CliRuntimeConfig {
  const raw = window.__TOKVISTA_CONFIG__;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as CliRuntimeConfig;
}

const mountNode = document.getElementById('tokvista-root');

if (!mountNode) {
  throw new Error('TokVista CLI mount node not found.');
}

const runtimeConfig = getRuntimeConfig();
const theme = buildTheme(runtimeConfig);
const categories = normalizeCategories(runtimeConfig.categories);
const defaultTab = normalizeDefaultTab(runtimeConfig.defaultTab);
const showSearch = typeof runtimeConfig.showSearch === 'boolean' ? runtimeConfig.showSearch : true;
const snapshotHistory = normalizeSnapshotHistory(runtimeConfig.snapshotHistory);

createRoot(mountNode).render(
  <React.StrictMode>
    <TokenDocumentation
      tokens={window.__TOKVISTA_TOKENS__ as Record<string, unknown>}
      title={runtimeConfig.title || 'Design Tokens'}
      subtitle={typeof runtimeConfig.subtitle === 'string' ? runtimeConfig.subtitle : undefined}
      logo={typeof runtimeConfig.logo === 'string' ? runtimeConfig.logo : undefined}
      defaultTab={defaultTab}
      categories={categories}
      showSearch={showSearch}
      theme={theme}
      snapshotHistory={snapshotHistory}
    />
  </React.StrictMode>
);
