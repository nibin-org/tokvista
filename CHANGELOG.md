# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.12.1] - 2025-01-XX

### Fixed
- **Scan command**: Fixed semantic token validation to properly detect hardcoded values in tokens under "Semantic/Value" and "Components/Mode" categories

## [1.12.0] - 2025-01-XX

### Added
- **Scan command**: Analyze token usage across your codebase
  - `tokvista scan ./src --tokens tokens.json` - Scan directory with specific tokens
  - `tokvista scan tokens.json` - Scan current directory using tokens file
  - Finds which tokens are actually used in your code
  - Identifies unused tokens (safe to delete)
  - Detects hardcoded colors (hex, rgb, rgba) that should be tokens
  - Detects hardcoded spacing values (px, rem, em) that should be tokens
  - Validates semantic/component tokens for hardcoded values
  - Scans common file types: .css, .scss, .tsx, .jsx, .ts, .js, .vue, .svelte
  - Shows file paths and line numbers for each finding
  - Perfect for token cleanup and migration audits

## [1.11.0] - 2026-03-09

### Added
- **Scan command**: Analyze token usage across your codebase
  - `tokvista scan ./src --tokens tokens.json`
  - Finds which tokens are actually used in your code
  - Identifies unused tokens (safe to delete)
  - Detects hardcoded colors (hex, rgb, rgba) that should be tokens
  - Detects hardcoded spacing values (px, rem, em) that should be tokens
  - Scans common file types: .css, .scss, .tsx, .jsx, .ts, .js, .vue, .svelte
  - Shows file paths and line numbers for each finding
  - Unique feature not available in other token tools
  - Perfect for token cleanup and migration audits

## [1.10.0] - 2026-03-09

### Added
- **Build command**: Complete CI/CD pipeline in one command
  - `tokvista build tokens.json --output-dir ./dist`
  - Validates tokens first (use `--skip-validation` to skip)
  - Exports all formats: CSS, SCSS, JavaScript, Tailwind
  - Creates output directory automatically
  - Perfect for automated build pipelines
  - Replaces 4 separate export commands

## [1.9.0] - 2026-03-09

### Added
- **Convert command**: Transform tokens between formats
  - `tokvista convert tokens.json --to w3c --output converted.json`
  - Convert from any format to: W3C DTCG, Style Dictionary, Supernova, or Token Studio
  - Auto-detects source format and normalizes before conversion
  - Perfect for migrating between design tools (Figma → Style Dictionary, etc.)
  - Supports all 5 token formats with automatic detection

## [1.8.0] - 2026-03-09

### Added
- **Diff command**: Compare two token files to see what changed
  - `tokvista diff tokens-v1.json tokens-v2.json`
  - Shows added, removed, and modified tokens
  - Displays old and new values for modified tokens
  - Perfect for version control reviews and release changelogs
  - Supports all 5 token formats with automatic detection

## [1.7.1] - 2026-03-09

### Fixed
- **Validator path resolution**: Fixed Token Studio category wrapper handling in buildTokenMap to correctly resolve token paths for alias validation

## [1.7.0] - 2026-03-09

### Added
- **Validation command**: Check token files for errors before deployment
  - `tokvista validate tokens.json`
  - Detects invalid color values (must be hex, rgb, rgba, hsl, hsla)
  - Detects invalid dimension values (must have unit: px, rem, em, %, vh, vw)
  - Finds broken token aliases (references to non-existent tokens)
  - Warns about missing type fields
  - Exit code 1 on errors (perfect for CI/CD pipelines)
  - Shows total tokens, errors, and warnings count

## [1.6.1] - 2026-03-09

### Fixed
- Added missing `--no-watch` flag to CLI help text
- Fixed TypeScript type assertion for export command

## [1.6.0] - 2026-03-09

### Added
- **Export commands**: Generate CSS, SCSS, JSON, or Tailwind config from CLI for CI/CD pipelines
  - `tokvista export tokens.json --format css --output tokens.css`
  - `tokvista export tokens.json --format scss --output _tokens.scss`
  - `tokvista export tokens.json --format json --output tokens.js`
  - `tokvista export tokens.json --format tailwind --output tailwind.config.js`
  - Output to file with `--output` or print to stdout for piping
  - Resolves token aliases to final values in JSON exports
  - Perfect for automated build pipelines and version control

## [1.5.2] - 2026-03-09

### Added
- **Tab completion in init**: File path autocomplete for logo and tokens paths during `tokvista init` - press Tab to see files or autocomplete partial names

### Changed
- Init prompts now support readline tab completion for better UX

## [1.5.1] - 2026-03-09

### Added
- **Live watch & hot reload**: CLI automatically reloads browser when token files change (enabled by default, use `--no-watch` to disable)
- WebSocket-based hot reload with minimal overhead
- File watcher with 100ms debounce for stable reloads
- Console feedback showing "Tokens reloaded" on each change

### Changed
- CLI now watches token file by default for instant feedback during development
- Updated README with live reload feature in features list
- Added `--no-watch` flag to CLI options documentation

## [Unreleased]

### Added
- **Multi-format token support**: Automatic detection and normalization for 5 token formats
  - Token Studio (native format)
  - W3C DTCG format (`$type`, `$value`)
  - Style Dictionary (nested objects)
  - Supernova (array format with id/name/tokenType/value)
  - Figma REST API (meta.variables structure)
- **Format detection UI**: Informational banner shows detected format with confidence score
- **Smart error messages**: Clear issues and actionable suggestions for unknown formats
- **CLI array support**: CLI now accepts both JSON objects and arrays (for Supernova format)

### Fixed
- **JS export alias resolution**: generateJS now resolves token aliases to their final values instead of exporting raw `{path.to.token}` strings
- **Color contrast for non-hex values**: getContrastColor now supports rgb(), rgba(), hsl(), hsla() formats using canvas API parsing
- **Code deduplication**: Centralized isRecord, isTokenLike, normalizeColorPath, and determineTokenType helpers in core.ts to eliminate duplication across exportUtils and searchUtils
- **Type safety**: Fixed StandaloneTokenProps.onTokenClick to use proper typed union instead of `any`
- **Type casting**: Added proper type casts in searchUtils to ensure determineTokenType return values match SearchableToken['type'] union
- **CLI shutdown**: Now exits reliably on `Ctrl+C`/`SIGTERM` by closing active connections and forcing socket cleanup on timeout
- **CLI browser auto-open**: Now handles async spawn failures correctly (for example, missing `xdg-open`) and falls back with a clear warning
- **Search modal**: Debounced search effect now skips updates while closed, eliminating React `act(...)` warning noise in tests
- **Alias resolution**: Removed ambiguous fuzzy endsWith matching in resolveTokenValue to prevent incorrect resolution with short alias paths
- **Token type fallback**: determineTokenType already returns 'component' as fallback, matching SearchableToken type union

### Changed
- Fonts: Default Google Fonts loading is now optional via `loadDefaultFonts`; users can pass `fontFamilySans` / `fontFamilyMono` to match their app fonts.
- Demo: Updated to show how to load and pass custom fonts.
- Root `npm run dev` now runs postbuild on each successful watch rebuild, so `dist/styles.css` stays in sync for local-linked consumers.
- Demo `basePath`/`assetPrefix` are now enabled only for production builds (`/tokvista`), while local dev uses root paths.
- TokenDocumentation now includes an **All Tokens** tab so arbitrary JSON token structures are visible even without `Foundation/Value` or `Semantic/Value` sections.
- **Tailwind export**: Added size token support in generateTailwind width configuration

### Planned
- Animation tokens support
- Typography tokens visualization
- Shadow tokens display
- Export functionality (CSS, SCSS, JSON)
- Storybook integration examples
- Accessibility improvements (ARIA labels, keyboard navigation)

## [1.3.0] - 2026-02-25

### Added
- Standalone CLI entrypoint exposed as `tokvista` binary.
- Zero-setup run flow: `npx tokvista tokens.json`.
- Built-in local server that serves a self-contained HTML app.
- Automatic browser launch on startup with `--no-open` opt-out.
- CLI flags: `--port`/`-p`, `--no-open`, `--help`/`-h`.
- Bundled browser runtime for CLI so no React project setup is required.

### Changed
- Build pipeline now emits:
  - `dist/bin/tokvista.js` (Node CLI binary)
  - `dist/cli/browser.js` (browser app bundle used by CLI)
- Postbuild now sets executable permissions on the CLI binary.
- README and usage docs updated for CLI + React dual usage.

## [1.0.1] - 2026-02-16

### Changed
- Updated README demo section and guide formatting.
- Refreshed Tokens Studio screenshots to reflect tokvista repo.

## [1.0.0] - 2026-02-16

### Added
- New `tokvista` package (renamed from `@nibin-org/tokens`).

### Changed
- Repository renamed to `nibin-org/tokvista`.
- Documentation and badges updated for the new package name.

### Deprecated
- `@nibin-org/tokens` in favor of `tokvista`.

## Legacy @nibin-org/tokens history

## [1.16.1] - 2026-02-13

### Added
- Reduced motion support via `prefers-reduced-motion`.
- Focus-visible rings for search input, playground input, and custom select.
- ARIA listbox semantics for search results.

### Changed
- CI now runs tests; build cleans `dist`; added `prepublishOnly` build guard.
- CSS `sideEffects` now matches all CSS to prevent tree-shaking.
- Token values now allow numbers in public types.

### Fixed
- Escaped search highlights to prevent HTML injection.
- Clipboard fallback for search and export copy actions.
- Guarded `localStorage` usage in privacy-restricted environments.
- Numeric token handling in color/core/dimension parsing.
- Updated package name references to `tokvista`.

## [1.16.0] - 2026-02-09

### Added
- **Responsive polish** 📱: Mobile header actions now stack cleanly with search on top and export/theme beneath.
- **Scrollable export tabs**: Horizontal scroll enabled for export format tabs on small screens.
- **Base colors grid**: Switched to a responsive grid (4 → 3 → 2 → 1 columns) to prevent overflow on mid‑width screens.

### Changed
- **WCAG contrast improvements** ✅: Updated light/dark text and primary colors for AA‑compliant readability while preserving the premium look.
- **Mobile navbar background**: Sticky header becomes opaque on small screens to avoid content bleed-through.

### Fixed
- **Header icon alignment**: Normalized line-height and SVG alignment for export/search/theme buttons.
- **Color pill wrapping**: CSS variable pills now truncate with ellipsis instead of wrapping to a new line.
- **Sticky offsets**: Sidebar/top spacing now respects the computed sticky header height across breakpoints.

### CI
- **Node 20 only**: CI matrix aligned to Node 20 to match dependencies and runtime requirements.

## [1.15.0] - 2026-02-09

### Added
- **Premium UI refresh** ✨: Glass surfaces, refined shadows, and polished cards across the entire experience.
- **Icon system**: Replaced emoji icons with a consistent SVG icon set.
- **Search enhancements** 🔎: Color previews in search results, stronger highlight states, and better keyboard navigation.
- **Component tokens parity**: Component dimension cards now match the foundation UI with preview tiles and ordered sizing.
- **Copy feedback**: Toast now shows a clear “Copied” badge and the value in `var(--token)` format when available.

### Changed
- **Build pipeline**: Removed CSS minifier dependency; postbuild now copies `styles.css` into `dist`.
- **Test environment**: Switched to `happy-dom` for stable test runs.
- **Demo upgrades**: Updated demo dependencies (Next.js + ESLint config) for security compliance.

### Fixed
- **Sticky sidebar**: Restored sticky behavior after layout changes.
- **Scroll spy**: Deterministic scroll spy with proper offset handling for header height.
- **Token focus**: Search navigation now reliably scrolls and highlights matching tokens.

## [1.14.0] - 2026-02-07

### Changed
- **Maintenance release**: Internal housekeeping and minor UI consistency fixes.

## [1.13.2] - 2026-02-06

### Changed
- **Architectural Refactor** 🏗️: Successfully reorganized the monolithic `utils.ts` into domain-specific modules for better maintainability and performance.
  - `core.ts`: Token detection and resolution.
  - `color.ts`: Advanced color parsing and contrast logic.
  - `dimension.ts`: Spacing, size, and radius utilities.
  - `ui.ts`: Clipboard and browser helpers.
- **Consistent Naming** 🏷️: Standardized all documentation components to use the `*Display` suffix (e.g., `ColorDisplay`, `RadiusDisplay`, `SpacingDisplay`, `SizeDisplay`).
- **Dependency Cleanup** 🧹: Removed `lodash-es` dependency to reduce bundle size and complexity.
- **Public API Cleanup**: Refined `src/index.ts` with cleaner exports and deprecated aliases for backward compatibility.

### Fixed 🐛
- **Scroll Positioning**: Fixed sticky navbar covering section headers by implementing accurate `scroll-margin-top`.
- **Navigation Active State**: Fixed sidebar highlighting jitter by optimizing `IntersectionObserver` root margins.
- **Card Styling**: Fixed inconsistent padding in Spacing, Size, and Radius cards to match the premium full-bleed style of Color cards.

## [1.12.0] - 2026-02-06

### Added
- **Unified Click-to-Copy Experience** 📋: Standardized the copy behavior across all foundation tokens (Spacing, Sizes, Radius, Typography). 
  - Clicking any token card now copies the CSS variable in `var(--variable)` format.
  - Removed separate click targets for a cleaner, more intuitive UX.
- **Improved Typography Tokens** 🔤: Replaced blue boxes with intuitive "Aa" text previews for font-size and vertical rhythm indicators for line-height.
- **Naming Convention Refactor** 🛠️: Cleaned up foundation token CSS variables!
  - Foundation colors now consistently use the `--base-` prefix (e.g., `--base-teal-50`).
  - Spatial/dimension tokens (Spacing, Sizes, Radius) now export without the `--base-` prefix for cleaner usage (e.g., `--size-xl`).
- **Premium Visual Feedback** ✨: Added subtle hover "lift" effects and border-color transitions to all interactive token cards.

## [1.11.0] - 2026-02-06

### Added
- **Dark Mode Modal Support** 🌙: Enhanced Search and Export modals with dedicated dark mode styling for improved readability and brand consistency.
- **Standalone Components** 🏗️: New `Colors`, `Spacing`, `Sizes`, and `Radius` components exported for standalone use, allowing you to build custom documentation layouts.
- **Testing Suite** 🧪: Integrated Vitest with a comprehensive suite of unit and component tests (85%+ coverage) ensuring long-term stability.
- **Typography Improvements** 🔤: Better detection and grouping of font-size and line-height tokens in the Foundation tab.

### Fixed
- **Dark Theme Refinements**: Fixed modal background, text contrast, and active tab highlights in dark mode.
- **Search UX**: Improved scroll behavior and keyboard navigation in the search results.
- **Build Quality**: Verified fresh builds for ESM and CommonJS with updated dependency mappings.

## [1.10.1] - 2026-02-05

### Added
- **README Overhaul**: Completely rewritten documentation with "Mastering Tokens" guide.
- **UI Refinements**: Final standardized header button sizes and branded blue aesthetic.

## [1.10.0] - 2026-02-05

### Added
- **Export Functionality** 📤 - A powerful new way to use tokens in your code!
  - Export to **CSS Variables**, **SCSS**, **JSON**, and **Tailwind CSS config**.
  - New **Export Modal** with live code preview and tabbed interface.
  - **Copy-to-Clipboard** and **Download** functionality for all formats.
  - Smart **Alias Resolution**: Semantic and Component tokens now correctly reference Foundation variables (e.g., `var(--base-...)` in CSS, `$base-...` in SCSS) instead of raw aliases.
- **Header UI Refinements** ✨:
  - Redesigned search, export, and theme buttons with a modern light blue aesthetic.
  - Increased search box width to **280px** for better prominence and UX.
  - Standardized all header actions to a consistent **40px height** and professional border radii.

### Changed
- **Package size**: 135.6 KB (+18 KB for export feature)
  - ESM: 46 KB
  - CJS: 50 KB
  - CSS: 25 KB

## [1.9.0] - 2026-02-05

### Added
- **Global Search Feature** ⭐ - Major UX improvement!
  - Search across all tokens (colors, spacing, sizes, radius, typography, components)
  - Keyboard shortcut: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)
  - Fuzzy matching for better search results
  - Grouped results by category and type
  - Keyboard navigation (arrow keys, Enter to copy, Esc to close)
  - Search by token name, value, or CSS variable
  - Highlighted matching text in results
  - Click to copy from search results
  - Search button in navbar with shortcut hint
  - Custom fuzzy search algorithm (no external dependencies)

### Changed
- **Package size**: 114.4 KB (from 95.3 KB, +19 KB for search feature)
  - ESM: 39 KB (from 32 KB)
  - CJS: 43 KB (from 36 KB)
  - CSS: 20 KB (from 16 KB)
  - TypeScript definitions: 13.6 KB

### Technical Details
- New `SearchModal` component with animations
- New `searchUtils.ts` with custom fuzzy search algorithm
- Added search button to navbar with keyboard shortcut hint
- Global keyboard event listener for Cmd+K / Ctrl+K
- Responsive search modal for mobile devices

## [1.8.1] - 2026-02-05

### Fixed
- **Package size optimization**: Reduced from 419 KB to 95.3 KB (-77%)
  - Disabled source maps in production build
  - Enabled minification for all bundles
  - Added CSS minification using lightningcss
- **Missing CSS variable**: Added `--ftd-primary-rgb` for rgba() usage in both light and dark themes
- **Accessibility improvements**: Added `role="status"` and `aria-live="polite"` to toast notifications
- **ESLint script removed**: Removed lint script from package.json (dependency not present)

### Changed
- **Build configuration**: Updated tsup.config.ts with minification and CSS optimization
- **Font loading**: Optimized Google Fonts import (Inter + JetBrains Mono)

## [1.8.0] - 2026-02-05

### Added
- **Three-tab architecture**: Foundation, Semantic, and Components tabs for organized navigation
- **Sticky sidebar navigation**: Contextual sidebar for each tab (Colors, Spacing, Sizes in Foundation; Fill, Stroke, Text in Semantic)
- **ComponentsTab component**: New dedicated component for displaying component tokens with dimension groups
- **FoundationTab component**: Refactored foundation token display with unified color navigation
- **SemanticTab component**: Enhanced semantic token display with automatic color grouping
- **Smart color grouping**: Semantic colors automatically grouped by base color name
- **One-click copy with var() format**: Click any token to copy `var(--token-name)` ready for CSS
- **Fixed navbar**: Persistent navigation bar with smooth scrolling
- **Component dimension display**: Shows all component dimensions (font-size, padding, radius, height, line-height) in organized groups
- **Toast timeout management**: Improved toast notifications that handle rapid clicking

### Changed
- **Copy behavior**: Now copies full `var(--token-name)` format instead of hex values
- **Color CSS variables**: Foundation colors now use `--base-` prefix (e.g., `--base-green-50`)
- **UX improvements**: Entire token cards are clickable with clear visual feedback
- **Hex code display**: Hex values are now display-only with reduced opacity
- **Color family layout**: Changed from 5-column to 4-column grid for better responsiveness

### Fixed
- **Size bar height calculation**: Now uses actual token values instead of percentage-based calculation
- **Toast notification stacking**: Fixed issue where rapid clicks caused toast overlap
- **CSS variable definitions**: Added missing `--ftd-primary-rgb` variable for rgba() usage
- **Hover states**: Removed confusing separate hover effects on CSS variable and hex code elements

## [1.0.2] - 2025-02-02

### Added
- Initial release of tokvista
- TokenDocumentation component for interactive token display
- ColorGrid component for color palette visualization
- SpacingScale component for spacing token display
- RadiusShowcase component for border radius tokens
- SizeScale component for size token display
- Dark mode support with theme toggle
- Copy-to-clipboard functionality
- Search and filter capabilities
- TypeScript support with full type definitions
- CSS custom properties for theming

### Features
- Support for Figma Tokens Studio format
- Responsive design for all screen sizes
- Zero-config setup - just pass tokens.json
- Next.js compatibility with transpilePackages
- Individual component exports for custom layouts
