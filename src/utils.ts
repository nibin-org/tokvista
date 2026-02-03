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
  if (typeof value !== 'string') return typeof value === 'number' ? value : 0;
  const match = value.match(/^(-?[\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Convert a token path to a CSS variable name
 */
export function toCssVariable(path: string, prefix: string = ''): string {
  const cleanPath = path.replace(/\//g, '-').replace(/\./g, '-').replace(/\s+/g, '-').toLowerCase();
  return prefix ? `--${prefix}-${cleanPath}` : `--${cleanPath}`;
}

/**
 * Get text color (black or white) based on background luminance
 */
export function getContrastColor(hexColor: string): 'black' | 'white' {
  if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) return 'black';
  
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Handle 3-character hex
  let fullHex = hex;
  if (hex.length === 3) {
    fullHex = hex.split('').map(char => char + char).join('');
  }
  
  // Handle 8-character hex (with alpha) - just take first 6
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Recursively find all tokens in a nested object
 */
export function findAllTokens(obj: any, path: string[] = []): Array<{ path: string; token: TokenValue }> {
  const tokens: Array<{ path: string; token: TokenValue }> = [];

  if (!obj || typeof obj !== 'object') return tokens;

  if (isTokenValue(obj)) {
    tokens.push({ path: path.join('.'), token: obj });
    return tokens;
  }

  for (const [key, value] of Object.entries(obj)) {
    tokens.push(...findAllTokens(value, [...path, key]));
  }

  return tokens;
}

/**
 * Create a map of token paths to values for resolution
 */
export function createTokenMap(tokens: any): Record<string, string> {
  const map: Record<string, string> = {};
  
  // Scan all top-level keys except metadata
  Object.entries(tokens).forEach(([setKey, setData]) => {
    if (['global', '$themes', '$metadata'].includes(setKey)) return;
    const allTokens = findAllTokens(setData);
    allTokens.forEach(({ path, token }) => {
      map[path] = token.value;
      // Also map with setKey prefix if not already present
      map[`${setKey}.${path}`] = token.value;
    });
  });

  return map;
}

/**
 * Resolve a token value (handles aliases)
 */
export function resolveTokenValue(value: string, tokenMap: Record<string, string>, maxDepth: number = 10): string {
  if (!value || typeof value !== 'string') return value;
  
  let currentValue = value;
  let depth = 0;
  
  while (currentValue.startsWith('{') && currentValue.endsWith('}') && depth < maxDepth) {
    const refPath = currentValue.slice(1, -1);
    const resolved = tokenMap[refPath];
    
    if (resolved !== undefined) {
      currentValue = resolved;
    } else {
      // Try fuzzy match (if path in map ends with refPath)
      const entry = Object.entries(tokenMap).find(([path]) => path.endsWith(refPath));
      if (entry) {
        currentValue = entry[1];
      } else {
        break;
      }
    }
    depth++;
  }
  
  return currentValue;
}

/**
 * Parse base color tokens into color families
 */
export function parseBaseColors(tokens: NestedTokens, tokenMap: Record<string, string> = {}): ColorFamily[] {
  const families: Record<string, ColorFamily> = {};
  
  // Find all color tokens
  const allTokens = findAllTokens(tokens);
  const colorTokens = allTokens.filter(t => t.token.type === 'color');

  colorTokens.forEach(({ path, token }) => {
    const parts = path.split('.');
    // Assume family is the first part, shade is the last part
    // e.g., "blue.500" or "brand.primary.main"
    const familyName = parts.length > 1 ? parts.slice(0, -1).join('-') : 'Other';
    const shadeName = parts[parts.length - 1];

    if (!families[familyName]) {
      families[familyName] = {
        name: familyName,
        primaryColor: '',
        shades: [],
      };
    }

    const resolvedValue = resolveTokenValue(token.value, tokenMap);
    
    const colorToken: ParsedColorToken = {
      name: path,
      value: token.value,
      resolvedValue: resolvedValue,
      cssVariable: toCssVariable(path, 'base'),
      shade: shadeName,
      family: familyName,
    };

    families[familyName].shades.push(colorToken);
  });

  const familyList = Object.values(families);

  familyList.forEach(family => {
    // Sort shades numerically if possible
    family.shades.sort((a, b) => {
      const aNum = parseInt(a.shade || '0');
      const bNum = parseInt(b.shade || '0');
      if (isNaN(aNum) || isNaN(bNum)) return (a.shade || '').localeCompare(b.shade || '');
      return aNum - bNum;
    });

    // Pick 500 or middle shade as primary
    const primaryShade = family.shades.find(s => s.shade === '500' || s.shade === '50') || 
                       family.shades[Math.floor(family.shades.length / 2)];
    family.primaryColor = primaryShade?.resolvedValue || primaryShade?.value || '';
  });

  return familyList;
}

/**
 * Parse semantic color tokens (fill, stroke, text)
 */
export function parseSemanticColors(tokens: NestedTokens, prefix: string, tokenMap: Record<string, string> = {}): ParsedColorToken[] {
  const allTokens = findAllTokens(tokens);
  return allTokens
    .filter(t => t.token.type === 'color')
    .map(({ path, token }) => ({
      name: path,
      value: token.value,
      resolvedValue: resolveTokenValue(token.value, tokenMap),
      cssVariable: toCssVariable(path, prefix),
    }));
}

/**
 * Generic parser for dimension tokens
 */
function parseDimensionTokens<T>(
  tokens: NestedTokens, 
  type: string, 
  prefix: string,
  mapFn: (name: string, value: string, cssVar: string, numeric: number) => T
): T[] {
  const allTokens = findAllTokens(tokens);
  return allTokens
    .filter(t => t.token.type === type || t.token.type === 'dimension')
    .map(({ path, token }) => {
      const cleanName = path.replace(new RegExp(`^${prefix}-`, 'i'), '');
      return mapFn(
        cleanName,
        token.value,
        toCssVariable(path, prefix),
        parseNumericValue(token.value)
      );
    });
}

/**
 * Parse spacing tokens
 */
export function parseSpacingTokens(tokens: NestedTokens): ParsedSpacingToken[] {
  const result = parseDimensionTokens<ParsedSpacingToken>(
    tokens, 
    'spacing', 
    'space',
    (name, value, cssVariable, numericValue) => ({ name, value, cssVariable, numericValue })
  );
  return result.sort((a, b) => a.numericValue - b.numericValue);
}

/**
 * Parse radius tokens
 */
export function parseRadiusTokens(tokens: NestedTokens): ParsedRadiusToken[] {
  const result = parseDimensionTokens<ParsedRadiusToken>(
    tokens, 
    'borderRadius', 
    'radius',
    (name, value, cssVariable, numericValue) => ({ name, value, cssVariable, numericValue })
  );
  return result.sort((a, b) => a.numericValue - b.numericValue);
}

/**
 * Parse size tokens
 */
export function parseSizeTokens(tokens: NestedTokens): ParsedSizeToken[] {
  const result = parseDimensionTokens<ParsedSizeToken>(
    tokens, 
    'sizing', 
    'size',
    (name, value, cssVariable, numericValue) => ({ name, value, cssVariable, numericValue })
  );
  return result.sort((a, b) => a.numericValue - b.numericValue);
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
