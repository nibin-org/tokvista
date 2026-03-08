/**
 * Type definitions for Tokvista
 */

export const TOKEN_TYPES = {
  COLOR: "color",
  NUMBER: "number",
  DIMENSION: "dimension",
  SPACING: "spacing",
  SIZING: "sizing",
  BORDER_RADIUS: "borderRadius",
  BORDER_WIDTH: "borderWidth",
  OPACITY: "opacity",
  FONT_SIZE: "fontSize",
  LINE_HEIGHT: "lineHeight",
  LETTER_SPACING: "letterSpacing",
  STRING: "string",
  FONT_FAMILY: "fontFamily",
  FONT_FAMILIES: "fontFamilies",
  FONT_WEIGHT: "fontWeight",
  FONT_WEIGHTS: "fontWeights",
  TEXT_CASE: "textCase",
  TEXT_DECORATION: "textDecoration",
  STROKE_STYLE: "strokeStyle",
  BORDER_STYLE: "borderStyle",
  DURATION: "duration",
  CUBIC_BEZIER: "cubicBezier",
  TYPOGRAPHY: "typography",
  BOX_SHADOW: "boxShadow",
  SHADOW: "shadow",
  BORDER: "border",
  COMPOSITION: "composition",
} as const;

export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];

// Token format from Figma Token Studio
export interface TokenValue {
  value: string | number;
  type: TokenType | (string & {});
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

// Theme configuration
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  primary?: string;
  background?: string;
  surface?: string;
  border?: string;
  text?: string;
  textSecondary?: string;
}

export interface ThemeConfig {
  mode?: ThemeMode;
  colors?: ThemeColors;
  enableModeToggle?: boolean;
}

export type TokenCategory = 'foundation' | 'semantic' | 'components';
export type TokvistaThemePreference = ThemeMode | 'system';

export interface TokvistaConfig {
  title?: string;
  subtitle?: string;
  logo?: string;
  tokens?: string;
  theme?: TokvistaThemePreference;
  brandColor?: string;
  themeColors?: ThemeColors;
  categories?: TokenCategory[];
  defaultTab?: TokenCategory;
  showSearch?: boolean;
  snapshotHistory?: SnapshotHistoryOptions;
}

// Component props
export interface TokenDocumentationProps {
  tokens: FigmaTokens;
  title?: string;
  subtitle?: string;
  logo?: string;
  defaultTab?: string;
  categories?: TokenCategory[];
  showSearch?: boolean;
  fontFamilySans?: string;
  fontFamilyMono?: string;
  loadDefaultFonts?: boolean;
  onTokenClick?: (token: ParsedColorToken | ParsedSpacingToken | ParsedRadiusToken | ParsedSizeToken) => void;
  snapshotHistory?: SnapshotHistoryOptions;
  theme?: ThemeConfig;
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
  onTokenClick?: (token: ParsedColorToken | ParsedSpacingToken | ParsedRadiusToken | ParsedSizeToken) => void;
  title?: string;
}
