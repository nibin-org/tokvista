'use client';

import React, { useState, useCallback } from 'react';
import type { SizeScaleProps, ParsedSizeToken } from '../types';
import { parseSizeTokens, copyToClipboard } from '../utils';

/**
 * SizeScale - Visual representation of size tokens
 * Shows vertical bars with proportional heights and horizontal bars
 */
export function SizeScale({ tokens, onTokenClick }: SizeScaleProps) {
    const [copiedValue, setCopiedValue] = useState<string | null>(null);

    const sizeTokens = parseSizeTokens(tokens);
    const maxValue = Math.max(...sizeTokens.map(t => t.numericValue), 1);

    const handleCopy = useCallback(async (token: ParsedSizeToken) => {
        const success = await copyToClipboard(token.value);
        if (success) {
            setCopiedValue(token.value);
            setTimeout(() => setCopiedValue(null), 2000);
        }
        onTokenClick?.(token);
    }, [onTokenClick]);

    if (sizeTokens.length === 0) {
        return (
            <div className="ftd-empty">
                <div className="ftd-empty-icon">📐</div>
                <h4 className="ftd-empty-title">No size tokens found</h4>
                <p className="ftd-empty-text">Add size tokens to your tokens.json file</p>
            </div>
        );
    }

    return (
        <div className="ftd-section">
            <div className="ftd-section-header">
                <div className="ftd-section-icon">📐</div>
                <h3 className="ftd-section-title">Size Scale</h3>
                <span className="ftd-section-count">{sizeTokens.length} tokens</span>
            </div>

            {/* Vertical bar chart */}
            <div className="ftd-size-grid">
                {sizeTokens.map((token) => {
                    const heightPercent = (token.numericValue / maxValue) * 200;

                    return (
                        <div
                            key={token.name}
                            className="ftd-size-item"
                            onClick={() => handleCopy(token)}
                            style={{ cursor: 'pointer' }}
                            title={`${token.name}: ${token.value}`}
                        >
                            <div
                                className="ftd-size-bar"
                                style={{
                                    height: `${Math.max(heightPercent, 8)}px`,
                                    width: '32px',
                                }}
                            />
                            <span className="ftd-size-label">{token.name}</span>
                        </div>
                    );
                })}
            </div>

            {/* Token list for reference */}
            <div style={{ marginTop: '24px' }}>
                <div className="ftd-spacing-list">
                    {sizeTokens.map((token) => (
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
                                    style={{ width: `${(token.numericValue / maxValue) * 100}%` }}
                                />
                            </div>
                            <span className="ftd-spacing-value">{token.value}</span>
                        </div>
                    ))}
                </div>
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

export default SizeScale;
