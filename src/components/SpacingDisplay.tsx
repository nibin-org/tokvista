'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SpacingDisplayProps, ParsedSpacingToken } from '../types';
import { parseSpacingTokens } from '../utils/dimension';
import { copyToClipboard } from '../utils/ui';
import { Icon } from './Icon';

type TokenCopyFormat = 'css' | 'scss' | 'tailwind';

function getSpacingCopyValue(cssVar: string, format: TokenCopyFormat) {
    if (format === 'css') return `var(${cssVar})`;
    if (format === 'scss') return `$${cssVar.replace(/^--/, '')}`;
    return `p-[var(${cssVar})]`;
}

/**
 * SpacingDisplay - Visual representation of spacing tokens
 * Shows horizontal bars with proportional widths
 */
export function SpacingDisplay({ tokens, onTokenClick }: SpacingDisplayProps) {
    const [copiedToast, setCopiedToast] = useState<{ id: number; value: string } | null>(null);
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    const spacingTokens = parseSpacingTokens(tokens);
    const maxSpacingValue = spacingTokens.reduce((max, token) => Math.max(max, token.numericValue), 0);

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

    const handleCopy = useCallback(async (value: string, token?: ParsedSpacingToken) => {
        const success = await copyToClipboard(value);
        if (success) {
            showToast(value);
        }
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
        <div className="ftd-section ftd-spacing-scale-section">
            <div className="ftd-foundation-intro">
                <h2 className="ftd-section-title">Spacing Scale</h2>
                <p className="ftd-foundation-subtitle">
                    {spacingTokens.length}
                    {' '}
                    tokens
                    {' '}
                    &#183;
                    {' '}
                    base-4 scale. Click a CSS, SCSS, or Tailwind value to copy.
                </p>
            </div>

            <div className="ftd-spacing-scale-table-wrap">
                <p className="ftd-spacing-scale-table-title">Tokens</p>
                <div className="ftd-spacing-scale-table">
                    <div className="ftd-spacing-scale-table-head">
                        <span>Token</span>
                        <span>Value</span>
                        <span>Scale</span>
                        <span>CSS</span>
                        <span className="ftd-foundation-col-scss">SCSS</span>
                        <span className="ftd-foundation-col-tailwind">Tailwind</span>
                    </div>
                    <div className="ftd-spacing-scale-table-body">
                        {spacingTokens.map((token) => {
                            const cssCopy = getSpacingCopyValue(token.cssVariable, 'css');
                            const scssCopy = getSpacingCopyValue(token.cssVariable, 'scss');
                            const tailwindCopy = getSpacingCopyValue(token.cssVariable, 'tailwind');
                            const widthPercent = maxSpacingValue > 0 ? (token.numericValue / maxSpacingValue) * 100 : 0;
                            const barWidth = token.numericValue <= 0 ? 1 : Math.max(widthPercent, 2);

                            return (
                                <div
                                    key={token.cssVariable}
                                    className="ftd-spacing-scale-row"
                                    data-token-name={token.name}
                                    data-token-css-var={token.cssVariable}
                                >
                                    <code className="ftd-spacing-scale-token">{token.cssVariable}</code>
                                    <code className="ftd-spacing-scale-value">{token.value}</code>
                                    <span className="ftd-spacing-scale-bar-track" aria-hidden="true">
                                        <span
                                            className="ftd-spacing-scale-bar"
                                            style={{
                                                width: `${barWidth}%`,
                                            }}
                                        />
                                    </span>
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

export default SpacingDisplay;
