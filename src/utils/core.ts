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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
  const cleanPath = path
    .replace(/\//g, '-')
    .replace(/\./g, '-')
    .replace(/\s+/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
  
  // Foundation colors always use --base-
  if (prefix === 'base') {
    return `--base-${cleanPath}`;
  }
  
  return prefix ? `--${prefix}-${cleanPath}` : `--${cleanPath}`;
}

/**
 * Resolve the usable foundation tree without dropping sibling token groups.
 * If Foundation/Value only contains a single "base" wrapper, unwrap it.
 */
export function getFoundationTokenTree(tokens: unknown): NestedTokens {
  const source =
    isRecord(tokens) && isRecord((tokens as Record<string, unknown>)['Foundation/Value'])
      ? (tokens as Record<string, unknown>)['Foundation/Value']
      : tokens;

  if (!isRecord(source)) return {};

  const keys = Object.keys(source).filter(key => !key.startsWith('$'));
  if (keys.length === 1 && keys[0].toLowerCase() === 'base') {
    const baseValue = source[keys[0]];
    if (isRecord(baseValue)) {
      return baseValue as NestedTokens;
    }
  }

  return source as NestedTokens;
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
      map[path] = typeof token.value === 'string' ? token.value : String(token.value);
      // Also map with setKey prefix if not already present
      map[`${setKey}.${path}`] = typeof token.value === 'string' ? token.value : String(token.value);
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
    let resolved = tokenMap[refPath];
    if (resolved === undefined && refPath.includes('.')) {
      // Support collection-prefixed aliases like {Tokvista.base.color.blue.50}
      const withoutCollectionPrefix = refPath.slice(refPath.indexOf('.') + 1);
      resolved = tokenMap[withoutCollectionPrefix];
    }
    
    if (resolved !== undefined) {
      currentValue = resolved;
    } else {
      // Try fuzzy match (if path in map ends with refPath)
      let entry = Object.entries(tokenMap).find(([path]) => path.endsWith(refPath));
      if (!entry && refPath.includes('.')) {
        const withoutCollectionPrefix = refPath.slice(refPath.indexOf('.') + 1);
        entry = Object.entries(tokenMap).find(([path]) => path.endsWith(withoutCollectionPrefix));
      }
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

/**
 * Merge two nested records recursively.
 * Token leaf objects (objects with a `value` key) are replaced, not merged.
 */
export function deepMergeRecords(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  Object.entries(source).forEach(([key, nextValue]) => {
    const currentValue = target[key];
    const currentIsObject = typeof currentValue === 'object' && currentValue !== null;
    const nextIsObject = typeof nextValue === 'object' && nextValue !== null;
    const currentIsTokenLeaf = currentIsObject && 'value' in (currentValue as Record<string, unknown>);
    const nextIsTokenLeaf = nextIsObject && 'value' in (nextValue as Record<string, unknown>);

    if (currentIsObject && nextIsObject && !currentIsTokenLeaf && !nextIsTokenLeaf) {
      target[key] = deepMergeRecords(
        currentValue as Record<string, unknown>,
        nextValue as Record<string, unknown>
      );
      return;
    }

    target[key] = nextValue;
  });

  return target;
}
