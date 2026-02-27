'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { RadiusDisplayProps, ParsedRadiusToken } from '../types';
import { parseRadiusTokens } from '../utils/dimension';
import { copyToClipboard } from '../utils/ui';
import { Icon } from './Icon';

type TokenCopyFormat = 'css' | 'scss' | 'tailwind';

function getRadiusCopyValue(cssVar: string, format: TokenCopyFormat) {
    if (format === 'css') return `var(${cssVar})`;
    if (format === 'scss') return `$${cssVar.replace(/^--/, '')}`;
    return `rounded-[var(${cssVar})]`;
}

/**
 * RadiusDisplay - Visual demonstration of border radius tokens
 * Shows boxes with actual border radius applied
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
        if (toastTimerRef.current !== null) {
            window.clearTimeout(toastTimerRef.current);
        }
    }, []);

    const handleCopy = useCallback(async (value: string, token?: ParsedRadiusToken) => {
        const success = await copyToClipboard(value);
        if (success) {
            showToast(value);
        }
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
        <div className="ftd-section ftd-radius-scale-section">
            <div className="ftd-foundation-intro">
                <h2 className="ftd-section-title">Border Radius</h2>
                <p className="ftd-foundation-subtitle">
                    {radiusTokens.length}
                    {' '}
                    tokens. Click a CSS, SCSS, or Tailwind value to copy.
                </p>
            </div>

            <div className="ftd-radius-scale-table-wrap">
                <p className="ftd-radius-scale-table-title">Tokens</p>
                <div className="ftd-radius-scale-table">
                    <div className="ftd-radius-scale-table-head">
                        <span>Token</span>
                        <span>Value</span>
                        <span>Preview</span>
                        <span>CSS</span>
                        <span className="ftd-foundation-col-scss">SCSS</span>
                        <span className="ftd-foundation-col-tailwind">Tailwind</span>
                    </div>
                    <div className="ftd-radius-scale-table-body">
                        {radiusTokens.map((token) => {
                            const cssCopy = getRadiusCopyValue(token.cssVariable, 'css');
                            const scssCopy = getRadiusCopyValue(token.cssVariable, 'scss');
                            const tailwindCopy = getRadiusCopyValue(token.cssVariable, 'tailwind');

                            return (
                                <div
                                    key={token.cssVariable}
                                    className="ftd-radius-scale-row"
                                    data-token-name={token.name}
                                    data-token-css-var={token.cssVariable}
                                >
                                    <code className="ftd-radius-scale-token">{token.cssVariable}</code>
                                    <code className="ftd-radius-scale-value">{token.value}</code>
                                    <div className="ftd-radius-scale-preview-cell">
                                        <span
                                            className="ftd-radius-scale-corner"
                                            style={{ borderTopLeftRadius: token.value }}
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="ftd-foundation-copy-cell"
                                        onClick={() => void handleCopy(cssCopy, token)}
                                        title={`Copy CSS: ${cssCopy}`}
                                    >
                                        {cssCopy}
                                    </button>
                                    <button
                                        type="button"
                                        className="ftd-foundation-copy-cell ftd-foundation-col-scss"
                                        onClick={() => void handleCopy(scssCopy, token)}
                                        title={`Copy SCSS: ${scssCopy}`}
                                    >
                                        {scssCopy}
                                    </button>
                                    <button
                                        type="button"
                                        className="ftd-foundation-copy-cell ftd-foundation-col-tailwind"
                                        onClick={() => void handleCopy(tailwindCopy, token)}
                                        title={`Copy Tailwind: ${tailwindCopy}`}
                                    >
                                        {tailwindCopy}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Premium Copy Toast */}
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
