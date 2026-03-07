import { describe, it, expect, vi } from 'vitest';
import { 
    isTokenValue, 
    normalizeTokenSetsRoot,
    parseNumericValue, 
    toCssVariable, 
    getFoundationTokenTree,
    extractSemanticSet,
    extractComponentSet,
    getContrastColor, 
    resolveTokenValue,
    createTokenMap,
    copyToClipboard
} from '../src/utils';

describe('Core Utils', () => {
    describe('isTokenValue', () => {
        it('should correctly identify token objects', () => {
            expect(isTokenValue({ value: '#fff', type: 'color' })).toBe(true);
            expect(isTokenValue({ value: 16, type: 'dimension' })).toBe(true);
            expect(isTokenValue({ something: 'else' })).toBe(false);
            expect(isTokenValue(null)).toBe(false);
        });
    });

    describe('parseNumericValue', () => {
        it('should extract numbers from strings', () => {
            expect(parseNumericValue('16px')).toBe(16);
            expect(parseNumericValue('1.5rem')).toBe(1.5);
            expect(parseNumericValue('-4px')).toBe(-4);
            expect(parseNumericValue('0')).toBe(0);
            expect(parseNumericValue(24 as any)).toBe(24);
        });
    });

    describe('toCssVariable', () => {
        it('should format paths correctly', () => {
            expect(toCssVariable('base/blue/50')).toBe('--base-blue-50');
            expect(toCssVariable('blue.50')).toBe('--blue-50');
            expect(toCssVariable('Brand Primary Color')).toBe('--brand-primary-color');
            expect(toCssVariable('spacing.md', 'ftd')).toBe('--ftd-spacing-md');
            expect(toCssVariable('borderRadius.sm')).toBe('--border-radius-sm');
        });
    });

    describe('getFoundationTokenTree', () => {
        it('should keep sibling groups when base exists', () => {
            const source: any = {
                'Foundation/Value': {
                    base: { blue: { '500': { value: '#3b82f6', type: 'color' } } },
                    spacing: { md: { value: '16px', type: 'spacing' } }
                }
            };

            const foundation = getFoundationTokenTree(source);
            expect((foundation as any).base).toBeDefined();
            expect((foundation as any).spacing).toBeDefined();
        });

        it('should unwrap single base wrapper', () => {
            const source: any = {
                'Foundation/Value': {
                    base: {
                        spacing: { md: { value: '16px', type: 'spacing' } }
                    }
                }
            };

            const foundation = getFoundationTokenTree(source);
            expect((foundation as any).spacing).toBeDefined();
            expect((foundation as any).base).toBeUndefined();
        });

        it('should unwrap a single collection wrapper that contains foundation, semantic, and components sets', () => {
            const source: any = {
                tokens: {
                    Foundation: {
                        Foundation: {
                            color: {
                                primary: {
                                    '500': { value: '#3b82f6', type: 'color' }
                                }
                            }
                        },
                        Semantic: {
                            color: {
                                primary: { value: '{Foundation.color.primary.500}', type: 'color' }
                            }
                        },
                        Components: {
                            Button: {
                                primary: {
                                    background: { value: '{Semantic.color.primary}', type: 'color' }
                                }
                            }
                        }
                    }
                }
            };

            const normalized = normalizeTokenSetsRoot(source);
            expect((normalized as any).Foundation).toBeDefined();
            expect((normalized as any).Semantic).toBeDefined();
            expect((normalized as any).Components).toBeDefined();

            const foundation = getFoundationTokenTree(source);
            const semantic = extractSemanticSet(source);
            const components = extractComponentSet(source);

            expect((foundation as any).color.primary['500']).toBeDefined();
            expect((semantic as any).color.primary).toBeDefined();
            expect((components as any).Button.primary.background).toBeDefined();
        });

        it('should merge mode-like semantic wrappers', () => {
            const source: any = {
                Semantic: {
                    'Mode 1': {
                        color: {
                            primary: { value: '{Foundation.color.primary.500}', type: 'color' }
                        }
                    }
                }
            };

            const semantic = extractSemanticSet(source);
            expect((semantic as any).color.primary).toBeDefined();
        });
    });

    describe('getContrastColor', () => {
        it('should return white for dark backgrounds and black for light backgrounds', () => {
            expect(getContrastColor('#000000')).toBe('white'); // Black
            expect(getContrastColor('#ffffff')).toBe('black'); // White
            expect(getContrastColor('#3b82f6')).toBe('white'); // Primary Blue
            expect(getContrastColor('#facc15')).toBe('black'); // Bright Yellow
        });

        it('should handle 3-char hex codes', () => {
            expect(getContrastColor('#000')).toBe('white');
            expect(getContrastColor('#fff')).toBe('black');
        });
    });

    describe('Token Resolution', () => {
        const tokenMap = {
            'base.blue.50': '#eff6ff',
            'base.blue.500': '#3b82f6',
            'semantic.primary': '{base.blue.500}',
            'component.button.bg': '{semantic.primary}',
            'deep.alias': '{component.button.bg}'
        };

        it('should resolve direct aliases', () => {
            expect(resolveTokenValue('{base.blue.500}', tokenMap)).toBe('#3b82f6');
        });

        it('should resolve multi-level aliases', () => {
            expect(resolveTokenValue('{component.button.bg}', tokenMap)).toBe('#3b82f6');
            expect(resolveTokenValue('{deep.alias}', tokenMap)).toBe('#3b82f6');
        });

        it('should return raw value if not an alias', () => {
            expect(resolveTokenValue('#ffffff', tokenMap)).toBe('#ffffff');
            expect(resolveTokenValue('16px', tokenMap)).toBe('16px');
        });

        it('should handle broken aliases gracefully', () => {
            expect(resolveTokenValue('{non.existent}', tokenMap)).toBe('{non.existent}');
        });
    });

    describe('copyToClipboard', () => {
        it('should fall back to execCommand when Clipboard API is unavailable', async () => {
            const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
            const originalExecCommand = (document as any).execCommand;
            const execSpy = vi.fn(() => true);
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                get: () => undefined
            });
            (document as any).execCommand = execSpy;

            const result = await copyToClipboard('hello');

            expect(result).toBe(true);
            expect(execSpy).toHaveBeenCalledWith('copy');
            if (clipboardDescriptor) {
                Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
            } else {
                delete (navigator as any).clipboard;
            }
            (document as any).execCommand = originalExecCommand;
        });
    });
});
