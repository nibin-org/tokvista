'use client';

import React, { useState, useCallback } from 'react';
import type { RadiusDisplayProps, ParsedRadiusToken } from '../types';
import { parseRadiusTokens } from '../utils/dimension';
import { copyToClipboard } from '../utils/ui';

/**
 * RadiusDisplay - Visual demonstration of border radius tokens
 * Shows boxes with actual border radius applied
 */
export function RadiusDisplay({ tokens, onTokenClick }: RadiusDisplayProps) {
    const [copiedValue, setCopiedValue] = useState<string | null>(null);

    const radiusTokens = parseRadiusTokens(tokens);

    const showToast = useCallback((value: string) => {
        setCopiedValue(value);
        setTimeout(() => setCopiedValue(null), 2000);
    }, []);

    const handleCopy = useCallback(async (token: ParsedRadiusToken) => {
        const success = await copyToClipboard(token.value);
        if (success) {
            showToast(token.value);
        }
        onTokenClick?.(token);
    }, [onTokenClick, showToast]);

    if (radiusTokens.length === 0) {
        return (
            <div className="ftd-empty">
                <div className="ftd-empty-icon">⬜</div>
                <h4 className="ftd-empty-title">No radius tokens found</h4>
                <p className="ftd-empty-text">Add radius tokens to your tokens.json file</p>
            </div>
        );
    }

    return (
        <div className="ftd-section">
            <div className="ftd-section-header">
                <div className="ftd-section-icon">⬜</div>
                <h2 className="ftd-section-title">Border Radius</h2>
                <span className="ftd-section-count">{radiusTokens.length} tokens</span>
            </div>

            <div className="ftd-token-grid">
                {radiusTokens.map((token) => {
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
                                    style={{ borderRadius: token.value }}
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

export default RadiusDisplay;
