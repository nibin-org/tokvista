'use client';

import React, { useState, useCallback } from 'react';
import type { SpacingScaleProps, ParsedSpacingToken } from '../types';
import { parseSpacingTokens, copyToClipboard } from '../utils';

/**
 * SpacingScale - Visual representation of spacing tokens
 * Shows horizontal bars with proportional widths
 */
export function SpacingScale({ tokens, onTokenClick }: SpacingScaleProps) {
    const [copiedValue, setCopiedValue] = useState<string | null>(null);

    const spacingTokens = parseSpacingTokens(tokens);
    const maxValue = Math.max(...spacingTokens.map(t => t.numericValue), 1);

    const handleCopy = useCallback(async (token: ParsedSpacingToken) => {
        const success = await copyToClipboard(token.value);
        if (success) {
            setCopiedValue(token.value);
            setTimeout(() => setCopiedValue(null), 2000);
        }
        onTokenClick?.(token);
    }, [onTokenClick]);

    if (spacingTokens.length === 0) {
        return (
            <div className="ftd-empty">
                <div className="ftd-empty-icon">📏</div>
                <h4 className="ftd-empty-title">No spacing tokens found</h4>
                <p className="ftd-empty-text">Add spacing tokens to your tokens.json file</p>
            </div>
        );
    }

    return (
        <div className="ftd-section">
            <div className="ftd-section-header">
                <div className="ftd-section-icon">📏</div>
                <h3 className="ftd-section-title">Spacing Scale</h3>
                <span className="ftd-section-count">{spacingTokens.length} tokens</span>
            </div>

            <div className="ftd-spacing-list">
                {spacingTokens.map((token) => {
                    const widthPercent = (token.numericValue / maxValue) * 100;

                    return (
                        <div
                            key={token.name}
                            className="ftd-spacing-item"
                            onClick={() => handleCopy(token)}
                            style={{ cursor: 'pointer' }}
                        >
                            <span className="ftd-spacing-label">{token.name}</span>
                            <div className="ftd-spacing-bar-container">
                                <div
                                    className="ftd-spacing-bar"
                                    style={{ width: `${Math.max(widthPercent, 5)}%` }}
                                />
                            </div>
                            <span className="ftd-spacing-value">{token.value}</span>
                        </div>
                    );
                })}
            </div>

            {/* Copy Toast */}
            {copiedValue && (
                <div className="ftd-copied-toast">
                    ✓ Copied: {copiedValue}
                </div>
            )}
        </div>
    );
}

export default SpacingScale;
