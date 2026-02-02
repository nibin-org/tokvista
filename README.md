# @nibin-org/tokens

<div align="center">

![npm version](https://img.shields.io/npm/v/@nibin-org/tokens.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)
![npm downloads](https://img.shields.io/npm/dm/@nibin-org/tokens.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&colorA=000000&colorB=5b47fb)

### 🎨 Beautiful, Interactive Visual Documentation for Design Tokens

**The missing UI layer that Style Dictionary doesn't provide**

[View Demo](https://nibin-org.github.io/tokens/) · [Report Bug](https://github.com/nibin-org/tokens/issues) · [Request Feature](https://github.com/nibin-org/tokens/issues)

</div>

---

## ✨ Why @nibin-org/tokens?

Transform your static design tokens into **living, interactive documentation** that designers and developers will actually love using.

```tsx
import { TokenDocumentation } from '@nibin-org/tokens';
import '@nibin-org/tokens/styles.css';

<TokenDocumentation tokens={yourTokens} />
```

That's it. Beautiful documentation in one line.

## 🎯 Features

<table>
  <tr>
    <td width="50%">
      <h3>🎨 Rich Color Visualization</h3>
      <p>Base palettes with shade scales + semantic tokens (fill, stroke, text) displayed with contrast ratios</p>
    </td>
    <td width="50%">
      <h3>📏 Spacing & Size Scales</h3>
      <p>Visual bar charts with proportional representation and real measurements</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>⬜ Radius Showcase</h3>
      <p>Actual rounded boxes demonstrating each radius value in action</p>
    </td>
    <td width="50%">
      <h3>🌙 Dark Mode</h3>
      <p>Built-in light/dark theme toggle with smooth transitions</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📋 Copy-to-Clipboard</h3>
      <p>Click any token to copy its value instantly with visual feedback</p>
    </td>
    <td width="50%">
      <h3>🔍 Search & Filter</h3>
      <p>Quickly find tokens with real-time search</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📱 Fully Responsive</h3>
      <p>Works beautifully on any screen size, from mobile to 4K displays</p>
    </td>
    <td width="50%">
      <h3>🔌 Zero Config</h3>
      <p>Just pass your tokens.json and go - no complex setup required</p>
    </td>
  </tr>
</table>

## 🚀 Quick Start

### Installation

```bash
npm install @nibin-org/tokens
# or
yarn add @nibin-org/tokens
# or
pnpm add @nibin-org/tokens
```

### Basic Usage

```tsx
import { TokenDocumentation } from '@nibin-org/tokens';
import '@nibin-org/tokens/styles.css';
import tokens from './tokens.json';

export default function DesignTokensPage() {
  return (
    <TokenDocumentation 
      tokens={tokens}
      title="My Design System"
      subtitle="Design tokens synced from Figma"
    />
  );
}
```

### Next.js Setup (Required)

For Next.js projects, add the package to `transpilePackages` in `next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nibin-org/tokens'],
};

export default nextConfig;
```

> **💡 Tip**: If you experience issues with Next.js 16+ Turbopack during local development with linked packages, use `next dev --webpack` as a workaround.

## 📖 Complete Guide

### Token Structure

This library works seamlessly with tokens exported from [Figma Tokens Studio](https://tokens.studio/). Here's the expected structure:

```json
{
  "Colors/Value": {
    "base": {
      "blue": {
        "50": { "value": "#e6f0ff", "type": "color" },
        "100": { "value": "#cce1ff", "type": "color" },
        "500": { "value": "#1369e9", "type": "color" }
      }
    },
    "fill": {
      "primary": { "value": "{base.blue.500}", "type": "color" }
    },
    "stroke": {
      "default": { "value": "{base.gray.30}", "type": "color" }
    },
    "text": {
      "default": { "value": "{base.gray.90}", "type": "color" }
    }
  },
  "Spacing/Mode 1": {
    "space-xs": { "value": "4px", "type": "dimension" },
    "space-sm": { "value": "8px", "type": "dimension" }
  },
  "Size/Mode 1": {
    "size-sm": { "value": "12px", "type": "dimension" },
    "size-lg": { "value": "16px", "type": "dimension" }
  },
  "Radius/Mode 1": {
    "radius-sm": { "value": "4px", "type": "dimension" },
    "radius-md": { "value": "6px", "type": "dimension" }
  }
}
```

### Full API Reference

#### `<TokenDocumentation />` - Main Component

The all-in-one solution for displaying all your tokens.

```tsx
<TokenDocumentation
  tokens={tokens}              // Required: Your tokens.json content
  title="Design Tokens"        // Optional: Page title
  subtitle="v1.0.0"           // Optional: Subtitle text
  defaultTab="colors"         // Optional: Initial tab
  showSearch={true}           // Optional: Show search input
  darkMode={false}            // Optional: Start in dark mode
  onTokenClick={(token) => {  // Optional: Callback when token clicked
    console.log('Clicked:', token);
  }}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tokens` | `FigmaTokens` | **required** | Your tokens.json content |
| `title` | `string` | `"Design Tokens"` | Page title |
| `subtitle` | `string` | `"View and copy design tokens"` | Subtitle text |
| `defaultTab` | `'colors' \| 'spacing' \| 'sizes' \| 'radius'` | `'colors'` | Initial active tab |
| `showSearch` | `boolean` | `true` | Show/hide search input |
| `darkMode` | `boolean` | `false` | Start in dark mode |
| `onTokenClick` | `(token) => void` | `undefined` | Callback when token is clicked |

### Individual Components

For custom layouts, use components individually:

#### ColorGrid

```tsx
import { ColorGrid } from '@nibin-org/tokens';

<ColorGrid 
  baseColors={tokens['Colors/Value'].base}
  fillColors={tokens['Colors/Value'].fill}
  strokeColors={tokens['Colors/Value'].stroke}
  textColors={tokens['Colors/Value'].text}
  onColorClick={(color) => console.log(color)}
/>
```

#### SpacingScale

```tsx
import { SpacingScale } from '@nibin-org/tokens';

<SpacingScale 
  tokens={tokens['Spacing/Mode 1']}
  onTokenClick={(token) => console.log(token)}
/>
```

#### RadiusShowcase

```tsx
import { RadiusShowcase } from '@nibin-org/tokens';

<RadiusShowcase 
  tokens={tokens['Radius/Mode 1']}
  onTokenClick={(token) => console.log(token)}
/>
```

#### SizeScale

```tsx
import { SizeScale } from '@nibin-org/tokens';

<SizeScale 
  tokens={tokens['Size/Mode 1']}
  onTokenClick={(token) => console.log(token)}
/>
```

## 🎨 Theming & Customization

The styles use CSS custom properties, making customization simple:

```css
:root {
  /* Primary accent color */
  --ftd-accent-primary: #6366f1;
  --ftd-accent-primary-hover: #4f46e5;
  
  /* Background colors */
  --ftd-bg-canvas: #fafbfc;
  --ftd-bg-primary: #ffffff;
  --ftd-bg-secondary: #f6f8fa;
  
  /* Text colors */
  --ftd-text-primary: #0d1117;
  --ftd-text-secondary: #57606a;
  
  /* Border radius */
  --ftd-radius-lg: 16px;
  --ftd-radius-xl: 24px;
  
  /* Shadows */
  --ftd-shadow-md: 0 4px 8px rgba(0, 0, 0, 0.08);
  --ftd-shadow-glow: 0 0 24px rgba(91, 71, 251, 0.2);
  
  /* Transitions */
  --ftd-transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Dark theme */
[data-theme="dark"] {
  --ftd-bg-canvas: #0d1117;
  --ftd-bg-primary: #161b22;
  --ftd-text-primary: #e6edf3;
  /* ... customize more */
}
```

### Advanced Customization Example

```css
/* Custom gradient for your brand */
:root {
  --ftd-gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Custom card hover effect */
.ftd-token-card:hover {
  transform: translateY(-8px) rotate(2deg);
}

/* Custom color scale height */
.ftd-color-shade {
  height: 150px;
}
```

## 📊 Workflow Integration

### Figma-to-Code Pipeline

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│                 │      │                  │      │                 │
│   Figma +       │─────▶│  tokens.json    │─────▶│   CSS + Docs   │
│   Token Studio  │      │                  │      │                 │
│                 │      │                  │      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                         │                        │
   Design tokens            Export/sync              Build script
   in Figma                 via plugin               generates CSS
                                                     + visual docs
```

### Recommended Setup

1. **Design Phase**: Use [Figma Tokens Studio](https://tokens.studio/) to manage tokens in Figma
2. **Sync Phase**: Export `tokens.json` to your repo (manual or automated via GitHub sync)
3. **Build Phase**: Run your token build script to generate CSS variables
4. **Document Phase**: Use `@nibin-org/tokens` to display beautiful, interactive documentation

### Example Build Script

```js
// scripts/build-tokens.js
const fs = require('fs');
const tokens = require('./tokens.json');

// Generate CSS variables
const css = generateCSSVariables(tokens);
fs.writeFileSync('src/styles/tokens.css', css);

// Generate documentation page
const docs = `
import { TokenDocumentation } from '@nibin-org/tokens';
import tokens from '../tokens.json';

export default function TokensPage() {
  return <TokenDocumentation tokens={tokens} />;
}
`;
fs.writeFileSync('src/pages/tokens.tsx', docs);
```

## 🆚 Comparison with Style Dictionary

| Feature | Style Dictionary | @nibin-org/tokens |
|---------|-----------------|------------------|
| **Token Transformation** | ✅ Excellent | ❌ Not included |
| **Multi-platform Output** (iOS, Android, Web) | ✅ Yes | ❌ No |
| **Visual Documentation** | ❌ None | ✅ Beautiful interactive UI |
| **Interactive Exploration** | ❌ No | ✅ Click, search, copy |
| **Copy-to-Clipboard** | ❌ No | ✅ Yes |
| **Dark Mode Support** | ❌ No | ✅ Yes |
| **Real-time Search** | ❌ No | ✅ Yes |

### Use Both Together! 🤝

**Best Practice**: Use **Style Dictionary** for token transformation and multi-platform output, and **@nibin-org/tokens** for beautiful documentation.

```bash
# 1. Transform tokens with Style Dictionary
npx style-dictionary build

# 2. Document tokens with @nibin-org/tokens
# Import in your docs site
```

## 🎯 Real-World Examples

### Storybook Integration

```tsx
// .storybook/preview.tsx
import { TokenDocumentation } from '@nibin-org/tokens';
import '@nibin-org/tokens/styles.css';
import tokens from '../design-tokens/tokens.json';

export default {
  title: 'Design System/Tokens',
  component: TokenDocumentation,
};

export const AllTokens = () => (
  <TokenDocumentation 
    tokens={tokens}
    title="Design System Tokens"
    subtitle="Version 2.0 - Updated Jan 2025"
  />
);
```

### Documentation Site (Docusaurus, VitePress, etc.)

```tsx
// docs/design-tokens.tsx
import { TokenDocumentation } from '@nibin-org/tokens';
import '@nibin-org/tokens/styles.css';
import tokens from './tokens.json';

export default function DesignTokensPage() {
  return (
    <div className="container">
      <TokenDocumentation 
        tokens={tokens}
        defaultTab="colors"
        onTokenClick={(token) => {
          // Track analytics
          analytics.track('token_copied', { name: token.name });
        }}
      />
    </div>
  );
}
```

### Custom Integration

```tsx
import { 
  ColorGrid, 
  SpacingScale, 
  parseBaseColors,
  copyToClipboard 
} from '@nibin-org/tokens';
import '@nibin-org/tokens/styles.css';

function CustomTokenDocs() {
  const colorFamilies = parseBaseColors(tokens['Colors/Value'].base);
  
  return (
    <div>
      <h1>Our Brand Colors</h1>
      <ColorGrid 
        baseColors={tokens['Colors/Value'].base}
        onColorClick={(color) => {
          copyToClipboard(color.value);
          toast.success(`Copied ${color.value}`);
        }}
      />
      
      <h2>Spacing System</h2>
      <SpacingScale tokens={tokens['Spacing/Mode 1']} />
    </div>
  );
}
```

## 🛠️ Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/nibinlab99-dev/next-storybook.git
cd next-storybook/packages/tokens

# Install dependencies
npm install

# Build the package
npm run build

# Run in watch mode
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Project Structure

```
@nibin-org/tokens/
├── src/
│   ├── components/
│   │   ├── TokenDocumentation.tsx
│   │   ├── ColorGrid.tsx
│   │   ├── SpacingScale.tsx
│   │   ├── RadiusShowcase.tsx
│   │   └── SizeScale.tsx
│   ├── types.ts
│   ├── utils.ts
│   ├── index.ts
│   └── styles.css
├── dist/                    # Built files (generated)
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

### Building

The package uses [tsup](https://tsup.egoist.dev/) for fast, zero-config bundling:

```bash
npm run build
```

This generates:
- `dist/index.js` - ESM bundle
- `dist/index.cjs` - CommonJS bundle
- `dist/index.d.ts` - TypeScript definitions
- `dist/styles.css` - Compiled styles

## 📝 TypeScript Support

Full TypeScript support with comprehensive type definitions:

```tsx
import type { 
  TokenDocumentationProps,
  FigmaTokens,
  ParsedColorToken,
  ParsedSpacingToken,
  ColorFamily 
} from '@nibin-org/tokens';

const tokens: FigmaTokens = {
  'Colors/Value': {
    base: { /* ... */ }
  }
};

const handleTokenClick = (token: ParsedColorToken) => {
  console.log(token.cssVariable); // Type-safe!
};
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © [nibinlab99-dev](https://github.com/nibinlab99-dev)

See [LICENSE](LICENSE) for more information.

## 🙏 Acknowledgments

- Built with ❤️ for design systems teams
- Inspired by [Figma Tokens Studio](https://tokens.studio/)
- Compatible with [Style Dictionary](https://amzn.github.io/style-dictionary/)
- Typography powered by [DM Sans](https://fonts.google.com/specimen/DM+Sans) and [Fraunces](https://fonts.google.com/specimen/Fraunces)

## 📬 Support

- 📧 Email: support@nibin.org
- 💬 [GitHub Discussions](https://github.com/nibinlab99-dev/next-storybook/discussions)
- 🐛 [Issue Tracker](https://github.com/nibinlab99-dev/next-storybook/issues)
- 📖 [Documentation](https://docs.nibin.org)

---

<div align="center">

**[⬆ back to top](#nibin-orgtokens)**

Made with ❤️ for design systems

</div>