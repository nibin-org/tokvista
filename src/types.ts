/**
 * Type definitions for Tokvista
 */

// Token format from Figma Token Studio
export interface TokenValue {
  value: string | number;
  type: string;
}

export interface NestedTokens {
  [key: string]: TokenValue | NestedTokens;
}

// Parsed token structure
export interface ParsedColorToken {
  name: string;
  value: string;
  cssVariable: string;
  shade?: string;
  family?: string;
  resolvedValue?: string; // Resolved hex value for alias tokens
}

export interface ParsedSpacingToken {
  name: string;
  value: string;
  cssVariable: string;
  numericValue: number;
}

export interface ParsedRadiusToken {
  name: string;
  value: string;
  cssVariable: string;
  numericValue: number;
}

export interface ParsedSizeToken {
  name: string;
  value: string;
  cssVariable: string;
  numericValue: number;
}

// Color categories
export interface ColorCategory {
  name: string;
  tokens: ParsedColorToken[];
}

export interface ColorFamily {
  name: string;
  primaryColor: string;
  shades: ParsedColorToken[];
}

export interface VariantTokens {
  [key: string]: TokenValue;
}

export interface DimensionGroup {
  [size: string]: TokenValue;
}

// Main tokens structure
export interface FigmaTokens {
  global?: Record<string, unknown>;
  $themes?: unknown[];
  $metadata?: {
    tokenSetOrder?: string[];
  };
  [key: string]: unknown; // Allow generic folder names like 'Foundation/Value', 'Semantic/Value', etc.
}

// Component props
export interface TokenDocumentationProps {
  tokens: FigmaTokens;
  title?: string;
  subtitle?: string;
  defaultTab?: string;
  showSearch?: boolean;
  fontFamilySans?: string;
  fontFamilyMono?: string;
  loadDefaultFonts?: boolean;
  onTokenClick?: (token: ParsedColorToken | ParsedSpacingToken | ParsedRadiusToken | ParsedSizeToken) => void;
  playgroundLock?: PlaygroundLockOptions;
  snapshotHistory?: SnapshotHistoryOptions;
}

export interface PlaygroundLockOptions {
  enabled: boolean;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export type SnapshotAccessMode = 'preview' | 'full';

export interface SnapshotHistoryOptions {
  enabled: boolean;
  accessMode?: SnapshotAccessMode;
  historyEndpoint?: string;
  sourceUrl?: string;
  onRefreshSource?: (options?: { preferredSourceUrl?: string }) => void | Promise<void>;
  title?: string;
  maxPreviewSnapshots?: number;
  maxPreviewDiffs?: number;
}

export interface GitHubSnapshotProjectConfig {
  owner: string;
  repo: string;
  path: string;
  branch?: string;
  perPage?: number;
}

export interface GitHubSnapshotHistoryConfig extends GitHubSnapshotProjectConfig {
  accessMode?: SnapshotAccessMode;
  title?: string;
}

export interface GitHubPreviewLinkConfig extends GitHubSnapshotProjectConfig {
  previewBaseUrl: string;
}

export interface ColorDisplayProps {
  baseColors?: NestedTokens;
  fillColors?: NestedTokens;
  strokeColors?: NestedTokens;
  textColors?: NestedTokens;
  tokenMap?: Record<string, string>;
  onColorClick?: (color: ParsedColorToken) => void;
}

export interface SpacingDisplayProps {
  tokens: NestedTokens;
  onTokenClick?: (token: ParsedSpacingToken) => void;
}

export interface RadiusDisplayProps {
  tokens: NestedTokens;
  onTokenClick?: (token: ParsedRadiusToken) => void;
}

export interface SizeDisplayProps {
  tokens: NestedTokens;
  onTokenClick?: (token: ParsedSizeToken) => void;
}

export interface TokenCardProps {
  name: string;
  value: string;
  cssVariable: string;
  type: 'color' | 'spacing' | 'radius' | 'size';
  onClick?: () => void;
}

// Standalone Component Props
export interface StandaloneTokenProps {
  tokens: FigmaTokens;
  onTokenClick?: (token: any) => void;
  title?: string;
}
