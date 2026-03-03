import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { TokenDocumentation } from '../src/components/TokenDocumentation';

expect.extend(axeMatchers);

describe('TokenDocumentation Component', () => {
    const mockTokens: any = {
        "Foundation/Value": {
            "base": {
                "blue": {
                    "500": { "value": "#3b82f6", "type": "color" }
                }
            }
        }
    };
    const nestedFoundationTokens: any = {
        "Foundation/Value": {
            "base": {
                "color": {
                    "blue": {
                        "500": { "value": "#2563EB", "type": "color" },
                        "600": { "value": "#1D4ED8", "type": "color" }
                    },
                    "gray": {
                        "100": { "value": "#F3F4F6", "type": "color" },
                        "900": { "value": "#111827", "type": "color" }
                    }
                },
                "spacing": {
                    "xs": { "value": "4px", "type": "spacing" }
                },
                "sizing": {
                    "md": { "value": "40px", "type": "sizing" }
                },
                "borderRadius": {
                    "sm": { "value": "6px", "type": "borderRadius" },
                    "md": { "value": "10px", "type": "borderRadius" }
                }
            }
        }
    };
    const arbitraryNamedFoundationTokens: any = {
        "Foundation/Value": {
            "base": {
                "primitives-v2": {
                    "palette": {
                        "brand": {
                            "500": { "value": "#2563EB", "type": "color" },
                            "600": { "value": "#1D4ED8", "type": "color" }
                        }
                    },
                    "layout-scale": {
                        "compact": { "value": "8px", "type": "spacing" },
                        "cozy": { "value": "16px", "type": "spacing" }
                    },
                    "box-metrics": {
                        "card": { "value": "40px", "type": "sizing" }
                    },
                    "shape-language": {
                        "soft": { "value": "10px", "type": "borderRadius" }
                    }
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
            },
            "sizing": {
                "lg": { "value": "48px", "type": "sizing" }
            },
            "borderRadius": {
                "sm": { "value": "6px", "type": "borderRadius" }
            }
        }
    };
    const typographyGroupedTokens: any = {
        "Foundation/Value": {
            "base": {
                "blue": {
                    "500": { "value": "#2563EB", "type": "color" }
                }
            },
            "fontFamily": {
                "sans": { "value": "'Inter', sans-serif", "type": "fontFamilies" }
            },
            "fontSize": {
                "md": { "value": "16px", "type": "fontSizes" }
            },
            "fontWeight": {
                "semibold": { "value": "600", "type": "fontWeights" }
            }
        }
    };

    it('should render the title and subtitle', () => {
        render(
            <TokenDocumentation
                tokens={mockTokens}
                title="Test Title"
                subtitle="Test Subtitle"
            />
        );

        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    it('should open search modal when search button is clicked', () => {
        render(<TokenDocumentation tokens={mockTokens} />);

        const searchButton = screen.getByTitle(/Search tokens/i);
        fireEvent.click(searchButton);

        // Search input should appear in the modal
        expect(screen.getByPlaceholderText(/Search tokens\.\.\./i)).toBeInTheDocument();
    });

    it('should open export modal when export button is clicked', () => {
        render(<TokenDocumentation tokens={mockTokens} />);

        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);

        // Export title should appear
        expect(screen.getByText('Export Tokens')).toBeInTheDocument();
        expect(screen.getByText(/Generate and download code snippets/i)).toBeInTheDocument();
    });

    it('should render base color families and border radius from Foundation/Value.base', async () => {
        render(<TokenDocumentation tokens={nestedFoundationTokens} />);

        const colorSections = await screen.findAllByText('color');
        expect(colorSections.length).toBeGreaterThan(0);
        expect(screen.getByText('blue')).toBeInTheDocument();
        expect(screen.getByText('gray')).toBeInTheDocument();
        const borderRadiusSections = screen.getAllByText('borderRadius');
        expect(borderRadiusSections.length).toBeGreaterThan(0);
    });

    it('should render foundation sections even when token group names are arbitrary', async () => {
        render(<TokenDocumentation tokens={arbitraryNamedFoundationTokens} />);

        const colorSections = await screen.findAllByText('color');
        expect(colorSections.length).toBeGreaterThan(0);
        expect(screen.getByText('primitives-v2-brand')).toBeInTheDocument();
        const spacingSections = screen.getAllByText('spacing');
        expect(spacingSections.length).toBeGreaterThan(0);
        const sizingSections = screen.getAllByText('sizing');
        expect(sizingSections.length).toBeGreaterThan(0);
        const borderRadiusSections = screen.getAllByText('borderRadius');
        expect(borderRadiusSections.length).toBeGreaterThan(0);
    });

    it('should render sibling foundation groups when base exists', async () => {
        render(<TokenDocumentation tokens={foundationWithSiblingGroups} />);

        const colorSections = await screen.findAllByText('color');
        expect(colorSections.length).toBeGreaterThan(0);
        const spacingSections = screen.getAllByText('spacing');
        expect(spacingSections.length).toBeGreaterThan(0);
        const sizingSections = screen.getAllByText('sizing');
        expect(sizingSections.length).toBeGreaterThan(0);
        const borderRadiusSections = screen.getAllByText('borderRadius');
        expect(borderRadiusSections.length).toBeGreaterThan(0);
    });

    it('should group typography tokens by top-level token names', async () => {
        render(<TokenDocumentation tokens={typographyGroupedTokens} />);

        const fontFamiliesSections = await screen.findAllByText('fontFamilies');
        expect(fontFamiliesSections.length).toBeGreaterThan(0);
        const fontSizesSections = screen.getAllByText('fontSizes');
        expect(fontSizesSections.length).toBeGreaterThan(0);
        const fontWeightsSections = screen.getAllByText('fontWeights');
        expect(fontWeightsSections.length).toBeGreaterThan(0);
    });

    it('should toggle dark mode theme', () => {
        const { container } = render(<TokenDocumentation tokens={mockTokens} />);
        const ftdContainer = container.querySelector('.ftd-container');

        const themeToggle = screen.getByTitle(/Switch to dark mode/i) || screen.getByTitle(/Switch to light mode/i);

        // Initially light or default (assuming light for this test)
        expect(ftdContainer).toHaveAttribute('data-theme', 'light');

        fireEvent.click(themeToggle);
        expect(ftdContainer).toHaveAttribute('data-theme', 'dark');

        fireEvent.click(themeToggle);
        expect(ftdContainer).toHaveAttribute('data-theme', 'light');
    });

    describe('Accessibility', () => {
        it('should have no basic accessibility violations', async () => {
            const { container } = render(<TokenDocumentation tokens={mockTokens} />);
            const results = await axe(container);
            // @ts-expect-error - toHaveNoViolations is extended via vitest-axe/matchers
            expect(results).toHaveNoViolations();
        });

        it('should have accessible interactive elements', () => {
            render(<TokenDocumentation tokens={mockTokens} />);
            expect(screen.getByTitle(/Search tokens/i)).toHaveAttribute('aria-label', 'Search tokens');
            expect(screen.getByRole('button', { name: /Export/i })).toHaveAttribute('type', 'button');
        });
    });

    describe('Mobile Layout', () => {
        it('should adapt to small viewports', () => {
            // Mock window width
            global.innerWidth = 375;
            global.dispatchEvent(new Event('resize'));

            render(<TokenDocumentation tokens={mockTokens} />);

            // On mobile, certain elements might change or be hidden/visible
            // Just verifying it renders without crashing in "mobile mode"
            expect(screen.getByText(/Design Tokens/i)).toBeInTheDocument();
        });
    });

    describe('Format Selector', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('should render format selector with default CSS Variables', () => {
            render(<TokenDocumentation tokens={mockTokens} />);
            expect(screen.getByText('CSS Variables')).toBeInTheDocument();
        });

        it('should switch to SCSS format when selected', () => {
            render(<TokenDocumentation tokens={mockTokens} />);
            
            const formatButton = screen.getByText('CSS Variables');
            fireEvent.click(formatButton);
            
            const scssOption = screen.getByText('SCSS Variables');
            fireEvent.click(scssOption);
            
            expect(screen.getByText('SCSS Variables')).toBeInTheDocument();
        });

        it('should switch to Tailwind format when selected', () => {
            render(<TokenDocumentation tokens={mockTokens} />);
            
            const formatButton = screen.getByText('CSS Variables');
            fireEvent.click(formatButton);
            
            const tailwindOption = screen.getByText('Tailwind Classes');
            fireEvent.click(tailwindOption);
            
            expect(screen.getByText('Tailwind Classes')).toBeInTheDocument();
        });

        it('should persist format selection in localStorage', () => {
            render(<TokenDocumentation tokens={mockTokens} />);
            
            const formatButton = screen.getByText('CSS Variables');
            fireEvent.click(formatButton);
            
            const scssOption = screen.getByText('SCSS Variables');
            fireEvent.click(scssOption);
            
            expect(localStorage.getItem('ftd-copy-format')).toBe('scss');
        });

        it('should load format preference from localStorage', () => {
            localStorage.setItem('ftd-copy-format', 'tailwind');
            
            render(<TokenDocumentation tokens={mockTokens} />);
            
            expect(screen.getByText('Tailwind Classes')).toBeInTheDocument();
        });
    });
});
