'use client';

import React, { useState, useMemo } from 'react';
import type { TokenDocumentationProps, FigmaTokens, NestedTokens, VariantTokens, DimensionGroup } from '../types';
import { ColorGrid } from './ColorGrid';
import { SpacingScale } from './SpacingScale';
import { RadiusShowcase } from './RadiusShowcase';
import { SizeScale } from './SizeScale';
import { createTokenMap, resolveTokenValue, findAllTokens, parseBaseColors, parseSemanticColors, parseSpacingTokens, parseSizeTokens, parseRadiusTokens } from '../utils';

type TabType = string;

interface ComponentData {
    variants: Record<string, VariantTokens>;
    dimensions: Record<string, DimensionGroup>;
}

/**
 * TokenDocumentation - Production-ready Design System Documentation
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
    const [activeTab, setActiveTab] = useState<TabType | null>(defaultTab || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // --- 1. Create Global Token Map for Resolution ---
    const tokenMap = useMemo(() => createTokenMap(tokens), [tokens]);

    // --- 2. Dynamic Category Detection ---
    const categorizedData = useMemo(() => {
        const categories: Record<string, Record<string, any>> = {
            colors: {},
            spacing: {},
            sizes: {},
            radius: {},
            components: {}
        };

        const isSingleToken = (obj: any): boolean =>
            obj && typeof obj === 'object' && obj.hasOwnProperty('value') && obj.hasOwnProperty('type');

        // Helper to detect type of a token set
        const detectType = (set: any, name: string): string => {
            const allTokens = findAllTokens(set);
            if (allTokens.length === 0) return 'other';

            // Check if it's a semantic color set (Colors/Value pattern)
            if (set.base || set.fill || set.stroke || set.text) return 'colors';

            const types = new Set(allTokens.map(t => t.token.type));
            const nameLower = name.toLowerCase();

            if (types.has('color')) return 'colors';
            if (types.has('spacing') || nameLower.includes('space') || nameLower.includes('spacing')) return 'spacing';
            if (types.has('sizing') || ['size', 'width', 'height'].some(n => nameLower.includes(n))) return 'sizes';
            if (types.has('borderRadius') || nameLower.includes('radius') || nameLower.includes('border')) return 'radius';

            // If it has deeply nested structures that aren't tokens, it's likely components
            const hasNestedNonTokens = Object.values(set).some(v => v && typeof v === 'object' && !isSingleToken(v));
            if (hasNestedNonTokens) return 'components';

            return 'other';
        };

        Object.entries(tokens).forEach(([key, value]) => {
            if (['global', '$themes', '$metadata'].includes(key)) return;
            const type = detectType(value, key);
            if (categories[type]) {
                categories[type][key] = value;
            }
        });

        return categories;
    }, [tokens]);

    // --- 3. Component Processing (Dynamic Variants) ---
    const mergedComponents = useMemo(() => {
        const components: Record<string, ComponentData> = {};

        const isSingleToken = (obj: any): boolean =>
            obj && typeof obj === 'object' && obj.hasOwnProperty('value') && obj.hasOwnProperty('type');

        const isDimensionGroup = (obj: any): boolean => {
            if (!obj || typeof obj !== 'object') return false;
            const values = Object.values(obj);
            return values.length > 0 && values.every((v: any) => isSingleToken(v) && (v.type === 'dimension' || v.type === 'spacing' || v.type === 'sizing' || v.type === 'borderRadius'));
        };

        Object.entries(categorizedData.components || {}).forEach(([_, setData]) => {
            Object.entries(setData as any).forEach(([compName, content]) => {
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
        });
        return components;
    }, [categorizedData]);

    // --- 4. Available Tabs ---
    const availableTabs = useMemo(() => {
        const tabs: Array<{ id: string; label: string; icon: string }> = [];
        const config: Record<string, { label: string; icon: string }> = {
            colors: { label: 'Colors', icon: '🎨' },
            spacing: { label: 'Spacing', icon: '📏' },
            sizes: { label: 'Sizes', icon: '📐' },
            radius: { label: 'Radius', icon: '⬜' },
            components: { label: 'Components', icon: '🧩' }
        };

        Object.keys(config).forEach(type => {
            const hasData = type === 'components'
                ? Object.keys(mergedComponents).length > 0
                : Object.keys(categorizedData[type] || {}).length > 0;

            if (hasData) {
                tabs.push({ id: type, ...config[type] });
            }
        });
        return tabs;
    }, [categorizedData, mergedComponents]);

    const currentTab = activeTab && availableTabs.some(t => t.id === activeTab)
        ? activeTab
        : (availableTabs[0]?.id || 'colors');

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
                    <button className="ftd-theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
                        {isDarkMode ? '☀️ Light' : '🌙 Dark'}
                    </button>
                </header>

                {availableTabs.length > 1 && (
                    <nav className="ftd-tabs">
                        {availableTabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`ftd-tab ${currentTab === tab.id ? 'active' : ''}`}
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
                {currentTab === 'colors' && Object.entries(categorizedData.colors || {}).map(([setName, setData]) => (
                    <div key={setName} className="ftd-set-section">
                        {Object.keys(categorizedData.colors).length > 1 && <h2 className="ftd-set-title">{setName}</h2>}
                        <ColorGrid
                            baseColors={setData.base}
                            fillColors={setData.fill}
                            strokeColors={setData.stroke}
                            textColors={setData.text}
                            tokenMap={tokenMap}
                            onColorClick={onTokenClick}
                        />
                    </div>
                ))}

                {currentTab === 'spacing' && Object.entries(categorizedData.spacing || {}).map(([setName, setData]) => (
                    <div key={setName} className="ftd-set-section">
                        {Object.keys(categorizedData.spacing).length > 1 && <h2 className="ftd-set-title">{setName}</h2>}
                        <SpacingScale tokens={setData} onTokenClick={onTokenClick} />
                    </div>
                ))}

                {currentTab === 'sizes' && Object.entries(categorizedData.sizes || {}).map(([setName, setData]) => (
                    <div key={setName} className="ftd-set-section">
                        {Object.keys(categorizedData.sizes).length > 1 && <h2 className="ftd-set-title">{setName}</h2>}
                        <SizeScale tokens={setData} onTokenClick={onTokenClick} />
                    </div>
                ))}

                {currentTab === 'radius' && Object.entries(categorizedData.radius || {}).map(([setName, setData]) => (
                    <div key={setName} className="ftd-set-section">
                        {Object.keys(categorizedData.radius).length > 1 && <h2 className="ftd-set-title">{setName}</h2>}
                        <RadiusShowcase tokens={setData} onTokenClick={onTokenClick} />
                    </div>
                ))}

                {currentTab === 'components' && (
                    <div className="ftd-components-showcase">
                        {Object.entries(mergedComponents).map(([name, data]) => {
                            const variants = Object.keys(data.variants);
                            if (variants.length === 0) return null;

                            return (
                                <div key={name} className="ftd-component-section">
                                    <div className="ftd-section-header">
                                        <h3 className="ftd-section-title">{name}</h3>
                                        <span className="ftd-section-badge">{variants.length} Variants</span>
                                    </div>

                                    <div className="ftd-variants-grid">
                                        {variants.map(v => (
                                            <VariantCard
                                                key={v}
                                                variantName={v}
                                                variantTokens={data.variants[v]}
                                                dimensionGroups={data.dimensions}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TokenDocumentation;