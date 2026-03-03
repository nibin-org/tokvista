# ❖ The Design Token Workflow using Figma

This guide explains how to set up your Figma design system to work perfectly with `tokvista`. Follow each step carefully to export your Figma variables and visualize them with Tokvista.

---

## Prerequisites

- **Tokvista Figma Plugin** installed from Figma Community
- Figma file with variables set up
- (Optional) A GitHub repository to store your `tokens.json`

---

## 1. Setting Up Figma Variables

Before using the Tokvista plugin, organize your design tokens as Figma variables. For best results, use a structured approach:

### Recommended Structure

**Foundation Variables** (Primitives)
- Colors: `blue/500`, `gray/100`, etc.
- Spacing: `space/xs`, `space/sm`, `space/md`
- Sizing: `size/sm`, `size/md`, `size/lg`
- Border Radius: `radius/sm`, `radius/md`
- Typography: `font-size/sm`, `font-size/md`

**Semantic Variables** (Intent-based)
- `fill/primary` → references `blue/500`
- `text/primary` → references `gray/900`
- `surface/default` → references `gray/100`

**Component Variables** (Component-specific)
- `button/primary/bg` → references `fill/primary`
- `button/primary/text` → references `text/inverse`

---

## 2. Using the Tokvista Plugin

### Step 2.1: Install the Plugin

1. In Figma, go to **Plugins** → **Find more plugins**
2. Search for "**Tokvista**"
3. Click **Install** or **Run** if already installed

### Step 2.2: Sync and Export

The plugin provides two main workflows:

**A. Export to File**
1. Click **Sync** to load your Figma variables
2. Review tokens in the visual preview
3. Click **Download** and choose your format:
   - `tokens.json` — W3C design token format
   - CSS Variables — `:root { --token: value }`
   - SCSS Variables — `$token: value`
   - Tailwind Config — `theme.extend`

**B. Publish to Repository**
1. Configure sync provider (GitHub or Relay URL)
2. Click **Sync** to load variables
3. Review changes in the **Changes** tab
4. Click **Publish** to push directly to your repository
5. **Get instant preview URL** - Share a live view of your tokens with your team

> **Tip:** Preview URLs are great for quick sharing. For full features (search, copy, export), install the Tokvista package in your project.

### What Gets Exported

The plugin exports Figma variables in W3C-compatible format:

```json
{
  "$schemaVersion": "1.0.0",
  "$format": "tokvista-plugin-v1",
  "tokens": {
    "color": {
      "brand": {
        "primary": { "type": "color", "value": "#3b82f6" }
      }
    },
    "spacing": {
      "sm": { "type": "number", "value": 8 }
    }
  }
}
```

**Supported Token Types:**
- Colors → Figma color variables
- Numbers (spacing, sizing, radius) → Figma number variables
- Typography, shadows, borders → Figma string variables (JSON)
- Aliases → Figma variable aliases (references)

### Step 2.3: Import Tokens

You can also import tokens back into Figma:

1. Switch to the **Import** tab
2. Drop a `tokens.json` file or paste a URL
3. Click **Import to Figma**
4. The plugin creates/updates variables in the "Tokvista" collection

---

## 3. Using Your Tokens

Once you have the `tokens.json` file, visualize it with Tokvista:

### Option A: Zero-Setup CLI

Run directly from your project folder:

```bash
npx tokvista tokens.json
```

Optional flags:

```bash
npx tokvista tokens.json --port 4000 --no-open
```

### Option B: React / Next.js Component

```tsx
import { TokenDocumentation } from 'tokvista';
import 'tokvista/styles.css';
import tokens from './tokens.json';

export default function DesignSystem() {
  return <TokenDocumentation tokens={tokens} />;
}
```

---

## 4. Keeping Tokens in Sync

### Option A: GitHub Direct Publish

Publish tokens directly to GitHub from Figma:

1. In the plugin **Settings** tab, choose **GitHub** as sync provider
2. Enter your repository details:
   - **Personal Access Token** (with Contents read/write permission)
   - **Repository** in `owner/repo` format
   - **Branch** (default: `main`)
   - **Token file path** (default: `tokens.json`)
3. Click **Save settings**
4. Click **Publish** to push changes directly to GitHub
5. **Instant preview URL** - Plugin generates a live Tokvista link automatically

**Benefits:**
- No manual export/commit workflow
- Automatic change detection
- Version history in GitHub
- Commit messages for each publish
- **Live preview URL generated instantly** - Share with your team immediately

### Option B: Relay URL (Advanced)

Use a backend relay for team workflows:

1. Deploy the relay server (Vercel or local)
2. Configure environment variables:
   ```bash
   TOKVISTA_GITHUB_TOKEN=your_token
   TOKVISTA_PROJECTS='{"project-alpha":{"publishKey":"secret","owner":"org","repo":"repo","branch":"main","path":"tokens.json"}}'
   ```
3. In plugin settings, enter:
   - **API URL**: `https://your-app.vercel.app/api`
   - **Project name**: `project-alpha`
   - **Publish key**: (from environment config)
4. Click **Publish** to sync through relay
5. **Live preview URL** - Relay returns shareable Tokvista link

**Benefits:**
- Centralized token management
- Multi-project routing
- No token storage in Figma
- Team access control
- **Instant preview URLs** for all team members

### Option C: Manual Export

1. Click **Sync** in the plugin
2. Click **Download** → choose format
3. Save file to your repository
4. Commit and push manually

---

## 5. Plugin Features

### In-Plugin Preview
- **Visual Mode** - Color swatches, spacing bars, typography samples
- **Table Mode** - Structured token list with types and values
- **JSON Mode** - Raw token data with syntax highlighting
- **Layer Filters** - View tokens by collection (Foundation, Semantic, Components)

### Export Formats
- **tokens.json** - W3C design token format
- **CSS Variables** - `:root { --token: value }`
- **SCSS Variables** - `$token: value`
- **Tailwind Config** - `theme.extend` object

### Change Tracking
- **Changes Tab** - See added, changed, and removed tokens
- **Publish History** - View past publishes with change logs
- **Snapshot Links** - Generate preview URLs for QA

### Developer Preview
- **Live Preview Link** - Automatically generated after publish for quick token viewing
- **Snapshot URLs** - Point-in-time token previews for each publish version
- **One-Click Open & Copy** - Preview link opens in browser and copies to clipboard
- **QA-Ready URLs** - Share specific token versions for design review

> **Note:** Live preview URLs show a read-only view of your tokens. For full features like search, format switching, and code export, install the Tokvista package in your project.

## 6. Full Features with Tokvista Package

The live preview URLs from the plugin provide quick token viewing. For the complete experience, install Tokvista in your project:

### What You Get with Full Installation

✅ **Global Format Selector** - Switch between CSS Variables, SCSS, and Tailwind
✅ **Instant Search** - Find tokens quickly with `Cmd+K` / `Ctrl+K`
✅ **One-Click Copy** - Copy tokens in your preferred format
✅ **Code Export** - Export as CSS, SCSS, JavaScript, or Tailwind config
✅ **Dark Mode** - Built-in theme switching
✅ **Custom Branding** - Use your own fonts and styling
✅ **Interactive Playground** - Preview components with your tokens

### Installation

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

Or use the zero-config CLI:

```bash
npx tokvista tokens.json
```

---

## 🎉 You're All Set!

Your Figma variables are now:
- ✅ Exported from Figma using the Tokvista plugin
- ✅ Ready to visualize with Tokvista CLI or React component
- ✅ Documented with beautiful, interactive UI
- ✅ Available in multiple formats (CSS, SCSS, Tailwind)

**Next Steps:**
- Share the `tokens.json` file with your development team
- Run `npx tokvista tokens.json` for instant documentation
- Integrate `TokenDocumentation` component in your design system site
- Set up automated workflows for continuous sync
