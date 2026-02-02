/**
 * Type definitions for figma-token-docs
 */

// Token format from Figma Token Studio
export interface TokenValue {
  value: string;
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

// Main tokens structure
export interface FigmaTokens {
  global?: Record<string, unknown>;
  'Colors/Value'?: {
    base?: NestedTokens;
    fill?: NestedTokens;
    stroke?: NestedTokens;
    text?: NestedTokens;
  };
  'Spacing/Mode 1'?: NestedTokens;
  'Space/Mode 1'?: NestedTokens; // Alternative naming from Figma
  'Size/Mode 1'?: NestedTokens;
  'Radius/Mode 1'?: NestedTokens;
  'Components/Mode 1'?: NestedTokens;
  $themes?: unknown[];
  $metadata?: {
    tokenSetOrder?: string[];
  };
}

// Component props
export interface TokenDocumentationProps {
  tokens: FigmaTokens;
  title?: string;
  subtitle?: string;
  defaultTab?: string;
  showSearch?: boolean;
  darkMode?: boolean;
  onTokenClick?: (token: ParsedColorToken | ParsedSpacingToken | ParsedRadiusToken | ParsedSizeToken) => void;
}

export interface ColorGridProps {
  baseColors?: NestedTokens;
  fillColors?: NestedTokens;
  strokeColors?: NestedTokens;
  textColors?: NestedTokens;
  onColorClick?: (color: ParsedColorToken) => void;
}

export interface SpacingScaleProps {
  tokens: NestedTokens;
  onTokenClick?: (token: ParsedSpacingToken) => void;
}

export interface RadiusShowcaseProps {
  tokens: NestedTokens;
  onTokenClick?: (token: ParsedRadiusToken) => void;
}

export interface SizeScaleProps {
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
