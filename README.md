# Tokvista

<div align="center">

![npm version](https://img.shields.io/npm/v/tokvista?style=for-the-badge&colorA=000000&colorB=5b47fb)
![npm downloads](https://img.shields.io/npm/dm/tokvista.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)

**Beautiful, interactive documentation for your design tokens.**

Zero configuration. Multiple formats. One command.

[Live Demo](https://tokvista-demo.vercel.app/) · [Documentation](./GUIDE.md) · [Report Issue](https://github.com/nibin-org/tokvista/issues)

</div>

---

## Features

- 🎨 **Beautiful visuals** - Colors, spacing, typography, and components
- 🔄 **Multi-format support** - Token Studio, W3C, Style Dictionary, Supernova, Figma API
- 📋 **Smart copy** - CSS Variables, SCSS, or Tailwind with one click
- 🔍 **Instant search** - `Cmd+K` / `Ctrl+K` to find any token
- 🔗 **Deep linking** - Share direct URLs to specific tokens
- 🔬 **Token scanner** - Find unused tokens and hardcoded values
- ✅ **Validation** - Check token structure and catch errors
- 🔄 **Format conversion** - Convert between token formats
- 📤 **Export** - Generate CSS, SCSS, JS, or Tailwind config
- 🎯 **Zero config** - Works out of the box
- ⚡ **Two modes** - CLI for quick preview or React component for apps
- 🔥 **Live reload** - Auto-refresh on file changes

---

## Quick Start

### CLI (Fastest)

```bash
npx tokvista tokens.json
```

That's it! Opens in your browser automatically.

### React Component

```bash
npm install tokvista
```

```tsx
import { TokenDocumentation } from 'tokvista';
import 'tokvista/styles.css';
import tokens from './tokens.json';

export default function DesignSystem() {
  return <TokenDocumentation tokens={tokens} />;
}
```

---

## Supported Formats

Tokvista automatically detects and works with:

| Format | Example | Auto-detected |
|--------|---------|---------------|
| **Token Studio** | `{ "type": "color", "value": "#fff" }` | ✅ |
| **W3C DTCG** | `{ "$type": "color", "$value": "#fff" }` | ✅ |
| **Style Dictionary** | Nested objects with type/value | ✅ |
| **Supernova** | Array with id/name/tokenType/value | ✅ |
| **Figma API** | meta.variables structure | ✅ |

No configuration needed - just pass your tokens.

---

## CLI Commands

### Preview & Documentation

```bash
# Start interactive documentation
npx tokvista tokens.json

# Custom port
npx tokvista tokens.json --port 4000

# Don't open browser
npx tokvista tokens.json --no-open

# Disable live reload
npx tokvista tokens.json --no-watch
```

### Setup & Configuration

```bash
# Interactive setup wizard
npx tokvista init

# Force overwrite existing config
npx tokvista init --force

# Skip preview after setup
npx tokvista init --no-preview
```

### Scan & Analyze

```bash
# Scan for token usage and issues
npx tokvista scan tokens.json

# Scan specific directory
npx tokvista scan ./src --tokens tokens.json

# Finds:
# - Unused tokens (safe to remove)
# - Hardcoded colors that should use tokens
# - Hardcoded spacing values
# - Semantic tokens with hardcoded values
```

### Validate & Quality

```bash
# Validate token structure
npx tokvista validate tokens.json

# Checks for:
# - Invalid color values
# - Invalid dimension values
# - Broken token aliases
# - Missing type fields
# Exit code 1 on errors (perfect for CI/CD)
```

### Compare & Diff

```bash
# Compare two token files
npx tokvista diff tokens-v1.json tokens-v2.json

# Shows:
# - Added tokens
# - Removed tokens
# - Modified tokens with old/new values
# - Unchanged count
```

### Export & Generate

```bash
# Export to CSS
npx tokvista export tokens.json --format css --output tokens.css

# Export to SCSS
npx tokvista export tokens.json --format scss --output _tokens.scss

# Export to JavaScript
npx tokvista export tokens.json --format json --output tokens.js

# Export to Tailwind
npx tokvista export tokens.json --format tailwind --output tailwind.config.js

# Print to stdout (for piping)
npx tokvista export tokens.json --format css
```

### Convert Formats

```bash
# Convert to W3C DTCG
npx tokvista convert tokens.json --to w3c --output tokens-w3c.json

# Convert to Style Dictionary
npx tokvista convert tokens.json --to style-dictionary --output tokens-sd.json

# Convert to Supernova
npx tokvista convert tokens.json --to supernova --output tokens-sn.json

# Convert to Token Studio
npx tokvista convert tokens.json --to token-studio --output tokens-ts.json
```

### Build Pipeline

```bash
# Build all formats at once
npx tokvista build tokens.json --output-dir ./dist

# Creates:
# - tokens.css (CSS Variables)
# - tokens.scss (SCSS Variables)
# - tokens.js (JavaScript/TypeScript)
# - tailwind.config.js (Tailwind Config)

# Skip validation for faster builds
npx tokvista build tokens.json --output-dir ./dist --skip-validation
```

### CLI Options Reference

| Command | Description |
|---------|-------------|
| `tokvista [file]` | Start documentation server |
| `tokvista init` | Interactive configuration setup |
| `tokvista scan <dir\|file>` | Analyze token usage and find issues |
| `tokvista validate <file>` | Validate token structure |
| `tokvista diff <old> <new>` | Compare two token files |
| `tokvista export <file>` | Export tokens to various formats |
| `tokvista convert <file>` | Convert between token formats |
| `tokvista build <file>` | Build all formats (validate + export) |

| Option | Description |
|--------|-------------|
| `--config`, `-c` | Path to config file |
| `--port`, `-p` | Server port (default: 3000) |
| `--format` | Export format: css, scss, json, tailwind |
| `--output`, `-o` | Output file path |
| `--output-dir` | Output directory for build command |
| `--to` | Target format for convert command |
| `--tokens` | Token file path for scan command |
| `--no-open` | Don't open browser automatically |
| `--no-watch` | Disable live reload |
| `--no-preview` | Skip preview after init |
| `--skip-validation` | Skip validation in build command |
| `--force`, `-f` | Overwrite existing files |
| `--help`, `-h` | Show help message |

---

## React API

### TokenDocumentation

```tsx
<TokenDocumentation
  tokens={tokens}              // Required: your token object
  title="Design System"        // Optional: header title
  subtitle="Documentation"     // Optional: subtitle
  logo="./logo.svg"           // Optional: logo URL
  categories={['foundation']}  // Optional: filter tabs
  theme="dark"                // Optional: 'light' | 'dark' | 'system'
  brandColor="#6366f1"        // Optional: primary color
  onTokenClick={(token) => {}} // Optional: click handler
/>
```

### Custom Fonts

```tsx
<TokenDocumentation
  tokens={tokens}
  loadDefaultFonts={false}
  fontFamilySans="'Inter', sans-serif"
  fontFamilyMono="'Fira Code', monospace"
/>
```

### Standalone Components

Build custom layouts with individual components:

```tsx
import { Colors, Spacing, Typography } from 'tokvista';

<Colors tokens={tokens} title="Color Palette" />
<Spacing tokens={tokens} />
<Typography tokens={tokens} />
```

Available: `Colors`, `Spacing`, `Sizes`, `Radius`, `Typography`

---

## Token Structure

### Recommended Format (Token Studio)

```json
{
  "Foundation/Value": {
    "base": {
      "color": {
        "blue": {
          "500": { "value": "#3B82F6", "type": "color" }
        }
      },
      "space": {
        "md": { "value": "16px", "type": "spacing" }
      }
    }
  },
  "Semantic/Value": {
    "fill": {
      "primary": { "value": "{base.color.blue.500}", "type": "color" }
    }
  },
  "Components/Mode 1": {
    "button": {
      "Primary": {
        "fill": { "value": "{Semantic.fill.primary}", "type": "color" }
      }
    }
  }
}
```

### W3C Format

```json
{
  "colors": {
    "primary": {
      "$value": "#3B82F6",
      "$type": "color",
      "$description": "Primary brand color"
    }
  }
}
```

See [GUIDE.md](./GUIDE.md) for complete setup instructions.

---

## Features in Detail

### 🎨 Visual Token Display

- **Colors** - Swatches with hex values and contrast ratios
- **Spacing** - Visual scale with pixel measurements
- **Typography** - Live font previews with size/weight
- **Components** - Organized by variant with all properties

### 📋 Smart Copy

- Click any token to copy
- Choose format: CSS Variables, SCSS, or Tailwind
- Format persists across sessions
- Toast confirmation with copied value

### 🔍 Global Search

- `Cmd+K` / `Ctrl+K` to open
- Search by name, value, or CSS variable
- Fuzzy matching
- Keyboard navigation
- Click result to copy

### 🔗 Deep Linking

- Share direct links to tokens
- URL updates when clicking tokens
- Auto-scroll and highlight on page load
- Example: `https://yoursite.com/tokens#color-primary-500`

### 📤 Code Export

Export all tokens as:
- CSS Variables
- SCSS Variables
- JavaScript/TypeScript
- Tailwind Config

With syntax highlighting and one-click copy.

---

## Migration from @nibin-org/tokens

```bash
# Old
npm install @nibin-org/tokens

# New
npm install tokvista
```

Update imports:

```tsx
// Old
import { TokenDocumentation } from '@nibin-org/tokens';

// New
import { TokenDocumentation } from 'tokvista';
```

No other changes needed - API is identical.

---

## Development

### For Package Users

```bash
npx tokvista init
npx tokvista
```

### For Contributors

```bash
# Setup
nvm use 20
npm install
npm run build

# Run CLI locally
node dist/bin/tokvista.js tokens.json --port 4000

# Run demo
cd demo
npm install
npm run dev
```

---

## Resources

- [Live Demo](https://tokvista-demo.vercel.app/)
- [Setup Guide](./GUIDE.md)
- [GitHub](https://github.com/nibin-org/tokvista)
- [Issues](https://github.com/nibin-org/tokvista/issues)
- [Changelog](./CHANGELOG.md)

---

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT © [nibin-org](https://github.com/nibin-org)
