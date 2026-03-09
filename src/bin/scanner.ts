import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { detectTokenFormat } from '../utils/formatDetector';
import { normalizeTokenFormat } from '../utils/formatNormalizers';

interface ScanResult {
  totalTokens: number;
  usedTokens: string[];
  unusedTokens: string[];
  hardcodedColors: Array<{ file: string; line: number; value: string }>;
  hardcodedSpacing: Array<{ file: string; line: number; value: string }>;
  tokenFileIssues: Array<{ path: string; issue: string; value: string }>;
  filesScanned: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTokenLike(obj: unknown): obj is { value: unknown; type?: string } {
  return isRecord(obj) && 'value' in obj;
}

// Check for hardcoded values in semantic tokens
function validateTokenStructure(tokens: unknown): Array<{ path: string; issue: string; value: string }> {
  const issues: Array<{ path: string; issue: string; value: string }> = [];
  
  function walk(node: unknown, path: string[] = [], category = '') {
    if (!isRecord(node)) return;

    if (path.length === 0 && Object.keys(node).some(k => k.includes('/'))) {
      Object.entries(node).forEach(([key, val]) => {
        const cat = key.toLowerCase().includes('semantic') ? 'semantic' : 
                    key.toLowerCase().includes('component') ? 'component' : '';
        walk(val, [], cat);
      });
      return;
    }

    if (isTokenLike(node)) {
      const tokenPath = path.join('.');
      const value = String(node.value || '');
      
      // Check if this is a semantic/component token with hardcoded value
      const isSemanticToken = category === 'semantic' || category === 'component';
      
      if (isSemanticToken && !value.startsWith('{')) {
        // Semantic token should reference foundation tokens
        if (/#[0-9A-Fa-f]{3,8}/.test(value) || /rgba?\(/.test(value)) {
          issues.push({
            path: tokenPath,
            issue: 'Semantic token uses hardcoded color',
            value
          });
        }
        if (/\d+px/.test(value) && (node.type === 'spacing' || node.type === 'sizing')) {
          issues.push({
            path: tokenPath,
            issue: 'Semantic token uses hardcoded spacing',
            value
          });
        }
      }
      return;
    }

    Object.entries(node).forEach(([key, val]) => {
      walk(val, [...path, key], category);
    });
  }

  walk(tokens);
  return issues;
}
function extractTokenNames(tokens: unknown): Map<string, string> {
  const tokenMap = new Map<string, string>(); // cssVar -> tokenPath

  function walk(node: unknown, path: string[] = []) {
    if (!isRecord(node)) return;

    if (path.length === 0 && Object.keys(node).some(k => k.includes('/'))) {
      Object.values(node).forEach(val => walk(val, []));
      return;
    }

    if (isTokenLike(node)) {
      const tokenPath = path.join('.');
      const cssVar = `--${path.join('-')}`;
      tokenMap.set(cssVar, tokenPath);
      return;
    }

    Object.entries(node).forEach(([key, val]) => {
      walk(val, [...path, key]);
    });
  }

  walk(tokens);
  return tokenMap;
}

// Scan file for token usage and hardcoded values
async function scanFile(filePath: string, tokenVars: Set<string>): Promise<{
  usedVars: Set<string>;
  hardcodedColors: Array<{ line: number; value: string }>;
  hardcodedSpacing: Array<{ line: number; value: string }>;
}> {
  const content = await readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const usedVars = new Set<string>();
  const hardcodedColors: Array<{ line: number; value: string }> = [];
  const hardcodedSpacing: Array<{ line: number; value: string }> = [];

  // Patterns to match
  const cssVarPattern = /var\((--[\w-]+)\)/g;
  const hexColorPattern = /#[0-9A-Fa-f]{3,8}\b/g;
  const rgbPattern = /rgba?\([^)]+\)/g;
  const spacingPattern = /\b(\d+(?:\.\d+)?(?:px|rem|em))\b/g;

  lines.forEach((line, index) => {
    // Find CSS variable usage
    let match;
    while ((match = cssVarPattern.exec(line)) !== null) {
      const varName = match[1];
      if (tokenVars.has(varName)) {
        usedVars.add(varName);
      }
    }

    // Find hardcoded colors
    while ((match = hexColorPattern.exec(line)) !== null) {
      const color = match[0];
      // Skip common non-color hex values
      if (!line.includes('0x') && !line.includes('\\u')) {
        hardcodedColors.push({ line: index + 1, value: color });
      }
    }

    while ((match = rgbPattern.exec(line)) !== null) {
      hardcodedColors.push({ line: index + 1, value: match[0] });
    }

    // Find hardcoded spacing (only in style contexts)
    if (line.includes('padding') || line.includes('margin') || line.includes('gap') || 
        line.includes('width') || line.includes('height')) {
      while ((match = spacingPattern.exec(line)) !== null) {
        hardcodedSpacing.push({ line: index + 1, value: match[1] });
      }
    }
  });

  return { usedVars, hardcodedColors, hardcodedSpacing };
}

// Recursively scan directory
async function scanDirectory(
  dir: string,
  tokenVars: Set<string>,
  extensions: Set<string>
): Promise<{
  usedVars: Set<string>;
  hardcodedColors: Array<{ file: string; line: number; value: string }>;
  hardcodedSpacing: Array<{ file: string; line: number; value: string }>;
  filesScanned: number;
}> {
  const usedVars = new Set<string>();
  const hardcodedColors: Array<{ file: string; line: number; value: string }> = [];
  const hardcodedSpacing: Array<{ file: string; line: number; value: string }> = [];
  let filesScanned = 0;

  async function scan(currentDir: string) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        // Skip common directories
        if (entry.isDirectory()) {
          if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) {
            continue;
          }
          await scan(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (extensions.has(ext)) {
            // Skip token export files
            const fileName = entry.name.toLowerCase();
            if (fileName.includes('token') && (ext === '.css' || ext === '.scss' || ext === '.js')) {
              continue;
            }
            
            const result = await scanFile(fullPath, tokenVars);
            filesScanned++;
            
            result.usedVars.forEach(v => usedVars.add(v));
            result.hardcodedColors.forEach(h => hardcodedColors.push({ file: fullPath, ...h }));
            result.hardcodedSpacing.forEach(h => hardcodedSpacing.push({ file: fullPath, ...h }));
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  await scan(dir);
  return { usedVars, hardcodedColors, hardcodedSpacing, filesScanned };
}

export async function scanTokenUsage(
  tokensPath: string,
  scanDir: string,
  tokens: unknown
): Promise<ScanResult> {
  // Detect and normalize format
  const detection = detectTokenFormat(tokens);
  let normalizedTokens = tokens;
  
  if (detection.format !== 'token-studio' && detection.format !== 'unknown') {
    normalizedTokens = normalizeTokenFormat(tokens, detection.format);
  }

  // Validate token structure for hardcoded values
  const tokenFileIssues = validateTokenStructure(normalizedTokens);

  // Extract all token CSS variables
  const tokenMap = extractTokenNames(normalizedTokens);
  const tokenVars = new Set(tokenMap.keys());

  // Scan directory for usage
  const extensions = new Set(['.css', '.scss', '.sass', '.less', '.tsx', '.jsx', '.ts', '.js', '.vue', '.svelte']);
  const scanResult = await scanDirectory(scanDir, tokenVars, extensions);

  // Determine used and unused tokens
  const usedTokens: string[] = [];
  const unusedTokens: string[] = [];

  tokenMap.forEach((tokenPath, cssVar) => {
    if (scanResult.usedVars.has(cssVar)) {
      usedTokens.push(tokenPath);
    } else {
      unusedTokens.push(tokenPath);
    }
  });

  return {
    totalTokens: tokenMap.size,
    usedTokens,
    unusedTokens,
    hardcodedColors: scanResult.hardcodedColors.slice(0, 50), // Limit to 50
    hardcodedSpacing: scanResult.hardcodedSpacing.slice(0, 50), // Limit to 50
    tokenFileIssues,
    filesScanned: scanResult.filesScanned,
  };
}
