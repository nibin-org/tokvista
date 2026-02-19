'use client';

import React, { useState, useCallback } from 'react';
import type { SizeDisplayProps, ParsedSizeToken } from '../types';
import { parseSizeTokens } from '../utils/dimension';
import { copyToClipboard } from '../utils/ui';
import { Icon } from './Icon';

/**
 * SizeDisplay - Visual representation of size tokens
 * Shows vertical bars with proportional heights and horizontal bars
 */
export function SizeDisplay({ tokens, onTokenClick }: SizeDisplayProps) {
    const [copiedValue, setCopiedValue] = useState<string | null>(null);

    const sizeTokens = parseSizeTokens(tokens);
    const maxValue = Math.max(...sizeTokens.map(t => t.numericValue), 1);

    const showToast = useCallback((value: string) => {
        setCopiedValue(value);
        setTimeout(() => setCopiedValue(null), 2000);
    }, []);

    const handleCopy = useCallback(async (token: ParsedSizeToken) => {
        const varValue = `var(${token.cssVariable})`;
        const success = await copyToClipboard(varValue);
        if (success) {
            showToast(varValue);
        }
        onTokenClick?.(token);
    }, [onTokenClick, showToast]);

    if (sizeTokens.length === 0) {
        return (
            <div className="ftd-empty">
                <div className="ftd-empty-icon"><Icon name="sizes" /></div>
                <h4 className="ftd-empty-title">No size tokens found</h4>
                <p className="ftd-empty-text">Add size tokens to your tokens.json file</p>
            </div>
        );
    }

    return (
        <div className="ftd-section">
            <div className="ftd-section-header">
                <div className="ftd-section-icon"><Icon name="sizes" /></div>
                <h2 className="ftd-section-title">Size Scale</h2>
                <span className="ftd-section-count">{sizeTokens.length} tokens</span>
            </div>

            <div className="ftd-size-family">
                <div className="ftd-size-metrics-grid">
                    {sizeTokens.map((token) => {
                        const varValue = `var(${token.cssVariable})`;
                        return (
                            <div
                                key={token.name}
                                className="ftd-size-metric-chip"
                                onClick={() => handleCopy(token)}
                            >
                                <div className="ftd-size-metric-viz">
                                    {/* The "Gauge" visualizing height growth */}
                                    <div
                                        className="ftd-size-metric-gauge"
                                        style={{ height: token.value }}
                                    />

                                    {/* Small technical dimension dot */}
                                    <div className="ftd-size-metric-dot" />

                                    {/* Premium Frosted Tooltip */}
                                    <div className="ftd-shade-tooltip">
                                        <span className="ftd-tooltip-var">{token.cssVariable}</span>
                                        <span className="ftd-tooltip-hex">{token.value}</span>
                                    </div>
                                </div>

                                <div className="ftd-size-metric-info">
                                    <span className="ftd-color-shade-label">{token.name}</span>
                                    <span className="ftd-shade-hex">{token.value}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
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

export default SizeDisplay;
