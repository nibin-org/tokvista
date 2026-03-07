import type { FigmaTokens, NestedTokens } from '../types';
import { createTokenMap, resolveTokenValue, getFoundationTokenTree, extractSemanticSet, extractComponentSet } from './core';

export interface SearchableToken {
  id: string;
  name: string;
  value: string;
  cssVariable: string;
  type: 'color' | 'spacing' | 'size' | 'radius' | 'typography' | 'component';
  category: 'foundation' | 'semantic' | 'component';
  preview?: string; // For colors: hex value, for others: display value
}

export interface SearchResult {
  token: SearchableToken;
  score: number;
  matches: string[];
}

type TokenLike = {
  value: string | number;
  type?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTokenLike(value: unknown): value is TokenLike {
  return isRecord(value) && 'value' in value;
}

function normalizeColorPath(path: string[]): string[] {
  const wrappers = new Set(['color', 'colors', 'palette', 'palettes', 'base', 'foundation', 'value']);
  const filtered = path.filter(part => !wrappers.has(part.toLowerCase()));
  return filtered.length > 0 ? filtered : path;
}

/**
 * Improved fuzzy search implementation
 * Prioritizes exact matches and substring matches, rejects overly scattered matches
 */
function fuzzyMatch(query: string, text: string): { score: number; matches: boolean } {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) {
    return { score: 1, matches: true };
  }
  
  // Contains query gets high score (prioritize this!)
  if (textLower.includes(queryLower)) {
    const position = textLower.indexOf(queryLower);
    // Bonus for being at the start
    const positionBonus = position === 0 ? 0.2 : 0;
    const score = 0.8 + positionBonus - (position / textLower.length) * 0.1;
    return { score, matches: true };
  }
  
  // Fuzzy match: check if all query characters appear in order
  // But reject if characters are too scattered
  let queryIndex = 0;
  let matchPositions: number[] = [];
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      matchPositions.push(i);
      queryIndex++;
    }
  }
  
  // If we didn't match all query characters, no match
  if (queryIndex < queryLower.length) {
    return { score: 0, matches: false };
  }
  
  // Calculate average distance between matched characters
  let totalDistance = 0;
  for (let i = 1; i < matchPositions.length; i++) {
    totalDistance += matchPositions[i] - matchPositions[i - 1] - 1;
  }
  const avgDistance = matchPositions.length > 1 ? totalDistance / (matchPositions.length - 1) : 0;
  
  // Reject if average distance is too high (characters are too scattered)
  // Stricter threshold: 1.5 instead of 2
  if (avgDistance > 1.5) {
    return { score: 0, matches: false };
  }
  
  // Score based on how close together the matches are
  // Lower scores for fuzzy matches so exact substring matches always win
  const score = 0.2 - (avgDistance * 0.08);
  return { score: Math.max(score, 0.05), matches: true };
}

/**
 * Index foundation tokens
 */
function indexFoundationTokens(baseTokens: NestedTokens, tokenMap: Record<string, string>): SearchableToken[] {
  const tokens: SearchableToken[] = [];

  const walk = (node: unknown, path: string[] = []) => {
    if (!isRecord(node)) return;

    if (isTokenLike(node) && node.value !== null) {
      const pathJoined = path.join('-');
      const rawType = determineTokenType(pathJoined, node.type);
      const value = String(node.value);

      if (rawType === 'color') {
        const colorPath = normalizeColorPath(path);
        const name = colorPath.join('-');
        tokens.push({
          id: `foundation-${name}`,
          name,
          value,
          cssVariable: `--base-${name}`,
          type: 'color',
          category: 'foundation',
          preview: resolveTokenValue(value, tokenMap),
        });
      } else {
        tokens.push({
          id: `foundation-${pathJoined}`,
          name: pathJoined,
          value,
          cssVariable: `--${pathJoined}`,
          type: rawType,
          category: 'foundation',
          preview: value,
        });
      }
      return;
    }

    Object.entries(node).forEach(([key, value]) => {
      walk(value, [...path, key]);
    });
  };

  walk(baseTokens);
  
  return tokens;
}

/**
 * Index semantic tokens using generic nested groups, not only fill/stroke/text.
 */
function indexSemanticTokens(semanticTokens: Record<string, NestedTokens>, tokenMap: Record<string, string>): SearchableToken[] {
  const tokens: SearchableToken[] = [];

  const walk = (node: unknown, path: string[] = []) => {
    if (!isRecord(node)) return;
    if (isTokenLike(node) && node.value !== null) {
      const name = path.join('-');
      const value = String(node.value);
      const type = determineTokenType(name, node.type);
      tokens.push({
        id: `semantic-${name}`,
        name,
        value,
        cssVariable: `--${name}`,
        type,
        category: 'semantic',
        preview: type === 'color' ? resolveTokenValue(value, tokenMap) : value,
      });
      return;
    }
    Object.entries(node).forEach(([key, value]) => {
      walk(value, [...path, key]);
    });
  };

  walk(semanticTokens);

  return tokens;
}

/**
 * Index component tokens
 */
function indexComponentTokens(components: Record<string, any>, tokenMap: Record<string, string>): SearchableToken[] {
  const tokens: SearchableToken[] = [];
  
  Object.entries(components).forEach(([componentName, component]) => {
    if (!isRecord(component)) return;

    const walk = (node: unknown, path: string[] = []) => {
      if (!isRecord(node)) return;

      if (isTokenLike(node) && node.value !== null) {
        const suffix = path.join('-');
        const value = String(node.value);
        const type = determineTokenType(suffix, node.type);
        const preview = type === 'color' ? resolveTokenValue(value, tokenMap) : value;
        tokens.push({
          id: `component-${componentName}-${suffix}`,
          name: `${componentName} ${path.join(' ')}`,
          value,
          cssVariable: `--${componentName}-${suffix}`,
          type,
          category: 'component',
          preview,
        });
        return;
      }

      Object.entries(node).forEach(([key, value]) => {
        walk(value, [...path, key]);
      });
    };

    walk(component);
  });
  
  return tokens;
}

/**
 * Determine token type from family/dimension name
 */
function determineTokenType(name: string, tokenType?: string): SearchableToken['type'] {
  const nameLower = name.toLowerCase();
  const rawType = String(tokenType || '').toLowerCase();

  if (rawType === 'color') return 'color';
  if (rawType === 'spacing') return 'spacing';
  if (rawType === 'sizing' || rawType === 'size') return 'size';
  if (rawType === 'borderradius' || rawType === 'radius') return 'radius';
  if (rawType.includes('font') || rawType.includes('line')) return 'typography';

  if (nameLower.includes('color') || nameLower.includes('fill') || nameLower.includes('stroke') ||
      ['blue', 'red', 'green', 'yellow', 'orange', 'purple', 'cyan', 'gray', 'slate', 'teal', 'pink', 'white', 'black', 'coolgray'].some(c => nameLower.includes(c))) {
    return 'color';
  }
  if (nameLower.includes('space') || nameLower.includes('spacing')) {
    return 'spacing';
  }
  if (nameLower.includes('size')) {
    return 'size';
  }
  if (nameLower.includes('radius')) {
    return 'radius';
  }
  if (nameLower.includes('font') || nameLower.includes('line-height') || nameLower.includes('typography')) {
    return 'typography';
  }
  
  return 'component';
}

/**
 * Index all tokens from FigmaTokens structure
 */
export function indexTokens(tokens: FigmaTokens): SearchableToken[] {
  const searchableTokens: SearchableToken[] = [];
  const tokenMap = createTokenMap(tokens);
  
  // Index foundation tokens
  const foundationSet = getFoundationTokenTree(tokens);
  if (Object.keys(foundationSet).length > 0) {
    searchableTokens.push(...indexFoundationTokens(foundationSet, tokenMap));
  }
  
  // Index semantic tokens
  const semanticSet = extractSemanticSet(tokens);
  if (Object.keys(semanticSet).length > 0) {
    searchableTokens.push(...indexSemanticTokens(semanticSet as Record<string, NestedTokens>, tokenMap));
  }
  
  // Index component tokens — merge all Components/* sets dynamically
  const mergedComponents = extractComponentSet(tokens) as Record<string, any>;

  if (Object.keys(mergedComponents).length > 0) {
    searchableTokens.push(...indexComponentTokens(mergedComponents, tokenMap));
  }
  
  return searchableTokens;
}

/**
 * Search tokens with fuzzy matching
 */
export function searchTokens(query: string, tokens: SearchableToken[], limit = 50): SearchResult[] {
  if (!query.trim()) {
    return [];
  }
  
  const results: SearchResult[] = [];
  
  tokens.forEach(token => {
    const nameMatch = fuzzyMatch(query, token.name);
    const valueMatch = fuzzyMatch(query, token.value);
    const cssVarMatch = fuzzyMatch(query, token.cssVariable);
    
    const maxScore = Math.max(nameMatch.score, valueMatch.score, cssVarMatch.score);
    
    if (maxScore > 0) {
      const matches: string[] = [];
      if (nameMatch.matches) matches.push('name');
      if (valueMatch.matches) matches.push('value');
      if (cssVarMatch.matches) matches.push('cssVariable');
      
      results.push({
        token,
        score: maxScore,
        matches,
      });
    }
  });
  
  // Sort by score (highest first) and limit results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Highlight matching text in a string
 */
export function highlightMatch(text: string, query: string): string {
  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return ch;
      }
    });

  if (!query.trim()) return escapeHtml(text);
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const index = textLower.indexOf(queryLower);
  
  if (index !== -1) {
    const before = escapeHtml(text.slice(0, index));
    const match = escapeHtml(text.slice(index, index + query.length));
    const after = escapeHtml(text.slice(index + query.length));
    return `${before}<mark>${match}</mark>${after}`;
  }
  
  return escapeHtml(text);
}
