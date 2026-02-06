'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { NestedTokens, ParsedColorToken } from '../types';
import { parseSemanticColors, getContrastColor } from '../utils/color';
import { copyToClipboard } from '../utils/ui';

interface SemanticTabProps {
    tokens: NestedTokens;
    tokenMap: Record<string, string>;
    onTokenClick?: (token: any) => void;
}

interface Section {
    id: string;
    name: string;
    icon: string;
    colors: ParsedColorToken[];
}

/**
 * SemanticTab - Displays semantic color tokens with scroll-spy navigation
 */
export function SemanticTab({ tokens, tokenMap, onTokenClick }: SemanticTabProps) {
    const observer = useRef<IntersectionObserver | null>(null);
    const [copiedValue, setCopiedValue] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<string>('');

    // Extract semantic color groups
    const fillColors = useMemo(() => tokens.fill ? parseSemanticColors(tokens.fill as NestedTokens, 'fill', tokenMap) : [], [tokens.fill, tokenMap]);
    const strokeColors = useMemo(() => tokens.stroke ? parseSemanticColors(tokens.stroke as NestedTokens, 'stroke', tokenMap) : [], [tokens.stroke, tokenMap]);
    const textColors = useMemo(() => tokens.text ? parseSemanticColors(tokens.text as NestedTokens, 'text', tokenMap) : [], [tokens.text, tokenMap]);

    const sections: Section[] = useMemo(() => [
        { id: 'fill-section', name: 'Fill', icon: '🖼️', colors: fillColors },
        { id: 'stroke-section', name: 'Stroke', icon: '✏️', colors: strokeColors },
        { id: 'text-section', name: 'Text', icon: '📝', colors: textColors },
    ].filter(section => section.colors.length > 0), [fillColors, strokeColors, textColors]);

    // Initialize active section
    useEffect(() => {
        if (sections.length > 0 && !activeSection) {
            setActiveSection(sections[0].id);
        }
    }, [sections, activeSection]);

    // Scroll Spy
    useEffect(() => {
        const options = { rootMargin: '-100px 0px -50% 0px', threshold: 0 };
        observer.current = new IntersectionObserver((entries) => {
            const intersecting = entries.find(entry => entry.isIntersecting);
            if (intersecting) {
                setActiveSection(intersecting.target.id);
            }
        }, options);

        const sectionElements = document.querySelectorAll('.ftd-semantic-section');
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

    const showToast = (value: string) => {
        setCopiedValue(value);
        setTimeout(() => setCopiedValue(null), 2000);
    };

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
                            onClick={() => scrollToSection(section.id)}
                        >
                            <span className="ftd-nav-icon">{section.icon}</span>
                            <span className="ftd-nav-label">{section.name}</span>
                            <span className="ftd-nav-count">{section.colors.length}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Content Area */}
            <div className="ftd-color-content">
                {sections.map((section) => (
                    <div key={section.id} id={section.id} className="ftd-semantic-section ftd-section ftd-scroll-target">
                        <div className="ftd-section-header">
                            <div className="ftd-section-icon">{section.icon}</div>
                            <h2 className="ftd-section-title">{section.name} Colors</h2>
                            <span className="ftd-section-count">{section.colors.length} tokens</span>
                        </div>

                        <SemanticColorGroups
                            colors={section.colors}
                            onCopy={handleCopy}
                        />
                    </div>
                ))}

                {copiedValue && (
                    <div className="ftd-copied-toast" role="status" aria-live="polite">
                        <div className="ftd-toast-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

    return (
        <div className="ftd-semantic-groups">
            {Object.entries(groupedColors).map(([groupName, groupColors]) => {
                const representativeColor = groupColors[0]?.resolvedValue || groupColors[0]?.value || '#000';

                return (
                    <div key={groupName} className="ftd-semantic-group">
                        <div className="ftd-semantic-group-header">
                            <div
                                className="ftd-color-family-swatch"
                                style={{ backgroundColor: representativeColor }}
                            />
                            <h3 className="ftd-semantic-group-name">
                                {groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                            </h3>
                            <span className="ftd-semantic-group-count">{groupColors.length} variants</span>
                        </div>

                        <div className="ftd-token-grid">
                            {groupColors.map((color) => {
                                const isAlias = color.value.startsWith('{');
                                const bgColor = color.resolvedValue || color.value;
                                const textColor = getContrastColor(bgColor);

                                return (
                                    <div
                                        key={color.name}
                                        className="ftd-token-card"
                                        data-token-name={color.name}
                                        onClick={() => onCopy(color)}
                                    >
                                        <div className="ftd-token-swatch" style={{ backgroundColor: bgColor, color: textColor }}>
                                            {isAlias && <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8 }}>Alias</span>}
                                        </div>
                                        <div className="ftd-token-info">
                                            <p className="ftd-token-name">{color.name}</p>
                                            <div className="ftd-token-values-row">
                                                <span className="ftd-token-css-var">{color.cssVariable}</span>
                                                <span className="ftd-token-hex">
                                                    {isAlias ? color.resolvedValue?.substring(0, 9) : color.value.substring(0, 9)}
                                                </span>
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
    );
}

export default SemanticTab;
