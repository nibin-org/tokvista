'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { NestedTokens } from '../types';
import { SpacingDisplay } from './SpacingDisplay';
import { SizeDisplay } from './SizeDisplay';
import { RadiusDisplay } from './RadiusDisplay';
import { getContrastColor } from '../utils/color';
import { copyToClipboard } from '../utils/ui';
import { findAllTokens, toCssVariable } from '../utils/core';
import { Icon, type IconName } from './Icon';

interface FoundationTabProps {
    tokens: NestedTokens;
    tokenMap: Record<string, string>;
    onTokenClick?: (token: any) => void;
    onNavigateTab?: (tab: 'semantic' | 'components' | 'playground') => void;
}

interface Section {
    id: string;
    name: string;
    icon: IconName;
    type: string;
    tokens: any;
    count: number;
}

type FoundationTokenKind = 'color' | 'spacing' | 'sizing' | 'radius' | 'typography' | 'other';

function isTokenObject(value: unknown): value is { value: string | number; type: string } {
    return !!value && typeof value === 'object' && 'value' in (value as Record<string, unknown>) && 'type' in (value as Record<string, unknown>);
}

function inferKindFromPath(path: string[]): FoundationTokenKind {
    const joined = path.join('-').toLowerCase();

    if (joined.includes('radius') || joined.includes('round')) return 'radius';
    if (joined.includes('space') || joined.includes('spacing') || joined.includes('gap') || joined.includes('padding') || joined.includes('margin')) return 'spacing';
    if (joined.includes('font') || joined.includes('line-height') || joined.includes('lineheight') || joined.includes('letter')) return 'typography';
    if (joined.includes('size') || joined.includes('width') || joined.includes('height')) return 'sizing';

    return 'other';
}

function normalizeTokenKind(type: string, path: string[]): FoundationTokenKind {
    const raw = String(type || '').toLowerCase();

    if (raw === 'color') return 'color';
    if (raw === 'spacing') return 'spacing';
    if (raw === 'sizing' || raw === 'size') return 'sizing';
    if (raw === 'borderradius' || raw === 'radius') return 'radius';
    if (raw.includes('font') || raw.includes('line') || raw.includes('letter')) return 'typography';

    if (raw === 'dimension') return inferKindFromPath(path);

    const inferred = inferKindFromPath(path);
    return inferred === 'other' ? 'other' : inferred;
}

function normalizePathForKind(path: string[]): string[] {
    const genericWrappers = new Set(['foundation', 'value', 'base', 'token', 'tokens', 'primitive', 'primitives']);

    let start = 0;
    while (start < path.length - 1) {
        const part = path[start].toLowerCase();
        if (genericWrappers.has(part)) {
            start += 1;
            continue;
        }
        break;
    }

    return path.slice(start);
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
    const colorTree: Record<string, any> = {};
    const spacingTree: Record<string, any> = {};
    const sizingTree: Record<string, any> = {};
    const radiusTree: Record<string, any> = {};
    const typographyTree: Record<string, any> = {};

    const walk = (node: unknown, path: string[]) => {
        if (!node || typeof node !== 'object') return;

        if (isTokenObject(node)) {
            const kind = normalizeTokenKind(node.type, path);
            const normalizedPath = normalizePathForKind(path);
            if (kind === 'color') addTokenAtPath(colorTree, normalizedPath, node);
            if (kind === 'spacing') addTokenAtPath(spacingTree, normalizedPath, node);
            if (kind === 'sizing') addTokenAtPath(sizingTree, normalizedPath, node);
            if (kind === 'radius') addTokenAtPath(radiusTree, normalizedPath, node);
            if (kind === 'typography') addTokenAtPath(typographyTree, normalizedPath, node);
            return;
        }

        Object.entries(node as Record<string, unknown>).forEach(([key, value]) => {
            walk(value, [...path, key]);
        });
    };

    walk(tokens, []);
    return { colorTree, spacingTree, sizingTree, radiusTree, typographyTree };
}

function normalizeColorFamilyName(path: string[]) {
    const wrappers = new Set(['color', 'colors', 'base', 'foundation', 'value', 'primitive', 'primitives', 'palette', 'palettes']);
    const filtered = path.filter(p => !wrappers.has(p.toLowerCase()));
    const finalParts = filtered.length > 0 ? filtered : path;
    return finalParts.join('-') || 'base';
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

function toTokenPart(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'base';
}

function sortShadeNames(a: string, b: string) {
    const aNum = Number.parseFloat(a);
    const bNum = Number.parseFloat(b);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    if (!Number.isNaN(aNum)) return -1;
    if (!Number.isNaN(bNum)) return 1;
    return a.localeCompare(b);
}

function buildSegmentedGradient(colors: string[]) {
    if (colors.length === 0) return 'transparent';
    if (colors.length === 1) return colors[0];
    const step = 100 / colors.length;
    const stops = colors.map((color, index) => {
        const start = Number((index * step).toFixed(2));
        const end = Number(((index + 1) * step).toFixed(2));
        return `${color} ${start}% ${end}%`;
    });
    return `linear-gradient(90deg, ${stops.join(', ')})`;
}

type TokenCopyFormat = 'css' | 'scss' | 'tailwind';
type TailwindTokenUsage = 'bg' | 'spacing' | 'size' | 'radius' | 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing';

function getTokenCopyValue(cssVar: string, format: TokenCopyFormat, tailwindUsage: TailwindTokenUsage = 'bg') {
    if (format === 'css') return `var(${cssVar})`;
    if (format === 'scss') return `$${cssVar.replace(/^--/, '')}`;

    if (tailwindUsage === 'spacing') return `p-[var(${cssVar})]`;
    if (tailwindUsage === 'size') return `w-[var(${cssVar})]`;
    if (tailwindUsage === 'radius') return `rounded-[var(${cssVar})]`;
    if (tailwindUsage === 'fontFamily') return `font-[var(${cssVar})]`;
    if (tailwindUsage === 'fontSize') return `text-[var(${cssVar})]`;
    if (tailwindUsage === 'fontWeight') return `font-[var(${cssVar})]`;
    if (tailwindUsage === 'lineHeight') return `leading-[var(${cssVar})]`;
    if (tailwindUsage === 'letterSpacing') return `tracking-[var(${cssVar})]`;
    return `bg-[var(${cssVar})]`;
}

/**
 * FoundationTab - Displays all foundation tokens with scroll-spy navigation
 */
export function FoundationTab({ tokens, tokenMap, onTokenClick, onNavigateTab }: FoundationTabProps) {
    const [activeSection, setActiveSection] = useState<string>('');

    const sections = useMemo(() => {
        const items: Section[] = [];

        const { colorTree, spacingTree, sizingTree, radiusTree, typographyTree } = collectTypedTrees(tokens);
        const colorFamilies = flattenColorFamilies(colorTree);

        if (Object.keys(colorFamilies).length > 0) {
            items.push({
                id: 'colors-section',
                name: 'Colors',
                icon: 'colors',
                type: 'colors',
                tokens: colorFamilies,
                count: Object.keys(colorFamilies).length
            });
        }

        const spacingCount = findAllTokens(spacingTree as NestedTokens).length;
        if (spacingCount > 0) {
            items.push({ id: 'spacing-section', name: 'Spacing', icon: 'spacing', type: 'spacing', tokens: spacingTree, count: spacingCount });
        }

        const sizingCount = findAllTokens(sizingTree as NestedTokens).length;
        if (sizingCount > 0) {
            items.push({ id: 'sizes-section', name: 'Sizes', icon: 'sizes', type: 'sizing', tokens: sizingTree, count: sizingCount });
        }

        const radiusCount = findAllTokens(radiusTree as NestedTokens).length;
        if (radiusCount > 0) {
            items.push({ id: 'radius-section', name: 'Radius', icon: 'radius', type: 'radius', tokens: radiusTree, count: radiusCount });
        }

        const typographyCount = findAllTokens(typographyTree as NestedTokens).length;
        if (typographyCount > 0) {
            items.push({ id: 'typography-section', name: 'Typography', icon: 'typography', type: 'typography', tokens: typographyTree, count: typographyCount });
        }

        return items;
    }, [tokens]);

    // Initialize active section
    useEffect(() => {
        if (sections.length > 0 && !activeSection) {
            setActiveSection(sections[0].id);
        }
    }, [sections, activeSection]);

    const selectSection = (id: string) => {
        setActiveSection(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (sections.length === 0) {
        return <div className="ftd-empty">No foundation tokens found</div>;
    }

    return (
        <div className="ftd-color-layout ftd-foundation-layout">
            <aside className="ftd-color-sidebar ftd-foundation-sidebar">
                <div className="ftd-nav-group">
                    <p className="ftd-nav-group-title">Foundation</p>
                    <nav className="ftd-color-nav ftd-foundation-nav" aria-label="Foundation sections">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                className={`ftd-color-nav-link ${activeSection === section.id ? 'active' : ''}`}
                                onClick={() => selectSection(section.id)}
                            >
                                <span className="ftd-nav-label">{section.name}</span>
                                <span className="ftd-nav-count">{section.count}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                {onNavigateTab && (
                    <div className="ftd-nav-group ftd-nav-group-secondary">
                        <p className="ftd-nav-group-title">Reference</p>
                        <nav className="ftd-color-nav ftd-foundation-nav-secondary" aria-label="Foundation references">
                            <button type="button" className="ftd-color-nav-link ftd-color-nav-link-secondary" onClick={() => onNavigateTab('semantic')}>
                                <span className="ftd-nav-label">Semantic</span>
                            </button>
                            <button type="button" className="ftd-color-nav-link ftd-color-nav-link-secondary" onClick={() => onNavigateTab('components')}>
                                <span className="ftd-nav-label">Specs</span>
                            </button>
                            <button type="button" className="ftd-color-nav-link ftd-color-nav-link-secondary" onClick={() => onNavigateTab('playground')}>
                                <span className="ftd-nav-label">Playground</span>
                            </button>
                        </nav>
                    </div>
                )}
            </aside>

            <div className="ftd-color-content">
                {sections.map((section) => (
                    <div key={section.id} className={`ftd-foundation-panel ${activeSection === section.id ? 'is-active' : 'is-hidden'}`}>
                        {section.type === 'colors' && (
                            <div id={section.id} className="ftd-section ftd-scroll-target">
                                <div className="ftd-foundation-intro">
                                    <h2 className="ftd-section-title">Base Colors</h2>
                                    <p className="ftd-foundation-subtitle">
                                        {Object.keys(section.tokens).length} color families
                                        {' '}
                                        &#183;
                                        {' '}
                                        {Object.values(section.tokens as Record<string, Record<string, unknown>>).reduce((total, shades) => total + Object.keys(shades).length, 0)}
                                        {' '}
                                        tokens. Click a CSS, SCSS, or Tailwind value to copy.
                                    </p>
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
                            <div id={section.id} className="ftd-scroll-target">
                                <TypographyDisplay tokens={section.tokens} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function TypographyDisplay({ tokens }: { tokens: NestedTokens }) {
    const [copiedToast, setCopiedToast] = useState<{ id: number; value: string } | null>(null);
    const [activeGroup, setActiveGroup] = useState<string>('');
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    const wrappers = useMemo(() => new Set(['typography', 'type', 'types']), []);
    const groupOrder = useMemo(() => ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'], []);
    const groupMeta = useMemo(() => ({
        fontFamily: { label: 'Font Family', valueLabel: null as string | null, previewLabel: 'Preview' },
        fontSize: { label: 'Font Size', valueLabel: 'Size', previewLabel: 'Preview' },
        fontWeight: { label: 'Font Weight', valueLabel: 'Weight', previewLabel: 'Preview' },
        lineHeight: { label: 'Line Height', valueLabel: 'Value', previewLabel: 'Preview' },
        letterSpacing: { label: 'Letter Spacing', valueLabel: 'Value', previewLabel: 'Preview' }
    }), []);

    const normalizeGroupKey = (value: string) => {
        const key = value.toLowerCase().replace(/[^a-z]/g, '');
        if (key.includes('fontfamily')) return 'fontFamily';
        if (key.includes('fontsize')) return 'fontSize';
        if (key.includes('fontweight')) return 'fontWeight';
        if (key.includes('lineheight')) return 'lineHeight';
        if (key.includes('letterspacing')) return 'letterSpacing';
        return value;
    };

    const getGroupKeyFromPath = (path: string) => {
        const parts = path.split('.').filter(Boolean);
        if (parts.length === 0) return 'typography';
        const joined = parts.join('-').toLowerCase().replace(/[^a-z]/g, '');
        if (joined.includes('fontfamily')) return 'fontFamily';
        if (joined.includes('fontsize')) return 'fontSize';
        if (joined.includes('fontweight')) return 'fontWeight';
        if (joined.includes('lineheight')) return 'lineHeight';
        if (joined.includes('letterspacing')) return 'letterSpacing';
        const normalizedParts = parts.map(part => normalizeGroupKey(part));
        const firstMeaningful = normalizedParts.find((part, index) => !(index === 0 && wrappers.has(parts[0].toLowerCase())));
        if (!firstMeaningful) return 'typography';
        return firstMeaningful;
    };

    const entries = useMemo(() => {
        return findAllTokens(tokens)
            .filter(({ path, token }) => normalizeTokenKind(token.type, path.split('.')) === 'typography')
            .map(({ path, token }) => {
                const cssVar = toCssVariable(path);
                const value = String(token.value);
                const parsed = Number.parseFloat(value);
                return {
                    path,
                    token,
                    cssVar,
                    value,
                    numericValue: Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
                };
            });
    }, [tokens]);

    const groups = useMemo(() => {
        const grouped = new Map<string, typeof entries>();

        entries.forEach((entry) => {
            const groupKey = getGroupKeyFromPath(entry.path);
            if (!grouped.has(groupKey)) grouped.set(groupKey, []);
            grouped.get(groupKey)!.push(entry);
        });

        const sortGroupEntries = (groupKey: string, groupEntries: typeof entries) => {
            if (groupKey === 'fontFamily') {
                return [...groupEntries].sort((a, b) => a.path.localeCompare(b.path));
            }

            if (groupKey === 'fontSize' || groupKey === 'fontWeight' || groupKey === 'lineHeight' || groupKey === 'letterSpacing') {
                return [...groupEntries].sort((a, b) => {
                    if (a.numericValue !== b.numericValue) return a.numericValue - b.numericValue;
                    return a.path.localeCompare(b.path);
                });
            }

            return [...groupEntries].sort((a, b) => a.path.localeCompare(b.path));
        };

        return Array.from(grouped.entries())
            .map(([groupKey, groupEntries]) => {
                const meta = groupMeta[groupKey as keyof typeof groupMeta];
                return {
                    key: groupKey,
                    label: meta?.label || groupKey,
                    valueLabel: meta?.valueLabel || 'Value',
                    previewLabel: meta?.previewLabel || 'Preview',
                    entries: sortGroupEntries(groupKey, groupEntries)
                };
            })
            .sort((a, b) => {
                const aIndex = groupOrder.indexOf(a.key);
                const bIndex = groupOrder.indexOf(b.key);
                if (aIndex === -1 && bIndex === -1) return a.label.localeCompare(b.label);
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
    }, [entries, groupMeta, groupOrder]);

    useEffect(() => {
        if (groups.length === 0) {
            setActiveGroup('');
            return;
        }

        if (!groups.some(group => group.key === activeGroup)) {
            setActiveGroup(groups[0].key);
        }
    }, [groups, activeGroup]);

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

    const selectedGroup = groups.find(group => group.key === activeGroup) || groups[0];
    if (!selectedGroup) return null;

    const hasValueColumn = selectedGroup.valueLabel !== null;
    const tableMode = hasValueColumn ? 'has-value-col' : 'no-value-col';

    const renderPreview = (groupKey: string, value: string) => {
        if (groupKey === 'fontFamily') {
            return (
                <div className="ftd-typography-preview-stack" style={{ fontFamily: value }}>
                    <p className="ftd-typography-preview-main">Aa Bb Cc Dd Ee Ff Gg 0123456789</p>
                    <p className="ftd-typography-preview-sub">The quick brown fox jumps over the lazy dog</p>
                </div>
            );
        }

        if (groupKey === 'fontSize') {
            return (
                <p className="ftd-typography-preview-main" style={{ fontSize: value, lineHeight: 1.15 }}>
                    The quick brown fox
                </p>
            );
        }

        if (groupKey === 'fontWeight') {
            return (
                <p className="ftd-typography-preview-main" style={{ fontWeight: value }}>
                    The quick brown fox jumps
                </p>
            );
        }

        if (groupKey === 'lineHeight') {
            return (
                <p className="ftd-typography-preview-main" style={{ lineHeight: value }}>
                    The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
                </p>
            );
        }

        if (groupKey === 'letterSpacing') {
            return (
                <p className="ftd-typography-preview-main" style={{ letterSpacing: value }}>
                    DESIGN SYSTEM TYPOGRAPHY
                </p>
            );
        }

        return <p className="ftd-typography-preview-main">The quick brown fox jumps over the lazy dog</p>;
    };

    const getTypographyTailwindUsage = (groupKey: string): TailwindTokenUsage => {
        if (groupKey === 'fontFamily') return 'fontFamily';
        if (groupKey === 'fontSize') return 'fontSize';
        if (groupKey === 'fontWeight') return 'fontWeight';
        if (groupKey === 'lineHeight') return 'lineHeight';
        if (groupKey === 'letterSpacing') return 'letterSpacing';
        return 'fontSize';
    };

    return (
        <>
            <div className="ftd-section ftd-typography-section">
                <div className="ftd-foundation-intro">
                    <h2 className="ftd-section-title">Typography</h2>
                    <p className="ftd-foundation-subtitle">
                        {entries.length}
                        {' '}
                        tokens across
                        {' '}
                        {groups.length}
                        {' '}
                        groups. Click a CSS, SCSS, or Tailwind value to copy.
                    </p>
                </div>

                <div className="ftd-typography-tabs" role="tablist" aria-label="Typography groups">
                    {groups.map((group) => (
                        <button
                            key={group.key}
                            type="button"
                            role="tab"
                            aria-selected={selectedGroup.key === group.key}
                            className={`ftd-typography-tab ${selectedGroup.key === group.key ? 'active' : ''}`}
                            onClick={() => setActiveGroup(group.key)}
                        >
                            <span>{group.label}</span>
                            <span className="ftd-typography-tab-count">{group.entries.length}</span>
                        </button>
                    ))}
                </div>

                <div className="ftd-typography-table-wrap">
                    <div className={`ftd-typography-table-head ${tableMode}`}>
                        <span>Token</span>
                        {hasValueColumn && <span>{selectedGroup.valueLabel}</span>}
                        <span>{selectedGroup.previewLabel}</span>
                        <span>CSS</span>
                        <span className="ftd-foundation-col-scss">SCSS</span>
                        <span className="ftd-foundation-col-tailwind">Tailwind</span>
                    </div>
                    <div className="ftd-typography-table-body">
                        {selectedGroup.entries.map((entry) => {
                            const tailwindUsage = getTypographyTailwindUsage(selectedGroup.key);
                            const cssCopy = getTokenCopyValue(entry.cssVar, 'css', tailwindUsage);
                            const scssCopy = getTokenCopyValue(entry.cssVar, 'scss', tailwindUsage);
                            const tailwindCopy = getTokenCopyValue(entry.cssVar, 'tailwind', tailwindUsage);

                            return (
                                <div
                                    key={entry.path}
                                    className={`ftd-typography-row ${tableMode}`}
                                    data-token-name={entry.path}
                                    data-token-css-var={entry.cssVar}
                                >
                                    <code className="ftd-typography-token">{entry.cssVar}</code>
                                    {hasValueColumn && <code className="ftd-typography-value-cell">{entry.value}</code>}
                                    <div className="ftd-typography-preview-cell">
                                        {renderPreview(selectedGroup.key, entry.value)}
                                    </div>
                                    <button
                                        type="button"
                                        className="ftd-foundation-copy-cell"
                                        onClick={() => void handleCopy(cssCopy)}
                                        title={`Copy CSS: ${cssCopy}`}
                                    >
                                        {cssCopy}
                                    </button>
                                    <button
                                        type="button"
                                        className="ftd-foundation-copy-cell ftd-foundation-col-scss"
                                        onClick={() => void handleCopy(scssCopy)}
                                        title={`Copy SCSS: ${scssCopy}`}
                                    >
                                        {scssCopy}
                                    </button>
                                    <button
                                        type="button"
                                        className="ftd-foundation-copy-cell ftd-foundation-col-tailwind"
                                        onClick={() => void handleCopy(tailwindCopy)}
                                        title={`Copy Tailwind: ${tailwindCopy}`}
                                    >
                                        {tailwindCopy}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
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
    const [activeFamily, setActiveFamily] = useState<string>('');
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    const familyEntries = useMemo(() => {
        const order = new Map(['blue', 'green', 'red', 'yellow', 'purple', 'neutral'].map((name, index) => [name, index]));

        return Object.entries(colorFamilies)
            .map(([familyName, shades]: [string, any]) => {
                const tokenFamily = toTokenPart(familyName);
                const sortedShades = Object.entries(shades)
                    .map(([shadeName, shadeToken]: [string, any]) => ({
                        name: String(shadeName),
                        tokenPath: `${tokenFamily}.${String(shadeName)}`,
                        value: String(shadeToken.value),
                        cssVar: `--color-${tokenFamily}-${toTokenPart(String(shadeName))}`,
                        tokenName: `${familyName}-${shadeName}`
                    }))
                    .sort((a, b) => sortShadeNames(a.name, b.name));

                return {
                    key: familyName,
                    label: familyName,
                    tokenFamily,
                    shades: sortedShades
                };
            })
            .sort((a, b) => {
                const aOrder = order.get(a.tokenFamily) ?? Number.MAX_SAFE_INTEGER;
                const bOrder = order.get(b.tokenFamily) ?? Number.MAX_SAFE_INTEGER;
                if (aOrder !== bOrder) return aOrder - bOrder;
                return a.label.localeCompare(b.label);
            });
    }, [colorFamilies]);

    useEffect(() => {
        if (familyEntries.length === 0) {
            setActiveFamily('');
            return;
        }

        if (!familyEntries.some(entry => entry.key === activeFamily)) {
            setActiveFamily(familyEntries[0].key);
        }
    }, [familyEntries, activeFamily]);

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

    const handleCopy = async (colorValue: string, cssVar: string, format: TokenCopyFormat = 'css') => {
        const copyValue = getTokenCopyValue(cssVar, format);
        const success = await copyToClipboard(copyValue);
        if (success) showToast(copyValue);
        onTokenClick?.({ value: colorValue, cssVariable: cssVar, format, copiedValue: copyValue });
    };

    const selectedFamily = familyEntries.find(entry => entry.key === activeFamily) || familyEntries[0];

    if (!selectedFamily) return null;

    return (
        <div className="ftd-foundation-colors">
            <div className="ftd-foundation-family-grid">
                {familyEntries.map((entry) => (
                    <button
                        type="button"
                        key={entry.key}
                        className={`ftd-foundation-family-card ${selectedFamily.key === entry.key ? 'active' : ''}`}
                        onClick={() => setActiveFamily(entry.key)}
                    >
                        <div className="ftd-foundation-family-strip" style={{ background: buildSegmentedGradient(entry.shades.map(shade => shade.value)) }} />
                        <div className="ftd-foundation-family-meta">
                            <h3 className="ftd-foundation-family-name">{entry.label}</h3>
                            <span className="ftd-foundation-family-count">{entry.shades.length}</span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="ftd-foundation-family-table-wrap">
                <div className="ftd-foundation-family-table-title">{selectedFamily.label.toUpperCase()} SCALE</div>
                <div className="ftd-foundation-family-table">
                    <div className="ftd-foundation-family-table-head">
                        <span>Shade</span>
                        <span>Token</span>
                        <span>Hex</span>
                        <span>CSS</span>
                        <span className="ftd-foundation-col-scss">SCSS</span>
                        <span className="ftd-foundation-col-tailwind">Tailwind</span>
                    </div>
                    <div className="ftd-foundation-family-table-body">
                        {selectedFamily.shades.map((shade) => {
                            const textColor = getContrastColor(shade.value);
                            const cssCopy = getTokenCopyValue(shade.cssVar, 'css');
                            const scssCopy = getTokenCopyValue(shade.cssVar, 'scss');
                            const tailwindCopy = getTokenCopyValue(shade.cssVar, 'tailwind');

                            return (
                                <div
                                    key={shade.name}
                                    className="ftd-foundation-row"
                                    data-token-name={shade.tokenName}
                                    data-token-css-var={shade.cssVar}
                                >
                                    <span className="ftd-foundation-cell-scale">
                                        <span className="ftd-foundation-row-swatch" style={{ backgroundColor: shade.value, color: textColor }} />
                                        {shade.name}
                                    </span>
                                    <code className="ftd-foundation-cell-token">{shade.tokenPath}</code>
                                    <code className="ftd-foundation-cell-hex">{shade.value}</code>
                                    <button
                                        type="button"
                                        className="ftd-foundation-copy-cell"
                                        onClick={() => void handleCopy(shade.value, shade.cssVar, 'css')}
                                        title={`Copy CSS: ${cssCopy}`}
                                    >
                                        {cssCopy}
                                    </button>
                                    <button
                                        type="button"
                                        className="ftd-foundation-copy-cell ftd-foundation-col-scss"
                                        onClick={() => void handleCopy(shade.value, shade.cssVar, 'scss')}
                                        title={`Copy SCSS: ${scssCopy}`}
                                    >
                                        {scssCopy}
                                    </button>
                                    <button
                                        type="button"
                                        className="ftd-foundation-copy-cell ftd-foundation-col-tailwind"
                                        onClick={() => void handleCopy(shade.value, shade.cssVar, 'tailwind')}
                                        title={`Copy Tailwind: ${tailwindCopy}`}
                                    >
                                        {tailwindCopy}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
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
        </div>
    );
}

export default FoundationTab;
