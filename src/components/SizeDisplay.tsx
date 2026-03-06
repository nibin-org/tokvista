'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { SizeDisplayProps, ParsedSizeToken } from '../types';
import { parseSizeTokens } from '../utils/dimension';
import { copyToClipboard } from '../utils/ui';
import { Icon } from './Icon';

/**
 * SizeDisplay - Visual representation of size tokens
 * Shows proportional square elements aligned to a baseline — 
 * both width and height scale together so you see real proportions
 */
export function SizeDisplay({ tokens, onTokenClick }: SizeDisplayProps) {
    const [copiedToast, setCopiedToast] = useState<{ id: number; value: string } | null>(null);
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    const sizeTokens = parseSizeTokens(tokens);

    // Max display size in px so huge tokens don't overflow
    const MAX_DISPLAY_PX = 96;
    const maxValue = useMemo(() => {
        if (sizeTokens.length === 0) return 1;
        return Math.max(...sizeTokens.map(t => t.numericValue), 1);
    }, [sizeTokens]);

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

    const handleCopy = useCallback(async (value: string, token?: ParsedSizeToken) => {
        const success = await copyToClipboard(value);
        if (success) showToast(value);
        if (token) onTokenClick?.(token);
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

            <div className="ftd-size-canvas-wrap">
                <div className="ftd-size-canvas">
                    {sizeTokens.map((token) => {
                        const varValue = `var(${token.cssVariable})`;
                        const displayPx = Math.max(8, (token.numericValue / maxValue) * MAX_DISPLAY_PX);

                        return (
                            <div
                                key={token.name}
                                className="ftd-size-item"
                                onClick={() => void handleCopy(varValue, token)}
                                title={`Click to copy: ${varValue}`}
                            >
                                <div
                                    className="ftd-size-element"
                                    style={{ width: `${displayPx}px`, height: `${displayPx}px` }}
                                />
                                <span className="ftd-size-name">{token.name}</span>
                                <span className="ftd-size-val">{token.value}</span>
                            </div>
                        );
                    })}
                </div>
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

export default SizeDisplay;