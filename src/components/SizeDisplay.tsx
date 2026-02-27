'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SizeDisplayProps, ParsedSizeToken } from '../types';
import { parseSizeTokens } from '../utils/dimension';
import { toTokenPathLabel } from '../utils/core';
import { copyToClipboard } from '../utils/ui';
import { Icon } from './Icon';

type TokenCopyFormat = 'css' | 'scss' | 'tailwind';

function getSizeCopyValue(cssVar: string, format: TokenCopyFormat) {
    if (format === 'css') return `var(${cssVar})`;
    if (format === 'scss') return `$${cssVar.replace(/^--/, '')}`;
    return `w-[var(${cssVar})]`;
}

/**
 * SizeDisplay - Visual representation of size tokens
 * Shows width rails with proportional lengths
 */
export function SizeDisplay({ tokens, onTokenClick }: SizeDisplayProps) {
    const [copiedToast, setCopiedToast] = useState<{ id: number; value: string } | null>(null);
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    const sizeTokens = parseSizeTokens(tokens);
    const maxFixedWidth = sizeTokens.reduce((max, token) => {
        const isPercent = token.value.trim().endsWith('%');
        if (isPercent) return max;
        return Math.max(max, token.numericValue);
    }, 0);

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

    const handleCopy = useCallback(async (value: string, token?: ParsedSizeToken) => {
        const success = await copyToClipboard(value);
        if (success) {
            showToast(value);
        }
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
        <div className="ftd-section ftd-size-scale-section">
            <div className="ftd-foundation-intro">
                <h2 className="ftd-section-title">Size Scale</h2>
                <p className="ftd-foundation-subtitle">
                    {sizeTokens.length}
                    {' '}
                    tokens
                    {' '}
                    &#183;
                    {' '}
                    layout container widths. Click a CSS, SCSS, or Tailwind value to copy.
                </p>
            </div>

            <div className="ftd-size-scale-table-wrap">
                <p className="ftd-size-scale-table-title">Tokens</p>
                <div className="ftd-size-scale-table">
                    <div className="ftd-size-scale-table-head">
                        <span>Token</span>
                        <span>Value</span>
                        <span>Width</span>
                        <span>CSS</span>
                        <span className="ftd-foundation-col-scss">SCSS</span>
                        <span className="ftd-foundation-col-tailwind">Tailwind</span>
                    </div>
                    <div className="ftd-size-scale-table-body">
                        {sizeTokens.map((token) => {
                            const cssCopy = getSizeCopyValue(token.cssVariable, 'css');
                            const scssCopy = getSizeCopyValue(token.cssVariable, 'scss');
                            const tailwindCopy = getSizeCopyValue(token.cssVariable, 'tailwind');
                            const isPercent = token.value.trim().endsWith('%');
                            const widthPercent = isPercent
                                ? Math.min(Math.max(token.numericValue, 0), 100)
                                : (maxFixedWidth > 0 ? (token.numericValue / maxFixedWidth) * 100 : 0);
                            const barWidth = token.numericValue <= 0 ? 1 : Math.max(widthPercent, 2);
                            const endPosition = Math.min(Math.max(barWidth, 0), 100);
                            const labelPosition = isPercent ? 50 : Math.min(Math.max(endPosition, 10), 92);

                            return (
                                <div
                                    key={token.cssVariable}
                                    className="ftd-size-scale-row"
                                    data-token-name={token.name}
                                    data-token-css-var={token.cssVariable}
                                >
                                    <code className="ftd-size-scale-token">{toTokenPathLabel(token.name)}</code>
                                    <code className="ftd-size-scale-value">{token.value}</code>
                                    <div className={`ftd-size-scale-width-cell${isPercent ? ' is-percent' : ''}`}>
                                        <span className="ftd-size-scale-bar-track" aria-hidden="true">
                                            <span
                                                className="ftd-size-scale-bar"
                                                style={{
                                                    width: `${barWidth}%`,
                                                }}
                                            />
                                            {!isPercent && (
                                                <span
                                                    className="ftd-size-scale-bar-end"
                                                    style={{
                                                        left: `${endPosition}%`,
                                                    }}
                                                />
                                            )}
                                            <span
                                                className="ftd-size-scale-bar-label"
                                                style={{
                                                    left: `${labelPosition}%`,
                                                }}
                                            >
                                                {token.value}
                                            </span>
                                        </span>
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

export default SizeDisplay;
