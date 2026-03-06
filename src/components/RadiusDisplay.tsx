'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { RadiusDisplayProps, ParsedRadiusToken } from '../types';
import { parseRadiusTokens } from '../utils/dimension';
import { copyToClipboard } from '../utils/ui';
import { Icon } from './Icon';

/**
 * RadiusDisplay - Visual demonstration of border radius tokens
 * Shows a card grid where each card previews the actual radius with corner annotations
 */
export function RadiusDisplay({ tokens, onTokenClick }: RadiusDisplayProps) {
    const [copiedToast, setCopiedToast] = useState<{ id: number; value: string } | null>(null);
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    const radiusTokens = parseRadiusTokens(tokens);

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

    const handleCopy = useCallback(async (value: string, token?: ParsedRadiusToken) => {
        const success = await copyToClipboard(value);
        if (success) showToast(value);
        if (token) onTokenClick?.(token);
    }, [onTokenClick, showToast]);

    if (radiusTokens.length === 0) {
        return (
            <div className="ftd-empty">
                <div className="ftd-empty-icon"><Icon name="radius" /></div>
                <h4 className="ftd-empty-title">No radius tokens found</h4>
                <p className="ftd-empty-text">Add radius tokens to your tokens.json file</p>
            </div>
        );
    }

    return (
        <div className="ftd-section">
            <div className="ftd-section-header">
                <div className="ftd-section-icon"><Icon name="radius" /></div>
                <h2 className="ftd-section-title">Border Radius</h2>
                <span className="ftd-section-count">{radiusTokens.length} tokens</span>
            </div>

            <div className="ftd-radius-grid">
                {radiusTokens.map((token) => {
                    const varValue = `var(${token.cssVariable})`;
                    return (
                        <div
                            key={token.name}
                            className="ftd-radius-card"
                            data-token-name={token.name}
                            onClick={() => void handleCopy(varValue, token)}
                            title={`Click to copy: ${varValue}`}
                        >
                            {/* Demo box with corner annotations */}
                            <div className="ftd-radius-demo-wrap">
                                <div
                                    className="ftd-radius-demo-box"
                                    style={{ borderRadius: token.value }}
                                >
                                    <span className="ftd-radius-corner-mark ftd-radius-corner-tl" />
                                    <span className="ftd-radius-corner-mark ftd-radius-corner-tr" />
                                    <span className="ftd-radius-corner-mark ftd-radius-corner-bl" />
                                    <span className="ftd-radius-corner-mark ftd-radius-corner-br" />
                                </div>
                            </div>
                            {/* Token info */}
                            <div className="ftd-radius-info">
                                <p className="ftd-radius-name">{token.name}</p>
                                <p className="ftd-radius-val">{token.value}</p>
                            </div>
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

export default RadiusDisplay;