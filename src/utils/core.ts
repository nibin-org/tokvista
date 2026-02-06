import type { NestedTokens, TokenValue } from '../types';

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
  
  // Foundation colors always use --base-
  if (prefix === 'base') {
    return `--base-${cleanPath}`;
  }
  
  return prefix ? `--${prefix}-${cleanPath}` : `--${cleanPath}`;
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
 * Extract all token groups from a nested object
 * Returns a map of group names to their token contents
 */
export function extractTokenGroups(setData: any): Record<string, NestedTokens> {
  const groups: Record<string, NestedTokens> = {};
  
  if (!setData || typeof setData !== 'object') return groups;
  
  Object.entries(setData).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      groups[key] = value as NestedTokens;
    }
  });
  
  return groups;
}

/**
 * Detect the primary type of tokens in a group
 */
export function detectTokenType(tokens: NestedTokens): 'color' | 'spacing' | 'sizing' | 'radius' | 'typography' | 'other' {
  const allTokens = findAllTokens(tokens);
  if (allTokens.length === 0) return 'other';
  
  const types = new Set(allTokens.map(t => t.token.type));
  
  if (types.has('color')) return 'color';
  if (types.has('spacing')) return 'spacing';
  if (types.has('sizing')) return 'sizing';
  if (types.has('borderRadius')) return 'radius';
  
  // Check for typography by checking common font properties
  const firstTokenPath = allTokens[0]?.path.toLowerCase() || '';
  if (firstTokenPath.includes('font') || firstTokenPath.includes('line-height') || firstTokenPath.includes('letter-spacing')) {
    return 'typography';
  }
  
  return 'other';
}
