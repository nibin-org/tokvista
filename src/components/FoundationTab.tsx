'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { NestedTokens } from '../types';
import { SpacingDisplay } from './SpacingDisplay';
import { SizeDisplay } from './SizeDisplay';
import { RadiusDisplay } from './RadiusDisplay';
import { getContrastColor } from '../utils/color';
import { copyToClipboard } from '../utils/ui';

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
 * FoundationTab - Displays all foundation tokens with scroll-spy navigation
 */
export function FoundationTab({ tokens, tokenMap, onTokenClick }: FoundationTabProps) {
    const observer = useRef<IntersectionObserver | null>(null);
    const [activeSection, setActiveSection] = useState<string>('');

    const sections = useMemo(() => {
        const items: Section[] = [];
        const allColors: any = {};

        Object.entries(tokens).forEach(([groupName, groupTokens]) => {
            if (!groupTokens || typeof groupTokens !== 'object') return;

            const groupKey = groupName.toLowerCase();
            const firstToken = Object.values(groupTokens)[0] as any;
            const tokenType = firstToken?.type || 'other';

            const count = Object.keys(groupTokens).filter(key => {
                const val = (groupTokens as any)[key];
                return val && typeof val === 'object';
            }).length;

            if (tokenType === 'color') {
                allColors[groupName] = groupTokens;
            } else if (groupKey === 'space' || groupKey === 'spacing') {
                items.push({ id: 'spacing-section', name: 'Spacing', icon: '📏', type: 'spacing', tokens: groupTokens, count });
            } else if (groupKey === 'size' || groupKey === 'sizing') {
                items.push({ id: 'sizes-section', name: 'Sizes', icon: '📐', type: 'sizing', tokens: groupTokens, count });
            } else if (groupKey === 'radius') {
                items.push({ id: 'radius-section', name: 'Radius', icon: '⬜', type: 'radius', tokens: groupTokens, count });
            } else if (groupKey.includes('font') || groupKey.includes('line')) {
                items.push({
                    id: `typo-${groupKey}`,
                    name: groupName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    icon: '🔤',
                    type: 'typography',
                    tokens: groupTokens,
                    count
                });
            }
        });

        if (Object.keys(allColors).length > 0) {
            items.unshift({ id: 'colors-section', name: 'Colors', icon: '🎨', type: 'colors', tokens: allColors, count: Object.keys(allColors).length });
        }

        return items;
    }, [tokens]);

    // Initialize active section
    useEffect(() => {
        if (sections.length > 0 && !activeSection) {
            setActiveSection(sections[0].id);
        }
    }, [sections, activeSection]);

    // Scroll Spy
    useEffect(() => {
        const options = { rootMargin: '-180px 0px -70% 0px', threshold: 0 };
        observer.current = new IntersectionObserver((entries) => {
            const intersecting = entries.find(entry => entry.isIntersecting);
            if (intersecting) {
                setActiveSection(intersecting.target.id);
            }
        }, options);

        const sectionElements = document.querySelectorAll('.ftd-scroll-target');
        sectionElements.forEach((el) => observer.current?.observe(el));

        return () => observer.current?.disconnect();
    }, [sections]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
        }
    };

    if (sections.length === 0) {
        return <div className="ftd-empty">No foundation tokens found</div>;
    }

    return (
        <div className="ftd-color-layout">
            <aside className="ftd-color-sidebar">
                <nav className="ftd-color-nav">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            className={`ftd-color-nav-link ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => scrollToSection(section.id)}
                        >
                            <span className="ftd-nav-icon">{section.icon}</span>
                            <span className="ftd-nav-label">{section.name}</span>
                            <span className="ftd-nav-count">{section.count}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <div className="ftd-color-content">
                {sections.map((section) => (
                    <div key={section.id} className="ftd-foundation-section">
                        {section.type === 'colors' && (
                            <div id={section.id} className="ftd-section ftd-scroll-target">
                                <div className="ftd-section-header">
                                    <div className="ftd-section-icon">🎨</div>
                                    <h2 className="ftd-section-title">Base Colors</h2>
                                    <span className="ftd-section-count">{Object.keys(section.tokens).length} families</span>
                                </div>
                                <ColorFamiliesDisplay
                                    colorFamilies={section.tokens}
                                    tokenMap={tokenMap}
                                    onTokenClick={onTokenClick}
                                />
                            </div>
                        )}

                        {section.type === 'spacing' && (
                            <div id={section.id} className="ftd-scroll-target">
                                <SpacingDisplay tokens={section.tokens} onTokenClick={onTokenClick} />
                            </div>
                        )}

                        {section.type === 'sizing' && (
                            <div id={section.id} className="ftd-scroll-target">
                                <SizeDisplay tokens={section.tokens} onTokenClick={onTokenClick} />
                            </div>
                        )}

                        {section.type === 'radius' && (
                            <div id={section.id} className="ftd-scroll-target">
                                <RadiusDisplay tokens={section.tokens} onTokenClick={onTokenClick} />
                            </div>
                        )}

                        {section.type === 'typography' && (
                            <div id={section.id} className="ftd-section ftd-scroll-target">
                                <div className="ftd-section-header">
                                    <div className="ftd-section-icon">🔤</div>
                                    <h2 className="ftd-section-title">{section.name}</h2>
                                    <span className="ftd-section-count">{section.count} tokens</span>
                                </div>
                                <TypographyDisplay tokens={section.tokens} familyName={section.id.replace('typo-', '')} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function TypographyDisplay({ tokens, familyName }: { tokens: NestedTokens; familyName: string }) {
    const [copiedValue, setCopiedValue] = useState<string | null>(null);

    const entries = Object.entries(tokens).filter(([_, value]) =>
        value && typeof value === 'object' && 'value' in value && 'type' in value
    );

    const showToast = (value: string) => {
        setCopiedValue(value);
        setTimeout(() => setCopiedValue(null), 2000);
    };

    if (entries.length === 0) return null;

    return (
        <>
            <div className="ftd-token-grid">
                {entries.map(([name, token]: [string, any]) => {
                    const cssVar = `--${familyName}-${name}`;
                    const varValue = `var(${cssVar})`;
                    const isLineHeight = familyName.toLowerCase().includes('line');
                    const isFontSize = familyName.toLowerCase().includes('size') || familyName.toLowerCase().includes('font');

                    return (
                        <div
                            key={name}
                            className="ftd-display-card ftd-clickable-card"
                            data-token-name={name}
                            onClick={() => copyToClipboard(varValue).then(() => showToast(varValue))}
                            title={`Click to copy: ${varValue}`}
                        >
                            <div className="ftd-token-preview-container">
                                {isFontSize ? (
                                    <div
                                        style={{
                                            fontSize: token.value,
                                            fontWeight: 600,
                                            color: 'var(--ftd-primary)',
                                            lineHeight: 1
                                        }}
                                    >
                                        Aa
                                    </div>
                                ) : isLineHeight ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: token.value,
                                            width: '32px'
                                        }}
                                    >
                                        <div style={{ height: '2px', background: 'var(--ftd-primary)', width: '100%', opacity: 0.8 }} />
                                        <div style={{ height: '2px', background: 'var(--ftd-primary)', width: '100%', opacity: 0.8 }} />
                                    </div>
                                ) : (
                                    <div
                                        className="ftd-token-preview"
                                        style={{
                                            width: '16px',
                                            height: token.value,
                                            borderRadius: '2px',
                                        }}
                                    />
                                )}
                            </div>
                            <p className="ftd-token-card-label">{name}</p>
                            <div className="ftd-token-values-row">
                                <span className="ftd-token-css-var">
                                    {cssVar}
                                </span>
                                <span className="ftd-token-hex">
                                    {token.value}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {copiedValue && (
                <div className="ftd-copied-toast">
                    <div className="ftd-toast-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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

    const showToast = (value: string) => {
        setCopiedValue(value);
        setTimeout(() => setCopiedValue(null), 2000);
    };

    const handleCopy = async (colorValue: string, cssVar: string) => {
        const fullCssVar = `var(${cssVar})`;
        const success = await copyToClipboard(fullCssVar);
        if (success) showToast(fullCssVar);
        onTokenClick?.({ value: colorValue, cssVariable: cssVar });
    };

    return (
        <div className="ftd-color-family-container">
            {Object.entries(colorFamilies).map(([familyName, shades]: [string, any]) => {
                const shadeKeys = Object.keys(shades);
                const midShade = shades[shadeKeys[Math.floor(shadeKeys.length / 2)]];
                const familyColor = midShade?.value || '#000';

                return (
                    <div key={familyName} className="ftd-color-family">
                        <div className="ftd-color-family-header">
                            <div className="ftd-color-family-swatch" style={{ backgroundColor: familyColor }} />
                            <h3 className="ftd-color-family-name">{familyName}</h3>
                        </div>

                        <div className="ftd-color-scale">
                            {Object.entries(shades).map(([shadeName, shadeToken]: [string, any]) => {
                                const bgColor = shadeToken.value;
                                const textColor = getContrastColor(bgColor);
                                const cssVar = `--base-${familyName}-${shadeName}`;
                                const tokenFullName = `${familyName}-${shadeName}`;

                                return (
                                    <div
                                        key={shadeName}
                                        className="ftd-color-shade"
                                        data-token-name={tokenFullName}
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

            {copiedValue && (
                <div className="ftd-copied-toast">
                    <div className="ftd-toast-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <div className="ftd-toast-content">
                        <span className="ftd-toast-label">Copied</span>
                        <span className="ftd-toast-value">{copiedValue}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FoundationTab;
