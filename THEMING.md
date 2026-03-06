# Theming Guide

Tokvista now supports custom brand colors and dark/light mode switching.

## Quick Start

### Enable Dark/Light Mode Toggle

```tsx
import { TokenDocumentation } from 'tokvista';
import 'tokvista/styles.css';
import tokens from './tokens.json';

export default function DesignSystem() {
  return (
    <TokenDocumentation 
      tokens={tokens}
      theme={{
        enableModeToggle: true, // Shows theme toggle button (default: true)
      }}
    />
  );
}
```

### Set Default Theme Mode

```tsx
<TokenDocumentation 
  tokens={tokens}
  theme={{
    mode: 'light', // or 'dark' (default: 'dark')
  }}
/>
```

### Custom Brand Colors

Override the default colors to match your brand:

```tsx
<TokenDocumentation 
  tokens={tokens}
  theme={{
    colors: {
      primary: '#FF6B6B',        // Your brand color
      background: '#1A1A1A',     // Page background
      surface: '#2D2D2D',        // Card/panel background
      border: '#404040',         // Border color
      text: '#FFFFFF',           // Primary text
      textSecondary: '#A0A0A0',  // Secondary text
    },
  }}
/>
```

### Complete Example

```tsx
import { TokenDocumentation } from 'tokvista';
import 'tokvista/styles.css';
import tokens from './tokens.json';

export default function DesignSystem() {
  return (
    <TokenDocumentation 
      tokens={tokens}
      title="Acme Design System"
      subtitle="Our design tokens"
      theme={{
        mode: 'light',
        enableModeToggle: true,
        colors: {
          primary: '#6366F1',      // Indigo
          background: '#FFFFFF',
          surface: '#F9FAFB',
          border: '#E5E7EB',
          text: '#111827',
          textSecondary: '#6B7280',
        },
      }}
    />
  );
}
```

## Theme Configuration

### ThemeConfig Interface

```typescript
interface ThemeConfig {
  mode?: 'light' | 'dark';           // Default theme mode
  enableModeToggle?: boolean;         // Show/hide toggle button (default: true)
  colors?: {
    primary?: string;                 // Brand/accent color
    background?: string;              // Page background
    surface?: string;                 // Card/panel background
    border?: string;                  // Border color
    text?: string;                    // Primary text color
    textSecondary?: string;           // Secondary text color
  };
}
```

## Default Colors

### Dark Mode (Default)
- Primary: `#D4A84B` (Gold)
- Background: `#141210`
- Surface: `#1C1A17`
- Border: `#2E2B23`
- Text: `#F0EBE3`
- Text Secondary: `#9C9487`

### Light Mode
- Primary: `#3B82F6` (Blue)
- Background: `#FFFFFF`
- Surface: `#F9FAFB`
- Border: `#E5E7EB`
- Text: `#111827`
- Text Secondary: `#6B7280`

## User Preferences

Theme preferences are automatically saved to localStorage:
- Theme mode (light/dark) persists across sessions
- Users can toggle between modes using the button in the header
- Custom colors are applied on top of the selected mode

## Advanced: CSS Variables

You can also override theme colors using CSS variables:

```css
:root {
  --ftd-primary: #FF6B6B;
  --ftd-bg-page: #1A1A1A;
  --ftd-bg-card: #2D2D2D;
  --ftd-border: #404040;
  --ftd-text-main: #FFFFFF;
  --ftd-text-sub: #A0A0A0;
}
```

This approach works for both programmatic and CSS-based theming.
