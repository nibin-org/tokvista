# @nibin-org/tokens

<div align="center">

![npm version](https://img.shields.io/npm/v/@nibin-org/tokens.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)
![npm downloads](https://img.shields.io/npm/dm/@nibin-org/tokens.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)

**Interactive visual documentation for design tokens**

[Demo](https://nibin-org.github.io/tokens/) · [Issues](https://github.com/nibin-org/tokens/issues)

</div>

## Features

- 🔍 **Global Search** - `Cmd+K` to find any token instantly
- 🎨 **Three-Tab Layout** - Foundation, Semantic, and Components
- � **One-Click Copy** - Copy CSS variables with a click
- ⌨️ **Keyboard Navigation** - Full keyboard support
- 🌙 **Dark Mode** - Built-in dark theme
- 📦 **117 KB** - Zero external dependencies
- 🔷 **TypeScript** - Full type definitions

## Installation

```bash
npm install @nibin-org/tokens
```

## Usage

```tsx
import { TokenDocumentation } from '@nibin-org/tokens';
import '@nibin-org/tokens/styles.css';
import tokens from './tokens.json';

<TokenDocumentation tokens={tokens} />
```

### Next.js

```js
// next.config.js
const nextConfig = {
  transpilePackages: ['@nibin-org/tokens'],
};
```

## Search

- **Open**: `Cmd+K` (Mac) or `Ctrl+K` (Windows)
- **Navigate**: Arrow keys
- **Select**: Enter
- **Close**: Esc

Search by token name, value, or CSS variable.

## API

```tsx
<TokenDocumentation
  tokens={tokens}                    // Required
  title="Design Tokens"              // Optional
  subtitle="v1.9.0"                  // Optional
  onTokenClick={(token) => {...}}    // Optional
/>
```

### Props

| Prop | Type | Required | Default |
|------|------|----------|---------|
| `tokens` | `FigmaTokens` | Yes | - |
| `title` | `string` | No | `"Design Tokens"` |
| `subtitle` | `string` | No | `"View and copy design tokens"` |
| `onTokenClick` | `(token) => void` | No | - |

## Token Structure

Works with [Figma Tokens Studio](https://tokens.studio/) exports:

```json
{
  "Foundation/Value": {
    "base": {
      "blue": {
        "50": { "value": "#3b82f6", "type": "color" }
      },
      "space": {
        "md": { "value": "16px", "type": "dimension" }
      }
    }
  },
  "Semantic/Value": {
    "fill": {
      "primary": { "value": "{base.blue.50}", "type": "color" }
    }
  }
}
```

## Components

Individual components for custom layouts:

```tsx
import { 
  FoundationTab,
  SemanticTab,
  ComponentsTab,
  SpacingScale,
  SizeScale,
  RadiusShowcase
} from '@nibin-org/tokens';
```

## Development

```bash
git clone https://github.com/nibin-org/tokens.git
cd tokens
npm install
npm run build

cd demo
npm install
npm run dev
```

## License

MIT © [nibin-org](https://github.com/nibin-org)