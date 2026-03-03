# Tokvista

<div align="center">

![npm version](https://img.shields.io/npm/v/tokvista?style=for-the-badge&colorA=000000&colorB=5b47fb)
![npm downloads](https://img.shields.io/npm/dm/tokvista.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&colorA=000000&colorB=5b47fb)

**The visual layer for your design system.**

Visualize colors, spacing, typography, and component tokens with zero configuration.

[Live Demo](https://tokvista-demo.vercel.app/) · [Figma Setup Guide](./GUIDE.md) · [Report Issue](https://github.com/nibin-org/tokvista/issues)

</div>

---

## Why This Package

Design token documentation is often static and hard to scan. **Tokvista** gives you:

- Beautiful visuals for colors, spacing, sizes, radius, and typography
- **Global format selector** - Switch between CSS Variables, SCSS, and Tailwind formats
- Instant search with `Cmd+K` / `Ctrl+K`
- One-click copy with format-aware variable names
- Semantic + component token views with aliases resolved
- Generic **All Tokens** view for non-standard JSON structures
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

### Try with a Sample `tokens.json`

You can copy this into a local `tokens.json` file and run Tokvista immediately:

```json
{
  "Foundation/Value": {
    "base": {
      "color": {
        "blue": {
          "500": { "value": "#2563EB", "type": "color" },
          "600": { "value": "#1D4ED8", "type": "color" }
        },
        "gray": {
          "100": { "value": "#F3F4F6", "type": "color" },
          "900": { "value": "#111827", "type": "color" }
        }
      },
      "space": {
        "xs": { "value": "4px", "type": "spacing" },
        "sm": { "value": "8px", "type": "spacing" },
        "md": { "value": "16px", "type": "spacing" }
      },
      "size": {
        "md": { "value": "40px", "type": "sizing" },
        "lg": { "value": "48px", "type": "sizing" }
      },
      "radius": {
        "sm": { "value": "6px", "type": "borderRadius" },
        "md": { "value": "10px", "type": "borderRadius" }
      },
      "font-size": {
        "sm": { "value": "12px", "type": "fontSize" },
        "md": { "value": "14px", "type": "fontSize" }
      }
    }
  },
  "Semantic/Value": {
    "fill": {
      "primary": { "value": "{base.color.blue.500}", "type": "color" },
      "surface": { "value": "{base.color.gray.100}", "type": "color" }
    },
    "stroke": {
      "primary": { "value": "{base.color.blue.600}", "type": "color" }
    },
    "text": {
      "primary": { "value": "{base.color.gray.900}", "type": "color" },
      "inverse": { "value": "#FFFFFF", "type": "color" }
    }
  },
  "Components/Mode 1": {
    "button": {
      "Primary": {
        "fill": { "value": "#2563EB", "type": "color" },
        "text": { "value": "#FFFFFF", "type": "color" },
        "stroke": { "value": "#1D4ED8", "type": "color" }
      },
      "height": {
        "md": { "value": "40px", "type": "dimension" }
      },
      "padding-x": {
        "md": { "value": "16px", "type": "dimension" }
      },
      "padding-y": {
        "md": { "value": "10px", "type": "dimension" }
      },
      "radius": {
        "md": { "value": "10px", "type": "dimension" }
      },
      "font-size": {
        "md": { "value": "14px", "type": "dimension" }
      },
      "line-height": {
        "md": { "value": "20px", "type": "dimension" }
      }
    }
  }
}

```

If you're contributing in this repository, a larger real-world sample is available at `tokens.json`.
For package users, run Tokvista with your own exported `tokens.json` file.


---

## What You Get

### Global Format Selector
Switch between CSS Variables (`var(--token)`), SCSS Variables (`$token`), and Tailwind Classes (`token`) with a single click. Your preference is saved and applied across all token displays and copy operations.

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

### All Tokens (Any JSON Shape)
Even when your file does not follow `Foundation/Value` or `Semantic/Value`, Tokvista now shows every token path/value/type in the **All Tokens** tab.

---

## Demo

Live demo: https://tokvista-demo.vercel.app/

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
| `snapshotHistory` | `SnapshotHistoryOptions` | `undefined` | Enable built-in snapshot history panel. Use `accessMode: "preview"` for locked teaser mode and `"full"` for full access. |

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

### Snapshot History

```tsx
<TokenDocumentation
  tokens={tokens}
  snapshotHistory={{
    enabled: true,
    accessMode: 'full', // or 'preview'
    historyEndpoint: 'https://your-relay.example.com/version-history?...',
    sourceUrl: 'https://raw.githubusercontent.com/org/repo/main/tokens.json',
  }}
/>
```

---

## Search and Copy

- Search across token names and values with `Cmd+K` / `Ctrl+K`
- Keyboard navigation with Enter to focus
- **Format-aware copying** - Choose between CSS Variables, SCSS, or Tailwind
- Variable names display in your selected format
- Preference persists across sessions

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

- [Live Demo](https://tokvista-demo.vercel.app/)
- [Figma Setup Guide](./GUIDE.md)
- [GitHub Repository](https://github.com/nibin-org/tokvista)
- [Issue Tracker](https://github.com/nibin-org/tokvista/issues)

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT © [nibin-org](https://github.com/nibin-org)
