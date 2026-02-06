'use client';

import React, { useState, useCallback } from 'react';
import type { SpacingDisplayProps, ParsedSpacingToken } from '../types';
import { parseSpacingTokens } from '../utils/dimension';
import { copyToClipboard } from '../utils/ui';

/**
 * SpacingDisplay - Visual representation of spacing tokens
 * Shows horizontal bars with proportional widths
 */
export function SpacingDisplay({ tokens, onTokenClick }: SpacingDisplayProps) {
    const [copiedValue, setCopiedValue] = useState<string | null>(null);

    const spacingTokens = parseSpacingTokens(tokens);
    const maxValue = Math.max(...spacingTokens.map(t => t.numericValue), 1);

    const showToast = useCallback((value: string) => {
        setCopiedValue(value);
        setTimeout(() => setCopiedValue(null), 2000);
    }, []);

    const handleCopy = useCallback(async (token: ParsedSpacingToken) => {
        const success = await copyToClipboard(token.value);
        if (success) {
            showToast(token.value);
        }
        onTokenClick?.(token);
    }, [onTokenClick, showToast]);

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
                <h2 className="ftd-section-title">Spacing Scale</h2>
                <span className="ftd-section-count">{spacingTokens.length} tokens</span>
            </div>

            <div className="ftd-token-grid">
                {spacingTokens.map((token) => {
                    const varValue = `var(${token.cssVariable})`;

                    return (
                        <div
                            key={token.name}
                            className="ftd-display-card ftd-clickable-card"
                            data-token-name={token.name}
                            onClick={() => copyToClipboard(varValue).then(() => showToast(varValue))}
                            title={`Click to copy: ${varValue}`}
                        >
                            <div className="ftd-token-preview-container">
                                <div
                                    className="ftd-token-preview"
                                    style={{
                                        width: token.value,
                                        height: '8px',
                                        borderRadius: '2px',
                                    }}
                                />
                            </div>
                            <p className="ftd-token-card-label">{token.name}</p>
                            <div className="ftd-token-values-row">
                                <span className="ftd-token-css-var">
                                    {token.cssVariable}
                                </span>
                                <span className="ftd-token-hex">
                                    {token.value}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Premium Copy Toast */}
            {copiedValue && (
                <div className="ftd-copied-toast">
                    <div className="ftd-toast-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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

export default SpacingDisplay;
