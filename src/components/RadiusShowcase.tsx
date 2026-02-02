'use client';

import React, { useState, useCallback } from 'react';
import type { RadiusShowcaseProps, ParsedRadiusToken } from '../types';
import { parseRadiusTokens, copyToClipboard } from '../utils';

/**
 * RadiusShowcase - Visual demonstration of border radius tokens
 * Shows boxes with actual border radius applied
 */
export function RadiusShowcase({ tokens, onTokenClick }: RadiusShowcaseProps) {
    const [copiedValue, setCopiedValue] = useState<string | null>(null);

    const radiusTokens = parseRadiusTokens(tokens);

    const handleCopy = useCallback(async (token: ParsedRadiusToken) => {
        const success = await copyToClipboard(token.value);
        if (success) {
            setCopiedValue(token.value);
            setTimeout(() => setCopiedValue(null), 2000);
        }
        onTokenClick?.(token);
    }, [onTokenClick]);

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
                <h3 className="ftd-section-title">Border Radius</h3>
                <span className="ftd-section-count">{radiusTokens.length} tokens</span>
            </div>

            <div className="ftd-radius-grid">
                {radiusTokens.map((token) => (
                    <div
                        key={token.name}
                        className="ftd-radius-item"
                        onClick={() => handleCopy(token)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div
                            className="ftd-radius-preview"
                            style={{ borderRadius: token.value }}
                        />
                        <p className="ftd-radius-label">{token.name}</p>
                        <p className="ftd-radius-value">{token.value}</p>
                    </div>
                ))}
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

export default RadiusShowcase;
