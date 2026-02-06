'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { TokenDocumentationProps, FigmaTokens, NestedTokens, VariantTokens, DimensionGroup } from '../types';
import { FoundationTab } from './FoundationTab';
import { SemanticTab } from './SemanticTab';
import { ComponentsTab } from './ComponentsTab';
import { SearchModal } from './SearchModal';
import { ExportModal } from './ExportModal';
import { createTokenMap, resolveTokenValue, findAllTokens } from '../utils/core';

type TabType = 'foundation' | 'semantic' | 'components';

interface ComponentData {
    variants: Record<string, VariantTokens>;
    dimensions: Record<string, DimensionGroup>;
}

/**
 * TokenDocumentation - Production-ready Design System Documentation
 * Displays tokens in three main tabs: Foundation, Semantic, and Components
 */
export function TokenDocumentation({
    tokens,
    title = 'Design Tokens',
    subtitle = 'Interactive documentation for your design system',
    defaultTab,
    showSearch = true,
    darkMode: initialDarkMode = false,
    onTokenClick,
}: TokenDocumentationProps) {
    // State
    const [activeTab, setActiveTab] = useState<TabType>((defaultTab as TabType) || 'foundation');
    const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);

    // Initial theme restoration
    useEffect(() => {
        const savedTheme = localStorage.getItem('ftd-theme-preference');
        if (savedTheme === 'dark') setIsDarkMode(true);
        else if (savedTheme === 'light') setIsDarkMode(false);
    }, []);

    const toggleTheme = () => {
        setIsDarkMode(prev => {
            const next = !prev;
            localStorage.setItem('ftd-theme-preference', next ? 'dark' : 'light');
            return next;
        });
    };

    // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Handle scrolling to and highlighting a specific token
    const handleScrollToToken = (tokenName: string, category: string) => {
        // Wait a bit for tab content to render
        setTimeout(() => {
            // Try to find the token element by data attribute or text content
            // Look for elements that might contain the token name
            const possibleSelectors = [
                `[data-token-name="${tokenName}"]`,
                `[data-token="${tokenName}"]`,
            ];

            let tokenElement: HTMLElement | null = null;

            for (const selector of possibleSelectors) {
                tokenElement = document.querySelector(selector);
                if (tokenElement) break;
            }

            // If not found by data attribute, try finding by text content
            if (!tokenElement) {
                const allElements = document.querySelectorAll('.ftd-color-shade, .ftd-spacing-item, .ftd-size-item, .ftd-radius-item, .ftd-token-card, .ftd-search-result-item');
                for (const el of Array.from(allElements)) {
                    if (el.textContent?.includes(tokenName)) {
                        tokenElement = el as HTMLElement;
                        break;
                    }
                }
            }

            if (tokenElement) {
                // Scroll to the element
                tokenElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });

                // Add highlight class
                tokenElement.classList.add('ftd-token-highlight');

                // Helper to remove highlight
                const removeHighlight = () => {
                    tokenElement?.classList.remove('ftd-token-highlight');
                    document.removeEventListener('mousedown', removeHighlight);
                };

                // Remove highlight after 6 seconds automatically
                const timeoutId = setTimeout(removeHighlight, 6000);

                // Or remove immediately on any click
                document.addEventListener('mousedown', () => {
                    clearTimeout(timeoutId);
                    removeHighlight();
                }, { once: true });
            }
        }, 200);
    };

    // --- Extract the three main token sets ---
    const { foundationTokens, semanticTokens, componentTokens } = useMemo(() => {
        const foundationData = (tokens as any)["Foundation/Value"] || {};
        // Foundation tokens are nested under 'base', extract that level
        const foundation = foundationData.base || foundationData;

        const semantic = (tokens as any)["Semantic/Value"] || {};

        // Extract all component sets (e.g., "Components/Mode 1", "Components/Mode 2", etc.)
        const components = Object.entries(tokens)
            .filter(([key]) => key.startsWith("Components/"))
            .reduce((acc, [key, val]) => {
                // Merge all component sets
                if (val && typeof val === 'object') {
                    return { ...acc, ...val };
                }
                return acc;
            }, {});

        return {
            foundationTokens: foundation,
            semanticTokens: semantic,
            componentTokens: components,
        };
    }, [tokens]);

    // --- Create Global Token Map for Resolution ---
    const tokenMap = useMemo(() => createTokenMap(tokens), [tokens]);

    // --- Determine which tabs to show ---
    const availableTabs = useMemo(() => {
        const tabs: Array<{ id: TabType; label: string; icon: string }> = [];

        if (Object.keys(foundationTokens).length > 0) {
            tabs.push({ id: 'foundation', label: 'Foundation', icon: '🏗️' });
        }

        if (Object.keys(semanticTokens).length > 0) {
            tabs.push({ id: 'semantic', label: 'Semantic', icon: '🎨' });
        }

        if (Object.keys(componentTokens).length > 0) {
            tabs.push({ id: 'components', label: 'Components', icon: '🧩' });
        }

        return tabs;
    }, [foundationTokens, semanticTokens, componentTokens]);

    // --- Component Processing (Dynamic Variants) ---
    const mergedComponents = useMemo(() => {
        const components: Record<string, ComponentData> = {};

        const isSingleToken = (obj: any): boolean =>
            obj && typeof obj === 'object' && obj.hasOwnProperty('value') && obj.hasOwnProperty('type');

        const isDimensionGroup = (obj: any): boolean => {
            if (!obj || typeof obj !== 'object') return false;
            const values = Object.values(obj);
            return values.length > 0 && values.every((v: any) => isSingleToken(v) && (v.type === 'dimension' || v.type === 'spacing' || v.type === 'sizing' || v.type === 'borderRadius'));
        };

        Object.entries(componentTokens).forEach(([compName, content]) => {
            if (!content || typeof content !== 'object' || isSingleToken(content)) return;

            if (!components[compName]) components[compName] = { variants: {}, dimensions: {} };

            Object.entries(content as any).forEach(([itemKey, itemValue]) => {
                if (isDimensionGroup(itemValue)) {
                    components[compName].dimensions[itemKey] = itemValue as DimensionGroup;
                } else if (typeof itemValue === 'object' && !isSingleToken(itemValue)) {
                    // It's a variant (e.g. "Primary", "Ghost", "Large")
                    components[compName].variants[itemKey] = itemValue as VariantTokens;
                }
            });
        });

        return components;
    }, [componentTokens]);

    // --- Interaction ---
    const handleCopy = (value: string, label: string) => {
        navigator.clipboard.writeText(value);
        setCopiedToken(label || value);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const getResolvedColor = (variantTokens: VariantTokens, patterns: string[]) => {
        for (const pattern of patterns) {
            const entry = Object.entries(variantTokens).find(([key]) => {
                const k = key.toLowerCase();
                return k === pattern || k.includes(pattern);
            });
            if (entry && isSingleToken(entry[1])) {
                const val = (entry[1] as any).value;
                return { name: entry[0], reference: val, resolved: resolveTokenValue(val, tokenMap) };
            }
        }
        return null;
    };

    const isSingleToken = (obj: any): boolean =>
        obj && typeof obj === 'object' && obj.hasOwnProperty('value') && obj.hasOwnProperty('type');

    // --- Sub-Components ---

    const TableSwatch = ({ data }: { data: { reference: string; resolved: string } | null }) => {
        if (!data) return <span className="ftd-cell-empty">-</span>;

        return (
            <div className="ftd-table-swatch-container" onClick={() => handleCopy(data.resolved, data.reference)}>
                <div className="ftd-table-swatch" style={{ backgroundColor: data.resolved }} />
                <div className="ftd-table-value-group">
                    <code className="ftd-table-hex">{data.resolved}</code>
                    <span className="ftd-table-ref" title={data.reference}>
                        {data.reference.startsWith('{') ? data.reference.slice(1, -1).split('.').pop() : 'Raw'}
                    </span>
                </div>
            </div>
        );
    };

    const VariantCard = ({
        variantName,
        variantTokens,
        dimensionGroups
    }: {
        variantName: string;
        variantTokens: VariantTokens;
        dimensionGroups: Record<string, DimensionGroup>;
    }) => {
        const states = ['default', 'hover', 'active', 'disabled', 'focus'];
        const properties = ['fill', 'bg', 'background', 'stroke', 'border', 'text', 'foreground', 'color'];

        const getColorForState = (propGroup: string[], state: string) => {
            const searchPatterns = state === 'default'
                ? propGroup
                : propGroup.map(p => `${p}-${state}`).concat(propGroup.map(p => `${p}${state}`));
            return getResolvedColor(variantTokens, searchPatterns);
        };

        // Preview Logic
        const fill = getColorForState(['fill', 'bg', 'background'], 'default')?.resolved || 'var(--ftd-bg-subtle)';
        const stroke = getColorForState(['stroke', 'border'], 'default')?.resolved || 'transparent';
        const text = getColorForState(['text', 'foreground', 'color'], 'default')?.resolved || 'var(--ftd-text-main)';

        const radiusToken = dimensionGroups['radius']?.md || dimensionGroups['borderRadius']?.md || Object.values(dimensionGroups)[0]?.md;
        const radius = radiusToken ? resolveTokenValue(radiusToken.value, tokenMap) : '8px';

        return (
            <div className="ftd-variant-card">
                <div className="ftd-variant-header">
                    <span className="ftd-variant-name">{variantName}</span>
                </div>

                <div className="ftd-variant-body">
                    <div className="ftd-variant-preview">
                        <button
                            className="ftd-variant-button"
                            style={{
                                backgroundColor: fill,
                                color: text,
                                border: stroke !== 'transparent' ? `1.5px solid ${stroke}` : 'none',
                                borderRadius: radius,
                                padding: '10px 20px',
                                fontWeight: 600,
                                cursor: 'default'
                            }}
                        >
                            Preview
                        </button>
                    </div>

                    <div className="ftd-variant-table-wrapper">
                        <table className="ftd-variant-table">
                            <thead>
                                <tr>
                                    <th>State</th>
                                    <th>Fill</th>
                                    <th>Border</th>
                                    <th>Text</th>
                                </tr>
                            </thead>
                            <tbody>
                                {states.map(state => {
                                    const fillData = getColorForState(['fill', 'bg', 'background'], state);
                                    const strokeData = getColorForState(['stroke', 'border'], state);
                                    const textData = getColorForState(['text', 'foreground', 'color'], state);

                                    if (state !== 'default' && !fillData && !strokeData && !textData) return null;

                                    return (
                                        <tr key={state}>
                                            <td className="ftd-cell-label">{state}</td>
                                            <td><TableSwatch data={fillData} /></td>
                                            <td><TableSwatch data={strokeData} /></td>
                                            <td><TableSwatch data={textData} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="ftd-container" data-theme={isDarkMode ? 'dark' : 'light'}>
            {copiedToken && <div className="ftd-copied-toast">Copied: {copiedToken}</div>}

            <div className="ftd-navbar-sticky">
                <header className="ftd-header">
                    <div className="ftd-title-wrapper">
                        <h1 className="ftd-title">{title}</h1>
                        <p className="ftd-subtitle">{subtitle}</p>
                    </div>
                    <div className="ftd-header-actions">
                        <button className="ftd-export-button-nav" onClick={() => setExportOpen(true)} type="button">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span>Export</span>
                        </button>
                        <button
                            className="ftd-search-button"
                            onClick={() => setSearchOpen(true)}
                            title="Search tokens (Cmd+K)"
                            aria-label="Search tokens"
                            type="button"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <span>Search</span>
                            <kbd className="ftd-search-shortcut">⌘K</kbd>
                        </button>
                        <button
                            className="ftd-theme-toggle"
                            onClick={toggleTheme}
                            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                            type="button"
                        >
                            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
                        </button>
                    </div>
                </header>

                {availableTabs.length > 1 && (
                    <nav className="ftd-tabs">
                        {availableTabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`ftd-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span style={{ marginRight: '8px' }}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                )}
            </div>

            <div className="ftd-content">
                {activeTab === 'foundation' && (
                    <FoundationTab
                        tokens={foundationTokens}
                        tokenMap={tokenMap}
                        onTokenClick={onTokenClick}
                    />
                )}

                {activeTab === 'semantic' && (
                    <SemanticTab
                        tokens={semanticTokens}
                        tokenMap={tokenMap}
                        onTokenClick={onTokenClick}
                    />
                )}

                {activeTab === 'components' && (
                    <ComponentsTab
                        components={mergedComponents}
                        onCopy={handleCopy}
                    />
                )}
            </div>

            {/* Search Modal */}
            <SearchModal
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
                tokens={tokens}
                onTokenClick={onTokenClick}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onScrollToToken={handleScrollToToken}
            />

            {/* Export Modal */}
            <ExportModal
                isOpen={exportOpen}
                onClose={() => setExportOpen(false)}
                tokens={tokens}
            />
        </div>
    );
}

export default TokenDocumentation;