# @nibin-org/tokens

<div align="center">

![npm version](https://img.shields.io/badge/version-1.13.2-5b47fb?style=for-the-badge&colorA=000000)
![npm downloads](https://img.shields.io/npm/dm/@nibin-org/tokens.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)

**The most "loveable" way to document and use your design tokens.**

[Demo](https://nibin-org.github.io/tokens/) · [Issues](https://github.com/nibin-org/tokens/issues)

</div>

---

## 📚 Workflow Guide
**New to Design Tokens?** Learn how to set up Figma, Token Studio, and GitHub Sync in our **[Design Token Workflow Guide](./GUIDE.md)**.

---

## 💎 Best in Segment Features

- 🔍 **Global Search** - `Cmd+K` to find any token across Foundation, Semantic, or Components instantly.
- 📤 **Code Export** - Generate and download **CSS**, **SCSS**, **JS**, or **Tailwind** configs directly from the UI.
- 🎨 **Smart Visualization** - Interactive color palettes, spacing scales, and component previews that feel premium.
- 🧠 **Alias Resolution** - Intelligent engine that resolves Figma Token Studio aliases into production-ready code.
- 🌙 **Adaptive Themes** - Seamless dark and light mode support out of the box.
- 📦 **Ultra Lightweight** - Zero external dependencies.

---

## 🚀 Quick Start

### Installation

```bash
npm install @nibin-org/tokens
```

### Usage

```tsx
import { TokenDocumentation } from '@nibin-org/tokens';
import '@nibin-org/tokens/styles.css';
import tokens from './tokens.json';

function App() {
  return <TokenDocumentation tokens={tokens} />;
}
```

---

## 🧩 Standalone Components

Want to build a custom layout? You can use our **Standalone Components** to render specific token categories anywhere. They automatically find the relevant data in your `tokens.json`.

```tsx
import { Colors, Spacing, Radius, Sizes } from '@nibin-org/tokens';

function CustomDocs() {
  return (
    <div>
      <Colors tokens={tokens} title="Brand Colors" />
      <Spacing tokens={tokens} title="Layout Spacing" />
      <Radius tokens={tokens} title="Corner Styles" />
    </div>
  );
}
```

---

## 🏗️ Mastering Tokens

`@nibin-org/tokens` is designed to work seamlessly with [Figma Tokens Studio](https://tokens.studio/) (W3C Design Token format). 

### 1. The Three-Layer Architecture

For the best experience, structure your tokens into these three categories. This allows our documentation engine to provide specialized visualizations (like color families and component tables).

| Layer | Purpose | Formatting Pattern |
|-------|---------|------------------|
| **Foundation** | Base values (colors, spacing, sizes) | `Foundation/Value` > `base` |
| **Semantic** | Intent-based tokens (fill-primary, text-danger) | `Semantic/Value` |
| **Components**| Component-specific tokens (button, input) | `Components/Mode 1` (or any name starting with `Components/`) |

### 2. Supported Token Types

We provide specialized visualizations for:
- `color`: Interactive cards with Hex, RGB, and Contrast info.
- `dimension` / `spacing` / `sizing`: Visual scale bars and pixel values.
- `borderRadius`: Interactive corner previews.
- `typography` (Coming Soon): Font family and style previews.

### 3. Smart Aliasing

We support the `{category.item.value}` syntax for token aliasing. Our **Export Engine** automatically resolves these for you:

```json
// tokens.json
{
  "Foundation/Value": {
    "base": {
      "blue": { "50": { "value": "#3b82f6", "type": "color" } }
    }
  },
  "Semantic/Value": {
    "fill": {
      "primary": { "value": "{base.blue.50}", "type": "color" } 
    }
  }
}
```

---

## 🔎 Advanced Documentation

### Global Search
Access the global search anywhere with **`Cmd+K`** (Mac) or **`Ctrl+K`** (Windows).
- Fuzzy matching finds tokens by name, hex value, or CSS variable.
- Keyboard navigation (Arrows + Enter) for a high-speed workflow.

### Code Export
Generate production-ready code in seconds:
- **CSS**: Standard CSS variables with proper headers.
- **SCSS**: Linked variables and a comprehensive `$tokens` map.
- **Tailwind**: A ready-to-paste `theme.extend` object.
- **JavaScript**: Clean object structures for runtime use.

---

## 🛠️ API Reference

### `<TokenDocumentation />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tokens` | `FigmaTokens` | **Required** | The JSON object exported from Tokens Studio. |
| `title` | `string` | `"Design Tokens"` | The main title in the header. |
| `subtitle` | `string` | `"View and copy design tokens"` | The subtitle/version text. |
| `onTokenClick` | `(token) => void` | `null` | Callback for custom token interaction logic. |
| `darkMode` | `boolean` | `false` | Initial theme state. |

---

## 💻 Development

```bash
# Clone the repository
git clone https://github.com/nibin-org/tokens.git

# Install and build the core package
npm install
npm run build

# Run the local demo playground
cd demo
npm install
npm run dev
```

---

## 📄 License
MIT © [nibin-org](https://github.com/nibin-org)
