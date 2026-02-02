'use client';

import React, { useState, useMemo } from 'react';
import type { TokenDocumentationProps } from '../types';
import { ColorGrid } from './ColorGrid';
import { SpacingScale } from './SpacingScale';
import { RadiusShowcase } from './RadiusShowcase';
import { SizeScale } from './SizeScale';

type TabType = string;

/**
 * TokenDocumentation - Main wrapper component for design token visualization
 * 
 * @example
 * ```tsx
 * import { TokenDocumentation } from 'figma-token-docs';
 * import 'figma-token-docs/styles.css';
 * import tokens from './tokens.json';
 * 
 * export default function DocsPage() {
 *   return <TokenDocumentation tokens={tokens} />;
 * }
 * ```
 */
export function TokenDocumentation({
    tokens,
    title = 'Design Tokens',
    subtitle = 'Interactive documentation for your design system',
    defaultTab = 'colors',
    showSearch = true,
    darkMode: initialDarkMode = false,
    onTokenClick,
}: TokenDocumentationProps) {
    const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);

    // Extract token sets dynamically
    const colorsValue = tokens['Colors/Value'];
    const spacingTokens = tokens['Spacing/Mode 1'] || tokens['Space/Mode 1'] || {};
    const sizeTokens = tokens['Size/Mode 1'] || {};
    const radiusTokens = tokens['Radius/Mode 1'] || {};
    
    // Get all other token sets dynamically (excluding special ones)
    const otherTokenSets = Object.entries(tokens)
        .filter(([key]) => ![
            'Colors/Value', 'Spacing/Mode 1', 'Space/Mode 1', 'Size/Mode 1', 'Radius/Mode 1',
            'global', '$themes', '$metadata'
        ].includes(key))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    // Available tabs based on token data
    const availableTabs = useMemo(() => {
        const tabs: { id: string; label: string; icon: string }[] = [];

        if (colorsValue) {
            tabs.push({ id: 'colors', label: 'Colors', icon: '🎨' });
        }
        if (Object.keys(spacingTokens).length > 0) {
            tabs.push({ id: 'spacing', label: 'Spacing', icon: '📏' });
        }
        if (Object.keys(sizeTokens).length > 0) {
            tabs.push({ id: 'sizes', label: 'Sizes', icon: '📐' });
        }
        if (Object.keys(radiusTokens).length > 0) {
            tabs.push({ id: 'radius', label: 'Radius', icon: '⬜' });
        }
        
        // Add dynamic tabs for any other token sets
        Object.entries(otherTokenSets).forEach(([key, value]) => {
            if (value && typeof value === 'object' && Object.keys(value).length > 0) {
                const cleanLabel = key.replace(/\/Mode \d+/, '').replace(/\//g, ' ');
                tabs.push({ 
                    id: key, 
                    label: cleanLabel, 
                    icon: '🧩' 
                });
            }
        });

        return tabs;
    }, [colorsValue, spacingTokens, sizeTokens, radiusTokens, otherTokenSets]);

    // Ensure active tab is valid
    const validActiveTab = availableTabs.some(t => t.id === activeTab)
        ? activeTab
        : availableTabs[0]?.id || 'colors';

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    return (
        <div className="ftd-container" data-theme={isDarkMode ? 'dark' : 'light'}>
            {/* Header */}
            <header className="ftd-header">
                <div>
                    <h1 className="ftd-title">{title}</h1>
                    <p className="ftd-subtitle">{subtitle}</p>
                </div>
                <button
                    className="ftd-theme-toggle"
                    onClick={toggleDarkMode}
                    aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {isDarkMode ? '☀️' : '🌙'}
                    <span>{isDarkMode ? 'Light' : 'Dark'}</span>
                </button>
            </header>

            {/* Search */}
            {showSearch && (
                <div className="ftd-search-container">
                    <div className="ftd-search-wrapper">
                        <svg
                            className="ftd-search-icon"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            className="ftd-search-input"
                            placeholder="Search tokens..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Tabs */}
            {availableTabs.length > 1 && (
                <nav className="ftd-tabs" role="tablist">
                    {availableTabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`ftd-tab ${validActiveTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            role="tab"
                            aria-selected={validActiveTab === tab.id}
                        >
                            <span style={{ marginRight: '8px' }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            )}

            {/* Tab Content */}
            <div role="tabpanel">
                {(() => {
                    // Handle built-in token types with special components
                    if (validActiveTab === 'colors' && colorsValue) {
                        return (
                            <ColorGrid
                                baseColors={colorsValue.base}
                                fillColors={colorsValue.fill}
                                strokeColors={colorsValue.stroke}
                                textColors={colorsValue.text}
                                onColorClick={onTokenClick}
                            />
                        );
                    }
                    
                    if (validActiveTab === 'spacing') {
                        return (
                            <SpacingScale
                                tokens={spacingTokens}
                                onTokenClick={onTokenClick}
                            />
                        );
                    }
                    
                    if (validActiveTab === 'sizes') {
                        return (
                            <SizeScale
                                tokens={sizeTokens}
                                onTokenClick={onTokenClick}
                            />
                        );
                    }
                    
                    if (validActiveTab === 'radius') {
                        return (
                            <RadiusShowcase
                                tokens={radiusTokens}
                                onTokenClick={onTokenClick}
                            />
                        );
                    }
                    
                    // Handle any other dynamic token sets
                    const tokenSet = (otherTokenSets as any)[validActiveTab];
                    if (!tokenSet) return null;
                    
                    return (
                        <div className="ftd-dynamic-tokens">
                            <h3>{availableTabs.find(t => t.id === validActiveTab)?.label || 'Tokens'}</h3>
                            {Object.entries(tokenSet).map(([componentName, componentData]) => (
                                <div key={componentName} className="ftd-component-section" style={{ marginBottom: '32px' }}>
                                    <h4 style={{ 
                                        textTransform: 'capitalize', 
                                        marginBottom: '24px', 
                                        color: 'var(--ftd-text-primary)',
                                        fontSize: '18px',
                                        fontWeight: '600'
                                    }}>
                                        {componentName} Component
                                    </h4>
                                    <div className="ftd-component-properties" style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                                        gap: '24px' 
                                    }}>
                                        {Object.entries(componentData as any).map(([propertyName, propertyTokens]) => (
                                            <div key={propertyName} className="ftd-property-group">
                                                <h5 style={{ 
                                                    textTransform: 'capitalize', 
                                                    marginBottom: '12px', 
                                                    color: 'var(--ftd-text-secondary)',
                                                    fontSize: '14px',
                                                    fontWeight: '500'
                                                }}>
                                                    {propertyName}
                                                </h5>
                                                <div className="ftd-property-tokens" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {Object.entries(propertyTokens as any).map(([tokenName, tokenData]) => (
                                                        <div 
                                                            key={tokenName} 
                                                            className="ftd-token-card" 
                                                            style={{ 
                                                                padding: '12px 16px', 
                                                                border: '1px solid var(--ftd-border-subtle)', 
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                backgroundColor: 'var(--ftd-bg-primary)'
                                                            }}
                                                            onClick={() => onTokenClick && onTokenClick({
                                                                name: tokenName,
                                                                value: (tokenData as any).value,
                                                                cssVariable: `--${componentName}-${propertyName}-${tokenName}`,
                                                                numericValue: 0
                                                            } as any)}
                                                        >
                                                            <div className="ftd-token-info">
                                                                <div className="ftd-token-name" style={{ 
                                                                    fontWeight: '500', 
                                                                    marginBottom: '2px',
                                                                    color: 'var(--ftd-text-primary)'
                                                                }}>
                                                                    {tokenName}
                                                                </div>
                                                                <div className="ftd-token-value" style={{ 
                                                                    color: 'var(--ftd-text-secondary)', 
                                                                    fontSize: '13px',
                                                                    fontFamily: 'monospace'
                                                                }}>
                                                                    {(tokenData as any).value}
                                                                </div>
                                                            </div>
                                                            {propertyName === 'fontsize' && (
                                                                <div style={{
                                                                    fontSize: (tokenData as any).value,
                                                                    color: 'var(--ftd-text-primary)',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    Aa
                                                                </div>
                                                            )}
                                                            {propertyName === 'radius' && (
                                                                <div style={{
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    backgroundColor: 'var(--ftd-accent-primary)',
                                                                    borderRadius: (tokenData as any).value
                                                                }} />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* Empty State */}
            {availableTabs.length === 0 && (
                <div className="ftd-empty">
                    <div className="ftd-empty-icon">📦</div>
                    <h4 className="ftd-empty-title">No tokens found</h4>
                    <p className="ftd-empty-text">
                        Pass a valid tokens.json file from Figma Token Studio
                    </p>
                </div>
            )}
        </div>
    );
}

export default TokenDocumentation;
