import type { FigmaTokens, NestedTokens } from '../types';

export interface ExportableToken {
  name: string;
  value: string;
  cssVariable: string;
  type: string;
  category: string;
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
      const isSpatial = ['space', 'size', 'radius', 'line-height', 'border-width'].some(k => n.includes(k));
      
      if (tokenType === 'color' || (!isSpatial && (n.includes('color') || n.includes('fill') || n.includes('stroke') || !isSpatial))) return 'color';
      if (n.includes('space') || n.includes('spacing')) return 'spacing';
      if (n.includes('size')) return 'size';
      if (n.includes('radius')) return 'radius';
      if (n.includes('font') || n.includes('line-height') || n.includes('typography')) return 'typography';
      return 'dimension';
    };

  // 1. Foundation Tokens
  if (tokens['Foundation/Value']?.base) {
    const base = tokens['Foundation/Value'].base;
    Object.entries(base).forEach(([familyName, family]: [string, any]) => {
      if (typeof family === 'object' && family !== null) {
        Object.entries(family).forEach(([tokenName, tokenValue]: [string, any]) => {
          if (tokenValue && typeof tokenValue === 'object' && 'value' in tokenValue) {
            const tokenType = determineType(familyName, tokenValue.type);
            const isSpatial = ['space', 'size', 'radius', 'line-height', 'border-width'].some(k => familyName.toLowerCase().includes(k));
            const isColor = tokenType === 'color' || !isSpatial;
            
            flattened.push({
              name: isColor ? `base-${familyName}-${tokenName}` : `${familyName}-${tokenName}`,
              value: String(tokenValue.value),
              cssVariable: isColor ? `--base-${familyName}-${tokenName}` : `--${familyName}-${tokenName}`,
              type: tokenType,
              category: 'Foundation',
            });
          }
        });
      }
    });
  }

  // 2. Semantic Tokens
  if (tokens['Semantic/Value']) {
    const semantic = tokens['Semantic/Value'];
    ['fill', 'stroke', 'text'].forEach(cat => {
      const group = semantic[cat];
      if (group && typeof group === 'object') {
        Object.entries(group).forEach(([tokenName, tokenValue]: [string, any]) => {
          if (tokenValue && typeof tokenValue === 'object' && 'value' in tokenValue) {
            flattened.push({
              name: `${cat}-${tokenName}`,
              value: String(tokenValue.value),
              cssVariable: `--${cat}-${tokenName}`,
              type: 'color',
              category: 'Semantic',
            });
          }
        });
      }
    });
  }

  // 3. Component Tokens
  if (tokens['Components/Mode 1']) {
    const components = tokens['Components/Mode 1'];
    Object.entries(components).forEach(([compName, comp]: [string, any]) => {
      if (typeof comp === 'object' && comp !== null) {
        Object.entries(comp).forEach(([dimName, dim]: [string, any]) => {
          if (typeof dim === 'object' && dim !== null) {
            Object.entries(dim).forEach(([variantName, tokenValue]: [string, any]) => {
              if (tokenValue && typeof tokenValue === 'object' && 'value' in tokenValue) {
                flattened.push({
                  name: `${compName}-${dimName}-${variantName}`,
                  value: String(tokenValue.value),
                  cssVariable: `--${compName}-${dimName}-${variantName}`,
                  type: determineType(dimName),
                  category: `Component (${compName})`,
                });
              }
            });
          }
        });
      }
    });
  }

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
