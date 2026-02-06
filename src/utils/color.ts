import type { NestedTokens, ColorFamily, ParsedColorToken } from '../types';
import { findAllTokens, resolveTokenValue, toCssVariable } from './core';

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
