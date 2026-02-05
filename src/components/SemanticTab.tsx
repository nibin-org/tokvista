'use client';

import React, { useState } from 'react';
import type { NestedTokens, ParsedColorToken } from '../types';
import { parseSemanticColors, getContrastColor, copyToClipboard } from '../utils';

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
 * SemanticTab - Displays semantic color tokens with sidebar navigation
 */
export function SemanticTab({ tokens, tokenMap, onTokenClick }: SemanticTabProps) {
    // Extract semantic color groups
    const fillColors = tokens.fill ? parseSemanticColors(tokens.fill as NestedTokens, 'fill', tokenMap) : [];
    const strokeColors = tokens.stroke ? parseSemanticColors(tokens.stroke as NestedTokens, 'stroke', tokenMap) : [];
    const textColors = tokens.text ? parseSemanticColors(tokens.text as NestedTokens, 'text', tokenMap) : [];

    const sections: Section[] = [
        { id: 'fill', name: 'Fill', icon: '🖼️', colors: fillColors },
        { id: 'stroke', name: 'Stroke', icon: '✏️', colors: strokeColors },
        { id: 'text', name: 'Text', icon: '📝', colors: textColors },
    ].filter(section => section.colors.length > 0);

    const [activeSection, setActiveSection] = useState(sections[0]?.id || 'fill');
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

    const handleCopy = async (color: ParsedColorToken) => {
        const fullCssVar = `var(${color.cssVariable})`;
        const success = await copyToClipboard(fullCssVar);
        if (success) showToast(fullCssVar);
        onTokenClick?.(color);
    };

    const activeData = sections.find(s => s.id === activeSection);

    if (sections.length === 0) {
        return <div>No semantic tokens found</div>;
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
                            <span className="ftd-nav-count">{section.colors.length}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="ftd-color-content">
                {activeData && (
                    <div id={activeData.id} className="ftd-color-section">
                        <div className="ftd-section">
                            <div className="ftd-section-header">
                                <div className="ftd-section-icon">{activeData.icon}</div>
                                <h3 className="ftd-section-title">{activeData.name} Colors</h3>
                                <span className="ftd-section-count">{activeData.colors.length} tokens</span>
                            </div>

                            <SemanticColorGroups
                                colors={activeData.colors}
                                onCopy={handleCopy}
                            />
                        </div>
                    </div>
                )}
            </div>

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
    // Group colors by their base name (e.g., "red", "blue", "green")
    const groupedColors: Record<string, ParsedColorToken[]> = {};

    colors.forEach(color => {
        // Extract base color name (e.g., "red" from "red-dark", "red-lighter")
        const nameParts = color.name.split(/[-_\.]/);
        let baseName = nameParts[0];

        // Handle special cases like "gray-light" vs "light-gray"
        const commonColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey', 'black', 'white', 'cyan', 'teal'];
        const foundColor = nameParts.find(part => commonColors.includes(part.toLowerCase()));
        if (foundColor) {
            baseName = foundColor;
        }

        if (!groupedColors[baseName]) {
            groupedColors[baseName] = [];
        }
        groupedColors[baseName].push(color);
    });

    return (
        <div className="ftd-semantic-groups">
            {Object.entries(groupedColors).map(([groupName, groupColors]) => {
                // Get a representative color for the group header
                const representativeColor = groupColors[0]?.resolvedValue || groupColors[0]?.value || '#000';

                return (
                    <div key={groupName} className="ftd-semantic-group">
                        <div className="ftd-semantic-group-header">
                            <div
                                className="ftd-color-family-swatch"
                                style={{ backgroundColor: representativeColor }}
                            />
                            <h4 className="ftd-semantic-group-name">
                                {groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                            </h4>
                            <span className="ftd-semantic-group-count">{groupColors.length} variants</span>
                        </div>

                        <div className="ftd-token-grid">
                            {groupColors.map((color) => {
                                const isAlias = color.value.startsWith('{');
                                const bgColor = color.resolvedValue || color.value;
                                const textColor = getContrastColor(bgColor);

                                return (
                                    <div key={color.name} className="ftd-token-card" onClick={() => onCopy(color)}>
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
