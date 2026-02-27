'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { NestedTokens, ParsedColorToken } from '../types';
import { parseSemanticColors } from '../utils/color';
import { copyToClipboard } from '../utils/ui';
import { Icon } from './Icon';

interface SemanticTabProps {
    tokens: NestedTokens;
    tokenMap: Record<string, string>;
    onTokenClick?: (token: any) => void;
}

interface Section {
    id: string;
    name: string;
    icon: 'fill' | 'stroke' | 'text';
    colors: ParsedColorToken[];
}

/**
 * SemanticTab - Displays semantic color tokens with scroll-spy navigation
 */
export function SemanticTab({ tokens, tokenMap, onTokenClick }: SemanticTabProps) {
    const [copiedToast, setCopiedToast] = useState<{ id: number; value: string } | null>(null);
    const [activeSection, setActiveSection] = useState<string>('');
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    // Extract semantic color groups
    const fillColors = useMemo(() => tokens.fill ? parseSemanticColors(tokens.fill as NestedTokens, 'fill', tokenMap) : [], [tokens.fill, tokenMap]);
    const strokeColors = useMemo(() => tokens.stroke ? parseSemanticColors(tokens.stroke as NestedTokens, 'stroke', tokenMap) : [], [tokens.stroke, tokenMap]);
    const textColors = useMemo(() => tokens.text ? parseSemanticColors(tokens.text as NestedTokens, 'text', tokenMap) : [], [tokens.text, tokenMap]);

    // Collect any non-standard semantic keys (e.g. 'background', 'border', 'icon')
    const otherSections = useMemo<Section[]>(() => {
        const known = new Set(['fill', 'stroke', 'text']);
        return Object.keys(tokens)
            .filter(k => !known.has(k))
            .map(k => ({
                id: `other-${k}-section`,
                name: k.charAt(0).toUpperCase() + k.slice(1),
                icon: 'fill' as const, // fallback icon
                colors: parseSemanticColors(tokens[k] as NestedTokens, k, tokenMap),
            }))
            .filter(s => s.colors.length > 0);
    }, [tokens, tokenMap]);

    const sections = useMemo<Section[]>(() => {
        const items: Section[] = [
            { id: 'fill-section', name: 'Fill', icon: 'fill', colors: fillColors },
            { id: 'stroke-section', name: 'Stroke', icon: 'stroke', colors: strokeColors },
            { id: 'text-section', name: 'Text', icon: 'text', colors: textColors },
            ...otherSections,
        ];
        return items.filter(section => section.colors.length > 0);
    }, [fillColors, strokeColors, textColors, otherSections]);

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

    const handleCopy = async (color: ParsedColorToken) => {
        const fullCssVar = `var(${color.cssVariable})`;
        const success = await copyToClipboard(fullCssVar);
        if (success) showToast(fullCssVar);
        onTokenClick?.(color);
    };

    if (sections.length === 0) {
        return <div className="ftd-empty">No semantic tokens found</div>;
    }

    return (
        <div className="ftd-color-layout">
            {/* Sidebar Navigation */}
            <aside className="ftd-color-sidebar">
                <nav className="ftd-color-nav">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            className={`ftd-color-nav-link ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => selectSection(section.id)}
                        >
                            <span className="ftd-nav-icon"><Icon name={section.icon} /></span>
                            <span className="ftd-nav-label">{section.name}</span>
                            <span className="ftd-nav-count">{section.colors.length}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Content Area */}
            <div className="ftd-color-content">
                {sections.map((section) => (
                    <div key={section.id} className={`ftd-semantic-panel ${activeSection === section.id ? 'is-active' : 'is-hidden'}`}>
                        <div id={section.id} className="ftd-semantic-section ftd-section ftd-scroll-target">
                            <div className="ftd-foundation-intro">
                                <h2 className="ftd-section-title">Semantic Tokens</h2>
                                <p className="ftd-foundation-subtitle">
                                    {section.name}
                                    {' '}
                                    tokens with resolved aliases. Click any row to copy the CSS variable.
                                </p>
                            </div>

                            <SemanticColorGroups
                                colors={section.colors}
                                onCopy={handleCopy}
                            />
                        </div>
                    </div>
                ))}

                {copiedToast &&
                    (typeof document !== 'undefined'
                        ? createPortal(
                            <div className="ftd-copied-toast" role="status" aria-live="polite" key={copiedToast.id}>
                                <div className="ftd-toast-icon">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        </div>
    );
}

/**
 * Group and display semantic colors by their base color name
 */
function SemanticColorGroups({
    colors,
    onCopy
}: {
    colors: ParsedColorToken[];
    onCopy: (color: ParsedColorToken) => void;
}) {
    // Group colors by their base name
    const groupedColors = useMemo(() => {
        const groups: Record<string, ParsedColorToken[]> = {};
        colors.forEach(color => {
            const nameParts = color.name.split(/[-_\.]/);
            let baseName = nameParts[0];
            const commonColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey', 'black', 'white', 'cyan', 'teal'];
            const foundColor = nameParts.find(part => commonColors.includes(part.toLowerCase()));
            if (foundColor) baseName = foundColor;

            if (!groups[baseName]) groups[baseName] = [];
            groups[baseName].push(color);
        });
        return groups;
    }, [colors]);

    const stateOrder = ['default', 'primary', 'secondary', 'tertiary', 'hover', 'active', 'focus', 'pressed', 'selected', 'subtle', 'muted', 'disabled'];
    const sortedGroupEntries = (groupColors: ParsedColorToken[]) => {
        const rankOf = (name: string) => {
            const lowered = name.toLowerCase();
            const found = stateOrder.findIndex(state => lowered.includes(state));
            return found === -1 ? Number.MAX_SAFE_INTEGER : found;
        };

        return [...groupColors].sort((a, b) => {
            const rankA = rankOf(a.name);
            const rankB = rankOf(b.name);
            if (rankA !== rankB) return rankA - rankB;
            return a.name.localeCompare(b.name);
        });
    };

    return (
        <div className="ftd-semantic-groups">
            {Object.entries(groupedColors).map(([groupName, groupColors]) => {
                const representativeColor = groupColors[0]?.resolvedValue || groupColors[0]?.value || '#000';
                const sortedColors = sortedGroupEntries(groupColors);

                return (
                    <div key={groupName} className="ftd-semantic-group">
                        <div className="ftd-semantic-group-header">
                            <span className="ftd-semantic-group-dot" style={{ backgroundColor: representativeColor }} />
                            <h3 className="ftd-semantic-group-name">
                                {groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                            </h3>
                            <span className="ftd-semantic-group-count">{groupColors.length} tokens</span>
                        </div>

                        <div className="ftd-semantic-table-wrap">
                            <div className="ftd-semantic-table-head">
                                <span>Token</span>
                                <span>Alias</span>
                                <span>Hex</span>
                            </div>
                            <div className="ftd-semantic-table-body">
                                {sortedColors.map((color) => {
                                    const resolvedValue = color.resolvedValue || color.value;
                                    const aliasValue = color.value.startsWith('{') && color.value.endsWith('}') ? color.value : resolvedValue;
                                    const hexValue = resolvedValue.startsWith('#') ? resolvedValue.toUpperCase() : resolvedValue;

                                    return (
                                        <button
                                            type="button"
                                            key={color.name}
                                            className="ftd-semantic-row"
                                            data-token-name={color.name}
                                            data-token-css-var={color.cssVariable}
                                            onClick={() => onCopy(color)}
                                            title={`Click to copy: var(${color.cssVariable})`}
                                        >
                                            <span className="ftd-semantic-token-cell">
                                                <span className="ftd-semantic-row-swatch" style={{ backgroundColor: resolvedValue }} />
                                                <code className="ftd-semantic-token">{color.cssVariable}</code>
                                            </span>
                                            <code className="ftd-semantic-alias">
                                                {aliasValue}
                                                {' '}
                                                &#8594;
                                                {' '}
                                                {`var(${color.cssVariable})`}
                                            </code>
                                            <span className="ftd-semantic-hex-cell">
                                                <code className="ftd-semantic-hex">{hexValue}</code>
                                                <span className="ftd-semantic-copy-btn">Copy var</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default SemanticTab;
