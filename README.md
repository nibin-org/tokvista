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
- 🎯 **Zero config** - Works out of the box with any token format
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

## CLI Usage

### Basic

```bash
# Use default tokens.json
npx tokvista

# Specify token file
npx tokvista ./design-tokens.json

# Custom port
npx tokvista tokens.json --port 4000

# Don't open browser
npx tokvista tokens.json --no-open
```

### Export Tokens

```bash
# Export to CSS
npx tokvista export tokens.json --format css --output tokens.css

# Export to SCSS
npx tokvista export tokens.json --format scss --output _tokens.scss

# Export to JavaScript
npx tokvista export tokens.json --format json --output tokens.js

# Export to Tailwind config
npx tokvista export tokens.json --format tailwind --output tailwind.config.js

# Print to stdout (for piping)
npx tokvista export tokens.json --format css
```

### Validate Tokens

```bash
# Check for errors
npx tokvista validate tokens.json

# Use in CI/CD (exits with code 1 on errors)
npm run validate-tokens
```

### Compare Tokens

```bash
# Compare two token files
npx tokvista diff tokens-v1.json tokens-v2.json

# Perfect for:
# - Version control reviews
# - Release changelogs  
# - Migration tracking
```

### Convert Formats

```bash
# Convert to W3C DTCG format
npx tokvista convert tokens.json --to w3c --output tokens-w3c.json

# Convert to Style Dictionary
npx tokvista convert tokens.json --to style-dictionary --output tokens-sd.json

# Convert to Supernova array format
npx tokvista convert tokens.json --to supernova --output tokens-sn.json

# Print to stdout
npx tokvista convert tokens.json --to w3c
```

### Interactive Setup

```bash
npx tokvista init
```

Creates `tokvista.config.ts` with your branding:

```ts
export default {
  title: 'Acme Design System',
  subtitle: 'Design tokens documentation',
  logo: './logo.svg',
  tokens: './tokens.json',
  theme: 'system',
  brandColor: '#6366f1',
  categories: ['foundation', 'semantic', 'components'],
}
```

Then run `npx tokvista` to use your config.

### CLI Options

| Option | Description |
|--------|-------------|
| `tokvista [file]` | Token file path (default: `./tokens.json`) |
| `tokvista init` | Interactive config setup |
| `tokvista export <file> --format <type>` | Export tokens (css, scss, json, tailwind) |
| `tokvista validate <file>` | Validate token structure and values |
| `tokvista diff <old> <new>` | Compare two token files |
| `tokvista convert <file> --to <format>` | Convert between token formats |
| `--config`, `-c` | Config file path |
| `--port`, `-p` | Server port (default: `3000`) |
| `--format` | Export format (export only) |
| `--output`, `-o` | Output file path (export only) |
| `--no-open` | Don't open browser |
| `--no-watch` | Disable live reload |
| `--no-preview` | Skip preview after init |
| `--force`, `-f` | Overwrite existing config |
| `--help`, `-h` | Show help |

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
