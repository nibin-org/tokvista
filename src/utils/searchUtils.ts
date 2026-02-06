import type { FigmaTokens, NestedTokens } from '../types';

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
function indexFoundationTokens(baseTokens: NestedTokens): SearchableToken[] {
  const tokens: SearchableToken[] = [];
  
  Object.entries(baseTokens).forEach(([familyName, family]) => {
    if (typeof family === 'object' && family !== null && !('value' in family)) {
      // It's a nested object (like colors, spacing, etc.)
      Object.entries(family).forEach(([tokenName, tokenValue]) => {
        if (tokenValue && typeof tokenValue === 'object' && 'value' in tokenValue && tokenValue.value !== null) {
          const value = String(tokenValue.value);
          const isSpatial = ['space', 'size', 'radius', 'line-height', 'border-width'].some(k => familyName.toLowerCase().includes(k));
          const cssVar = isSpatial ? `--${familyName}-${tokenName}` : `--base-${familyName}-${tokenName}`;
          
          tokens.push({
            id: `foundation-${familyName}-${tokenName}`,
            name: `${familyName}-${tokenName}`,
            value,
            cssVariable: cssVar,
            type: determineTokenType(familyName),
            category: 'foundation',
            preview: value,
          });
        }
      });
    }
  });
  
  return tokens;
}

/**
 * Index semantic tokens (fill, stroke, text)
 */
function indexSemanticTokens(semanticTokens: Record<string, NestedTokens>): SearchableToken[] {
  const tokens: SearchableToken[] = [];
  
  ['fill', 'stroke', 'text'].forEach(category => {
    const categoryTokens = semanticTokens[category];
    if (!categoryTokens) return;
    
    Object.entries(categoryTokens).forEach(([tokenName, tokenValue]) => {
      if (tokenValue && typeof tokenValue === 'object' && 'value' in tokenValue && tokenValue.value !== null) {
        const value = String(tokenValue.value);
        const cssVar = `--${category}-${tokenName}`;
        
        tokens.push({
          id: `semantic-${category}-${tokenName}`,
          name: `${category}-${tokenName}`,
          value,
          cssVariable: cssVar,
          type: 'color',
          category: 'semantic',
          preview: value,
        });
      }
    });
  });
  
  return tokens;
}

/**
 * Index component tokens
 */
function indexComponentTokens(components: Record<string, any>): SearchableToken[] {
  const tokens: SearchableToken[] = [];
  
  Object.entries(components).forEach(([componentName, component]) => {
    if (typeof component === 'object' && component !== null) {
      Object.entries(component).forEach(([dimensionName, dimension]) => {
        if (typeof dimension === 'object' && dimension !== null) {
          Object.entries(dimension).forEach(([variantName, tokenValue]) => {
            if (tokenValue && typeof tokenValue === 'object' && 'value' in tokenValue && tokenValue.value !== null) {
              const value = String(tokenValue.value);
              const cssVar = `--${componentName}-${dimensionName}-${variantName}`;
              
              tokens.push({
                id: `component-${componentName}-${dimensionName}-${variantName}`,
                name: `${componentName} ${dimensionName} ${variantName}`,
                value,
                cssVariable: cssVar,
                type: determineTokenType(dimensionName),
                category: 'component',
                preview: value,
              });
            }
          });
        }
      });
    }
  });
  
  return tokens;
}

/**
 * Determine token type from family/dimension name
 */
function determineTokenType(name: string): SearchableToken['type'] {
  const nameLower = name.toLowerCase();
  
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
  
  // Index foundation tokens
  if (tokens['Foundation/Value']?.base) {
    searchableTokens.push(...indexFoundationTokens(tokens['Foundation/Value'].base));
  }
  
  // Index semantic tokens
  if (tokens['Semantic/Value']) {
    searchableTokens.push(...indexSemanticTokens(tokens['Semantic/Value']));
  }
  
  // Index component tokens
  if (tokens['Components/Mode 1']) {
    searchableTokens.push(...indexComponentTokens(tokens['Components/Mode 1']));
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
  if (!query.trim()) return text;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const index = textLower.indexOf(queryLower);
  
  if (index !== -1) {
    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);
    return `${before}<mark>${match}</mark>${after}`;
  }
  
  return text;
}
