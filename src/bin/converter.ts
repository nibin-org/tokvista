import type { TokenFormat } from '../utils/formatDetector';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTokenLike(obj: unknown): obj is { value: unknown; type?: string } {
  return isRecord(obj) && 'value' in obj;
}

// Convert Token Studio to W3C DTCG format
function toW3C(tokens: unknown): unknown {
  function walk(node: unknown): unknown {
    if (!isRecord(node)) return node;

    // Skip Token Studio category wrappers
    if (Object.keys(node).some(k => k.includes('/'))) {
      const result: Record<string, unknown> = {};
      Object.entries(node).forEach(([key, val]) => {
        Object.assign(result, walk(val));
      });
      return result;
    }

    if (isTokenLike(node)) {
      return {
        $value: node.value,
        ...(node.type ? { $type: node.type } : {}),
      };
    }

    const result: Record<string, unknown> = {};
    Object.entries(node).forEach(([key, val]) => {
      result[key] = walk(val);
    });
    return result;
  }

  return walk(tokens);
}

// Convert Token Studio to Style Dictionary format (same structure, just flatten categories)
function toStyleDictionary(tokens: unknown): unknown {
  function walk(node: unknown): unknown {
    if (!isRecord(node)) return node;

    // Skip Token Studio category wrappers
    if (Object.keys(node).some(k => k.includes('/'))) {
      const result: Record<string, unknown> = {};
      Object.entries(node).forEach(([key, val]) => {
        Object.assign(result, walk(val));
      });
      return result;
    }

    if (isTokenLike(node)) {
      return node;
    }

    const result: Record<string, unknown> = {};
    Object.entries(node).forEach(([key, val]) => {
      result[key] = walk(val);
    });
    return result;
  }

  return walk(tokens);
}

// Convert Token Studio to Supernova array format
function toSupernova(tokens: unknown): unknown[] {
  const result: unknown[] = [];
  let idCounter = 1;

  function walk(node: unknown, path: string[] = []) {
    if (!isRecord(node)) return;

    // Skip Token Studio category wrappers
    if (path.length === 0 && Object.keys(node).some(k => k.includes('/'))) {
      Object.values(node).forEach(val => walk(val, []));
      return;
    }

    if (isTokenLike(node)) {
      result.push({
        id: String(idCounter++),
        name: path[path.length - 1] || 'token',
        tokenType: node.type || 'unknown',
        value: node.value,
      });
      return;
    }

    Object.entries(node).forEach(([key, val]) => {
      walk(val, [...path, key]);
    });
  }

  walk(tokens);
  return result;
}

export type ConvertFormat = 'token-studio' | 'w3c' | 'style-dictionary' | 'supernova';

export function convertTokenFormat(tokens: unknown, targetFormat: ConvertFormat): unknown {
  // Token Studio is the source format, no conversion needed
  if (targetFormat === 'token-studio') {
    return tokens;
  }

  switch (targetFormat) {
    case 'w3c':
      return toW3C(tokens);
    case 'style-dictionary':
      return toStyleDictionary(tokens);
    case 'supernova':
      return toSupernova(tokens);
    default:
      throw new Error(`Unsupported target format: ${targetFormat}`);
  }
}
