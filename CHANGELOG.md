# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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