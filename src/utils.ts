/**
 * Utility functions for parsing and processing Figma tokens
 */

import type {
  NestedTokens,
  TokenValue,
  ParsedColorToken,
  ParsedSpacingToken,
  ParsedRadiusToken,
  ParsedSizeToken,
  ColorFamily,
} from './types';

/**
 * Check if a value is a token (has value and type properties)
 */
export function isTokenValue(obj: unknown): obj is TokenValue {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'value' in obj &&
    'type' in obj
  );
}

/**
 * Parse a numeric value from a CSS dimension string
 */
export function parseNumericValue(value: string): number {
  const match = value.match(/^([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Convert a token path to a CSS variable name
 */
export function toCssVariable(path: string, prefix: string = ''): string {
  const cleanPath = path.replace(/\./g, '-').replace(/\s+/g, '-').toLowerCase();
  return prefix ? `--${prefix}-${cleanPath}` : `--${cleanPath}`;
}

/**
 * Get text color (black or white) based on background luminance
 */
export function getContrastColor(hexColor: string): 'black' | 'white' {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Handle 8-character hex (with alpha)
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Parse base color tokens into color families
 */
export function parseBaseColors(tokens: NestedTokens): ColorFamily[] {
  const families: ColorFamily[] = [];
  
  for (const [familyName, shades] of Object.entries(tokens)) {
    if (typeof shades !== 'object' || shades === null) continue;
    
    const family: ColorFamily = {
      name: familyName,
      primaryColor: '',
      shades: [],
    };
    
    for (const [shadeName, token] of Object.entries(shades as NestedTokens)) {
      if (isTokenValue(token)) {
        const colorToken: ParsedColorToken = {
          name: `${familyName}-${shadeName}`,
          value: token.value,
          cssVariable: `--base-${familyName}-${shadeName}`,
          shade: shadeName,
          family: familyName,
        };
        family.shades.push(colorToken);
        
        // Use shade 50 as primary color
        if (shadeName === '50') {
          family.primaryColor = token.value;
        }
      }
    }
    
    // Sort shades numerically
    family.shades.sort((a, b) => {
      const aNum = parseInt(a.shade || '0');
      const bNum = parseInt(b.shade || '0');
      return aNum - bNum;
    });
    
    // If no shade 50, use first available shade as primary
    if (!family.primaryColor && family.shades.length > 0) {
      family.primaryColor = family.shades[Math.floor(family.shades.length / 2)]?.value || '';
    }
    
    if (family.shades.length > 0) {
      families.push(family);
    }
  }
  
  return families;
}

/**
 * Parse semantic color tokens (fill, stroke, text)
 */
export function parseSemanticColors(tokens: NestedTokens, prefix: string): ParsedColorToken[] {
  const colors: ParsedColorToken[] = [];
  
  for (const [name, token] of Object.entries(tokens)) {
    if (isTokenValue(token)) {
      // Resolve alias if present
      let value = token.value;
      if (value.startsWith('{') && value.endsWith('}')) {
        // Keep the alias reference for display purposes
        value = token.value;
      }
      
      colors.push({
        name,
        value,
        cssVariable: `--${prefix}-${name}`,
      });
    }
  }
  
  return colors;
}

/**
 * Parse spacing tokens
 */
export function parseSpacingTokens(tokens: NestedTokens): ParsedSpacingToken[] {
  const spacings: ParsedSpacingToken[] = [];
  
  for (const [name, token] of Object.entries(tokens)) {
    if (isTokenValue(token)) {
      const cleanName = name.replace(/^space-/, '');
      spacings.push({
        name: cleanName,
        value: token.value,
        cssVariable: `--space-${cleanName}`,
        numericValue: parseNumericValue(token.value),
      });
    }
  }
  
  // Sort by numeric value
  return spacings.sort((a, b) => a.numericValue - b.numericValue);
}

/**
 * Parse radius tokens
 */
export function parseRadiusTokens(tokens: NestedTokens): ParsedRadiusToken[] {
  const radiuses: ParsedRadiusToken[] = [];
  
  for (const [name, token] of Object.entries(tokens)) {
    if (isTokenValue(token)) {
      const cleanName = name.replace(/^radius-/, '');
      radiuses.push({
        name: cleanName,
        value: token.value,
        cssVariable: `--radius-${cleanName}`,
        numericValue: parseNumericValue(token.value),
      });
    }
  }
  
  return radiuses.sort((a, b) => a.numericValue - b.numericValue);
}

/**
 * Parse size tokens
 */
export function parseSizeTokens(tokens: NestedTokens): ParsedSizeToken[] {
  const sizes: ParsedSizeToken[] = [];
  
  for (const [name, token] of Object.entries(tokens)) {
    if (isTokenValue(token)) {
      const cleanName = name.replace(/^size-/, '');
      sizes.push({
        name: cleanName,
        value: token.value,
        cssVariable: `--size-${cleanName}`,
        numericValue: parseNumericValue(token.value),
      });
    }
  }
  
  return sizes.sort((a, b) => a.numericValue - b.numericValue);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
