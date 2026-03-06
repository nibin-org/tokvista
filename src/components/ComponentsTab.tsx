'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { NestedTokens } from '../types';
import type { CopyFormat } from './FormatSelector';
import { getContrastColor } from '../utils/color';
import { formatTokenPath } from '../utils/formatUtils';
import { Icon } from './Icon';
import { findAllTokens, resolveTokenValue, toCssVariable } from '../utils/core';

interface ComponentsTabProps {
    tokens: NestedTokens;
    tokenMap: Record<string, string>;
    onTokenClick?: (token: any) => void;
    copyFormat: CopyFormat;
    onCopy: (value: string, label: string, tokenPath?: string) => Promise<void>;
}

interface ParsedToken {
    name: string;       // e.g. "primary.bg"
    shortName: string;  // e.g. "bg"
    value: string;
    resolvedValue: string;
    cssVariable: string;
    type: string;
}

interface ComponentVariant {
    name: string;       // e.g. "primary", "secondary"
    tokens: ParsedToken[];
    // Extracted resolved values for live preview
    bg: string;
    bgHover: string;
    text: string;
    border: string;
    borderWidth: string;
    radius: string;
    paddingX: string;
    paddingY: string;
    fontSize: string;
    fontWeight: string;
    shadow: string;
}

interface ComponentSection {
    id: string;
    name: string;       // e.g. "Button"
    key: string;        // e.g. "button"
    hasVariants: boolean;
    variants: ComponentVariant[];
    flatTokens: ParsedToken[]; // for flat components like navbar, modal
}

// Token type metadata
const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
    color:        { label: 'Color',       icon: '⬤', color: 'var(--ftd-blue)' },
    borderRadius: { label: 'Radius',      icon: '◻', color: 'var(--ftd-green)' },
    spacing:      { label: 'Spacing',     icon: '↔', color: 'var(--ftd-primary)' },
    sizing:       { label: 'Size',        icon: '⬛', color: 'var(--ftd-primary)' },
    fontSizes:    { label: 'Font Size',   icon: 'Aa', color: 'var(--ftd-yellow)' },
    fontWeights:  { label: 'Weight',      icon: 'B',  color: 'var(--ftd-yellow)' },
    boxShadow:    { label: 'Shadow',      icon: '◫',  color: 'var(--ftd-text-sub)' },
    borderWidth:  { label: 'Border',      icon: '▭',  color: 'var(--ftd-red)' },
};

function getTokenMeta(type: string) {
    return TYPE_META[type] || { label: type, icon: '•', color: 'var(--ftd-text-muted)' };
}

function resolveByKey(tokens: ParsedToken[], ...keys: string[]): string {
    for (const k of keys) {
        const t = tokens.find(t => t.shortName === k || t.shortName.endsWith('-' + k) || t.name.endsWith('.' + k));
        if (t && t.resolvedValue) return t.resolvedValue;
    }
    return '';
}

function buildVariant(name: string, tokens: ParsedToken[]): ComponentVariant {
    return {
        name,
        tokens,
        bg:          resolveByKey(tokens, 'bg', 'background'),
        bgHover:     resolveByKey(tokens, 'bg-hover', 'background-hover', 'hover'),
        text:        resolveByKey(tokens, 'text', 'color', 'text-color'),
        border:      resolveByKey(tokens, 'border', 'border-color'),
        borderWidth: resolveByKey(tokens, 'border-width', 'borderWidth', 'stroke'),
        radius:      resolveByKey(tokens, 'radius', 'border-radius', 'cornerRadius'),
        paddingX:    resolveByKey(tokens, 'padding-x', 'paddingX', 'px'),
        paddingY:    resolveByKey(tokens, 'padding-y', 'paddingY', 'py'),
        fontSize:    resolveByKey(tokens, 'font-size', 'fontSize', 'size'),
        fontWeight:  resolveByKey(tokens, 'font-weight', 'fontWeight', 'weight'),
        shadow:      resolveByKey(tokens, 'shadow', 'box-shadow'),
    };
}

// ─── COMPONENT LIVE PREVIEWS ────────────────────────────────────────────────

function ButtonPreview({ variant }: { variant: ComponentVariant }) {
    const [hovered, setHovered] = useState(false);
    const bg = (hovered && variant.bgHover) ? variant.bgHover : variant.bg;
    const isTransparent = !bg || bg === 'transparent';
    const textColor = variant.text || (isTransparent ? 'currentColor' : getContrastColor(bg));
    const borderColor = variant.border && variant.border !== 'transparent' ? variant.border : 'transparent';
    const hasBorder = borderColor !== 'transparent' && variant.borderWidth && variant.borderWidth !== '0';

    return (
        <div className="ftd-comp-preview-stage">
            <button
                className="ftd-comp-live-btn"
                style={{
                    background: isTransparent ? 'transparent' : bg,
                    color: textColor,
                    borderRadius: variant.radius || '6px',
                    padding: `${variant.paddingY || '10px'} ${variant.paddingX || '20px'}`,
                    fontSize: variant.fontSize || '14px',
                    fontWeight: variant.fontWeight || 500,
                    border: hasBorder ? `${variant.borderWidth || '1px'} solid ${borderColor}` : '1px solid transparent',
                    boxShadow: variant.shadow || 'none',
                    outline: isTransparent ? '1px solid rgba(128,128,128,0.3)' : 'none',
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {variant.name.charAt(0).toUpperCase() + variant.name.slice(1)}
            </button>
        </div>
    );
}

function InputPreview({ variant }: { variant: ComponentVariant }) {
    return (
        <div className="ftd-comp-preview-stage">
            <div className="ftd-comp-live-input-wrap">
                <label className="ftd-comp-live-label" style={{ color: variant.text || 'inherit' }}>Label</label>
                <div
                    className="ftd-comp-live-input"
                    style={{
                        background: variant.bg || 'transparent',
                        borderRadius: variant.radius || '6px',
                        padding: `${variant.paddingY || '8px'} ${variant.paddingX || '12px'}`,
                        fontSize: variant.fontSize || '14px',
                        border: `${variant.borderWidth || '1px'} solid ${variant.border || '#ccc'}`,
                        boxShadow: variant.shadow || 'none',
                    }}
                >
                    <span className="ftd-comp-live-placeholder">Placeholder text…</span>
                </div>
            </div>
        </div>
    );
}

function CardPreview({ variant }: { variant: ComponentVariant }) {
    return (
        <div className="ftd-comp-preview-stage">
            <div
                className="ftd-comp-live-card"
                style={{
                    background: variant.bg || 'white',
                    border: `1px solid ${variant.border || 'rgba(0,0,0,0.1)'}`,
                    borderRadius: variant.radius || '8px',
                    padding: variant.paddingX || '16px',
                    boxShadow: variant.shadow || 'none',
                }}
            >
                <div className="ftd-comp-live-card-title" style={{ fontSize: variant.fontSize || '16px', color: variant.text || 'inherit' }}>Card Title</div>
                <div className="ftd-comp-live-card-body">Some body content goes here</div>
            </div>
        </div>
    );
}

function BadgePreview({ variant }: { variant: ComponentVariant }) {
    return (
        <div className="ftd-comp-preview-stage">
            <span
                className="ftd-comp-live-badge"
                style={{
                    background: variant.bg || 'rgba(0,0,0,0.08)',
                    color: variant.text || 'inherit',
                    borderRadius: variant.radius || '999px',
                    fontSize: variant.fontSize || '12px',
                    padding: `${variant.paddingY || '3px'} ${variant.paddingX || '10px'}`,
                }}
            >
                {variant.name.charAt(0).toUpperCase() + variant.name.slice(1)}
            </span>
        </div>
    );
}

function TooltipPreview({ variant }: { variant: ComponentVariant }) {
    return (
        <div className="ftd-comp-preview-stage">
            <div className="ftd-comp-live-tooltip-wrap">
                <div
                    className="ftd-comp-live-tooltip"
                    style={{
                        background: variant.bg || '#1a1a1a',
                        color: variant.text || 'white',
                        borderRadius: variant.radius || '4px',
                        padding: `${variant.paddingY || '4px'} ${variant.paddingX || '8px'}`,
                        fontSize: variant.fontSize || '12px',
                        boxShadow: variant.shadow || 'none',
                    }}
                >
                    Tooltip content
                    <span className="ftd-comp-live-tooltip-arrow" style={{ borderTopColor: variant.bg || '#1a1a1a' }} />
                </div>
                <div className="ftd-comp-live-tooltip-target">Hover target</div>
            </div>
        </div>
    );
}

function AvatarPreview({ variant }: { variant: ComponentVariant }) {
    // Avatars are sizing-based, no sub-variants - show a stack
    const sizes = variant.tokens.filter(t => t.type === 'sizing');
    const bg = variant.bg || '#6b9fe8';
    const text = variant.text || getContrastColor(bg);
    if (sizes.length > 0) {
        return (
            <div className="ftd-comp-preview-stage">
                <div className="ftd-comp-avatar-stack">
                    {sizes.slice(0, 5).map(t => {
                        const sz = Math.min(parseInt(t.resolvedValue) || 32, 56);
                        return (
                            <div
                                key={t.name}
                                className="ftd-comp-live-avatar"
                                style={{ width: `${sz}px`, height: `${sz}px`, background: bg, color: text, borderRadius: '50%', fontSize: `${Math.round(sz * 0.35)}px` }}
                                title={t.shortName + ' — ' + t.resolvedValue}
                            >
                                {t.shortName.toUpperCase().slice(0, 2)}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return (
        <div className="ftd-comp-preview-stage">
            <div className="ftd-comp-live-avatar" style={{ width: '40px', height: '40px', background: bg, color: text, borderRadius: '50%', fontSize: '14px' }}>AV</div>
        </div>
    );
}

function NavbarPreview({ variant }: { variant: ComponentVariant }) {
    const bg = resolveByKey(variant.tokens, 'bg');
    const border = resolveByKey(variant.tokens, 'border');
    const text = resolveByKey(variant.tokens, 'text');
    const textActive = resolveByKey(variant.tokens, 'text-active');
    const shadow = resolveByKey(variant.tokens, 'shadow');
    return (
        <div className="ftd-comp-preview-stage ftd-comp-preview-stage--wide">
            <div className="ftd-comp-live-navbar"
                style={{ background: bg || 'white', borderBottom: `1px solid ${border || '#eee'}`, boxShadow: shadow || 'none' }}>
                <div className="ftd-comp-live-navbar-logo" style={{ color: textActive || '#3b82f6' }}>◈ Brand</div>
                <div className="ftd-comp-live-navbar-links">
                    <span style={{ color: textActive || '#3b82f6', fontWeight: 600 }}>Home</span>
                    <span style={{ color: text || '#666' }}>About</span>
                    <span style={{ color: text || '#666' }}>Docs</span>
                </div>
            </div>
        </div>
    );
}

function ModalPreview({ variant }: { variant: ComponentVariant }) {
    const bg = resolveByKey(variant.tokens, 'bg');
    const radius = resolveByKey(variant.tokens, 'radius');
    const shadow = resolveByKey(variant.tokens, 'shadow');
    const padding = resolveByKey(variant.tokens, 'padding');
    return (
        <div className="ftd-comp-preview-stage ftd-comp-preview-stage--wide">
            <div className="ftd-comp-live-modal-backdrop">
                <div className="ftd-comp-live-modal"
                    style={{ background: bg || 'white', borderRadius: radius || '12px', boxShadow: shadow || '0 20px 60px rgba(0,0,0,0.3)', padding: padding || '24px' }}>
                    <div className="ftd-comp-live-modal-header">Modal Title</div>
                    <div className="ftd-comp-live-modal-body">Content area with some descriptive text here.</div>
                    <div className="ftd-comp-live-modal-footer">
                        <span className="ftd-comp-live-modal-btn-ghost">Cancel</span>
                        <span className="ftd-comp-live-modal-btn-primary">Confirm</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TablePreview({ variant }: { variant: ComponentVariant }) {
    const headerBg = resolveByKey(variant.tokens, 'header-bg');
    const headerText = resolveByKey(variant.tokens, 'header-text');
    const rowBg = resolveByKey(variant.tokens, 'row-bg');
    const rowBorder = resolveByKey(variant.tokens, 'row-border');
    return (
        <div className="ftd-comp-preview-stage ftd-comp-preview-stage--wide">
            <div className="ftd-comp-live-table">
                <div className="ftd-comp-live-table-header" style={{ background: headerBg || '#f5f5f5', color: headerText || '#888', borderBottom: `1px solid ${rowBorder || '#eee'}` }}>
                    <span>Name</span><span>Status</span><span>Date</span>
                </div>
                {['Alpha', 'Beta'].map((r, i) => (
                    <div key={r} className="ftd-comp-live-table-row" style={{ background: rowBg || 'white', borderBottom: `1px solid ${rowBorder || '#eee'}` }}>
                        <span>{r} Row</span><span>Active</span><span>Mar 2025</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── SMART AUTO-PREVIEW ──────────────────────────────────────────────────────
// Detects component shape from token names/types and renders the best preview.
// Works for any component the user provides — no hardcoding needed.

type ShapeHint =
    | 'interactive'   // has bg + text + padding → button/tag/chip
    | 'input-like'    // has placeholder/label/focus tokens → input/textarea
    | 'card-like'     // has padding + shadow + bg, no direct text action → surface
    | 'layered'       // has multiple bg variants (header/row/body) → table/panel
    | 'badge-like'    // tiny: bg + text + radius, minimal padding → pill/tag
    | 'icon-sized'    // only sizing tokens → dimensional grid
    | 'elevation'     // only shadow tokens → shadow scale
    | 'swatch-only';  // only color tokens → color palette

function detectShape(variant: ComponentVariant): ShapeHint {
    const names = variant.tokens.map(t => t.shortName.toLowerCase());
    const types = variant.tokens.map(t => t.type);

    const has = (...keys: string[]) => keys.some(k => names.some(n => n.includes(k)));
    const hasType = (...ts: string[]) => ts.some(t => types.includes(t));
    const colorCount = types.filter(t => t === 'color').length;
    const totalCount = variant.tokens.length;

    // Only sizing → dimensional preview
    if (!hasType('color') && hasType('sizing')) return 'icon-sized';
    // Only shadow → elevation
    if (!hasType('color', 'spacing', 'sizing') && hasType('boxShadow')) return 'elevation';
    // Only colors → swatch palette
    if (colorCount === totalCount) return 'swatch-only';
    // Has label/placeholder/focus → input-like
    if (has('placeholder', 'label', 'focus', 'disabled', 'error') && has('bg', 'border')) return 'input-like';
    // Has header/row → layered (table/list)
    if (has('header', 'row', 'cell', 'stripe')) return 'layered';
    // Tiny: no padding, has bg+text+radius → badge/pill
    if (!has('padding', 'px', 'py') && has('bg', 'text') && has('radius')) return 'badge-like';
    // Has bg + text + padding → interactive
    if (has('bg', 'text') && (has('padding', 'px', 'py') || hasType('spacing'))) return 'interactive';
    // Has bg + shadow + padding → card surface
    if (has('bg') && (hasType('boxShadow') || has('shadow'))) return 'card-like';
    // Default to interactive if has bg+text at minimum
    if (has('bg', 'text')) return 'interactive';
    return 'swatch-only';
}

function AutoPreview({ variant, componentName }: { variant: ComponentVariant; componentName: string }) {
    const [hovered, setHovered] = useState(false);
    const shape = detectShape(variant);

    const bg = (hovered && variant.bgHover) ? variant.bgHover : variant.bg;
    const isTransparent = !bg || bg === 'transparent';
    const textColor = variant.text || (bg && !isTransparent && !bg.startsWith('{') ? getContrastColor(bg) : 'var(--ftd-text-main)');
    const borderColor = variant.border && variant.border !== 'transparent' ? variant.border : undefined;
    const hasBorder = !!borderColor && variant.borderWidth && variant.borderWidth !== '0';
    const canUseBg = bg && !isTransparent && !bg.startsWith('{');

    // ── INTERACTIVE: button/chip/tag/link ──
    if (shape === 'interactive') {
        return (
            <div className="ftd-comp-preview-stage">
                <div className="ftd-auto-preview-interactive"
                    style={{
                        background: canUseBg ? bg : 'rgba(128,128,128,0.12)',
                        color: textColor,
                        borderRadius: variant.radius || '7px',
                        padding: `${variant.paddingY || '9px'} ${variant.paddingX || '18px'}`,
                        fontSize: variant.fontSize || '13px',
                        fontWeight: variant.fontWeight as any || 600,
                        border: hasBorder ? `${variant.borderWidth} solid ${borderColor}` : (canUseBg ? 'none' : '1px dashed rgba(128,128,128,0.3)'),
                        boxShadow: variant.shadow || 'none',
                        outline: isTransparent ? '1px solid rgba(128,128,128,0.25)' : 'none',
                        cursor: 'default',
                        transition: 'background 0.15s, color 0.15s',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                    }}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    <span className="ftd-auto-preview-dot" style={{ background: textColor, opacity: 0.4 }} />
                    {componentName} · {variant.name}
                </div>
            </div>
        );
    }

    // ── INPUT-LIKE ──
    if (shape === 'input-like') {
        const focusBorder = variant.tokens.find(t => t.shortName.includes('focus'))?.resolvedValue;
        return (
            <div className="ftd-comp-preview-stage">
                <div className="ftd-auto-preview-input-wrap">
                    <div className="ftd-auto-preview-input-label">Label</div>
                    <div className="ftd-auto-preview-input"
                        style={{
                            background: canUseBg ? bg : 'rgba(128,128,128,0.05)',
                            borderRadius: variant.radius || '6px',
                            padding: `${variant.paddingY || '8px'} ${variant.paddingX || '12px'}`,
                            border: `1px solid ${borderColor || 'rgba(128,128,128,0.25)'}`,
                            boxShadow: variant.shadow || 'none',
                        }}
                    >
                        <span style={{ color: 'var(--ftd-text-muted)', fontSize: '12px' }}>Placeholder…</span>
                    </div>
                    {focusBorder && (
                        <div className="ftd-auto-preview-input"
                            style={{ borderRadius: variant.radius || '6px', padding: `${variant.paddingY || '8px'} ${variant.paddingX || '12px'}`, border: `2px solid ${focusBorder}`, background: 'transparent', marginTop: '4px' }}>
                            <span style={{ color: 'var(--ftd-text-sub)', fontSize: '12px' }}>Focused state</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── CARD-LIKE ──
    if (shape === 'card-like') {
        return (
            <div className="ftd-comp-preview-stage">
                <div className="ftd-auto-preview-card"
                    style={{
                        background: canUseBg ? bg : 'rgba(128,128,128,0.06)',
                        borderRadius: variant.radius || '10px',
                        border: borderColor ? `1px solid ${borderColor}` : '1px solid rgba(128,128,128,0.15)',
                        padding: variant.paddingX || '16px',
                        boxShadow: variant.shadow || 'none',
                    }}
                >
                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: 'var(--ftd-text-main)' }}>
                        {componentName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ftd-text-muted)', lineHeight: 1.5 }}>
                        Surface with {variant.tokens.length} design tokens
                    </div>
                </div>
            </div>
        );
    }

    // ── LAYERED (table/list/panel) ──
    if (shape === 'layered') {
        const headerBg   = variant.tokens.find(t => t.shortName.includes('header'))?.resolvedValue || 'rgba(128,128,128,0.12)';
        const rowBg      = variant.tokens.find(t => t.shortName.includes('row') && !t.shortName.includes('hover'))?.resolvedValue || 'transparent';
        const borderVal  = variant.tokens.find(t => t.shortName.includes('border'))?.resolvedValue || 'rgba(128,128,128,0.15)';
        return (
            <div className="ftd-comp-preview-stage ftd-comp-preview-stage--wide">
                <div style={{ width: '100%', borderRadius: '6px', overflow: 'hidden', fontSize: '11px', fontFamily: 'var(--ftd-font-sans)' }}>
                    <div style={{ background: headerBg, padding: '6px 10px', fontWeight: 700, fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ftd-text-sub)', borderBottom: `1px solid ${borderVal}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                        <span>Column A</span><span>Column B</span><span>Column C</span>
                    </div>
                    {['Row 1', 'Row 2'].map(r => (
                        <div key={r} style={{ background: rowBg, padding: '6px 10px', borderBottom: `1px solid ${borderVal}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', color: 'var(--ftd-text-sub)' }}>
                            <span>{r}</span><span>—</span><span>—</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── BADGE-LIKE ──
    if (shape === 'badge-like') {
        return (
            <div className="ftd-comp-preview-stage" style={{ gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: canUseBg ? bg : 'rgba(128,128,128,0.1)', color: textColor, borderRadius: variant.radius || '999px', padding: '3px 10px', fontSize: variant.fontSize || '12px', fontWeight: 600, fontFamily: 'var(--ftd-font-sans)', border: borderColor ? `1px solid ${borderColor}` : 'none' }}>
                    {variant.name}
                </span>
            </div>
        );
    }

    // ── ICON-SIZED (sizing tokens only) ──
    if (shape === 'icon-sized') {
        const sizingTokens = variant.tokens.filter(t => t.type === 'sizing');
        return (
            <div className="ftd-comp-preview-stage" style={{ gap: '6px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {sizingTokens.slice(0, 6).map(t => {
                    const sz = Math.min(parseInt(t.resolvedValue) || 24, 52);
                    return (
                        <div key={t.name} title={`${t.shortName}: ${t.resolvedValue}`}
                            style={{ width: `${sz}px`, height: `${sz}px`, borderRadius: variant.radius || '50%', background: 'rgba(var(--ftd-primary-rgb), 0.15)', border: '1px solid rgba(var(--ftd-primary-rgb), 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${Math.max(8, sz * 0.3)}px`, fontWeight: 700, color: 'var(--ftd-primary)', fontFamily: 'var(--ftd-font-mono)', flexShrink: 0 }}>
                            {t.shortName.slice(0, 2).toUpperCase()}
                        </div>
                    );
                })}
            </div>
        );
    }

    // ── ELEVATION (shadow only) ──
    if (shape === 'elevation') {
        const shadowTokens = variant.tokens.filter(t => t.type === 'boxShadow');
        return (
            <div className="ftd-comp-preview-stage" style={{ gap: '16px', flexWrap: 'wrap' }}>
                {shadowTokens.slice(0, 4).map(t => (
                    <div key={t.name} title={`${t.shortName}: ${t.resolvedValue}`}
                        style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'var(--ftd-bg-card)', boxShadow: t.resolvedValue, border: '1px solid rgba(128,128,128,0.1)' }} />
                ))}
            </div>
        );
    }

    // ── SWATCH-ONLY ── color palette strip
    const colorTokens = variant.tokens.filter(t => t.type === 'color' && t.resolvedValue && !t.resolvedValue.startsWith('{') && t.resolvedValue !== 'transparent');
    return (
        <div className="ftd-comp-preview-stage" style={{ flexWrap: 'wrap', gap: '6px' }}>
            {colorTokens.slice(0, 8).map(t => (
                <div key={t.name} title={`${t.shortName}: ${t.resolvedValue}`}
                    style={{ width: '32px', height: '32px', borderRadius: '6px', background: t.resolvedValue, border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }} />
            ))}
            {colorTokens.length === 0 && (
                <span style={{ fontSize: '11px', color: 'var(--ftd-text-muted)', fontFamily: 'var(--ftd-font-sans)' }}>
                    {variant.tokens.length} tokens
                </span>
            )}
        </div>
    );
}

type PreviewComponent = React.ComponentType<{ variant: ComponentVariant; componentName: string }>;

const PREVIEW_MAP: Record<string, PreviewComponent> = {
    button:  ({ variant }: { variant: ComponentVariant; componentName: string }) => <ButtonPreview variant={variant} />,
    input:   ({ variant }: { variant: ComponentVariant; componentName: string }) => <InputPreview variant={variant} />,
    card:    ({ variant }: { variant: ComponentVariant; componentName: string }) => <CardPreview variant={variant} />,
    badge:   ({ variant }: { variant: ComponentVariant; componentName: string }) => <BadgePreview variant={variant} />,
    tooltip: ({ variant }: { variant: ComponentVariant; componentName: string }) => <TooltipPreview variant={variant} />,
    avatar:  ({ variant }: { variant: ComponentVariant; componentName: string }) => <AvatarPreview variant={variant} />,
    navbar:  ({ variant }: { variant: ComponentVariant; componentName: string }) => <NavbarPreview variant={variant} />,
    modal:   ({ variant }: { variant: ComponentVariant; componentName: string }) => <ModalPreview variant={variant} />,
    table:   ({ variant }: { variant: ComponentVariant; componentName: string }) => <TablePreview variant={variant} />,
};

// ─── TOKEN SPEC ROW ─────────────────────────────────────────────────────────

function TokenSpecRow({ token, copyFormat, onCopy }: {
    key?: any;
    token: ParsedToken;
    copyFormat: CopyFormat;
    onCopy: (token: ParsedToken) => void | Promise<void>;
}) {
    const meta = getTokenMeta(token.type);
    const isAlias = token.value.startsWith('{');
    const displayValue = token.resolvedValue || token.value;
    const refPath = isAlias ? token.value.slice(1, -1) : null;
    const isColor = token.type === 'color';
    const canSwatch = isColor && displayValue && !displayValue.startsWith('{') && displayValue !== 'transparent';
    const formattedVar = formatTokenPath(token.name, copyFormat);

    return (
        <div className="ftd-spec-row" onClick={() => onCopy(token)} title={`Click to copy: ${formattedVar}`}>
            <div className="ftd-spec-row-left">
                {canSwatch
                    ? <span className="ftd-spec-swatch" style={{ background: displayValue }} />
                    : <span className="ftd-spec-type-icon" style={{ color: meta.color }}>{meta.icon}</span>
                }
                <span className="ftd-spec-name">{token.shortName}</span>
            </div>
            <div className="ftd-spec-row-right">
                <span className="ftd-spec-value">{displayValue.substring(0, 22)}</span>
                {refPath && <span className="ftd-spec-ref">→ {refPath.split('.').slice(-2).join('.')}</span>}
            </div>
        </div>
    );
}

// ─── VARIANT PANEL ──────────────────────────────────────────────────────────

function VariantPanel({ componentKey, variant, copyFormat, onCopy }: {
    key?: any;
    componentKey: string;
    variant: ComponentVariant;
    copyFormat: CopyFormat;
    onCopy: (token: ParsedToken) => void | Promise<void>;
}) {
    const PreviewComp = PREVIEW_MAP[componentKey.toLowerCase()] || AutoPreview;
    
    // Group tokens by type category for the spec panel
    const colorTokens   = variant.tokens.filter(t => t.type === 'color');
    const spacingTokens = variant.tokens.filter(t => t.type === 'spacing' || t.type === 'sizing');
    const styleTokens   = variant.tokens.filter(t => !['color', 'spacing', 'sizing'].includes(t.type));

    return (
        <div className="ftd-variant-panel">
            {/* Left: live preview */}
            <div className="ftd-variant-preview-col">
                <div className="ftd-variant-name-badge">{variant.name}</div>
                <PreviewComp variant={variant} componentName={componentKey} />
            </div>

            {/* Right: spec sheet */}
            <div className="ftd-variant-spec-col">
                {colorTokens.length > 0 && (
                    <div className="ftd-spec-group">
                        <span className="ftd-spec-group-label">Colors</span>
                        {colorTokens.map(t => (
                            <TokenSpecRow key={t.name} token={t} copyFormat={copyFormat} onCopy={onCopy} />
                        ))}
                    </div>
                )}
                {spacingTokens.length > 0 && (
                    <div className="ftd-spec-group">
                        <span className="ftd-spec-group-label">Spacing & Size</span>
                        {spacingTokens.map(t => (
                            <TokenSpecRow key={t.name} token={t} copyFormat={copyFormat} onCopy={onCopy} />
                        ))}
                    </div>
                )}
                {styleTokens.length > 0 && (
                    <div className="ftd-spec-group">
                        <span className="ftd-spec-group-label">Style</span>
                        {styleTokens.map(t => (
                            <TokenSpecRow key={t.name} token={t} copyFormat={copyFormat} onCopy={onCopy} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export function ComponentsTab({ tokens, tokenMap, onTokenClick, copyFormat, onCopy }: ComponentsTabProps) {
    const rafId = useRef<number | null>(null);
    const pendingSectionId = useRef<string | null>(null);
    const [activeSection, setActiveSection] = useState<string>('');

    const sections = useMemo<ComponentSection[]>(() => {
        const list: ComponentSection[] = [];

        Object.keys(tokens).forEach(componentKey => {
            const componentTokens = tokens[componentKey] as NestedTokens;
            const allTokens = findAllTokens(componentTokens);
            if (allTokens.length === 0) return;

            // Detect if tokens are grouped under variants (2-level path) or flat (1-level)
            const hasVariants = allTokens.some(({ path }) => path.includes('.'));

            if (hasVariants) {
                // Group by first path segment = variant name
                const variantMap: Record<string, ParsedToken[]> = {};
                allTokens.forEach(({ path, token }) => {
                    const parts = path.split('.');
                    const variantName = parts.length > 1 ? parts[0] : 'default';
                    const shortName = parts.slice(1).join('.') || path;
                    const value = typeof token.value === 'string' ? token.value : String(token.value);
                    if (!variantMap[variantName]) variantMap[variantName] = [];
                    variantMap[variantName].push({
                        name: path,
                        shortName,
                        value,
                        resolvedValue: resolveTokenValue(value, tokenMap),
                        cssVariable: toCssVariable(path, componentKey),
                        type: token.type || 'unknown',
                    });
                });
                const variants = Object.entries(variantMap).map(([name, toks]) => buildVariant(name, toks));
                list.push({ id: `${componentKey}-section`, name: componentKey.charAt(0).toUpperCase() + componentKey.slice(1), key: componentKey, hasVariants: true, variants, flatTokens: [] });
            } else {
                // Flat component (no variants) — single "default" variant
                const flatTokens: ParsedToken[] = allTokens.map(({ path, token }) => {
                    const value = typeof token.value === 'string' ? token.value : String(token.value);
                    return { name: path, shortName: path, value, resolvedValue: resolveTokenValue(value, tokenMap), cssVariable: toCssVariable(path, componentKey), type: token.type || 'unknown' };
                });
                const variant = buildVariant('default', flatTokens);
                list.push({ id: `${componentKey}-section`, name: componentKey.charAt(0).toUpperCase() + componentKey.slice(1), key: componentKey, hasVariants: false, variants: [variant], flatTokens });
            }
        });

        return list;
    }, [tokens, tokenMap]);

    useEffect(() => {
        if (sections.length > 0 && !activeSection) setActiveSection(sections[0].id);
    }, [sections, activeSection]);

    useEffect(() => {
        const getOffset = () => {
            const sticky = document.querySelector('.ftd-navbar-sticky') as HTMLElement | null;
            const base = sticky ? sticky.getBoundingClientRect().height : 160;
            const offset = Math.round(base + 16);
            document.documentElement.style.setProperty('--ftd-sticky-offset', `${offset}px`);
            return offset;
        };
        const updateActive = () => {
            const els = Array.from(document.querySelectorAll('.ftd-comp-section-scroll')) as HTMLElement[];
            if (els.length === 0) return;
            const offset = getOffset();
            if (pendingSectionId.current) {
                const target = document.getElementById(pendingSectionId.current);
                if (!target) { pendingSectionId.current = null; }
                else {
                    if (target.getBoundingClientRect().top - offset > 0) { setActiveSection(pendingSectionId.current); return; }
                    pendingSectionId.current = null;
                }
            }
            const vTop = offset, vBot = window.innerHeight;
            let bestId = els[0].id, bestVis = -1, bestTop = Infinity;
            for (const el of els) {
                const rect = el.getBoundingClientRect();
                const vis = Math.max(0, Math.min(rect.bottom, vBot) - Math.max(rect.top, vTop));
                if (vis > bestVis || (vis === bestVis && rect.top < bestTop)) { bestVis = vis; bestId = el.id; bestTop = rect.top; }
            }
            setActiveSection(bestId);
        };
        const onScroll = () => {
            if (rafId.current !== null) return;
            rafId.current = window.requestAnimationFrame(() => { rafId.current = null; updateActive(); });
        };
        updateActive();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (rafId.current !== null) { window.cancelAnimationFrame(rafId.current); rafId.current = null; }
        };
    }, [sections]);

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            const sticky = document.querySelector('.ftd-navbar-sticky') as HTMLElement | null;
            const offset = (sticky ? sticky.getBoundingClientRect().height : 160) + 16;
            window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - offset, behavior: 'smooth' });
            setActiveSection(id);
            pendingSectionId.current = id;
        }
    };

    const handleCopy = async (token: ParsedToken) => {
        const formattedVar = formatTokenPath(token.name, copyFormat);
        await onCopy(formattedVar, token.cssVariable, token.name);
        onTokenClick?.(token);
    };

    if (sections.length === 0) return <div className="ftd-empty">No component tokens found</div>;

    return (
        <div className="ftd-color-layout">
            {/* Sidebar */}
            <aside className="ftd-color-sidebar">
                <nav className="ftd-color-nav">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            className={`ftd-color-nav-link ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => scrollToSection(section.id)}
                        >
                            <span className="ftd-nav-icon"><Icon name="components" /></span>
                            <span className="ftd-nav-label">{section.name}</span>
                            <span className="ftd-nav-count">{section.variants.length}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Content */}
            <div className="ftd-color-content">
                {sections.map(section => (
                    <div key={section.id} id={section.id} className="ftd-section ftd-comp-section-scroll">
                        <div className="ftd-section-header">
                            <div className="ftd-section-icon"><Icon name="components" /></div>
                            <h2 className="ftd-section-title">{section.name}</h2>
                            <span className="ftd-section-count">
                                {section.variants.length} {section.hasVariants ? 'variants' : 'tokens'}
                            </span>
                        </div>

                        <div className="ftd-comp-variants-list">
                            {section.variants.map(variant => (
                                <VariantPanel
                                    key={variant.name}
                                    componentKey={section.key}
                                    variant={variant}
                                    copyFormat={copyFormat}
                                    onCopy={handleCopy}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ComponentsTab;