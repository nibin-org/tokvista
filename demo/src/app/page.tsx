'use client'

import { TokenDocumentation } from '@nibin-org/tokens'
import '@nibin-org/tokens/styles.css'

// Sample tokens data
const sampleTokens = {
  "Colors/Value": {
    "base": {
      "blue": {
        "50": { "value": "#e6f0ff", "type": "color" },
        "100": { "value": "#cce1ff", "type": "color" },
        "200": { "value": "#99c3ff", "type": "color" },
        "300": { "value": "#66a5ff", "type": "color" },
        "400": { "value": "#3387ff", "type": "color" },
        "500": { "value": "#1369e9", "type": "color" },
        "600": { "value": "#0f54ba", "type": "color" },
        "700": { "value": "#0b3f8b", "type": "color" },
        "800": { "value": "#072a5c", "type": "color" },
        "900": { "value": "#03152d", "type": "color" }
      },
      "gray": {
        "10": { "value": "#fafbfc", "type": "color" },
        "20": { "value": "#f6f8fa", "type": "color" },
        "30": { "value": "#d0d7de", "type": "color" },
        "40": { "value": "#afb8c1", "type": "color" },
        "50": { "value": "#8c959f", "type": "color" },
        "60": { "value": "#6e7781", "type": "color" },
        "70": { "value": "#57606a", "type": "color" },
        "80": { "value": "#424a53", "type": "color" },
        "90": { "value": "#32383f", "type": "color" },
        "100": { "value": "#24292f", "type": "color" }
      }
    },
    "fill": {
      "primary": { "value": "{base.blue.500}", "type": "color" },
      "secondary": { "value": "{base.gray.20}", "type": "color" },
      "success": { "value": "#28a745", "type": "color" },
      "warning": { "value": "#ffc107", "type": "color" },
      "danger": { "value": "#dc3545", "type": "color" }
    },
    "stroke": {
      "default": { "value": "{base.gray.30}", "type": "color" },
      "subtle": { "value": "{base.gray.20}", "type": "color" },
      "strong": { "value": "{base.gray.60}", "type": "color" }
    },
    "text": {
      "default": { "value": "{base.gray.90}", "type": "color" },
      "muted": { "value": "{base.gray.70}", "type": "color" },
      "subtle": { "value": "{base.gray.60}", "type": "color" },
      "inverse": { "value": "#ffffff", "type": "color" }
    }
  },
  "Spacing/Mode 1": {
    "space-xs": { "value": "4px", "type": "dimension" },
    "space-sm": { "value": "8px", "type": "dimension" },
    "space-md": { "value": "16px", "type": "dimension" },
    "space-lg": { "value": "24px", "type": "dimension" },
    "space-xl": { "value": "32px", "type": "dimension" },
    "space-2xl": { "value": "48px", "type": "dimension" },
    "space-3xl": { "value": "64px", "type": "dimension" }
  },
  "Size/Mode 1": {
    "size-xs": { "value": "12px", "type": "dimension" },
    "size-sm": { "value": "14px", "type": "dimension" },
    "size-md": { "value": "16px", "type": "dimension" },
    "size-lg": { "value": "18px", "type": "dimension" },
    "size-xl": { "value": "20px", "type": "dimension" },
    "size-2xl": { "value": "24px", "type": "dimension" },
    "size-3xl": { "value": "32px", "type": "dimension" }
  },
  "Radius/Mode 1": {
    "radius-none": { "value": "0px", "type": "dimension" },
    "radius-sm": { "value": "4px", "type": "dimension" },
    "radius-md": { "value": "6px", "type": "dimension" },
    "radius-lg": { "value": "8px", "type": "dimension" },
    "radius-xl": { "value": "12px", "type": "dimension" },
    "radius-2xl": { "value": "16px", "type": "dimension" },
    "radius-full": { "value": "9999px", "type": "dimension" }
  }
}

export default function Home() {
  return (
    <main>
      <TokenDocumentation 
        tokens={sampleTokens}
        title="@nibin-org/tokens Demo"
        subtitle="Interactive design tokens documentation"
        onTokenClick={(token) => {
          console.log('Token clicked:', token)
        }}
      />
    </main>
  )
}