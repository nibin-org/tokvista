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
                            {Object.entries(tokenSet).map(([componentName, componentData]) => {
                                const buttonData = componentData as any;
                                
                                // Check if this is a button component with variants
                                const hasVariants = buttonData.primary || buttonData.secondary || buttonData.tertiary;
                                
                                if (hasVariants) {
                                    // Button component with variants
                                    const variants = ['primary', 'secondary', 'tertiary'].filter(v => buttonData[v]);
                                    const fontSize = buttonData.fontsize?.md?.value || '14px';
                                    const lineHeight = buttonData['line-height']?.md?.value || '24px';
                                    const borderRadius = buttonData.radius?.md?.value || '6px';
                                    
                                    return (
                                        <div key={componentName} className="ftd-component-section" style={{ marginBottom: '48px' }}>
                                            <h4 style={{ 
                                                margin: '0 0 32px 0',
                                                color: 'var(--ftd-text-primary)',
                                                fontSize: '24px',
                                                fontWeight: '700',
                                                textAlign: 'center'
                                            }}>
                                                {componentName.charAt(0).toUpperCase() + componentName.slice(1)} Component
                                            </h4>
                                            
                                            {/* Button Variants Preview */}
                                            <div style={{
                                                padding: '32px',
                                                backgroundColor: 'var(--ftd-bg-secondary)',
                                                borderRadius: '16px',
                                                marginBottom: '32px'
                                            }}>
                                                <h5 style={{ 
                                                    margin: '0 0 24px 0',
                                                    color: 'var(--ftd-text-primary)',
                                                    fontSize: '18px',
                                                    fontWeight: '600',
                                                    textAlign: 'center'
                                                }}>
                                                    Button Variants
                                                </h5>
                                                
                                                <div style={{ 
                                                    display: 'grid', 
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                                    gap: '24px',
                                                    marginBottom: '32px'
                                                }}>
                                                    {variants.map(variant => {
                                                        const variantData = buttonData[variant];
                                                        const fillColor = variantData.fill?.value?.replace(/[{}]/g, '') || '#3b82f6';
                                                        const textColor = variantData.text?.value?.replace(/[{}]/g, '') || '#ffffff';
                                                        const strokeColor = variantData.stroke?.value?.replace(/[{}]/g, '') || 'transparent';
                                                        
                                                        return (
                                                            <div key={variant} style={{ textAlign: 'center' }}>
                                                                <button
                                                                    style={{
                                                                        fontSize: fontSize,
                                                                        lineHeight: lineHeight,
                                                                        borderRadius: borderRadius,
                                                                        padding: '12px 24px',
                                                                        backgroundColor: variant === 'primary' ? 'var(--ftd-accent-primary)' : 
                                                                                       variant === 'secondary' ? 'transparent' : 'transparent',
                                                                        color: variant === 'primary' ? 'white' : 
                                                                               variant === 'secondary' ? 'var(--ftd-text-primary)' : 'var(--ftd-accent-primary)',
                                                                        border: variant === 'secondary' ? '1px solid var(--ftd-border-subtle)' : 'none',
                                                                        cursor: 'pointer',
                                                                        fontWeight: '500',
                                                                        transition: 'all 0.2s ease',
                                                                        minWidth: '120px',
                                                                        textDecoration: variant === 'tertiary' ? 'underline' : 'none'
                                                                    }}
                                                                    onMouseOver={(e) => {
                                                                        if (variant === 'primary') {
                                                                            e.currentTarget.style.backgroundColor = 'var(--ftd-accent-primary-hover)';
                                                                        } else if (variant === 'secondary') {
                                                                            e.currentTarget.style.backgroundColor = 'var(--ftd-bg-secondary)';
                                                                        }
                                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                                    }}
                                                                    onMouseOut={(e) => {
                                                                        if (variant === 'primary') {
                                                                            e.currentTarget.style.backgroundColor = 'var(--ftd-accent-primary)';
                                                                        } else if (variant === 'secondary') {
                                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                                        }
                                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                                    }}
                                                                >
                                                                    {variant.charAt(0).toUpperCase() + variant.slice(1)}
                                                                </button>
                                                                <p style={{ 
                                                                    margin: '8px 0 0 0', 
                                                                    fontSize: '12px', 
                                                                    color: 'var(--ftd-text-secondary)',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {variant.toUpperCase()}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                
                                                {/* Size Variations */}
                                                <h6 style={{ 
                                                    margin: '0 0 16px 0',
                                                    color: 'var(--ftd-text-secondary)',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    textAlign: 'center'
                                                }}>
                                                    Size Variations
                                                </h6>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                                    {Object.entries(buttonData.fontsize || {}).map(([size, data]: [string, any]) => {
                                                        const sizeRadius = buttonData.radius?.[size]?.value || borderRadius;
                                                        const sizeLineHeight = buttonData['line-height']?.[size]?.value || lineHeight;
                                                        
                                                        return (
                                                            <button
                                                                key={size}
                                                                style={{
                                                                    fontSize: data.value,
                                                                    lineHeight: sizeLineHeight,
                                                                    borderRadius: sizeRadius,
                                                                    padding: size === 'sm' ? '8px 16px' : size === 'lg' ? '12px 24px' : '10px 20px',
                                                                    backgroundColor: 'var(--ftd-accent-primary)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    fontWeight: '500',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                            >
                                                                {size.toUpperCase()}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            
                                            {/* Token Details */}
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                                                gap: '24px' 
                                            }}>
                                                {/* Variant Tokens */}
                                                {variants.map(variant => (
                                                    <div key={variant} style={{
                                                        padding: '24px',
                                                        backgroundColor: 'var(--ftd-bg-primary)',
                                                        borderRadius: '12px',
                                                        border: '1px solid var(--ftd-border-subtle)'
                                                    }}>
                                                        <h6 style={{ 
                                                            margin: '0 0 16px 0',
                                                            color: 'var(--ftd-text-primary)',
                                                            fontSize: '16px',
                                                            fontWeight: '600',
                                                            textTransform: 'capitalize'
                                                        }}>
                                                            {variant} Variant
                                                        </h6>
                                                        <div style={{ display: 'grid', gap: '8px' }}>
                                                            {Object.entries(buttonData[variant]).map(([prop, data]: [string, any]) => (
                                                                <div 
                                                                    key={prop}
                                                                    style={{
                                                                        padding: '8px 12px',
                                                                        backgroundColor: 'var(--ftd-bg-secondary)',
                                                                        borderRadius: '6px',
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(data.value);
                                                                    }}
                                                                >
                                                                    <span style={{ 
                                                                        fontSize: '12px', 
                                                                        fontWeight: '500',
                                                                        color: 'var(--ftd-text-primary)'
                                                                    }}>
                                                                        {prop}
                                                                    </span>
                                                                    <span style={{ 
                                                                        fontSize: '11px', 
                                                                        fontFamily: 'monospace',
                                                                        color: 'var(--ftd-accent-primary)',
                                                                        fontWeight: '600'
                                                                    }}>
                                                                        {data.value}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {/* Size Tokens */}
                                                {['fontsize', 'line-height', 'radius'].map(prop => {
                                                    if (!buttonData[prop]) return null;
                                                    return (
                                                        <div key={prop} style={{
                                                            padding: '24px',
                                                            backgroundColor: 'var(--ftd-bg-primary)',
                                                            borderRadius: '12px',
                                                            border: '1px solid var(--ftd-border-subtle)'
                                                        }}>
                                                            <h6 style={{ 
                                                                margin: '0 0 16px 0',
                                                                color: 'var(--ftd-text-primary)',
                                                                fontSize: '16px',
                                                                fontWeight: '600',
                                                                textTransform: 'capitalize'
                                                            }}>
                                                                {prop.replace('-', ' ')}
                                                            </h6>
                                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                                {Object.entries(buttonData[prop]).map(([size, data]: [string, any]) => (
                                                                    <div 
                                                                        key={size}
                                                                        style={{
                                                                            padding: '8px 12px',
                                                                            backgroundColor: 'var(--ftd-bg-secondary)',
                                                                            borderRadius: '6px',
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(data.value);
                                                                        }}
                                                                    >
                                                                        <span style={{ 
                                                                            fontSize: '12px', 
                                                                            fontWeight: '500',
                                                                            color: 'var(--ftd-text-primary)'
                                                                        }}>
                                                                            {size}
                                                                        </span>
                                                                        <span style={{ 
                                                                            fontSize: '11px', 
                                                                            fontFamily: 'monospace',
                                                                            color: 'var(--ftd-accent-primary)',
                                                                            fontWeight: '600'
                                                                        }}>
                                                                            {data.value}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // Fallback for other component types
                                    return (
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
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                                gap: '12px' 
                                            }}>
                                                {Object.entries(buttonData).map(([tokenName, tokenData]) => (
                                                    <div 
                                                        key={tokenName} 
                                                        style={{ 
                                                            padding: '12px', 
                                                            border: '1px solid var(--ftd-border-subtle)', 
                                                            borderRadius: '8px',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => {
                                                            navigator.clipboard.writeText((tokenData as any).value);
                                                        }}
                                                    >
                                                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                                            {tokenName}
                                                        </div>
                                                        <div style={{ color: 'var(--ftd-text-secondary)', fontSize: '14px' }}>
                                                            {(tokenData as any).value}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                            })}
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
