/**
 * figma-token-docs
 * Beautiful visual documentation components for Figma design tokens
 * 
 * @example
 * ```tsx
 * import { TokenDocumentation } from 'figma-token-docs';
 * import 'figma-token-docs/styles.css';
 * import tokens from './tokens.json';
 * 
 * export default function DocsPage() {
 *   return <TokenDocumentation tokens={tokens} />;
 * }
 * ```
 */

// Main component
export { TokenDocumentation } from './components/TokenDocumentation';
export { default as TokenDocumentationDefault } from './components/TokenDocumentation';

// Individual components for custom layouts
export { ColorGrid } from './components/ColorGrid';
export { SpacingScale } from './components/SpacingScale';
export { RadiusShowcase } from './components/RadiusShowcase';
export { SizeScale } from './components/SizeScale';

// Types
export type {
  TokenDocumentationProps,
  ColorGridProps,
  SpacingScaleProps,
  RadiusShowcaseProps,
  SizeScaleProps,
  FigmaTokens,
  ParsedColorToken,
  ParsedSpacingToken,
  ParsedRadiusToken,
  ParsedSizeToken,
  ColorFamily,
  TokenValue,
  NestedTokens,
} from './types';

// Utilities (for advanced customization)
export {
  parseBaseColors,
  parseSemanticColors,
  parseSpacingTokens,
  parseRadiusTokens,
  parseSizeTokens,
  getContrastColor,
  copyToClipboard,
} from './utils';
