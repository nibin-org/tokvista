# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Initial release of @nibin-org/tokens
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

## [Unreleased]

### Planned
- Animation tokens support
- Typography tokens visualization
- Shadow tokens display
- Export functionality (CSS, SCSS, JSON)
- Storybook integration examples
- Accessibility improvements (ARIA labels, keyboard navigation)