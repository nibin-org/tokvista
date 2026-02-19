'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { NestedTokens } from '../types';
import { SpacingDisplay } from './SpacingDisplay';
import { SizeDisplay } from './SizeDisplay';
import { RadiusDisplay } from './RadiusDisplay';
import { getContrastColor } from '../utils/color';
import { copyToClipboard } from '../utils/ui';
import { Icon, type IconName } from './Icon';

interface FoundationTabProps {
    tokens: NestedTokens;
    tokenMap: Record<string, string>;
    onTokenClick?: (token: any) => void;
}

interface Section {
    id: string;
    name: string;
    icon: IconName;
    type: string;
    tokens: any;
    count: number;
}

/**
 * FoundationTab - Displays all foundation tokens with scroll-spy navigation
 */
export function FoundationTab({ tokens, tokenMap, onTokenClick }: FoundationTabProps) {
    const rafId = useRef<number | null>(null);
    const pendingSectionId = useRef<string | null>(null);
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
                items.push({ id: 'spacing-section', name: 'Spacing', icon: 'spacing', type: 'spacing', tokens: groupTokens, count });
            } else if (groupKey === 'size' || groupKey === 'sizing') {
                items.push({ id: 'sizes-section', name: 'Sizes', icon: 'sizes', type: 'sizing', tokens: groupTokens, count });
            } else if (groupKey === 'radius') {
                items.push({ id: 'radius-section', name: 'Radius', icon: 'radius', type: 'radius', tokens: groupTokens, count });
            } else if (groupKey.includes('font') || groupKey.includes('line')) {
                items.push({
                    id: `typo-${groupKey}`,
                    name: groupName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    icon: 'typography',
                    type: 'typography',
                    tokens: groupTokens,
                    count
                });
            }
        });

        if (Object.keys(allColors).length > 0) {
            items.unshift({ id: 'colors-section', name: 'Colors', icon: 'colors', type: 'colors', tokens: allColors, count: Object.keys(allColors).length });
        }

        return items;
    }, [tokens]);

    // Initialize active section
    useEffect(() => {
        if (sections.length > 0 && !activeSection) {
            setActiveSection(sections[0].id);
        }
    }, [sections, activeSection]);

    // Scroll Spy (deterministic by scroll position)
    useEffect(() => {
        const getOffset = () => {
            const sticky = document.querySelector('.ftd-navbar-sticky') as HTMLElement | null;
            const base = sticky ? sticky.getBoundingClientRect().height : 160;
            const offset = Math.round(base + 16);
            document.documentElement.style.setProperty('--ftd-sticky-offset', `${offset}px`);
            return offset;
        };

        const updateActive = () => {
            const sectionElements = Array.from(document.querySelectorAll('.ftd-scroll-target')) as HTMLElement[];
            if (sectionElements.length === 0) return;

            const offset = getOffset();
            if (pendingSectionId.current) {
                const target = document.getElementById(pendingSectionId.current);
                if (!target) {
                    pendingSectionId.current = null;
                } else {
                    const top = target.getBoundingClientRect().top;
                    if (top - offset > 0) {
                        setActiveSection(pendingSectionId.current);
                        return;
                    }
                    pendingSectionId.current = null;
                }
            }
            const viewportTop = offset;
            const viewportBottom = window.innerHeight;
            let bestId = sectionElements[0].id;
            let bestVisible = -1;
            let bestTop = Infinity;

            for (const el of sectionElements) {
                const rect = el.getBoundingClientRect();
                const visibleTop = Math.max(rect.top, viewportTop);
                const visibleBottom = Math.min(rect.bottom, viewportBottom);
                const visible = Math.max(0, visibleBottom - visibleTop);
                if (visible > bestVisible || (visible === bestVisible && rect.top < bestTop)) {
                    bestVisible = visible;
                    bestId = el.id;
                    bestTop = rect.top;
                }
            }
            setActiveSection(bestId);
        };

        const onScroll = () => {
            if (rafId.current !== null) return;
            rafId.current = window.requestAnimationFrame(() => {
                rafId.current = null;
                updateActive();
            });
        };

        updateActive();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (rafId.current !== null) {
                window.cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }
        };
    }, [sections]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const sticky = document.querySelector('.ftd-navbar-sticky') as HTMLElement | null;
            const offset = (sticky ? sticky.getBoundingClientRect().height : 160) + 16;
            const top = window.scrollY + element.getBoundingClientRect().top - offset;
            setActiveSection(id);
            pendingSectionId.current = id;
            window.scrollTo({ top, behavior: 'smooth' });
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
                            <span className="ftd-nav-icon"><Icon name={section.icon} /></span>
                            <span className="ftd-nav-label">{section.name}</span>
                            <span className="ftd-nav-count">{section.count}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <div className="ftd-color-content">
                {sections.map((section) => (
                    <React.Fragment key={section.id}>
                        {section.type === 'colors' && (
                            <div id={section.id} className="ftd-section ftd-scroll-target">
                                <div className="ftd-section-header">
                                    <div className="ftd-section-icon"><Icon name="colors" /></div>
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
                                    <div className="ftd-section-icon"><Icon name="typography" /></div>
                                    <h2 className="ftd-section-title">{section.name}</h2>
                                    <span className="ftd-section-count">{section.count} tokens</span>
                                </div>
                                <TypographyDisplay tokens={section.tokens} familyName={section.id.replace('typo-', '')} />
                            </div>
                        )}
                    </React.Fragment>
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
        <div className="ftd-size-family">
            <div className="ftd-size-metrics-grid">
                {entries.map(([name, token]: [string, any]) => {
                    const cssVar = `--${familyName}-${name}`;
                    const varValue = `var(${cssVar})`;
                    const isLineHeight = familyName.toLowerCase().includes('line');
                    const isFontSize = familyName.toLowerCase().includes('size') || familyName.toLowerCase().includes('font');

                    return (
                        <div
                            key={name}
                            className="ftd-size-metric-chip"
                            onClick={() => copyToClipboard(varValue).then(() => showToast(varValue))}
                        >
                            <div className="ftd-size-metric-viz">
                                {isFontSize ? (
                                    <div
                                        style={{
                                            fontSize: token.value,
                                            fontWeight: 900,
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
                                        <div style={{ height: '3px', background: 'var(--ftd-primary)', width: '100%', borderRadius: '2px' }} />
                                        <div style={{ height: '3px', background: 'var(--ftd-primary)', width: '100%', borderRadius: '2px' }} />
                                    </div>
                                ) : (
                                    <div
                                        className="ftd-size-metric-gauge"
                                        style={{ height: '8px', width: '20px' }}
                                    />
                                )}

                                {/* Premium Frosted Tooltip */}
                                <div className="ftd-shade-tooltip">
                                    <span className="ftd-tooltip-var">{cssVar}</span>
                                    <span className="ftd-tooltip-hex">{token.value}</span>
                                </div>
                            </div>

                            <div className="ftd-size-metric-info">
                                <span className="ftd-color-shade-label">{name}</span>
                                <span className="ftd-shade-hex">{token.value}</span>
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
        </div>
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
                const shadeEntries = Object.entries(shades);
                const shadeValues = shadeEntries.map(([, token]: [string, any]) => (token as any).value);
                const gradientBg = `linear-gradient(to right, ${shadeValues.join(', ')})`;

                return (
                    <div key={familyName} className="ftd-color-family">
                        <div className="ftd-color-family-header">
                            <div className="ftd-color-family-swatch" style={{ background: gradientBg }} />
                            <h3 className="ftd-color-family-name">{familyName}</h3>
                        </div>

                        {/* Paint chip swatch fan */}
                        <div className="ftd-color-scale">
                            {Object.entries(shades).map(([shadeName, shadeToken]: [string, any]) => {
                                const bgColor = shadeToken.value;
                                const cssVar = `--base-${familyName}-${shadeName}`;
                                const tokenFullName = `${familyName}-${shadeName}`;
                                const shortHex = bgColor.length > 7 ? bgColor.substring(0, 7) : bgColor;

                                return (
                                    <div
                                        key={shadeName}
                                        className="ftd-color-shade"
                                        data-token-name={tokenFullName}
                                        onClick={() => handleCopy(bgColor, cssVar)}
                                    >
                                        {/* Premium frosted tooltip */}
                                        <div className="ftd-shade-tooltip">
                                            <code className="ftd-tooltip-var">{cssVar}</code>
                                            <code className="ftd-tooltip-hex">{bgColor}</code>
                                        </div>

                                        {/* Color fill — top portion of chip */}
                                        <div className="ftd-shade-fill" style={{ backgroundColor: bgColor }} />
                                        {/* White label area — bottom of chip */}
                                        <div className="ftd-shade-chip">
                                            <span className="ftd-color-shade-label">{shadeName}</span>
                                            <code className="ftd-shade-hex">{shortHex}</code>
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

