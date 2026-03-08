import { describe, it, expect, beforeEach } from 'vitest';
import { generateCSS, generateSCSS, generateJS, generateTailwind, getFlattenedTokens } from '../src/utils/exportUtils';
import { FigmaTokens } from '../src/types';

describe('Export Utils', () => {
    const mockTokens: any = {
        "Foundation/Value": {
            "base": {
                "blue": {
                    "50": { "value": "#3b82f6", "type": "color" }
                },
                "space": {
                    "md": { "value": "16px", "type": "dimension" }
                }
            }
        },
        "Semantic/Value": {
            "fill": {
                "primary": { "value": "{base.blue.50}", "type": "color" }
            }
        }
    };

    const nestedAndMergedTokens: any = {
        "Foundation/Value": {
            "base": {
                "color": {
                    "blue": {
                        "500": { "value": "#2563EB", "type": "color" }
                    }
                }
            }
        },
        "Components/Mode 1": {
            "button": {
                "Primary": {
                    "base": { "value": "#0EA5E9", "type": "color" }
                }
            }
        },
        "Components/Mode 2": {
            "button": {
                "height": {
                    "md": { "value": "40px", "type": "dimension" }
                }
            }
        }
    };

    const foundationWithSiblingGroups: any = {
        "Foundation/Value": {
            "base": {
                "blue": {
                    "500": { "value": "#2563EB", "type": "color" }
                }
            },
            "spacing": {
                "md": { "value": "16px", "type": "spacing" }
            }
        }
    };

    describe('generateCSS', () => {
        it('should generate valid CSS variables with alias resolution', () => {
            const css = generateCSS(mockTokens);
            expect(css).toContain(':root {');
            expect(css).toContain('--base-blue-50: #3b82f6;');
            expect(css).toContain('--fill-primary: var(--base-blue-50);'); // Smart alias resolution
        });
    });

    describe('generateSCSS', () => {
        it('should generate valid SCSS variables and maps', () => {
            const scss = generateSCSS(mockTokens);
            expect(scss).toContain('$base-blue-50: #3b82f6;');
            expect(scss).toContain('$fill-primary: $base-blue-50;'); // Smart alias resolution
            expect(scss).toContain('$tokens: (');
            expect(scss).toContain('"base-blue-50": #3b82f6');
        });
    });

    describe('generateTailwind', () => {
        it('should generate valid Tailwind config extend object', () => {
            const tw = generateTailwind(mockTokens);
            expect(tw).toContain('"extend": {');
            expect(tw).toContain('"colors": {');
            expect(tw).toContain('"base-blue-50": "var(--base-blue-50)"');
            expect(tw).toContain('"fill-primary": "var(--fill-primary)"');
        });
    });

    describe('generateJS', () => {
        it('should generate valid JavaScript object string with resolved aliases', () => {
            const js = generateJS(mockTokens);
            expect(js).toContain('export const tokens = {');
            expect(js).toContain('"base-blue-50": "#3b82f6"');
            expect(js).toContain('"fill-primary": "#3b82f6"'); // Resolved alias
        });
    });

    describe('regressions', () => {
        it('should flatten nested foundation color tokens', () => {
            const flattened = getFlattenedTokens(nestedAndMergedTokens);
            expect(flattened.find(t => t.name === 'base-blue-500')).toBeDefined();
            expect(flattened.find(t => t.cssVariable === '--base-blue-500')).toBeDefined();
        });

        it('should deep merge component sets without losing same component keys', () => {
            const css = generateCSS(nestedAndMergedTokens);
            expect(css).toContain('--button-Primary-base: #0EA5E9;');
            expect(css).toContain('--button-height-md: 40px;');
        });

        it('should respect token.type for component color classification', () => {
            const tailwind = generateTailwind(nestedAndMergedTokens);
            expect(tailwind).toContain('"button-Primary-base": "var(--button-Primary-base)"');
        });

        it('should include foundation siblings when base exists', () => {
            const flattened = getFlattenedTokens(foundationWithSiblingGroups);
            expect(flattened.find(t => t.name === 'base-blue-500')).toBeDefined();
            expect(flattened.find(t => t.name === 'spacing-md')).toBeDefined();
        });
    });
});
