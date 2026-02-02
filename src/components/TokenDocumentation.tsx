'use client';

import React, { useState, useMemo } from 'react';
import type { TokenDocumentationProps } from '../types';
import { ColorGrid } from './ColorGrid';
import { SpacingScale } from './SpacingScale';
import { RadiusShowcase } from './RadiusShowcase';
import { SizeScale } from './SizeScale';

type TabType = 'colors' | 'spacing' | 'sizes' | 'radius';

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

    // Extract token sets
    const colorsValue = tokens['Colors/Value'];
    const spacingTokens = tokens['Spacing/Mode 1'] || {};
    const sizeTokens = tokens['Size/Mode 1'] || {};
    const radiusTokens = tokens['Radius/Mode 1'] || {};

    // Available tabs based on token data
    const availableTabs = useMemo(() => {
        const tabs: { id: TabType; label: string; icon: string }[] = [];

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

        return tabs;
    }, [colorsValue, spacingTokens, sizeTokens, radiusTokens]);

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
                {validActiveTab === 'colors' && colorsValue && (
                    <ColorGrid
                        baseColors={colorsValue.base}
                        fillColors={colorsValue.fill}
                        strokeColors={colorsValue.stroke}
                        textColors={colorsValue.text}
                        onColorClick={onTokenClick}
                    />
                )}

                {validActiveTab === 'spacing' && (
                    <SpacingScale
                        tokens={spacingTokens}
                        onTokenClick={onTokenClick}
                    />
                )}

                {validActiveTab === 'sizes' && (
                    <SizeScale
                        tokens={sizeTokens}
                        onTokenClick={onTokenClick}
                    />
                )}

                {validActiveTab === 'radius' && (
                    <RadiusShowcase
                        tokens={radiusTokens}
                        onTokenClick={onTokenClick}
                    />
                )}
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
