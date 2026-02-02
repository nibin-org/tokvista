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
                }
            }
        });
        
        // Add single "Components" tab if there are any component tokens
        if (Object.keys(otherTokenSets).length > 0) {
            tabs.push({ id: 'components', label: 'Components', icon: '🧩' });
        }

        return tabs;
    }, [categorizedSets, otherTokenSets]);

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
                    
                    // Handle single Components tab with all component tokens
                    if (validActiveTab === 'components') {
                        const allComponentTokens = Object.entries(otherTokenSets).reduce((acc, [setKey, setData]) => {
                            Object.entries(setData as any).forEach(([componentName, componentData]) => {
                                acc[`${setKey}/${componentName}`] = componentData;
                            });
                            return acc;
                        }, {} as Record<string, any>);
                        
                        return (
                            <div className="ftd-components-showcase">
                                <div style={{
                                    textAlign: 'center',
                                    marginBottom: '64px',
                                    padding: '48px 24px',
                                    background: 'linear-gradient(135deg, var(--ftd-accent-primary) 0%, #8b5cf6 100%)',
                                    borderRadius: '24px',
                                    color: 'white',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                                        pointerEvents: 'none'
                                    }} />
                                    <h1 style={{
                                        margin: '0 0 16px 0',
                                        fontSize: '48px',
                                        fontWeight: '900',
                                        background: 'linear-gradient(45deg, #ffffff, #f0f9ff)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                        Design System Components
                                    </h1>
                                    <p style={{
                                        margin: 0,
                                        fontSize: '18px',
                                        opacity: 0.9,
                                        maxWidth: '600px',
                                        marginLeft: 'auto',
                                        marginRight: 'auto'
                                    }}>
                                        Interactive component tokens with live previews, color palettes, and copy-to-clipboard functionality
                                    </p>
                                </div>
                                
                                <div style={{
                                    display: 'grid',
                                    gap: '48px'
                                }}>
                                    {Object.entries(allComponentTokens).map(([fullName, componentData]) => {
                                        const [setName, componentName] = fullName.split('/');
                                        const buttonData = componentData as any;
                                        
                                        // Find variant properties
                                        const allKeys = Object.keys(buttonData);
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
                                                background: 'linear-gradient(145deg, var(--ftd-bg-primary) 0%, var(--ftd-bg-secondary) 100%)',
                                                borderRadius: '32px',
                                                padding: '48px',
                                                border: '1px solid var(--ftd-border-subtle)',
                                                boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.05)',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                {/* Decorative background */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-50%',
                                                    right: '-20%',
                                                    width: '300px',
                                                    height: '300px',
                                                    background: 'radial-gradient(circle, var(--ftd-accent-primary)20, transparent 70%)',
                                                    borderRadius: '50%',
                                                    opacity: 0.05,
                                                    pointerEvents: 'none'
                                                }} />
                                                
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '40px'
                                                }}>
                                                    <h2 style={{
                                                        margin: 0,
                                                        fontSize: '32px',
                                                        fontWeight: '800',
                                                        color: 'var(--ftd-text-primary)',
                                                        textTransform: 'capitalize',
                                                        position: 'relative'
                                                    }}>
                                                        {componentName}
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: '-8px',
                                                            left: 0,
                                                            width: '60px',
                                                            height: '4px',
                                                            background: 'linear-gradient(90deg, var(--ftd-accent-primary), #8b5cf6)',
                                                            borderRadius: '2px'
                                                        }} />
                                                    </h2>
                                                    <div style={{
                                                        padding: '12px 24px',
                                                        background: 'var(--ftd-accent-primary)10',
                                                        borderRadius: '20px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        color: 'var(--ftd-accent-primary)',
                                                        border: '1px solid var(--ftd-accent-primary)20'
                                                    }}>
                                                        {potentialVariants.length} Variants
                                                    </div>
                                                </div>
                                                
                                                {/* Variants Grid */}
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                                                    gap: '32px'
                                                }}>
                                                    {potentialVariants.map(variant => {
                                                        const variantData = buttonData[variant];
                                                        const variantTokens = Object.entries(variantData);
                                                        
                                                        // Get colors for preview
                                                        const fillToken = variantTokens.find(([key]) => key.toLowerCase().includes('fill') || key.toLowerCase().includes('background'));
                                                        const strokeToken = variantTokens.find(([key]) => key.toLowerCase().includes('stroke') || key.toLowerCase().includes('border'));
                                                        const textToken = variantTokens.find(([key]) => key.toLowerCase().includes('text') || key.toLowerCase().includes('color'));
                                                        
                                                        const fillColor = fillToken ? (fillToken[1] as any).value : '#6366f1';
                                                        const strokeColor = strokeToken ? (strokeToken[1] as any).value : 'transparent';
                                                        const textColor = textToken ? (textToken[1] as any).value : '#ffffff';
                                                        
                                                        return (
                                                            <div key={variant} style={{
                                                                background: 'var(--ftd-bg-primary)',
                                                                borderRadius: '24px',
                                                                padding: '32px',
                                                                border: '1px solid var(--ftd-border-subtle)',
                                                                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                                                transition: 'all 0.3s ease',
                                                                position: 'relative'
                                                            }}>
                                                                {/* Variant Header */}
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    marginBottom: '24px'
                                                                }}>
                                                                    <h3 style={{
                                                                        margin: 0,
                                                                        fontSize: '20px',
                                                                        fontWeight: '700',
                                                                        color: 'var(--ftd-text-primary)',
                                                                        textTransform: 'capitalize'
                                                                    }}>
                                                                        {variant}
                                                                    </h3>
                                                                    
                                                                    {/* Color Palette */}
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        gap: '8px',
                                                                        alignItems: 'center'
                                                                    }}>
                                                                        <div style={{
                                                                            width: '32px',
                                                                            height: '32px',
                                                                            backgroundColor: fillColor,
                                                                            borderRadius: '50%',
                                                                            border: '3px solid var(--ftd-bg-primary)',
                                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                                            position: 'relative'
                                                                        }}>
                                                                            <div style={{
                                                                                position: 'absolute',
                                                                                bottom: '-6px',
                                                                                right: '-6px',
                                                                                width: '12px',
                                                                                height: '12px',
                                                                                backgroundColor: textColor,
                                                                                borderRadius: '50%',
                                                                                border: '2px solid var(--ftd-bg-primary)'
                                                                            }} />
                                                                        </div>
                                                                        {strokeColor !== 'transparent' && (
                                                                            <div style={{
                                                                                width: '24px',
                                                                                height: '24px',
                                                                                border: `3px solid ${strokeColor}`,
                                                                                borderRadius: '50%',
                                                                                backgroundColor: 'transparent'
                                                                            }} />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Interactive Button Preview */}
                                                                <div style={{
                                                                    textAlign: 'center',
                                                                    marginBottom: '32px',
                                                                    padding: '32px',
                                                                    background: 'linear-gradient(135deg, var(--ftd-bg-canvas) 0%, var(--ftd-bg-secondary) 100%)',
                                                                    borderRadius: '16px',
                                                                    border: '1px solid var(--ftd-border-subtle)'
                                                                }}>
                                                                    <button style={{
                                                                        backgroundColor: fillColor,
                                                                        color: textColor,
                                                                        border: strokeColor !== 'transparent' ? `2px solid ${strokeColor}` : 'none',
                                                                        borderRadius: '12px',
                                                                        padding: '16px 32px',
                                                                        fontSize: '16px',
                                                                        fontWeight: '600',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s ease',
                                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                                        minWidth: '140px'
                                                                    }}>
                                                                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                                                                    </button>
                                                                </div>
                                                                
                                                                {/* Token Values */}
                                                                <div style={{
                                                                    display: 'grid',
                                                                    gap: '12px'
                                                                }}>
                                                                    <h4 style={{
                                                                        margin: '0 0 16px 0',
                                                                        fontSize: '16px',
                                                                        fontWeight: '600',
                                                                        color: 'var(--ftd-text-secondary)'
                                                                    }}>
                                                                        Token Values
                                                                    </h4>
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
                                                                                    padding: '16px 20px',
                                                                                    backgroundColor: 'var(--ftd-bg-secondary)',
                                                                                    borderRadius: '12px',
                                                                                    border: '1px solid var(--ftd-border-subtle)',
                                                                                    cursor: 'pointer',
                                                                                    transition: 'all 0.2s ease',
                                                                                    position: 'relative',
                                                                                    overflow: 'hidden'
                                                                                }}
                                                                                onClick={() => {
                                                                                    navigator.clipboard.writeText(data.value);
                                                                                }}
                                                                                onMouseOver={(e) => {
                                                                                    e.currentTarget.style.backgroundColor = 'var(--ftd-accent-primary)10';
                                                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                                                                                }}
                                                                                onMouseOut={(e) => {
                                                                                    e.currentTarget.style.backgroundColor = 'var(--ftd-bg-secondary)';
                                                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                                                    e.currentTarget.style.boxShadow = 'none';
                                                                                }}
                                                                            >
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '16px'
                                                                                }}>
                                                                                    {isColor && (
                                                                                        <div style={{
                                                                                            width: '24px',
                                                                                            height: '24px',
                                                                                            backgroundColor: data.value,
                                                                                            borderRadius: '6px',
                                                                                            border: '2px solid var(--ftd-border-subtle)',
                                                                                            flexShrink: 0,
                                                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                                                                        }} />
                                                                                    )}
                                                                                    <span style={{
                                                                                        fontSize: '15px',
                                                                                        fontWeight: '600',
                                                                                        color: 'var(--ftd-text-primary)',
                                                                                        textTransform: 'capitalize'
                                                                                    }}>
                                                                                        {tokenName.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                                                                    </span>
                                                                                </div>
                                                                                
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '12px'
                                                                                }}>
                                                                                    <span style={{
                                                                                        fontSize: '13px',
                                                                                        fontFamily: 'monospace',
                                                                                        color: 'var(--ftd-accent-primary)',
                                                                                        fontWeight: '700',
                                                                                        backgroundColor: 'var(--ftd-bg-primary)',
                                                                                        padding: '6px 12px',
                                                                                        borderRadius: '8px',
                                                                                        border: '1px solid var(--ftd-accent-primary)20'
                                                                                    }}>
                                                                                        {data.value}
                                                                                    </span>
                                                                                    <div style={{
                                                                                        width: '16px',
                                                                                        height: '16px',
                                                                                        opacity: 0.5,
                                                                                        cursor: 'pointer'
                                                                                    }}>
                                                                                        📋
                                                                                    </div>
                                                                                </div>
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
                            </div>
                        );
                    }
                    
                    // Handle individual component token sets (fallback)
                    const tokenSet = (tokenSets as any)[validActiveTab];
                    if (!tokenSet) return null;
                    
                    return (
                        <div className="ftd-component-tokens">
                            <h2 style={{
                                textAlign: 'center',
                                margin: '0 0 48px 0',
                                color: 'var(--ftd-text-primary)',
                                fontSize: '32px',
                                fontWeight: '800'
                            }}>
                                {(availableTabs.find(t => t.id === validActiveTab) || { label: 'Components' }).label}
                            </h2>
                            
                            {Object.entries(tokenSet).map(([componentName, componentData]) => {
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
                                    <div key={componentName} style={{
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
