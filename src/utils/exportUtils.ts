import type { FigmaTokens, NestedTokens } from '../types';
import { getFoundationTokenTree, extractSemanticSet, extractComponentSet } from './core';

export interface ExportableToken {
  name: string;
  value: string;
  cssVariable: string;
  type: string;
  category: string;
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
 * Formats a token value for export. 
 * Converts aliases like {base.color.50} to var(--base-color-50)
 */
function formatTokenValue(value: string, format: 'css' | 'scss' | 'js'): string {
  if (typeof value !== 'string') return String(value);
  
  // Check if it's an alias {path.to.token}
  const aliasMatch = value.match(/^\{(.+)\}$/);
  if (aliasMatch) {
    const path = aliasMatch[1];
    // Replace dots with hyphens: base.blue.50 -> base-blue-50
    let cleanPath = path.replace(/\./g, '-');
    
    // Remove base- prefix if it's not a color
    if (cleanPath.startsWith('base-')) {
      const afterBase = cleanPath.slice(5).toLowerCase();
      const isSpatial = ['space', 'size', 'radius', 'line-height', 'border-width'].some(k => afterBase.includes(k));
      
      if (isSpatial) {
        cleanPath = path.replace(/\./g, '-').slice(5); // Remove 'base-'
      }
    }
    
    if (format === 'css') {
      return `var(--${cleanPath})`;
    } else if (format === 'scss') {
      return `$${cleanPath}`;
    }
  }
  
  return value;
}

/**
 * Flatten all tokens into a single list for easier generation
 */
export function getFlattenedTokens(tokens: FigmaTokens): ExportableToken[] {
  const flattened: ExportableToken[] = [];

  const determineType = (name: string, tokenType?: string) => {
    const n = name.toLowerCase();
    const rawType = String(tokenType || '').toLowerCase();

    if (rawType === 'color') return 'color';
    if (rawType === 'spacing') return 'spacing';
    if (rawType === 'sizing' || rawType === 'size') return 'size';
    if (rawType === 'borderradius' || rawType === 'radius') return 'radius';
    if (rawType.includes('font') || rawType.includes('line')) return 'typography';

    if (n.includes('color') || n.includes('fill') || n.includes('stroke') || n.includes('text') || n.includes('bg')) return 'color';
    if (n.includes('space') || n.includes('spacing') || n.includes('gap') || n.includes('padding') || n.includes('margin')) return 'spacing';
    if (n.includes('size') || n.includes('width') || n.includes('height')) return 'size';
    if (n.includes('radius') || n.includes('round')) return 'radius';
    if (n.includes('font') || n.includes('line-height') || n.includes('typography') || n.includes('letter')) return 'typography';
    return 'dimension';
  };

  const pushToken = (name: string, cssVariable: string, value: string, type: string, category: string) => {
    flattened.push({ name, cssVariable, value, type, category });
  };

  // 1. Foundation Tokens
  const foundationRoot = getFoundationTokenTree(tokens);
  const walkFoundation = (node: unknown, path: string[] = []) => {
    if (!isRecord(node)) return;

    if (isTokenLike(node) && node.value !== null) {
      const joinedPath = path.join('-');
      const tokenType = determineType(joinedPath, node.type);
      const value = String(node.value);

      if (tokenType === 'color') {
        const colorPath = normalizeColorPath(path);
        const colorName = colorPath.join('-');
        pushToken(`base-${colorName}`, `--base-${colorName}`, value, tokenType, 'Foundation');
      } else {
        pushToken(joinedPath, `--${joinedPath}`, value, tokenType, 'Foundation');
      }
      return;
    }

    Object.entries(node).forEach(([key, value]) => {
      walkFoundation(value, [...path, key]);
    });
  };

  if (isRecord(foundationRoot)) {
    walkFoundation(foundationRoot);
  }

  // 2. Semantic Tokens
  const semanticSet = extractSemanticSet(tokens);
  if (Object.keys(semanticSet).length > 0) {
    const walkSemantic = (node: unknown, path: string[] = []) => {
      if (!isRecord(node)) return;
      if (isTokenLike(node) && node.value !== null) {
        const name = path.join('-');
        const tokenType = determineType(name, node.type);
        pushToken(name, `--${name}`, String(node.value), tokenType, 'Semantic');
        return;
      }
      Object.entries(node).forEach(([key, value]) => {
        walkSemantic(value, [...path, key]);
      });
    };

    walkSemantic(semanticSet);
  }

  // 3. Component Tokens — accept any supported structured shape
  const mergedComponents = extractComponentSet(tokens) as Record<string, any>;

  Object.entries(mergedComponents).forEach(([compName, comp]: [string, any]) => {
    if (!isRecord(comp)) return;

    const walkComponent = (node: unknown, path: string[] = []) => {
      if (!isRecord(node)) return;
      if (isTokenLike(node) && node.value !== null) {
        const suffix = path.join('-');
        const type = determineType(suffix, node.type);
        const tokenType = type === 'size' ? 'size' : type;
        const name = suffix ? `${compName}-${suffix}` : compName;
        pushToken(name, `--${name}`, String(node.value), tokenType, `Component (${compName})`);
        return;
      }
      Object.entries(node).forEach(([key, value]) => {
        walkComponent(value, [...path, key]);
      });
    };

    walkComponent(comp);
  });

  return flattened;
}

/**
 * Generate CSS Variables
 */
export function generateCSS(tokens: FigmaTokens): string {
  const flattened = getFlattenedTokens(tokens);
  let css = ':root {\n';
  
  // Group by category for readability
  const categories = ['Foundation', 'Semantic'];
  const componentCategories = Array.from(new Set(flattened.map(t => t.category))).filter(c => c.startsWith('Component'));
  
  [...categories, ...componentCategories].forEach(cat => {
    const catTokens = flattened.filter(t => t.category === cat);
    if (catTokens.length > 0) {
      css += `  /* ${cat} */\n`;
      catTokens.forEach(t => {
        const value = formatTokenValue(t.value, 'css');
        css += `  ${t.cssVariable}: ${value};\n`;
      });
      css += '\n';
    }
  });

  css = css.trim() + '\n}';
  return css;
}

/**
 * Generate SCSS Variables
 */
export function generateSCSS(tokens: FigmaTokens): string {
  const flattened = getFlattenedTokens(tokens);
  let scss = '';
  
  // Group by category for readability
  const categories = ['Foundation', 'Semantic'];
  const componentCategories = Array.from(new Set(flattened.map(t => t.category))).filter(c => c.startsWith('Component'));
  const allCategories = [...categories, ...componentCategories];

  // Individual variables
  allCategories.forEach(cat => {
    const catTokens = flattened.filter(t => t.category === cat);
    if (catTokens.length > 0) {
      scss += `// ${cat}\n`;
      catTokens.forEach(t => {
        const scssVar = t.cssVariable.replace('--', '$');
        const value = formatTokenValue(t.value, 'scss');
        scss += `${scssVar}: ${value};\n`;
      });
      scss += '\n';
    }
  });

  scss += '// Token Map\n$tokens: (\n';
  flattened.forEach(t => {
    const value = formatTokenValue(t.value, 'scss');
    scss += `  "${t.name}": ${value},\n`;
  });
  scss += ');';

  return scss;
}

/**
 * Generate JS Object
 */
export function generateJS(tokens: FigmaTokens): string {
  const flattened = getFlattenedTokens(tokens);
  const jsObj: Record<string, string> = {};
  
  flattened.forEach(t => {
    // For JS, we either resolve the alias or return raw value
    // If it's an alias {path.to.token}, we try to find the final value
    // For now, let's just use the raw value but we could add a resolver here
    jsObj[t.name] = t.value;
  });

  return `export const tokens = ${JSON.stringify(jsObj, null, 2)};`;
}

/**
 * Generate Tailwind Config
 */
export function generateTailwind(tokens: FigmaTokens): string {
  const flattened = getFlattenedTokens(tokens);
  
  const config: any = {
    theme: {
      extend: {
        colors: {},
        spacing: {},
        borderRadius: {},
        fontSize: {},
      }
    }
  };

  flattened.forEach(t => {
    // For Tailwind, we keep the full name for clarity
    const cleanName = t.name;
    
    if (t.type === 'color') {
      config.theme.extend.colors[cleanName] = `var(${t.cssVariable})`;
    } else if (t.type === 'spacing') {
      config.theme.extend.spacing[cleanName] = `var(${t.cssVariable})`;
    } else if (t.type === 'radius') {
      config.theme.extend.borderRadius[cleanName] = `var(${t.cssVariable})`;
    } else if (t.type === 'typography' && t.name.includes('font-size')) {
      config.theme.extend.fontSize[cleanName] = `var(${t.cssVariable})`;
    }
  });

  // Clean up empty objects
  if (Object.keys(config.theme.extend.colors).length === 0) delete config.theme.extend.colors;
  if (Object.keys(config.theme.extend.spacing).length === 0) delete config.theme.extend.spacing;
  if (Object.keys(config.theme.extend.borderRadius).length === 0) delete config.theme.extend.borderRadius;
  if (Object.keys(config.theme.extend.fontSize).length === 0) delete config.theme.extend.fontSize;

  return `/** @type {import('tailwindcss').Config} */\nmodule.exports = ${JSON.stringify(config, null, 2)};`;
}
