/**
 * Tokvista
 * Beautiful visual documentation components for Figma design tokens
 * 
 * @example
 * ```tsx
 * import { TokenDocumentation } from 'tokvista';
 * import 'tokvista/styles.css';
 * import tokens from './tokens.json';
 * 
 * export default function DocsPage() {
 *   return <TokenDocumentation tokens={tokens} />;
 * }
 * ```
 */

// Main component
export { TokenDocumentation } from './components/TokenDocumentation';
/** @deprecated Use TokenDocumentation instead */
export { default as TokenDocumentationDefault } from './components/TokenDocumentation';

// Individual components for custom layouts
export { ColorDisplay } from './components/ColorDisplay';
export { SpacingDisplay } from './components/SpacingDisplay';
export { RadiusDisplay } from './components/RadiusDisplay';
export { SizeDisplay } from './components/SizeDisplay';
export { FoundationTab } from './components/FoundationTab';
export { SemanticTab } from './components/SemanticTab';
export { ComponentsTab } from './components/ComponentsTab';
export { SearchModal } from './components/SearchModal';
export { ExportModal } from './components/ExportModal';

// Deprecated aliases (for backward compatibility)
/** @deprecated Use ColorDisplay instead */
export { ColorDisplay as ColorGrid } from './components/ColorDisplay';
/** @deprecated Use SpacingDisplay instead */
export { SpacingDisplay as SpacingScale } from './components/SpacingDisplay';
/** @deprecated Use RadiusDisplay instead */
export { RadiusDisplay as RadiusShowcase } from './components/RadiusDisplay';
/** @deprecated Use SizeDisplay instead */
export { SizeDisplay as SizeScale } from './components/SizeDisplay';

// Standalone Components
export { Spacing, Colors, Sizes, Radius } from './components/StandaloneComponents';

// Types
export type {
  TokenDocumentationProps,
  SnapshotHistoryOptions,
  SnapshotAccessMode,
  ColorDisplayProps,
  SpacingDisplayProps,
  RadiusDisplayProps,
  SizeDisplayProps,
  FigmaTokens,
  ParsedColorToken,
  ParsedSpacingToken,
  ParsedRadiusToken,
  ParsedSizeToken,
  ColorFamily,
  TokenValue,
  NestedTokens,
  // Deprecated type aliases
  ColorDisplayProps as ColorGridProps,
  SpacingDisplayProps as SpacingScaleProps,
  RadiusDisplayProps as RadiusShowcaseProps,
  SizeDisplayProps as SizeScaleProps,
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
  extractTokenGroups,
  detectTokenType,
  createTokenMap,
  resolveTokenValue,
} from './utils/index';

export {
  generateCSS,
  generateSCSS,
  generateJS,
  generateTailwind,
  getFlattenedTokens,
} from './utils/exportUtils';
