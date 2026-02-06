import type { NestedTokens, ParsedSpacingToken, ParsedRadiusToken, ParsedSizeToken } from '../types';
import { findAllTokens, toCssVariable, parseNumericValue } from './core';

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
