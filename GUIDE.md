# ❖ The Design Token Workflow using Figma

This guide explains how to set up your Figma design system to work perfectly with `@nibin-org/tokens`.

## 1. Organizing Your Tokens (The 3-Layer Method)
For the best results, organize your tokens in **Tokens Studio** into these three distinct sets/files. This structure allows our documentation engine to generate specialized visualizations.

### 🏗️ Layer 1: Foundation (The Primitives)
These are your raw values. **Do not use these directly in your designs.**
- **Sets**: `Foundation`
- **Naming Convention**: `Foundation/{Type}/{Name}`
- **Examples**:
  - `Foundation/Blue/500` -> `#3B82F6`
  - `Foundation/Spacing/4` -> `16px`
  - `Foundation/Radius/md` -> `8px`

### 🎨 Layer 2: Semantic (The Intent)
These define **how** to use the primitives. These are what designers should use.
- **Sets**: `Semantic`
- **Naming Convention**: `Semantic/{Property}/{Role}`
- **Examples**:
  - `Semantic/bg/primary` -> `{Foundation.Blue.500}`
  - `Semantic/text/danger` -> `{Foundation.Red.600}`
  - `Semantic/radius/card` -> `{Foundation.Radius.md}`

### 🧩 Layer 3: Components (The Specifics)
Overrides for specific components.
- **Sets**: `Components`
- **Naming Convention**: `Components/{Component}/{Property}`
- **Examples**:
  - `Components/Button/bg` -> `{Semantic.bg.primary}`

---

## 2. Setting Up Tokens Studio (Figma)
1.  Open **Tokens Studio for Figma** plugin.
2.  Go to **Settings**.
3.  **Token Format**: Ensure you select **W3C Design Token Format (DTCG)** if possible, or standard JSON.
4.  **Base Pixel Size**: Set to `16` (standard) so `rem` conversions work correctly.

---

## 3. Syncing with GitHub
Automate the handoff so developers always have the latest tokens.

1.  In Tokens Studio, click the **Settings (Gear)** icon > **Providers**.
2.  Choose **GitHub**.
3.  **Add New Credentials**:
    - **Name**: `Design System Repo`
    - **Personal Access Token**: Create a GitHub Classic Token with `repo` scope.
    - **Repository**: `your-org/your-repo` (e.g., `nibin-org/tokens`)
    - **Branch**: `main` (or a dedicated `design` branch)
    - **FilePath**: `tokens.json` (or `src/tokens.json`)
4.  Click **Save** and then **Push** to upload your initial tokens.

---

## 4. Using in Your Project
Once `tokens.json` is in your repo, usage is simple:

```tsx
// src/app/page.tsx
import { TokenDocumentation } from '@nibin-org/tokens';
import '@nibin-org/tokens/styles.css';

// Import the JSON file synced from Figma
import tokens from '../tokens.json'; 

export default function DesignSystem() {
  return <TokenDocumentation tokens={tokens} />;
}
```

## 5. Automation (Optional)
You can set up a **GitHub Action** to automatically publish a new NPM version whenever `tokens.json` is updated by the design team.

*(Create a `.github/workflows/publish-tokens.yml` file in your repo for this)*.
