'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { NestedTokens } from '../types';
import { getContrastColor } from '../utils/color';
import { copyToClipboard } from '../utils/ui';
import { findAllTokens, toCssVariable } from '../utils/core';
import { Icon, type IconName } from './Icon';
import { TokenPreview } from './TokenPreview';

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

function isTokenObject(value: unknown): value is { value: string | number; type: string } {
    return !!value && typeof value === 'object' && 'value' in (value as Record<string, unknown>) && 'type' in (value as Record<string, unknown>);
}

function addTokenAtPath(target: Record<string, any>, path: string[], token: { value: string | number; type: string }) {
    if (path.length === 0) return;

    let cursor: Record<string, any> = target;
    for (let i = 0; i < path.length - 1; i += 1) {
        const segment = path[i];
        if (!cursor[segment] || typeof cursor[segment] !== 'object' || isTokenObject(cursor[segment])) {
            cursor[segment] = {};
        }
        cursor = cursor[segment] as Record<string, any>;
    }

    cursor[path[path.length - 1]] = token;
}

function collectTypedTrees(tokens: NestedTokens) {
    const typeGroups: Record<string, Record<string, any>> = {};

    const walk = (node: unknown, path: string[]) => {
        if (!node || typeof node !== 'object') return;

        if (isTokenObject(node)) {
            const tokenType = node.type || 'other';
            if (!typeGroups[tokenType]) typeGroups[tokenType] = {};
            // Use original path without normalization
            addTokenAtPath(typeGroups[tokenType], path, node);
            return;
        }

        Object.entries(node as Record<string, unknown>).forEach(([key, value]) => {
            walk(value, [...path, key]);
        });
    };

    walk(tokens, []);
    return typeGroups;
}

function normalizeColorFamilyName(path: string[]) {
    // Remove common wrapper names to get the actual color family name
    const wrappers = new Set(['color', 'colors', 'base', 'foundation', 'value', 'primitive', 'primitives', 'palette', 'palettes']);
    const filtered = path.filter(p => !wrappers.has(p.toLowerCase()));
    const finalParts = filtered.length > 0 ? filtered : path;
    return finalParts.join('-') || 'color';
}

function flattenColorFamilies(node: unknown, path: string[] = [], families: Record<string, any> = {}) {
    if (!node || typeof node !== 'object') return families;

    const entries = Object.entries(node as Record<string, unknown>);
    const directTokens = entries.filter(([, value]) => isTokenObject(value));

    if (directTokens.length > 0) {
        const familyName = normalizeColorFamilyName(path);
        if (!families[familyName]) families[familyName] = {};
        directTokens.forEach(([shadeName, token]) => {
            families[familyName][shadeName] = token;
        });
        return families;
    }

    entries.forEach(([key, value]) => {
        if (value && typeof value === 'object') {
            flattenColorFamilies(value, [...path, key], families);
        }
    });

    return families;
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
        const typeGroups = collectTypedTrees(tokens);

        // Create a section for each unique type - no categorization
        Object.entries(typeGroups).forEach(([type, tree]) => {
            const tokenCount = findAllTokens(tree as NestedTokens).length;
            if (tokenCount === 0) return;

            const normalized = type.toLowerCase().replace(/[-_]/g, '');
            
            // Only special handling for colors (needs family grouping)
            if (normalized.includes('color')) {
                const colorFamilies = flattenColorFamilies(tree);
                items.push({
                    id: `${type}-section`,
                    name: type,
                    icon: 'colors',
                    type: 'colors',
                    tokens: colorFamilies,
                    count: Object.keys(colorFamilies).length
                });
            } else {
                // Everything else uses generic display
                items.push({
                    id: `${type}-section`,
                    name: type,
                    icon: 'components',
                    type: 'generic',
                    tokens: tree,
                    count: tokenCount
                });
            }
        });

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
                                    <h2 className="ftd-section-title">{section.name}</h2>
                                    <span className="ftd-section-count">{Object.keys(section.tokens).length} families</span>
                                </div>
                                <ColorFamiliesDisplay
                                    colorFamilies={section.tokens}
                                    tokenMap={tokenMap}
                                    onTokenClick={onTokenClick}
                                />
                            </div>
                        )}

                        {section.type === 'generic' && (
                            <div id={section.id} className="ftd-section ftd-scroll-target">
                                <div className="ftd-section-header">
                                    <div className="ftd-section-icon"><Icon name={section.icon} /></div>
                                    <h2 className="ftd-section-title">{section.name}</h2>
                                    <span className="ftd-section-count">{section.count} tokens</span>
                                </div>
                                <GenericTokenDisplay tokens={section.tokens} tokenType={section.name} />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

function GenericTokenDisplay({ tokens, tokenType }: { tokens: NestedTokens; tokenType: string }) {
    const [copiedToast, setCopiedToast] = useState<{ id: number; value: string } | null>(null);
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    const entries = findAllTokens(tokens);

    const showToast = (value: string) => {
        const id = ++toastIdRef.current;
        setCopiedToast({ id, value });
        if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => {
            setCopiedToast((current) => (current && current.id === id ? null : current));
            toastTimerRef.current = null;
        }, 2000);
    };

    useEffect(() => () => {
        if (toastTimerRef.current !== null) {
            window.clearTimeout(toastTimerRef.current);
        }
    }, []);

    const handleCopy = async (value: string) => {
        const success = await copyToClipboard(value);
        if (success) showToast(value);
    };

    if (entries.length === 0) return null;

    return (
        <>
            <div className="ftd-token-grid">
                {entries.map(({ path, token }) => {
                    const cssVar = toCssVariable(path);
                    const varValue = `var(${cssVar})`;

                    return (
                        <div
                            key={path}
                            className="ftd-display-card ftd-clickable-card"
                            data-token-name={path}
                            onClick={() => void handleCopy(varValue)}
                            title={`Click to copy: ${varValue}`}
                        >
                            <div className="ftd-token-preview-container">
                                <TokenPreview 
                                    type={tokenType}
                                    value={String(token.value)}
                                    name={path}
                                />
                            </div>
                            <p className="ftd-token-card-label">{path}</p>
                            <div className="ftd-token-values-row">
                                <span
                                    className="ftd-token-css-var"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void handleCopy(cssVar);
                                    }}
                                >
                                    {cssVar}
                                </span>
                                <span
                                    className="ftd-token-hex"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void handleCopy(String(token.value));
                                    }}
                                >
                                    {token.value}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {copiedToast &&
                (typeof document !== 'undefined'
                    ? createPortal(
                        <div key={copiedToast.id} className="ftd-copied-toast">
                            <div className="ftd-toast-icon">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <div className="ftd-toast-content">
                                <span className="ftd-toast-label">Copied</span>
                                <span className="ftd-toast-value">{copiedToast.value}</span>
                            </div>
                        </div>,
                        document.body
                    )
                    : null)}
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
    const [copiedToast, setCopiedToast] = useState<{ id: number; value: string } | null>(null);
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    const showToast = (value: string) => {
        const id = ++toastIdRef.current;
        setCopiedToast({ id, value });
        if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => {
            setCopiedToast((current) => (current && current.id === id ? null : current));
            toastTimerRef.current = null;
        }, 2000);
    };

    useEffect(() => () => {
        if (toastTimerRef.current !== null) {
            window.clearTimeout(toastTimerRef.current);
        }
    }, []);

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

            {copiedToast &&
                (typeof document !== 'undefined'
                    ? createPortal(
                        <div key={copiedToast.id} className="ftd-copied-toast">
                            <div className="ftd-toast-icon">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <div className="ftd-toast-content">
                                <span className="ftd-toast-label">Copied</span>
                                <span className="ftd-toast-value">{copiedToast.value}</span>
                            </div>
                        </div>,
                        document.body
                    )
                    : null)}
        </div>
    );
}

export default FoundationTab;
