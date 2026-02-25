# Tokvista

<div align="center">

![npm version](https://img.shields.io/npm/v/tokvista?style=for-the-badge&colorA=000000&colorB=5b47fb)
![npm downloads](https://img.shields.io/npm/dm/tokvista.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)

**The visual layer for your design system.**

Visualize colors, spacing, typography, and component tokens with zero configuration.

[Live Demo](https://nibin-org.github.io/tokvista/) · [Figma Setup Guide](./GUIDE.md) · [Report Issue](https://github.com/nibin-org/tokvista/issues)

</div>

---

## Why This Package

Design token documentation is often static and hard to scan. **Tokvista** gives you:

- Beautiful visuals for colors, spacing, sizes, radius, and typography
- Instant search with `Cmd+K` / `Ctrl+K`
- Copy-ready CSS variables and resolved values
- Semantic + component token views with aliases resolved
- Built-in dark mode
- Interactive playground for previews
- Two usage modes: zero-setup CLI and React component library

---

## Quick Start

### Option A: CLI (No React Setup)

```bash
npx tokvista tokens.json
```

Optional flags:

```bash
npx tokvista ./tokens.json --port 4000 --no-open
```

### Option B: React Component Library

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

### CLI Options

- `tokvista [tokens.json]` - Token file path (default: `./tokens.json`)
- `--port` / `-p` - Preferred port (default: `3000`)
- `--no-open` - Do not auto-open browser
- `--help` / `-h` - Show help
- `Ctrl+C` - Stop the local server


---

## What You Get

### Foundation Tokens
Visualize base tokens like colors, spacing, sizes, radius, and typography.

### Semantic Tokens
Show intent-based tokens with resolved values and quick copy.

### Component Tokens
Document component overrides with clean visual grouping.

### Code Export
Export CSS, SCSS, JavaScript, or Tailwind config with high‑contrast syntax highlighting.

### Playground
Preview components using your tokens and custom class names.

---

## Demo

Live demo: https://nibin-org.github.io/tokvista/

Run it locally: see Local Development below.

---

## Token Structure (Recommended)

### Foundation
```json
{
  "Foundation/Value": {
    "base": {
      "blue": { "500": { "value": "#3B82F6", "type": "color" } }
    }
  }
}
```

### Semantic
```json
{
  "Semantic/Value": {
    "fill": {
      "primary": { "value": "{base.blue.500}", "type": "color" }
    }
  }
}
```

### Components
```json
{
  "Components/Mode 1": {
    "button": {
      "bg": { "value": "{Semantic.fill.primary}", "type": "color" }
    }
  }
}
```

Need a full setup guide? See **[GUIDE.md](./GUIDE.md)**.

---

## API Reference

### `TokenDocumentation`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tokens` | `FigmaTokens` | Required | Tokens object (W3C format or Token Studio) |
| `title` | `string` | `"Design Tokens"` | Main header title |
| `subtitle` | `string` | `"View and copy design tokens"` | Subtitle text |
| `darkMode` | `boolean` | `false` | Initial theme state |
| `fontFamilySans` | `string` | `undefined` | Override the UI sans font-family (CSS value). Load the font in your app. |
| `fontFamilyMono` | `string` | `undefined` | Override the UI mono font-family (CSS value). Load the font in your app. |
| `loadDefaultFonts` | `boolean` | `true` | When `true`, loads Inter + JetBrains Mono from Google Fonts. Set `false` to use only your app fonts. |
| `onTokenClick` | `(token) => void` | `undefined` | Callback when a token is clicked |

### Custom Fonts

You can use your app's fonts by disabling the default fonts and passing your own font-family values.

```tsx
<TokenDocumentation
  tokens={tokens}
  loadDefaultFonts={false}
  fontFamilySans="'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  fontFamilyMono="'Fira Code', ui-monospace, 'SF Mono', Consolas, monospace"
/>
```

### Standalone Components

Use these to build custom layouts:

- `Colors`
- `Spacing`
- `Sizes`
- `Radius`
- `Typography`

Each accepts `tokens` and optional `title`.

---

## Search and Copy

- Search across token names and values
- Keyboard navigation with Enter to focus
- Copy action returns `var(--token)` when available

---

## Production Ready

- Standalone CLI via `npx tokvista tokens.json`
- ESM and CJS builds
- Typed exports
- CSS delivered as a single file
- React support via `TokenDocumentation` component
- Compatible with modern React and Next.js

---

## Local Development

```bash
# root package
npm install
npm run build
node dist/bin/tokvista.js ../tokens.json --port 4000

# demo app
cd demo
npm install
npm run dev
```

CLI defaults to `http://localhost:3000` and demo dev runs at `http://localhost:3000/`, so use a custom CLI port (for example `4000`) when running both.
Note: production demo is served under `/tokvista/`.

---

## Resources

- [Live Demo](https://nibin-org.github.io/tokvista/)
- [Figma Setup Guide](./GUIDE.md)
- [GitHub Repository](https://github.com/nibin-org/tokvista)
- [Issue Tracker](https://github.com/nibin-org/tokvista/issues)

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT © [nibin-org](https://github.com/nibin-org)
