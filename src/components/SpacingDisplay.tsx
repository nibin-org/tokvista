'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { SpacingDisplayProps, ParsedSpacingToken } from '../types';
import { parseSpacingTokens } from '../utils/dimension';
import { copyToClipboard } from '../utils/ui';
import { Icon } from './Icon';

/**
 * SpacingDisplay - Visual representation of spacing tokens
 * Shows a row layout: name | proportional bar | real box demo | value
 */
export function SpacingDisplay({ tokens, onTokenClick }: SpacingDisplayProps) {
    const [copiedToast, setCopiedToast] = useState<{ id: number; value: string } | null>(null);
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    const spacingTokens = parseSpacingTokens(tokens);

    const maxValue = useMemo(() => {
        if (spacingTokens.length === 0) return 1;
        return Math.max(...spacingTokens.map(t => t.numericValue), 1);
    }, [spacingTokens]);

    const showToast = useCallback((value: string) => {
        const id = ++toastIdRef.current;
        setCopiedToast({ id, value });
        if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => {
            setCopiedToast((current) => (current && current.id === id ? null : current));
            toastTimerRef.current = null;
        }, 2000);
    }, []);

    useEffect(() => () => {
        if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    }, []);

    const handleCopy = useCallback(async (value: string, token?: ParsedSpacingToken) => {
        const success = await copyToClipboard(value);
        if (success) showToast(value);
        if (token) onTokenClick?.(token);
    }, [onTokenClick, showToast]);

    if (spacingTokens.length === 0) {
        return (
            <div className="ftd-empty">
                <div className="ftd-empty-icon"><Icon name="spacing" /></div>
                <h4 className="ftd-empty-title">No spacing tokens found</h4>
                <p className="ftd-empty-text">Add spacing tokens to your tokens.json file</p>
            </div>
        );
    }

    return (
        <div className="ftd-section">
            <div className="ftd-section-header">
                <div className="ftd-section-icon"><Icon name="spacing" /></div>
                <h2 className="ftd-section-title">Spacing Scale</h2>
                <span className="ftd-section-count">{spacingTokens.length} tokens</span>
            </div>

            <div className="ftd-spacing-list">
                {spacingTokens.map((token) => {
                    const varValue = `var(${token.cssVariable})`;
                    const pct = Math.max(2, (token.numericValue / maxValue) * 100);
                    const boxWidth = Math.min(80, Math.max(4, (token.numericValue / maxValue) * 80));

                    return (
                        <div
                            key={token.name}
                            className="ftd-spacing-row"
                            data-token-name={token.name}
                            onClick={() => void handleCopy(varValue, token)}
                            title={`Click to copy: ${varValue}`}
                        >
                            <span className="ftd-spacing-label">{token.name}</span>
                            <div className="ftd-spacing-track">
                                <div className="ftd-spacing-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="ftd-spacing-box-demo">
                                <div className="ftd-spacing-box" style={{ width: `${boxWidth}px` }} />
                            </div>
                            <span className="ftd-spacing-value">{token.value}</span>
                            <span className="ftd-spacing-copy-hint">copy</span>
                        </div>
                    );
                })}
            </div>

            {copiedToast &&
                (typeof document !== 'undefined'
                    ? createPortal(
                        <div key={copiedToast.id} className="ftd-copied-toast">
                            <div className="ftd-toast-icon">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
    );
}

export default SpacingDisplay;