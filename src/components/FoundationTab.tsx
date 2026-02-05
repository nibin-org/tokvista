'use client';

import React, { useState } from 'react';
import type { NestedTokens } from '../types';
import { SpacingScale } from './SpacingScale';
import { SizeScale } from './SizeScale';
import { RadiusShowcase } from './RadiusShowcase';
import { getContrastColor, copyToClipboard } from '../utils';

interface FoundationTabProps {
    tokens: NestedTokens;
    tokenMap: Record<string, string>;
    onTokenClick?: (token: any) => void;
}

interface Section {
    id: string;
    name: string;
    icon: string;
    type: string;
    tokens: any;
    count: number;
}

/**
 * FoundationTab - Displays all foundation tokens with sidebar navigation
 */
export function FoundationTab({ tokens, tokenMap, onTokenClick }: FoundationTabProps) {
    const sections: Section[] = [];
    const allColors: any = {};

    Object.entries(tokens).forEach(([groupName, groupTokens]) => {
        if (!groupTokens || typeof groupTokens !== 'object') return;

        const groupKey = groupName.toLowerCase();
        const firstToken = Object.values(groupTokens)[0] as any;
        const tokenType = firstToken?.type || 'other';

        // Count tokens
        const count = Object.keys(groupTokens).filter(key => {
            const val = (groupTokens as any)[key];
            return val && typeof val === 'object';
        }).length;

        // Collect all color families
        if (tokenType === 'color') {
            allColors[groupName] = groupTokens;
        }
        // Spacing
        else if (groupKey === 'space' || groupKey === 'spacing') {
            sections.push({
                id: 'spacing',
                name: 'Spacing',
                icon: '📏',
                type: 'spacing',
                tokens: groupTokens,
                count
            });
        }
        // Sizes
        else if (groupKey === 'size' || groupKey === 'sizing') {
            sections.push({
                id: 'sizes',
                name: 'Sizes',
                icon: '📐',
                type: 'sizing',
                tokens: groupTokens,
                count
            });
        }
        // Radius
        else if (groupKey === 'radius') {
            sections.push({
                id: 'radius',
                name: 'Radius',
                icon: '⬜',
                type: 'radius',
                tokens: groupTokens,
                count
            });
        }
        // Typography
        else if (groupKey.includes('font') || groupKey.includes('line')) {
            sections.push({
                id: groupKey,
                name: groupName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                icon: '🔤',
                type: 'typography',
                tokens: groupTokens,
                count
            });
        }
    });

    // Add Colors section at the beginning if we have any
    if (Object.keys(allColors).length > 0) {
        sections.unshift({
            id: 'colors',
            name: 'Colors',
            icon: '🎨',
            type: 'colors',
            tokens: allColors,
            count: Object.keys(allColors).length
        });
    }

    const [activeSection, setActiveSection] = useState(sections[0]?.id || 'colors');

    const activeData = sections.find(s => s.id === activeSection);

    if (sections.length === 0) {
        return <div>No foundation tokens found</div>;
    }

    return (
        <div className="ftd-color-layout">
            {/* Sidebar Navigation */}
            <div className="ftd-color-sidebar">
                <nav className="ftd-color-nav">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            className={`ftd-color-nav-link ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <span className="ftd-nav-icon">{section.icon}</span>
                            <span className="ftd-nav-label">{section.name}</span>
                            <span className="ftd-nav-count">{section.count}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="ftd-color-content">
                {activeData && (
                    <div id={activeData.id} className="ftd-color-section">
                        {/* All Colors - render directly without nested navigation */}
                        {activeData.type === 'colors' && (
                            <div className="ftd-section">
                                <div className="ftd-section-header">
                                    <div className="ftd-section-icon">🎨</div>
                                    <h3 className="ftd-section-title">Base Colors</h3>
                                    <span className="ftd-section-count">{Object.keys(activeData.tokens).length} families</span>
                                </div>
                                {/* Assuming ColorFamiliesDisplay is defined elsewhere or will be added */}
                                <ColorFamiliesDisplay
                                    colorFamilies={activeData.tokens}
                                    tokenMap={tokenMap}
                                    onTokenClick={onTokenClick}
                                />
                            </div>
                        )}

                        {/* Spacing */}
                        {activeData.type === 'spacing' && (
                            <>
                                <div className="ftd-section-header">
                                    <div className="ftd-section-icon">📏</div>
                                    <h3 className="ftd-section-title">Spacing</h3>
                                </div>
                                <SpacingScale tokens={activeData.tokens} onTokenClick={onTokenClick} />
                            </>
                        )}

                        {/* Sizes */}
                        {activeData.type === 'sizing' && (
                            <>
                                <div className="ftd-section-header">
                                    <div className="ftd-section-icon">📐</div>
                                    <h3 className="ftd-section-title">Sizes</h3>
                                </div>
                                <SizeScale tokens={activeData.tokens} onTokenClick={onTokenClick} />
                            </>
                        )}

                        {/* Radius */}
                        {activeData.type === 'radius' && (
                            <>
                                <div className="ftd-section-header">
                                    <div className="ftd-section-icon">⬜</div>
                                    <h3 className="ftd-section-title">Border Radius</h3>
                                </div>
                                <RadiusShowcase tokens={activeData.tokens} onTokenClick={onTokenClick} />
                            </>
                        )}

                        {/* Typography */}
                        {activeData.type === 'typography' && (
                            <>
                                <div className="ftd-section-header">
                                    <div className="ftd-section-icon">🔤</div>
                                    <h3 className="ftd-section-title">{activeData.name}</h3>
                                </div>
                                <TypographyDisplay tokens={activeData.tokens} tokenMap={tokenMap} />
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Display typography tokens
 */
function TypographyDisplay({ tokens, tokenMap }: { tokens: NestedTokens; tokenMap: Record<string, string> }) {
    const entries = Object.entries(tokens).filter(([_, value]) =>
        value && typeof value === 'object' && 'value' in value && 'type' in value
    );

    if (entries.length === 0) return null;

    return (
        <div className="ftd-typography-grid">
            {entries.map(([name, token]: [string, any]) => (
                <div key={name} className="ftd-typography-card">
                    <div className="ftd-typography-label">{name}</div>
                    <div className="ftd-typography-value">{token.value}</div>
                </div>
            ))}
        </div>
    );
}

/**
 * Display all color families without navigation
 */
function ColorFamiliesDisplay({
    colorFamilies,
    tokenMap,
    onTokenClick
}: {
    colorFamilies: any;
    tokenMap: Record<string, string>;
    onTokenClick?: (token: any) => void;
}) {
    const [copiedValue, setCopiedValue] = useState<string | null>(null);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const showToast = (value: string) => {
        // Clear previous timeout if it exists
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setCopiedValue(value);
        timeoutRef.current = setTimeout(() => {
            setCopiedValue(null);
            timeoutRef.current = null;
        }, 2000);
    };

    const handleCopy = async (colorValue: string, cssVar: string) => {
        const fullCssVar = `var(${cssVar})`;
        const success = await copyToClipboard(fullCssVar);
        if (success) showToast(fullCssVar);
        onTokenClick?.({ value: colorValue, cssVariable: cssVar });
    };

    return (
        <>
            <div className="ftd-color-family-container">
                {Object.entries(colorFamilies).map(([familyName, shades]: [string, any]) => {
                    // Get the middle shade for the family swatch
                    const shadeKeys = Object.keys(shades);
                    const midShade = shades[shadeKeys[Math.floor(shadeKeys.length / 2)]];
                    const familyColor = midShade?.value || '#000';

                    return (
                        <div key={familyName} className="ftd-color-family">
                            <div className="ftd-color-family-header">
                                <div
                                    className="ftd-color-family-swatch"
                                    style={{ backgroundColor: familyColor }}
                                />
                                <h4 className="ftd-color-family-name">{familyName}</h4>
                            </div>

                            <div className="ftd-color-scale">
                                {Object.entries(shades).map(([shadeName, shadeToken]: [string, any]) => {
                                    const bgColor = shadeToken.value;
                                    const textColor = getContrastColor(bgColor);
                                    const cssVar = `--base-${familyName}-${shadeName}`;

                                    return (
                                        <div
                                            key={shadeName}
                                            className="ftd-color-shade"
                                            style={{ backgroundColor: bgColor, color: textColor }}
                                            onClick={() => handleCopy(bgColor, cssVar)}
                                        >
                                            <span className="ftd-color-shade-label">{shadeName}</span>
                                            <div className="ftd-shade-values">
                                                <code className="ftd-shade-css-var">{cssVar}</code>
                                                <code className="ftd-shade-hex">{bgColor}</code>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {copiedValue && (
                <div className="ftd-copied-toast" role="status" aria-live="polite">
                    <div className="ftd-toast-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <div className="ftd-toast-content">
                        <span className="ftd-toast-label">Copied</span>
                        <span className="ftd-toast-value">{copiedValue}</span>
                    </div>
                </div>
            )}
        </>
    );
}

export default FoundationTab;
