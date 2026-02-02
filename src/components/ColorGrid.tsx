'use client';

import React, { useState, useCallback } from 'react';
import type { ColorGridProps, ParsedColorToken } from '../types';
import { parseBaseColors, parseSemanticColors, getContrastColor, copyToClipboard } from '../utils';

/**
 * ColorGrid - Beautiful visualization of color tokens
 * Displays base colors as shade scales and semantic colors as grids
 */
export function ColorGrid({
    baseColors,
    fillColors,
    strokeColors,
    textColors,
    onColorClick,
}: ColorGridProps) {
    const [copiedValue, setCopiedValue] = useState<string | null>(null);

    const handleCopy = useCallback(async (color: ParsedColorToken) => {
        const success = await copyToClipboard(color.value);
        if (success) {
            setCopiedValue(color.value);
            setTimeout(() => setCopiedValue(null), 2000);
        }
        onColorClick?.(color);
    }, [onColorClick]);

    const colorFamilies = baseColors ? parseBaseColors(baseColors) : [];
    const semanticFill = fillColors ? parseSemanticColors(fillColors, 'fill') : [];
    const semanticStroke = strokeColors ? parseSemanticColors(strokeColors, 'stroke') : [];
    const semanticText = textColors ? parseSemanticColors(textColors, 'text') : [];

    return (
        <div className="ftd-color-container">
            {/* Base Colors */}
            {colorFamilies.length > 0 && (
                <div className="ftd-section">
                    <div className="ftd-section-header">
                        <div className="ftd-section-icon">🎨</div>
                        <h3 className="ftd-section-title">Base Colors</h3>
                        <span className="ftd-section-count">{colorFamilies.length} families</span>
                    </div>

                    {colorFamilies.map((family) => (
                        <div key={family.name} className="ftd-color-family">
                            <div className="ftd-color-family-header">
                                <div
                                    className="ftd-color-family-swatch"
                                    style={{ backgroundColor: family.primaryColor }}
                                />
                                <h4 className="ftd-color-family-name">{family.name}</h4>
                            </div>

                            <div className="ftd-color-scale">
                                {family.shades.map((shade) => (
                                    <div
                                        key={shade.name}
                                        className="ftd-color-shade"
                                        style={{
                                            backgroundColor: shade.value,
                                            color: getContrastColor(shade.value),
                                        }}
                                        onClick={() => handleCopy(shade)}
                                        title={`Click to copy: ${shade.value}`}
                                    >
                                        <span className="ftd-color-shade-label">{shade.shade}</span>
                                        <span className="ftd-color-shade-value">{shade.value.substring(0, 7)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Semantic Fill Colors */}
            {semanticFill.length > 0 && (
                <div className="ftd-section">
                    <div className="ftd-section-header">
                        <div className="ftd-section-icon">🖼️</div>
                        <h3 className="ftd-section-title">Fill Colors</h3>
                        <span className="ftd-section-count">{semanticFill.length} tokens</span>
                    </div>

                    <div className="ftd-token-grid">
                        {semanticFill.map((color) => (
                            <ColorCard
                                key={color.name}
                                color={color}
                                onClick={() => handleCopy(color)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Semantic Stroke Colors */}
            {semanticStroke.length > 0 && (
                <div className="ftd-section">
                    <div className="ftd-section-header">
                        <div className="ftd-section-icon">✏️</div>
                        <h3 className="ftd-section-title">Stroke Colors</h3>
                        <span className="ftd-section-count">{semanticStroke.length} tokens</span>
                    </div>

                    <div className="ftd-token-grid">
                        {semanticStroke.map((color) => (
                            <ColorCard
                                key={color.name}
                                color={color}
                                onClick={() => handleCopy(color)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Semantic Text Colors */}
            {semanticText.length > 0 && (
                <div className="ftd-section">
                    <div className="ftd-section-header">
                        <div className="ftd-section-icon">📝</div>
                        <h3 className="ftd-section-title">Text Colors</h3>
                        <span className="ftd-section-count">{semanticText.length} tokens</span>
                    </div>

                    <div className="ftd-token-grid">
                        {semanticText.map((color) => (
                            <ColorCard
                                key={color.name}
                                color={color}
                                onClick={() => handleCopy(color)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Copy Toast */}
            {copiedValue && (
                <div className="ftd-copied-toast">
                    ✓ Copied: {copiedValue}
                </div>
            )}
        </div>
    );
}

/**
 * Individual color card component
 */
interface ColorCardInternalProps {
    color: ParsedColorToken;
    onClick: () => void;
}

function ColorCard({ color, onClick }: ColorCardInternalProps) {
    // Determine if this is an alias (reference to another token)
    const isAlias = color.value.startsWith('{');
    const displayValue = isAlias ? color.value : color.value.substring(0, 9);

    return (
        <div className="ftd-token-card" onClick={onClick}>
            <div
                className="ftd-token-swatch"
                style={{
                    backgroundColor: isAlias ? 'var(--ftd-bg-tertiary)' : color.value,
                }}
            >
                {isAlias && (
                    <span style={{
                        fontSize: '0.625rem',
                        color: 'var(--ftd-text-secondary)',
                        padding: '4px',
                    }}>
                        Alias →
                    </span>
                )}
            </div>
            <div className="ftd-token-info">
                <p className="ftd-token-name">{color.name}</p>
                <p className="ftd-token-value">
                    {displayValue}
                    <svg
                        className="ftd-copy-icon"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                </p>
            </div>
        </div>
    );
}

export default ColorGrid;
