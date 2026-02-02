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

    // Extract token sets dynamically by analyzing structure
    const tokenSets = Object.entries(tokens)
        .filter(([key]) => !['global', '$themes', '$metadata'].includes(key))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    // Detect token set types by analyzing their structure
    const detectTokenSetType = (tokenSet: any): string => {
        if (!tokenSet || typeof tokenSet !== 'object') return 'other';
        
        // Check for color structure (base, fill, stroke, text)
        if (tokenSet.base || tokenSet.fill || tokenSet.stroke || tokenSet.text) {
            return 'colors';
        }
        
        // Check if all tokens are dimension/spacing type
        const allTokens = Object.values(tokenSet).flat();
        const hasOnlyDimensions = allTokens.every((token: any) => 
            token && typeof token === 'object' && token.type === 'dimension'
        );
        
        if (hasOnlyDimensions) {
            // Distinguish between spacing, size, and radius by common naming patterns
            const tokenNames = Object.keys(tokenSet).join(' ').toLowerCase();
            if (tokenNames.includes('space') || tokenNames.includes('spacing')) return 'spacing';
            if (tokenNames.includes('radius') || tokenNames.includes('border')) return 'radius';
            if (tokenNames.includes('size') || tokenNames.includes('width') || tokenNames.includes('height')) return 'sizes';
        }
        
        return 'other';
    };
    
    // Categorize token sets
    const categorizedSets = Object.entries(tokenSets).reduce((acc, [key, value]) => {
        const type = detectTokenSetType(value);
        if (!acc[type]) acc[type] = {};
        acc[type][key] = value;
        return acc;
    }, {} as Record<string, Record<string, any>>);
    
    // Extract specific token sets (use first found of each type)
    const colorsValue = Object.values(categorizedSets.colors || {})[0];
    const spacingTokens = Object.values(categorizedSets.spacing || {})[0] || {};
    const sizeTokens = Object.values(categorizedSets.sizes || {})[0] || {};
    const radiusTokens = Object.values(categorizedSets.radius || {})[0] || {};
    const otherTokenSets = categorizedSets.other || {};

    // Available tabs based on token data
    const availableTabs = useMemo(() => {
        const tabs: { id: string; label: string; icon: string }[] = [];
        
        // Add tabs for detected token types
        const typeConfig = {
            colors: { label: 'Colors', icon: '🎨' },
            spacing: { label: 'Spacing', icon: '📏' },
            sizes: { label: 'Sizes', icon: '📐' },
            radius: { label: 'Radius', icon: '⬜' }
        };
        
        Object.entries(categorizedSets).forEach(([type, sets]) => {
            if (Object.keys(sets).length > 0) {
                const config = typeConfig[type as keyof typeof typeConfig];
                if (config) {
                    tabs.push({ id: type, label: config.label, icon: config.icon });
                } else {
                    // Dynamic tabs for other token sets
                    Object.entries(sets).forEach(([key, value]) => {
                        if (value && typeof value === 'object' && Object.keys(value).length > 0) {
                            const cleanLabel = key.replace(/\/Mode \d+/, '').replace(/\//g, ' ');
                            tabs.push({ 
                                id: key, 
                                label: cleanLabel, 
                                icon: '🧩' 
                            });
                        }
                    });
                }
            }
        });

        return tabs;
    }, [categorizedSets]);

    // Ensure active tab is valid
    const validActiveTab = availableTabs.some(t => t.id === activeTab)
        ? activeTab
        : (availableTabs[0] && availableTabs[0].id) || 'colors';

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
            {availableTabs.length > 1 && Object.keys(otherTokenSets).length === 0 && (
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
                    
                    // Unified view for all component tokens
                    const allComponentTokens = Object.entries(otherTokenSets).reduce((acc, [setKey, setData]) => {
                        Object.entries(setData as any).forEach(([componentName, componentData]) => {
                            acc[`${setKey}/${componentName}`] = componentData;
                        });
                        return acc;
                    }, {} as Record<string, any>);
                    
                    if (Object.keys(allComponentTokens).length === 0) return null;
                    
                    return (
                        <div className="ftd-unified-tokens">
                            <h2 style={{
                                textAlign: 'center',
                                margin: '0 0 48px 0',
                                color: 'var(--ftd-text-primary)',
                                fontSize: '32px',
                                fontWeight: '800'
                            }}>
                                Design System Components
                            </h2>
                            
                            {Object.entries(allComponentTokens).map(([fullName, componentData]) => {
                                const [setName, componentName] = fullName.split('/');
                                const buttonData = componentData as any;
                                
                                // Dynamically detect structure patterns
                                const allKeys = Object.keys(buttonData);
                                
                                // Find variant properties (primary, secondary, tertiary)
                                const potentialVariants = allKeys.filter(key => {
                                    const item = buttonData[key];
                                    return item && 
                                           typeof item === 'object' && 
                                           item !== null &&
                                           !item.hasOwnProperty('value') && 
                                           Object.values(item).some((subItem: any) => 
                                               subItem && typeof subItem === 'object' && subItem.hasOwnProperty('value')
                                           );
                                });
                                
                                if (potentialVariants.length === 0) return null;
                                
                                return (
                                    <div key={fullName} style={{
                                        marginBottom: '80px',
                                        padding: '40px',
                                        backgroundColor: 'var(--ftd-bg-primary)',
                                        borderRadius: '24px',
                                        border: '1px solid var(--ftd-border-subtle)',
                                        boxShadow: 'var(--ftd-shadow-md)'
                                    }}>
                                        <h3 style={{
                                            textAlign: 'center',
                                            margin: '0 0 40px 0',
                                            color: 'var(--ftd-text-primary)',
                                            fontSize: '28px',
                                            fontWeight: '700',
                                            textTransform: 'capitalize'
                                        }}>
                                            {componentName} Component
                                        </h3>
                                        
                                        {/* Variant Cards */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                                            gap: '32px'
                                        }}>
                                            {potentialVariants.map(variant => {
                                                const variantData = buttonData[variant];
                                                const variantTokens = Object.entries(variantData);
                                                
                                                // Get color values for preview
                                                const fillToken = variantTokens.find(([key]) => key.toLowerCase().includes('fill') || key.toLowerCase().includes('background'));
                                                const strokeToken = variantTokens.find(([key]) => key.toLowerCase().includes('stroke') || key.toLowerCase().includes('border'));
                                                const textToken = variantTokens.find(([key]) => key.toLowerCase().includes('text') || key.toLowerCase().includes('color'));
                                                
                                                const fillColor = fillToken ? (fillToken[1] as any).value : 'var(--ftd-accent-primary)';
                                                const strokeColor = strokeToken ? (strokeToken[1] as any).value : 'transparent';
                                                const textColor = textToken ? (textToken[1] as any).value : 'white';
                                                
                                                return (
                                                    <div key={variant} style={{
                                                        padding: '32px',
                                                        backgroundColor: 'var(--ftd-bg-secondary)',
                                                        borderRadius: '16px',
                                                        border: '1px solid var(--ftd-border-subtle)'
                                                    }}>
                                                        {/* Variant Header */}
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            marginBottom: '24px'
                                                        }}>
                                                            <h4 style={{
                                                                margin: '0',
                                                                color: 'var(--ftd-text-primary)',
                                                                fontSize: '20px',
                                                                fontWeight: '600',
                                                                textTransform: 'capitalize'
                                                            }}>
                                                                {variant}
                                                            </h4>
                                                            
                                                            {/* Color Preview */}
                                                            <div style={{
                                                                display: 'flex',
                                                                gap: '8px',
                                                                alignItems: 'center'
                                                            }}>
                                                                {fillColor !== 'transparent' && (
                                                                    <div style={{
                                                                        width: '24px',
                                                                        height: '24px',
                                                                        backgroundColor: fillColor,
                                                                        borderRadius: '50%',
                                                                        border: '2px solid var(--ftd-border-subtle)'
                                                                    }} />
                                                                )}
                                                                {strokeColor !== 'transparent' && (
                                                                    <div style={{
                                                                        width: '24px',
                                                                        height: '24px',
                                                                        backgroundColor: 'transparent',
                                                                        border: `3px solid ${strokeColor}`,
                                                                        borderRadius: '50%'
                                                                    }} />
                                                                )}
                                                                {textColor !== 'white' && textColor !== fillColor && (
                                                                    <div style={{
                                                                        width: '24px',
                                                                        height: '24px',
                                                                        backgroundColor: textColor,
                                                                        borderRadius: '50%',
                                                                        border: '2px solid var(--ftd-border-subtle)'
                                                                    }} />
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Button Preview */}
                                                        <div style={{
                                                            textAlign: 'center',
                                                            marginBottom: '24px',
                                                            padding: '24px',
                                                            backgroundColor: 'var(--ftd-bg-canvas)',
                                                            borderRadius: '12px'
                                                        }}>
                                                            <button style={{
                                                                backgroundColor: fillColor,
                                                                color: textColor,
                                                                border: strokeColor !== 'transparent' ? `2px solid ${strokeColor}` : 'none',
                                                                borderRadius: '8px',
                                                                padding: '12px 24px',
                                                                fontSize: '16px',
                                                                fontWeight: '500',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease'
                                                            }}>
                                                                {variant.charAt(0).toUpperCase() + variant.slice(1)} Button
                                                            </button>
                                                        </div>
                                                        
                                                        {/* Token Values */}
                                                        <div style={{
                                                            display: 'grid',
                                                            gap: '12px'
                                                        }}>
                                                            {variantTokens.map(([tokenName, tokenData]) => {
                                                                const data = tokenData as any;
                                                                const isColor = data.type === 'color';
                                                                
                                                                return (
                                                                    <div
                                                                        key={tokenName}
                                                                        style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            padding: '12px 16px',
                                                                            backgroundColor: 'var(--ftd-bg-primary)',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid var(--ftd-border-subtle)',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s ease'
                                                                        }}
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(data.value);
                                                                        }}
                                                                        onMouseOver={(e) => {
                                                                            e.currentTarget.style.backgroundColor = 'var(--ftd-bg-secondary)';
                                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                                        }}
                                                                        onMouseOut={(e) => {
                                                                            e.currentTarget.style.backgroundColor = 'var(--ftd-bg-primary)';
                                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                                        }}
                                                                    >
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '12px'
                                                                        }}>
                                                                            {isColor && (
                                                                                <div style={{
                                                                                    width: '20px',
                                                                                    height: '20px',
                                                                                    backgroundColor: data.value,
                                                                                    borderRadius: '4px',
                                                                                    border: '1px solid var(--ftd-border-subtle)',
                                                                                    flexShrink: 0
                                                                                }} />
                                                                            )}
                                                                            <span style={{
                                                                                fontSize: '14px',
                                                                                fontWeight: '500',
                                                                                color: 'var(--ftd-text-primary)',
                                                                                textTransform: 'capitalize'
                                                                            }}>
                                                                                {tokenName.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                                                            </span>
                                                                        </div>
                                                                        
                                                                        <span style={{
                                                                            fontSize: '12px',
                                                                            fontFamily: 'monospace',
                                                                            color: 'var(--ftd-accent-primary)',
                                                                            fontWeight: '600',
                                                                            backgroundColor: 'var(--ftd-bg-secondary)',
                                                                            padding: '4px 8px',
                                                                            borderRadius: '4px'
                                                                        }}>
                                                                            {data.value}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
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
