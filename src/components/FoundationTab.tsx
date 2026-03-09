'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { NestedTokens } from '../types';
import type { CopyFormat } from './FormatSelector';
import { getContrastColor } from '../utils/color';
import { findAllTokens, toCssVariable } from '../utils/core';
import { formatTokenPath } from '../utils/formatUtils';
import { Icon, type IconName } from './Icon';
import { TokenPreview } from './TokenPreview';

interface FoundationTabProps {
    tokens: NestedTokens;
    tokenMap: Record<string, string>;
    onTokenClick?: (token: any) => void;
    copyFormat: CopyFormat;
    onCopy: (value: string, label: string, tokenPath?: string) => Promise<void>;
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

function formatTokenDisplayValue(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (value === null || value === undefined) {
        return '';
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

/**
 * FoundationTab - Displays all foundation tokens with scroll-spy navigation
 */
export function FoundationTab({ tokens, tokenMap, onTokenClick, copyFormat, onCopy }: FoundationTabProps) {
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
            } else if (normalized === 'other') {
                // Split 'other' typed tokens into sub-sections by top-level path key
                const subGroups: Record<string, Record<string, any>> = {};
                const walk = (node: unknown, path: string[]) => {
                    if (!node || typeof node !== 'object') return;
                    if (isTokenObject(node)) {
                        const key = path[0] || 'other';
                        if (!subGroups[key]) subGroups[key] = {};
                        addTokenAtPath(subGroups[key], path, node as { value: string | number; type: string });
                        return;
                    }
                    Object.entries(node as Record<string, unknown>).forEach(([k, v]) => walk(v, [...path, k]));
                };
                walk(tree, []);

                Object.entries(subGroups).forEach(([subKey, subTree]) => {
                    const subCount = findAllTokens(subTree as NestedTokens).length;
                    if (subCount === 0) return;
                    items.push({
                        id: `${subKey}-section`,
                        name: subKey,
                        icon: 'components',
                        type: 'generic',
                        tokens: subTree,
                        count: subCount
                    });
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
                                    onCopy={onCopy}
                                    copyFormat={copyFormat}
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
                                <GenericTokenDisplay 
                                    tokens={section.tokens} 
                                    tokenType={section.name}
                                    onCopy={onCopy}
                                    copyFormat={copyFormat}
                                />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

function GenericTokenDisplay({ tokens, tokenType, onCopy, copyFormat }: { tokens: NestedTokens; tokenType: string; onCopy: (value: string, label: string, tokenPath?: string) => Promise<void>; copyFormat: CopyFormat }) {
    const [copiedToast, setCopiedToast] = useState<{ id: number; value: string } | null>(null);
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    const entries = findAllTokens(tokens);

    useEffect(() => () => {
        if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    }, []);

    const handleCopy = async (value: string, label: string, tokenPath: string) => {
        await onCopy(value, label, tokenPath);
    };

    const getFormattedVar = (path: string) => formatTokenPath(path, copyFormat);

    if (entries.length === 0) return null;

    const normalized = tokenType.toLowerCase().replace(/[-_\s]/g, '');
    // For tokens typed as "other", sniff by path to identify the real category
    const firstPath = entries[0]?.path?.toLowerCase().replace(/[-_\s]/g, '') ?? '';
    const pathHint = (s: string) => entries.every(({ path }) => path.toLowerCase().replace(/[-_\s]/g, '').includes(s)) || firstPath.includes(s);

    // ── Z-INDEX ───────────────────────────────────────────────────────────
    const isZIndex = normalized.includes('zindex') || normalized.includes('z-index') || pathHint('zindex');

    if (isZIndex) {
        const toNum = (v: unknown) => { const n = parseInt(String(v), 10); return isNaN(n) ? 0 : n; };
        const sorted = [...entries].sort((a, b) => toNum(a.token.value) - toNum(b.token.value));
        const maxVal = Math.max(...sorted.map(e => toNum(e.token.value)), 1);
        const LAYERS_MAX = 6; // max visible stacked layers in diagram
        const LAYER_STEP = 6; // px offset per visual layer

        return (
            <>
                <div className="ftd-zi-grid">
                    {sorted.map(({ path, token }, idx) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const rawValue = formatTokenDisplayValue(token.value);
                        const numVal = toNum(rawValue);
                        const shortLabel = path.split('.').pop() || path;
                        // How many layers to render proportionally (min 1, max LAYERS_MAX)
                        const ratio = numVal / maxVal;
                        const layerCount = Math.max(1, Math.round(ratio * LAYERS_MAX));

                        return (
                            <div
                                key={path}
                                className="ftd-zi-card"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                <div className="ftd-zi-preview">
                                    <span className="ftd-zi-badge">{rawValue}</span>

                                    {/* Stacked layers diagram */}
                                    <div className="ftd-zi-stack">
                                        {Array.from({ length: layerCount }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`ftd-zi-layer ${i === layerCount - 1 ? 'is-top' : ''}`}
                                                style={{
                                                    bottom: `${i * LAYER_STEP}px`,
                                                    zIndex: i,
                                                    opacity: 0.3 + (i / layerCount) * 0.7,
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="ftd-zi-info">
                                    <p className="ftd-zi-name">{path}</p>
                                    <p className="ftd-zi-var">{varValue}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }


    const isSpacing = (normalized.includes('spacing') || normalized.includes('space') || normalized.includes('gap') || normalized.includes('padding') || normalized.includes('margin')) && !normalized.includes('letterspacing') && !normalized.includes('letter-spacing');

    if (isSpacing) {
        const numericValues = entries.map(({ token }) => parseFloat(String(token.value)) || 0);
        const maxVal = Math.max(...numericValues, 1);
        const MAX_BLOCK = 560;

        return (
            <>
                <div className="ftd-spacing-scale">
                    {entries.map(({ path, token }, i) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const displayValue = formatTokenDisplayValue(token.value);
                        const numeric = numericValues[i];
                        const blockW = Math.max(3, (numeric / maxVal) * MAX_BLOCK);
                        // Only show label inside if block is wide enough to comfortably fit it
                        const labelInside = blockW > 44;

                        return (
                            <div
                                key={path}
                                className="ftd-spacing-scale-row"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                <span className="ftd-spacing-scale-name">{path}</span>

                                <div className="ftd-spacing-scale-track">
                                    {/* Permanent left-edge anchor — same x for every row */}
                                    <span className="ftd-spacing-scale-origin" />
                                    <div className="ftd-spacing-scale-block" style={{ width: `${blockW}px` }}>
                                        <span className="ftd-spacing-scale-cap ftd-spacing-scale-cap-r" />
                                        {labelInside && (
                                            <span className="ftd-spacing-scale-inline-val">{displayValue}</span>
                                        )}
                                    </div>
                                    {!labelInside && (
                                        <span className="ftd-spacing-scale-outside-val">{displayValue}</span>
                                    )}
                                </div>

                                <div className="ftd-spacing-scale-meta" />

                                <div className="ftd-spacing-scale-copy">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── BORDER RADIUS ─────────────────────────────────────────────────────
    const isRadius = normalized.includes('radius') || normalized.includes('borderradius') || normalized.includes('round');

    if (isRadius) {
        return (
            <>
                <div className="ftd-radius-grid">
                    {entries.map(({ path, token }) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const rawValue = String(token.value);
                        const numericVal = parseFloat(rawValue);
                        // Treat very large values (≥999) as "full / pill"
                        const isPill = numericVal >= 999 || rawValue === '50%' || rawValue === '9999px';
                        const displayValue = isPill ? '50%' : formatTokenDisplayValue(token.value);
                        // Short label: last dot-segment only
                        const shortLabel = path.split('.').pop() || path;
                        // Hide corner marks when radius is so large corners aren't visible
                        const hideCorners = isPill || numericVal >= 20;

                        return (
                            <div
                                key={path}
                                className={`ftd-radius-card${isPill ? ' is-pill' : ''}`}
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                <div className="ftd-radius-demo-wrap">
                                    <div className="ftd-radius-demo-box" style={{ borderRadius: displayValue }}>
                                        {!hideCorners && <>
                                            <span className="ftd-radius-corner-mark ftd-radius-corner-tl" />
                                            <span className="ftd-radius-corner-mark ftd-radius-corner-tr" />
                                            <span className="ftd-radius-corner-mark ftd-radius-corner-bl" />
                                            <span className="ftd-radius-corner-mark ftd-radius-corner-br" />
                                        </>}
                                    </div>
                                </div>
                                <div className="ftd-radius-info">
                                    <p className="ftd-radius-name">{shortLabel}</p>
                                    <p className="ftd-radius-val">
                                        {isPill ? 'pill' : formatTokenDisplayValue(token.value)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── SIZING ────────────────────────────────────────────────────────────
    const isSizing = normalized === 'sizing' || normalized === 'sizes' || normalized === 'size';

    if (isSizing) {
        // Resolve each value to a comparable number for scaling
        const resolvedValues = entries.map(({ token }) => {
            const raw = String(token.value).trim();
            // Percentage: treat 100% as a large reference (e.g. 9999px equivalent for scale)
            if (raw.endsWith('%')) {
                return { numeric: parseFloat(raw) * 10, isPercent: true, isNonNumeric: false };
            }
            // vw / vh — treat as percentage-like
            if (raw.endsWith('vw') || raw.endsWith('vh')) {
                return { numeric: parseFloat(raw) * 10, isPercent: true, isNonNumeric: false };
            }
            const n = parseFloat(raw);
            if (!isNaN(n)) {
                return { numeric: n, isPercent: false, isNonNumeric: false };
            }
            // auto, fit-content, min-content, etc. — non-numeric
            return { numeric: 0, isPercent: false, isNonNumeric: true };
        });

        const numericOnly = resolvedValues.filter(v => !v.isNonNumeric).map(v => v.numeric);
        const maxVal = Math.max(...numericOnly, 1);
        const MAX_H = 120;
        const MIN_H = 16;
        const MAX_W = 100;
        const MIN_W = 16;

        // Split into scalable and non-scalable
        const scalable = entries.filter((_, i) => !resolvedValues[i].isNonNumeric);
        const nonNumeric = entries.filter((_, i) => resolvedValues[i].isNonNumeric);

        return (
            <>
                <div className="ftd-tshirt-wrap">
                    <div className="ftd-tshirt-stage">
                        {scalable.map(({ path, token }, si) => {
                            const originalIndex = entries.findIndex(e => e.path === path);
                            const { numeric, isPercent } = resolvedValues[originalIndex];
                            const cssVar = toCssVariable(path);
                            const varValue = `var(${cssVar})`;
                            const formattedVar = getFormattedVar(path);
                            const displayValue = formatTokenDisplayValue(token.value);
                            const ratio = numeric / maxVal;
                            const blockH = Math.max(MIN_H, ratio * MAX_H);
                            const blockW = Math.max(MIN_W, ratio * MAX_W);
                            const shortLabel = path.split('.').pop() || path;

                            return (
                                <div
                                    key={path}
                                    className={`ftd-tshirt-item${isPercent ? ' is-percent' : ''}`}
                                    onClick={() => void handleCopy(varValue, cssVar, path)}
                                    title={`Click to copy: ${formattedVar}`}
                                >
                                    <span className="ftd-tshirt-dim">{displayValue}</span>
                                    <div
                                        className="ftd-tshirt-block"
                                        style={{ width: `${blockW}px`, height: `${blockH}px` }}
                                    />
                                    <span className="ftd-tshirt-label">{shortLabel}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Non-numeric tokens shown as a simple tag list below */}
                    {nonNumeric.length > 0 && (
                        <div className="ftd-tshirt-nonnumeric">
                            <span className="ftd-tshirt-nonnumeric-label">Non-scalable</span>
                            {nonNumeric.map(({ path, token }) => {
                                const cssVar = toCssVariable(path);
                                const varValue = `var(${cssVar})`;
                                const formattedVar = getFormattedVar(path);
                                const displayValue = formatTokenDisplayValue(token.value);
                                const shortLabel = path.split('.').pop() || path;
                                return (
                                    <div
                                        key={path}
                                        className="ftd-tshirt-nonnumeric-tag"
                                        onClick={() => void handleCopy(varValue, cssVar, path)}
                                        title={`Click to copy: ${formattedVar}`}
                                    >
                                        <span className="ftd-tshirt-nonnumeric-name">{shortLabel}</span>
                                        <span className="ftd-tshirt-nonnumeric-val">{displayValue}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── BORDER WIDTH ──────────────────────────────────────────────────────
    const isBorderWidth = normalized.includes('borderwidth') || normalized.includes('border-width') || normalized.includes('strokewidth') || normalized === 'stroke';

    if (isBorderWidth) {
        return (
            <>
                <div className="ftd-bw-grid">
                    {entries.map(({ path, token }) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const displayValue = formatTokenDisplayValue(token.value);
                        const numeric = parseFloat(String(token.value)) || 0;
                        const shortLabel = path.split('.').pop() || path;
                        // Cap visual border so 0px still shows as hairline placeholder
                        const visualBorder = numeric === 0 ? 0 : Math.min(numeric, 12);

                        return (
                            <div
                                key={path}
                                className="ftd-bw-card"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                {/* Box with actual border thickness applied */}
                                <div className="ftd-bw-demo-wrap">
                                    <div
                                        className="ftd-bw-box"
                                        style={{ borderWidth: `${visualBorder}px` }}
                                    >
                                        {numeric === 0 && (
                                            <span className="ftd-bw-zero-label">no border</span>
                                        )}
                                    </div>
                                </div>
                                <div className="ftd-bw-info">
                                    <p className="ftd-bw-name">{shortLabel}</p>
                                    <p className="ftd-bw-val">{displayValue}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── FONT FAMILY ───────────────────────────────────────────────────────
    const isFontFamily = normalized.includes('fontfamily') || normalized.includes('font-family') || normalized === 'fontfamilies' || normalized === 'typeface';

    if (isFontFamily) {
        return (
            <>
                <div className="ftd-ff-grid">
                    {entries.map(({ path, token }) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const rawValue = formatTokenDisplayValue(token.value);
                        const shortLabel = path.split('.').pop() || path;
                        // First font in stack for the specimen
                        const firstFont = rawValue.split(',')[0].replace(/['"]/g, '').trim();

                        return (
                            <div
                                key={path}
                                className="ftd-ff-card"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                <div className="ftd-ff-specimen-wrap">
                                    <span
                                        className="ftd-ff-specimen"
                                        style={{ fontFamily: rawValue }}
                                    >
                                        Aa Bb Cc
                                    </span>
                                    <span className="ftd-ff-specimen-name">{firstFont.toUpperCase()}</span>
                                </div>
                                <div className="ftd-ff-info">
                                    <p className="ftd-ff-label">{path}</p>
                                    <p className="ftd-ff-var">{varValue}</p>
                                    <p className="ftd-ff-stack">{rawValue}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── FONT SIZE ─────────────────────────────────────────────────────────
    const isFontSize = normalized.includes('fontsize') || normalized.includes('font-size') || normalized === 'fontsizes' || normalized === 'textsizes' || normalized === 'textsize';

    if (isFontSize) {
        const parse = (raw: string): number => {
            const s = String(raw).trim();
            if (s.endsWith('rem')) return parseFloat(s) * 16;
            if (s.endsWith('em'))  return parseFloat(s) * 16;
            if (s.endsWith('px'))  return parseFloat(s);
            if (s.endsWith('%'))   return parseFloat(s) * 0.16;
            const n = parseFloat(s);
            return isNaN(n) ? 0 : n;
        };

        const sorted = [...entries].sort((a, b) => parse(String(a.token.value)) - parse(String(b.token.value)));
        const maxPx = Math.max(...sorted.map(e => parse(String(e.token.value))), 1);
        const SPECIMEN_MAX = 72;
        const SPECIMEN_MIN = 12;

        return (
            <>
                <div className="ftd-fsize-grid">
                    {sorted.map(({ path, token }) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const rawValue = formatTokenDisplayValue(token.value);
                        const shortLabel = path.split('.').pop() || path;
                        const resolvedPx = parse(rawValue);
                        const ratio = resolvedPx / maxPx;
                        const specimenSize = SPECIMEN_MIN + ratio * (SPECIMEN_MAX - SPECIMEN_MIN);

                        return (
                            <div
                                key={path}
                                className="ftd-fsize-card"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                {/* Preview box */}
                                <div className="ftd-fsize-preview">
                                    <span className="ftd-fsize-badge">{rawValue}</span>
                                    <span
                                        className="ftd-fsize-specimen"
                                        style={{ fontSize: `${specimenSize}px` }}
                                    >
                                        Aa
                                    </span>
                                </div>

                                {/* Info below */}
                                <div className="ftd-fsize-info">
                                    <p className="ftd-fsize-name">{path}</p>
                                    <p className="ftd-fsize-var">{varValue}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── FONT WEIGHT ───────────────────────────────────────────────────────
    const isFontWeight = normalized.includes('fontweight') || normalized.includes('font-weight') || normalized === 'fontweights';

    if (isFontWeight) {
        const sorted = [...entries].sort((a, b) => {
            const toNum = (v: unknown) => {
                const n = parseInt(String(v), 10);
                return isNaN(n) ? 0 : n;
            };
            return toNum(a.token.value) - toNum(b.token.value);
        });

        return (
            <>
                <div className="ftd-fw-grid">
                    {sorted.map(({ path, token }) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const rawValue = formatTokenDisplayValue(token.value);
                        const numericWeight = parseInt(rawValue, 10);
                        const fontWeight = isNaN(numericWeight) ? rawValue : numericWeight;

                        return (
                            <div
                                key={path}
                                className="ftd-fw-card"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                <div className="ftd-fw-preview">
                                    <span className="ftd-fw-badge">{rawValue}</span>
                                    <span
                                        className="ftd-fw-specimen"
                                        style={{ fontWeight: fontWeight as any }}
                                    >
                                        Aa
                                    </span>
                                </div>
                                <div className="ftd-fw-info">
                                    <p className="ftd-fw-name">{path}</p>
                                    <p className="ftd-fw-var">{varValue}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── LINE HEIGHT ───────────────────────────────────────────────────────
    const isLineHeight = normalized.includes('lineheight') || normalized.includes('line-height') || normalized === 'lineheights' || normalized === 'leading';

    if (isLineHeight) {
        const toNum = (v: unknown) => { const n = parseFloat(String(v)); return isNaN(n) ? 0 : n; };
        const sorted = [...entries].sort((a, b) => toNum(a.token.value) - toNum(b.token.value));

        return (
            <>
                <div className="ftd-lh-grid">
                    {sorted.map(({ path, token }) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const rawValue = formatTokenDisplayValue(token.value);
                        const numericLH = toNum(rawValue);
                        const FONT_PX = 22;
                        // Gap = the leading space above/below the glyph within the line box
                        const lineBoxPx = numericLH * FONT_PX;
                        const gapPx = Math.max(0, (lineBoxPx - FONT_PX) / 2);

                        return (
                            <div
                                key={path}
                                className="ftd-lh-card"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                <div className="ftd-lh-preview">
                                    <span className="ftd-lh-badge">{rawValue}</span>

                                    <div className="ftd-lh-specimen-wrap">
                                        {/* Line 1 */}
                                        <div className="ftd-lh-line">
                                            <span className="ftd-lh-glyph" style={{ fontSize: `${FONT_PX}px` }}>Ag</span>
                                        </div>

                                        {/* Gap zone — the visual heart of the component */}
                                        <div
                                            className="ftd-lh-gap-zone"
                                            style={{ height: `${Math.max(2, gapPx * 2)}px` }}
                                        >
                                            <span className="ftd-lh-gap-tick ftd-lh-gap-tick-top" />
                                            <span className="ftd-lh-gap-line" />
                                            <span className="ftd-lh-gap-tick ftd-lh-gap-tick-bot" />
                                        </div>

                                        {/* Line 2 */}
                                        <div className="ftd-lh-line">
                                            <span className="ftd-lh-glyph" style={{ fontSize: `${FONT_PX}px` }}>Ag</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ftd-lh-info">
                                    <p className="ftd-lh-name">{path}</p>
                                    <p className="ftd-lh-var">{varValue}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── LETTER SPACING ────────────────────────────────────────────────────
    const isLetterSpacing = normalized.includes('letterspacing') || normalized.includes('letter-spacing') || normalized === 'tracking' || normalized === 'kerning';

    if (isLetterSpacing) {
        const parseEm = (raw: string): number => {
            const s = String(raw).trim();
            if (s.endsWith('em')) return parseFloat(s);
            if (s.endsWith('px')) return parseFloat(s) / 16;
            if (s.endsWith('%')) return parseFloat(s) / 100;
            const n = parseFloat(s);
            return isNaN(n) ? 0 : n;
        };

        const sorted = [...entries].sort((a, b) => parseEm(String(a.token.value)) - parseEm(String(b.token.value)));
        const allVals = sorted.map(e => parseEm(String(e.token.value)));
        const maxAbs = Math.max(...allVals.map(Math.abs), 0.001);
        const TRACK_MAX = 80; // max bar half-width in px

        return (
            <>
                <div className="ftd-ls-grid">
                    {sorted.map(({ path, token }) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const rawValue = formatTokenDisplayValue(token.value);
                        const emVal = parseEm(rawValue);
                        const isNeg = emVal < 0;
                        const isZero = emVal === 0;
                        const ratio = Math.abs(emVal) / maxAbs;
                        const barW = Math.max(3, ratio * TRACK_MAX);

                        return (
                            <div
                                key={path}
                                className="ftd-ls-card"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                {/* Preview */}
                                <div className="ftd-ls-preview">
                                    <span className="ftd-ls-badge">{rawValue}</span>

                                    {/* Live specimen */}
                                    <span
                                        className="ftd-ls-specimen"
                                        style={{ letterSpacing: rawValue }}
                                    >
                                        ABCDE
                                    </span>

                                    {/* Bidirectional bar */}
                                    <div className="ftd-ls-track">
                                        <div className="ftd-ls-axis-line" />
                                        {!isZero && (
                                            <div
                                                className={`ftd-ls-bar ${isNeg ? 'is-neg' : 'is-pos'}`}
                                                style={{
                                                    width: `${barW}px`,
                                                    ...(isNeg
                                                        ? { right: '50%' }
                                                        : { left: '50%' })
                                                }}
                                            />
                                        )}
                                        {isZero && <div className="ftd-ls-zero-dot" />}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="ftd-ls-info">
                                    <p className="ftd-ls-name">{path}</p>
                                    <p className="ftd-ls-var">{varValue}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── OPACITY ───────────────────────────────────────────────────────────
    const isOpacity = normalized === 'opacity' || normalized === 'opacities' || normalized.includes('opacity');

    if (isOpacity) {
        const toNum = (v: unknown) => {
            const s = String(v).trim();
            // Handle percentage strings like "50%"
            if (s.endsWith('%')) return parseFloat(s) / 100;
            const n = parseFloat(s);
            // Handle 0–100 integer scale vs 0–1 float scale
            if (!isNaN(n)) return n > 1 ? n / 100 : n;
            return 0;
        };

        const sorted = [...entries].sort((a, b) => toNum(a.token.value) - toNum(b.token.value));

        return (
            <>
                <div className="ftd-op-grid">
                    {sorted.map(({ path, token }) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const rawValue = formatTokenDisplayValue(token.value);
                        const opacityNum = toNum(rawValue);
                        const shortLabel = path.split('.').pop() || path;
                        // Display as percentage always
                        const pctLabel = `${Math.round(opacityNum * 100)}%`;

                        return (
                            <div
                                key={path}
                                className="ftd-op-card"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                <div className="ftd-op-preview">
                                    <span className="ftd-op-badge">{pctLabel}</span>

                                    {/* Checkerboard bg to show transparency */}
                                    <div className="ftd-op-checker" />

                                    {/* Solid block dimmed by opacity */}
                                    <div
                                        className="ftd-op-block"
                                        style={{ opacity: opacityNum }}
                                    />
                                </div>

                                <div className="ftd-op-info">
                                    <p className="ftd-op-name">{path}</p>
                                    <p className="ftd-op-var">{varValue}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── BOX SHADOW ────────────────────────────────────────────────────────
    const isBoxShadow = normalized.includes('boxshadow') || normalized.includes('box-shadow') || normalized.includes('shadow') || normalized === 'elevation';

    if (isBoxShadow) {
        // Sort: none first → ascending blur/spread → inset last
        const shadowWeight = (raw: string): number => {
            if (raw === 'none' || raw === '0') return -1;
            if (raw.startsWith('inset')) return 9999;
            const blurs = [...raw.matchAll(/\S+px\s+([\d.]+)px/g)].map(m => parseFloat(m[1]));
            return blurs.reduce((a, b) => a + b, 0);
        };
        // Extract largest blur value for the badge
        const maxBlur = (raw: string): string | null => {
            if (raw === 'none' || raw === '0') return null;
            const blurs = [...raw.matchAll(/\S+px\s+([\d.]+)px/g)].map(m => parseFloat(m[1]));
            if (blurs.length === 0) return null;
            return `${Math.max(...blurs)}px`;
        };
        const sorted = [...entries].sort((a, b) =>
            shadowWeight(String(a.token.value)) - shadowWeight(String(b.token.value))
        );

        return (
            <>
                <div className="ftd-bs-grid">
                    {sorted.map(({ path, token }) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const rawValue = formatTokenDisplayValue(token.value);
                        const isNone = rawValue === 'none' || rawValue === '0';
                        const isInset = rawValue.startsWith('inset');
                        const blurBadge = maxBlur(rawValue);
                        // Count shadow layers
                        const layerCount = isNone ? 0 : rawValue.split(/,(?![^(]*\))/).length;

                        return (
                            <div
                                key={path}
                                className="ftd-bs-card"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                <div className="ftd-bs-preview">
                                    <div className="ftd-bs-badges">
                                        {isNone && <span className="ftd-bs-tag">none</span>}
                                        {isInset && <span className="ftd-bs-tag">inset</span>}
                                    </div>
                                    <div
                                        className="ftd-bs-box"
                                        style={{ boxShadow: isNone ? 'none' : rawValue }}
                                    />
                                </div>
                                <div className="ftd-bs-info">
                                    <p className="ftd-bs-name">{path}</p>
                                    <p className="ftd-bs-var">{varValue}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── DURATION ──────────────────────────────────────────────────────────
    const isDuration = normalized.includes('duration') || normalized.includes('transition') || normalized.includes('animation') || pathHint('duration');

    if (isDuration) {
        const parseMs = (v: unknown): number => {
            const s = String(v).trim();
            if (s.endsWith('ms')) return parseFloat(s);
            if (s.endsWith('s') && !s.endsWith('ms')) return parseFloat(s) * 1000;
            const n = parseFloat(s);
            return isNaN(n) ? 0 : n;
        };
        const sorted = [...entries].sort((a, b) => parseMs(a.token.value) - parseMs(b.token.value));
        const maxMs = Math.max(...sorted.map(e => parseMs(e.token.value)), 1);
        const BAR_MAX = 280;

        return (
            <>
                <div className="ftd-dur-list">
                    {sorted.map(({ path, token }) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const rawValue = formatTokenDisplayValue(token.value);
                        const ms = parseMs(rawValue);
                        const barW = ms === 0 ? 3 : Math.max(6, (ms / maxMs) * BAR_MAX);

                        return (
                            <div
                                key={path}
                                className="ftd-dur-row"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                <div className="ftd-dur-meta">
                                    <span className="ftd-dur-label">{path.split('.').pop()}</span>
                                    <span className="ftd-dur-var">{varValue}</span>
                                </div>

                                <div className="ftd-dur-track-wrap">
                                    <div className="ftd-dur-track">
                                        <div className="ftd-dur-bar" style={{ width: `${barW}px` }} />
                                    </div>
                                    <span className="ftd-dur-value">{rawValue}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── EASING ────────────────────────────────────────────────────────────
    const isEasing = normalized.includes('easing') || normalized.includes('ease') || normalized.includes('bezier') || normalized.includes('cubic') || pathHint('easing');

    if (isEasing) {
        // Parse cubic-bezier(x1,y1,x2,y2) into control points
        const parseBezier = (v: string): [number,number,number,number] | null => {
            const m = v.match(/cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/);
            if (m) return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
            if (v === 'linear') return [0, 0, 1, 1];
            if (v === 'ease') return [0.25, 0.1, 0.25, 1];
            if (v === 'ease-in') return [0.42, 0, 1, 1];
            if (v === 'ease-out') return [0, 0, 0.58, 1];
            if (v === 'ease-in-out') return [0.42, 0, 0.58, 1];
            return null;
        };

        // Build SVG path from bezier control points (approximation using cubic bezier SVG path)
        const bezierPath = (cp: [number,number,number,number], W = 80, H = 60): string => {
            const [x1, y1, x2, y2] = cp;
            const sx = 8, sy = H - 8, ex = W - 8, ey = 8;
            const c1x = sx + x1 * (ex - sx);
            const c1y = sy - y1 * (sy - ey);
            const c2x = sx + x2 * (ex - sx);
            const c2y = sy - y2 * (sy - ey);
            return `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}`;
        };

        return (
            <>
                <div className="ftd-ease-grid">
                    {entries.map(({ path, token }) => {
                        const cssVar = toCssVariable(path);
                        const varValue = `var(${cssVar})`;
                        const formattedVar = getFormattedVar(path);
                        const rawValue = formatTokenDisplayValue(token.value);
                        const cp = parseBezier(rawValue);
                        const svgPath = cp ? bezierPath(cp) : null;

                        return (
                            <div
                                key={path}
                                className="ftd-ease-card"
                                data-token-name={path}
                                onClick={() => void handleCopy(varValue, cssVar, path)}
                                title={`Click to copy: ${formattedVar}`}
                            >
                                <div className="ftd-ease-preview">
                                    <svg className="ftd-ease-svg" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        {/* Grid lines */}
                                        <line x1="8" y1="8" x2="8" y2="52" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
                                        <line x1="8" y1="52" x2="72" y2="52" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
                                        {/* Diagonal reference (linear) */}
                                        <line x1="8" y1="52" x2="72" y2="8" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.2"/>
                                        {/* Curve */}
                                        {svgPath && <path d={svgPath} stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>}
                                        {/* Start / end dots */}
                                        <circle cx="8" cy="52" r="2.5" fill="currentColor" opacity="0.5"/>
                                        <circle cx="72" cy="8" r="2.5" fill="currentColor" opacity="0.5"/>
                                    </svg>
                                </div>
                                <div className="ftd-ease-info">
                                    <p className="ftd-ease-name">{path}</p>
                                    <p className="ftd-ease-var">{varValue}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {copiedToast && typeof document !== 'undefined' && createPortal(
                    <div key={copiedToast.id} className="ftd-copied-toast">
                        <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                        <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                    </div>, document.body
                )}
            </>
        );
    }

    // ── EVERYTHING ELSE — generic card grid ───────────────────────────────
    return (
        <>
            <div className="ftd-token-grid">
                {entries.map(({ path, token }) => {
                    const cssVar = toCssVariable(path);
                    const formattedVar = getFormattedVar(path);
                    const varValue = `var(${cssVar})`;
                    const displayValue = formatTokenDisplayValue(token.value);

                    return (
                        <div
                            key={path}
                            className="ftd-display-card ftd-clickable-card"
                            data-token-name={path}
                            onClick={() => void handleCopy(varValue, cssVar, path)}
                            title={`Click to copy: ${varValue}`}
                        >
                            <div className="ftd-token-preview-container">
                                <TokenPreview
                                    type={tokenType}
                                    value={displayValue}
                                    name={path}
                                />
                            </div>
                            <p className="ftd-token-card-label">{path}</p>
                            <div className="ftd-token-values-row">
                                <span className="ftd-token-css-var">{formattedVar}</span>
                                <span className="ftd-token-hex">{displayValue}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {copiedToast && typeof document !== 'undefined' && createPortal(
                <div key={copiedToast.id} className="ftd-copied-toast">
                    <div className="ftd-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                    <div className="ftd-toast-content"><span className="ftd-toast-label">Copied</span><span className="ftd-toast-value">{copiedToast.value}</span></div>
                </div>, document.body
            )}
        </>
    );
}

function ColorFamiliesDisplay({
    colorFamilies,
    tokenMap,
    onTokenClick,
    onCopy,
    copyFormat
}: {
    colorFamilies: any;
    tokenMap: Record<string, string>;
    onTokenClick?: (token: any) => void;
    onCopy: (value: string, label: string, tokenPath?: string) => Promise<void>;
    copyFormat: CopyFormat;
}) {
    const [activeFamily, setActiveFamily] = useState<string | null>(null);
    const [copiedShade, setCopiedShade] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const familyNames = Object.keys(colorFamilies);
    const activeIndex = activeFamily ? familyNames.indexOf(activeFamily) : -1;
    const hasPrev = activeIndex > 0;
    const hasNext = activeIndex < familyNames.length - 1;

    // Auto-open panel if URL hash matches a color shade
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const hash = window.location.hash.slice(1);
        if (!hash) return;
        
        const tokenName = decodeURIComponent(hash).trim();
        const parts = tokenName.split('.');
        if (parts.length === 2) {
            const [family, shade] = parts;
            if (colorFamilies[family] && colorFamilies[family][shade]) {
                setActiveFamily(family);
            }
        }
    }, [colorFamilies]);

    const goTo = (name: string) => {
        setCopiedShade(null);
        setActiveFamily(name);
    };

    const goPrev = () => { if (hasPrev) goTo(familyNames[activeIndex - 1]); };
    const goNext = () => { if (hasNext) goTo(familyNames[activeIndex + 1]); };

    const closePanel = () => {
        setActiveFamily(null);
        setCopiedShade(null);
    };

    const handleCopyShade = async (colorValue: string, cssVar: string, tokenPath: string, shadeKey: string) => {
        const formattedVar = formatTokenPath(tokenPath, copyFormat);
        await onCopy(formattedVar, cssVar, tokenPath);
        onTokenClick?.({ value: colorValue, cssVariable: cssVar });
        setCopiedShade(shadeKey);
        setTimeout(() => setCopiedShade(null), 1400);
    };

    // Keyboard: Escape = close, ArrowLeft/ArrowRight = prev/next
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!activeFamily) return;
            if (e.key === 'Escape') closePanel();
            if (e.key === 'ArrowLeft') goPrev();
            if (e.key === 'ArrowRight') goNext();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeFamily, activeIndex]);

    const activeFamilyData = activeFamily ? colorFamilies[activeFamily] : null;

    const panelContent = activeFamilyData ? (() => {
        const shadeKeys = Object.keys(activeFamilyData);
        const midShade = activeFamilyData[shadeKeys[Math.floor(shadeKeys.length / 2)]];
        const lastShade = activeFamilyData[shadeKeys[shadeKeys.length - 1]];
        const primaryColor = midShade?.value || '#888';
        const secondaryColor = lastShade?.value || primaryColor;
        const textColor = getContrastColor(primaryColor) === 'white' ? '#fff' : '#000';
        return { shadeKeys, primaryColor, secondaryColor, textColor };
    })() : null;

    return (
        <>
            {/* Grid — layout never changes */}
            <div className="ftd-color-family-container">
                {Object.entries(colorFamilies).map(([familyName, shades]: [string, any]) => {
                    const shadeKeys = Object.keys(shades);
                    const midShade = shades[shadeKeys[Math.floor(shadeKeys.length / 2)]];
                    const lastShade = shades[shadeKeys[shadeKeys.length - 1]];
                    const primaryColor = midShade?.value || '#888';
                    const secondaryColor = lastShade?.value || primaryColor;
                    const textColor = getContrastColor(primaryColor) === 'white' ? '#fff' : '#000';
                    const isActive = activeFamily === familyName;

                    return (
                        <div
                            key={familyName}
                            className={`ftd-color-family-card${isActive ? ' is-active' : ''}`}
                            onClick={() => goTo(familyName)}
                            title={`View ${familyName} shades`}
                        >
                            <div
                                className="ftd-color-family-hero"
                                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                            >
                                <div className="ftd-color-family-hero-overlay" />
                                <span className="ftd-color-family-hero-name" style={{ color: textColor }}>
                                    {familyName}
                                </span>
                            </div>
                            <div className="ftd-color-shades-strip">
                                {shadeKeys.map(shadeName => (
                                    <div key={shadeName} className="ftd-color-shade-pip" style={{ background: shades[shadeName]?.value || '#888' }} />
                                ))}
                            </div>
                            <div className="ftd-color-family-meta">
                                <span className="ftd-color-family-count">{shadeKeys.length} shades</span>
                                <span className="ftd-color-family-hex">
                                    {primaryColor.startsWith('#') ? primaryColor.substring(0, 7) : primaryColor}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Slide-out panel */}
            {typeof document !== 'undefined' && createPortal(
                <>
                    <div className={`ftd-panel-backdrop${activeFamily ? ' is-visible' : ''}`} onClick={closePanel} />

                    <div
                        ref={panelRef}
                        className={`ftd-color-panel${activeFamily ? ' is-open' : ''}`}
                        role="dialog"
                        aria-modal="true"
                        aria-label={activeFamily ? `${activeFamily} color shades` : undefined}
                    >
                        {panelContent && activeFamilyData && activeFamily && (
                            <>
                                {/* Hero */}
                                <div
                                    className="ftd-color-panel-hero"
                                    style={{ background: `linear-gradient(135deg, ${panelContent.primaryColor}, ${panelContent.secondaryColor})` }}
                                >
                                    <div className="ftd-color-panel-hero-overlay" />
                                    <div className="ftd-color-panel-hero-content">
                                        <div className="ftd-color-panel-hero-text">
                                            <p className="ftd-color-panel-family-label">Color family</p>
                                            <h2 className="ftd-color-panel-family-name" style={{ color: panelContent.textColor }}>
                                                {activeFamily}
                                            </h2>
                                            <p className="ftd-color-panel-shade-count" style={{ color: panelContent.textColor }}>
                                                {panelContent.shadeKeys.length} shades
                                            </p>
                                        </div>

                                        {/* Nav controls: prev / counter / next / close */}
                                        <div className="ftd-color-panel-nav">
                                            <button
                                                className="ftd-color-panel-nav-btn"
                                                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                                                disabled={!hasPrev}
                                                aria-label="Previous family"
                                                title="Previous (←)"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                                            </button>
                                            <span className="ftd-color-panel-nav-counter">
                                                {activeIndex + 1} / {familyNames.length}
                                            </span>
                                            <button
                                                className="ftd-color-panel-nav-btn"
                                                onClick={(e) => { e.stopPropagation(); goNext(); }}
                                                disabled={!hasNext}
                                                aria-label="Next family"
                                                title="Next (→)"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                            </button>
                                            <div className="ftd-color-panel-nav-divider" />
                                            <button className="ftd-color-panel-close" onClick={closePanel} aria-label="Close panel" title="Close (Esc)">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Shade strip */}
                                    <div className="ftd-color-panel-strip">
                                        {panelContent.shadeKeys.map(shadeName => (
                                            <div key={shadeName} className="ftd-color-panel-strip-pip" style={{ background: activeFamilyData[shadeName]?.value || '#888' }} />
                                        ))}
                                    </div>
                                </div>

                                {/* Shade list */}
                                <div className="ftd-color-panel-body">
                                    <p className="ftd-color-panel-hint">Click any shade to copy</p>
                                    <div className="ftd-color-panel-shades">
                                        {Object.entries(activeFamilyData).map(([shadeName, shadeToken]: [string, any]) => {
                                            const bgColor = shadeToken.value;
                                            const cssVar = `--base-${activeFamily}-${shadeName}`;
                                            const tokenPath = `${activeFamily}.${shadeName}`;
                                            const formattedVar = formatTokenPath(`base.${activeFamily}.${shadeName}`, copyFormat);
                                            const isCopied = copiedShade === tokenPath;
                                            const contrastText = getContrastColor(bgColor);

                                            return (
                                                <div
                                                    key={shadeName}
                                                    className={`ftd-color-panel-shade-row${isCopied ? ' is-copied' : ''}`}
                                                    data-token-name={tokenPath}
                                                    onClick={() => void handleCopyShade(bgColor, cssVar, tokenPath, tokenPath)}
                                                    title={`Copy ${bgColor}`}
                                                >
                                                    <div className="ftd-color-panel-swatch" style={{ background: bgColor }}>
                                                        {isCopied && (
                                                            <svg className="ftd-color-panel-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={contrastText === 'white' ? '#fff' : '#000'} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                                        )}
                                                    </div>
                                                    <div className="ftd-color-panel-shade-info">
                                                        <span className="ftd-color-panel-shade-name">{shadeName}</span>
                                                        <span className="ftd-color-panel-shade-var">{formattedVar}</span>
                                                    </div>
                                                    <span className="ftd-color-panel-shade-hex">
                                                        {isCopied ? 'Copied!' : bgColor}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>,
                document.body
            )}
        </>
    );
}

export default FoundationTab;