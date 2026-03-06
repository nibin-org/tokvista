'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { NestedTokens } from '../types';
import type { CopyFormat } from './FormatSelector';
import { getContrastColor } from '../utils/color';
import { formatTokenPath } from '../utils/formatUtils';
import { Icon } from './Icon';
import { findAllTokens, resolveTokenValue, toCssVariable } from '../utils/core';

interface SemanticTabProps {
    tokens: NestedTokens;
    tokenMap: Record<string, string>;
    onTokenClick?: (token: any) => void;
    copyFormat: CopyFormat;
    onCopy: (value: string, label: string, tokenPath?: string) => Promise<void>;
}

interface ParsedToken {
    name: string;
    value: string;
    resolvedValue: string;
    cssVariable: string;
    type: string;
}

interface Section {
    id: string;
    name: string;
    tokens: ParsedToken[];
    type: string;
    count: number;
}

function formatTokenDisplayValue(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value === null || value === undefined) return '';
    try { return JSON.stringify(value); } catch { return String(value); }
}

export function SemanticTab({ tokens, tokenMap, onTokenClick, copyFormat, onCopy }: SemanticTabProps) {
    const rafId = useRef<number | null>(null);
    const pendingSectionId = useRef<string | null>(null);
    const [activeSection, setActiveSection] = useState<string>('');

    const sections = useMemo<Section[]>(() => {
        const list: Section[] = [];
        Object.keys(tokens).forEach(groupKey => {
            const groupTokens = tokens[groupKey] as NestedTokens;
            const allTokens = findAllTokens(groupTokens);
            if (allTokens.length === 0) return;

            const parsedTokens: ParsedToken[] = allTokens.map(({ path, token }) => {
                const rawValue = typeof token.value === 'string' ? token.value : String(token.value);
                return {
                    name: path,
                    value: rawValue,
                    resolvedValue: resolveTokenValue(rawValue, tokenMap),
                    cssVariable: toCssVariable(path, groupKey),
                    type: token.type || 'unknown',
                };
            });

            const typeCounts: Record<string, number> = {};
            parsedTokens.forEach(t => { typeCounts[t.type] = (typeCounts[t.type] || 0) + 1; });
            const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';

            list.push({
                id: `sem-${groupKey}-section`,
                name: groupKey.charAt(0).toUpperCase() + groupKey.slice(1),
                tokens: parsedTokens,
                type: dominantType,
                count: parsedTokens.length,
            });
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
            const els = Array.from(document.querySelectorAll('.ftd-sem-scroll-target')) as HTMLElement[];
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

    if (sections.length === 0) return <div className="ftd-empty">No semantic tokens found</div>;

    const getSectionIcon = (section: Section): 'fill' | 'stroke' | 'text' | 'colors' | 'components' => {
        const n = section.name.toLowerCase(), t = section.type.toLowerCase();
        if (t.includes('color') || n.includes('color') || n.includes('background') || n.includes('fill') || n.includes('surface')) return 'fill';
        if (n.includes('border') || n.includes('stroke') || n.includes('outline') || t.includes('borderwidth')) return 'stroke';
        if (n.includes('text') || n.includes('typography') || n.includes('font') || t.includes('font')) return 'text';
        return 'components';
    };

    return (
        <div className="ftd-color-layout">
            <aside className="ftd-color-sidebar">
                <nav className="ftd-color-nav">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            className={`ftd-color-nav-link ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => scrollToSection(section.id)}
                        >
                            <span className="ftd-nav-icon"><Icon name={getSectionIcon(section)} /></span>
                            <span className="ftd-nav-label">{section.name}</span>
                            <span className="ftd-nav-count">{section.count}</span>
                        </button>
                    ))}
                </nav>
            </aside>
            <div className="ftd-color-content">
                {sections.map(section => (
                    <div key={section.id} id={section.id} className="ftd-section ftd-sem-scroll-target">
                        <div className="ftd-section-header">
                            <div className="ftd-section-icon"><Icon name={getSectionIcon(section)} /></div>
                            <h2 className="ftd-section-title">{section.name}</h2>
                            <span className="ftd-section-count">{section.count} tokens</span>
                        </div>
                        <SemanticSectionBody section={section} copyFormat={copyFormat} onCopy={onCopy} onTokenClick={onTokenClick} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section body — dispatches to rich renderer based on dominant token type
// ─────────────────────────────────────────────────────────────────────────────

function SemanticSectionBody({ section, copyFormat, onCopy, onTokenClick }: {
    section: Section;
    copyFormat: CopyFormat;
    onCopy: (value: string, label: string, tokenPath?: string) => Promise<void>;
    onTokenClick?: (token: any) => void;
}) {
    const handleCopy = async (token: ParsedToken) => {
        const formattedVar = formatTokenPath(token.name, copyFormat);
        await onCopy(formattedVar, token.cssVariable, token.name);
        onTokenClick?.(token);
    };

    const getVar = (name: string) => formatTokenPath(name, copyFormat);
    const { tokens } = section;
    const norm = section.type.toLowerCase().replace(/[-_]/g, '');
    const namNorm = section.name.toLowerCase().replace(/[-_\s]/g, '');

    // ── COLOR ──────────────────────────────────────────────────────────────
    if (norm.includes('color')) {
        return <SemanticColorGroups tokens={tokens} onCopy={handleCopy} copyFormat={copyFormat} />;
    }

    // ── SPACING ────────────────────────────────────────────────────────────
    const isSpacing = (norm.includes('spacing') || norm.includes('space') || namNorm.includes('spacing') || namNorm.includes('space') || namNorm.includes('gap') || namNorm.includes('padding') || namNorm.includes('margin')) && !norm.includes('letterspacing');
    if (isSpacing) {
        const nums = tokens.map(t => parseFloat(t.resolvedValue) || 0);
        const maxV = Math.max(...nums, 1);
        return (
            <div className="ftd-spacing-scale">
                    {tokens.map((token, i) => {
                        const blockW = Math.max(3, (nums[i] / maxV) * 560);
                        const inside = blockW > 44;
                        return (
                            <div key={token.name} className="ftd-spacing-scale-row" data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <span className="ftd-spacing-scale-name">{token.name}{token.value.startsWith('{') && <AliasChip value={token.value} />}</span>
                                <div className="ftd-spacing-scale-track">
                                    <span className="ftd-spacing-scale-origin" />
                                    <div className="ftd-spacing-scale-block" style={{ width: `${blockW}px` }}>
                                        <span className="ftd-spacing-scale-cap ftd-spacing-scale-cap-r" />
                                        {inside && <span className="ftd-spacing-scale-inline-val">{token.resolvedValue || token.value}</span>}
                                    </div>
                                    {!inside && <span className="ftd-spacing-scale-outside-val">{token.resolvedValue || token.value}</span>}
                                </div>
                                <div className="ftd-spacing-scale-meta" />
                                <div className="ftd-spacing-scale-copy"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── BORDER RADIUS ──────────────────────────────────────────────────────
    const isRadius = norm.includes('radius') || norm.includes('borderradius') || namNorm.includes('radius');
    if (isRadius) {
        return (
            <div className="ftd-radius-grid">
                    {tokens.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const n = parseFloat(raw);
                        const isPill = n >= 999 || raw === '50%' || raw === '9999px';
                        const display = isPill ? '50%' : raw;
                        const hide = isPill || n >= 20;
                        return (
                            <div key={token.name} className={`ftd-radius-card${isPill ? ' is-pill' : ''}`} data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-radius-demo-wrap">
                                    <div className="ftd-radius-demo-box" style={{ borderRadius: display }}>
                                        {!hide && <><span className="ftd-radius-corner-mark ftd-radius-corner-tl"/><span className="ftd-radius-corner-mark ftd-radius-corner-tr"/><span className="ftd-radius-corner-mark ftd-radius-corner-bl"/><span className="ftd-radius-corner-mark ftd-radius-corner-br"/></>}
                                    </div>
                                </div>
                                <div className="ftd-radius-info">
                                    <p className="ftd-radius-name">{token.name.split('.').pop() || token.name}</p>
                                    <p className="ftd-radius-val">{isPill ? 'pill' : raw}</p>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── SIZING ─────────────────────────────────────────────────────────────
    const isSizing = norm === 'sizing' || norm === 'sizes' || norm === 'size' || namNorm === 'sizing' || namNorm === 'sizes';
    if (isSizing) {
        const rv = tokens.map(t => {
            const raw = (t.resolvedValue || t.value).trim();
            if (raw.endsWith('%') || raw.endsWith('vw') || raw.endsWith('vh')) return { numeric: parseFloat(raw) * 10, isPercent: true, isNonNumeric: false };
            const n = parseFloat(raw);
            return isNaN(n) ? { numeric: 0, isPercent: false, isNonNumeric: true } : { numeric: n, isPercent: false, isNonNumeric: false };
        });
        const maxV = Math.max(...rv.filter(v => !v.isNonNumeric).map(v => v.numeric), 1);
        const scalable = tokens.filter((_, i) => !rv[i].isNonNumeric);
        const nonNum = tokens.filter((_, i) => rv[i].isNonNumeric);
        return (
            <div className="ftd-tshirt-wrap">
                    <div className="ftd-tshirt-stage">
                        {scalable.map(token => {
                            const idx = tokens.findIndex(t => t.name === token.name);
                            const { numeric, isPercent } = rv[idx];
                            const ratio = numeric / maxV;
                            return (
                                <div key={token.name} className={`ftd-tshirt-item${isPercent ? ' is-percent' : ''}`} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                    <span className="ftd-tshirt-dim">{token.resolvedValue || token.value}</span>
                                    <div className="ftd-tshirt-block" style={{ width: `${Math.max(16, ratio * 100)}px`, height: `${Math.max(16, ratio * 120)}px` }} />
                                    <span className="ftd-tshirt-label">{token.name.split('.').pop() || token.name}</span>
                                </div>
                            );
                        })}
                    </div>
                    {nonNum.length > 0 && (
                        <div className="ftd-tshirt-nonnumeric">
                            <span className="ftd-tshirt-nonnumeric-label">Non-scalable</span>
                            {nonNum.map(token => (
                                <div key={token.name} className="ftd-tshirt-nonnumeric-tag" onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                    <span className="ftd-tshirt-nonnumeric-name">{token.name.split('.').pop() || token.name}</span>
                                    <span className="ftd-tshirt-nonnumeric-val">{token.resolvedValue || token.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
        );
    }

    // ── BORDER WIDTH ───────────────────────────────────────────────────────
    const isBorderWidth = norm.includes('borderwidth') || norm.includes('strokewidth') || namNorm.includes('borderwidth');
    if (isBorderWidth) {
        return (
            <div className="ftd-bw-grid">
                    {tokens.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const n = parseFloat(raw) || 0;
                        return (
                            <div key={token.name} className="ftd-bw-card" data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-bw-demo-wrap">
                                    <div className="ftd-bw-box" style={{ borderWidth: `${Math.min(n, 12)}px` }}>
                                        {n === 0 && <span className="ftd-bw-zero-label">no border</span>}
                                    </div>
                                </div>
                                <div className="ftd-bw-info">
                                    <p className="ftd-bw-name">{token.name.split('.').pop() || token.name}</p>
                                    <p className="ftd-bw-val">{raw}</p>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── FONT FAMILY ────────────────────────────────────────────────────────
    const isFontFamily = norm.includes('fontfamily') || namNorm.includes('fontfamily') || namNorm === 'typeface';
    if (isFontFamily) {
        return (
            <div className="ftd-ff-grid">
                    {tokens.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const first = raw.split(',')[0].replace(/['"]/g, '').trim();
                        return (
                            <div key={token.name} className="ftd-ff-card" data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-ff-specimen-wrap">
                                    <span className="ftd-ff-specimen" style={{ fontFamily: raw }}>Aa Bb Cc</span>
                                    <span className="ftd-ff-specimen-name">{first.toUpperCase()}</span>
                                </div>
                                <div className="ftd-ff-info">
                                    <p className="ftd-ff-label">{token.name}</p>
                                    <p className="ftd-ff-var">{`var(${token.cssVariable})`}</p>
                                    <p className="ftd-ff-stack">{raw}</p>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── FONT SIZE ──────────────────────────────────────────────────────────
    const isFontSize = norm.includes('fontsize') || namNorm.includes('fontsize') || namNorm === 'textsizes';
    if (isFontSize) {
        const parsePx = (s: string) => { const t = String(s).trim(); if (t.endsWith('rem') || t.endsWith('em')) return parseFloat(t) * 16; if (t.endsWith('px')) return parseFloat(t); const n = parseFloat(t); return isNaN(n) ? 0 : n; };
        const sorted = [...tokens].sort((a, b) => parsePx(a.resolvedValue || a.value) - parsePx(b.resolvedValue || b.value));
        const maxPx = Math.max(...sorted.map(t => parsePx(t.resolvedValue || t.value)), 1);
        return (
            <div className="ftd-fsize-grid">
                    {sorted.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const sp = 12 + (parsePx(raw) / maxPx) * (72 - 12);
                        return (
                            <div key={token.name} className="ftd-fsize-card" data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-fsize-preview">
                                    <span className="ftd-fsize-badge">{raw}</span>
                                    <span className="ftd-fsize-specimen" style={{ fontSize: `${sp}px` }}>Aa</span>
                                </div>
                                <div className="ftd-fsize-info">
                                    <p className="ftd-fsize-name">{token.name}</p>
                                    <p className="ftd-fsize-var">{`var(${token.cssVariable})`}</p>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── FONT WEIGHT ────────────────────────────────────────────────────────
    const isFontWeight = norm.includes('fontweight') || namNorm.includes('fontweight');
    if (isFontWeight) {
        const sorted = [...tokens].sort((a, b) => (parseInt(a.resolvedValue || a.value, 10) || 0) - (parseInt(b.resolvedValue || b.value, 10) || 0));
        return (
            <div className="ftd-fw-grid">
                    {sorted.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const w = parseInt(raw, 10);
                        return (
                            <div key={token.name} className="ftd-fw-card" data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-fw-preview">
                                    <span className="ftd-fw-badge">{raw}</span>
                                    <span className="ftd-fw-specimen" style={{ fontWeight: isNaN(w) ? raw as any : w }}>Aa</span>
                                </div>
                                <div className="ftd-fw-info">
                                    <p className="ftd-fw-name">{token.name}</p>
                                    <p className="ftd-fw-var">{`var(${token.cssVariable})`}</p>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── LINE HEIGHT ────────────────────────────────────────────────────────
    const isLineHeight = norm.includes('lineheight') || namNorm.includes('lineheight') || namNorm === 'leading';
    if (isLineHeight) {
        const sorted = [...tokens].sort((a, b) => (parseFloat(a.resolvedValue || a.value) || 0) - (parseFloat(b.resolvedValue || b.value) || 0));
        return (
            <div className="ftd-lh-grid">
                    {sorted.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const lh = parseFloat(raw) || 0;
                        const gap = Math.max(0, (lh * 22 - 22) / 2);
                        return (
                            <div key={token.name} className="ftd-lh-card" data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-lh-preview">
                                    <span className="ftd-lh-badge">{raw}</span>
                                    <div className="ftd-lh-specimen-wrap">
                                        <div className="ftd-lh-line"><span className="ftd-lh-glyph" style={{ fontSize: '22px' }}>Ag</span></div>
                                        <div className="ftd-lh-gap-zone" style={{ height: `${Math.max(2, gap * 2)}px` }}>
                                            <span className="ftd-lh-gap-tick ftd-lh-gap-tick-top"/><span className="ftd-lh-gap-line"/><span className="ftd-lh-gap-tick ftd-lh-gap-tick-bot"/>
                                        </div>
                                        <div className="ftd-lh-line"><span className="ftd-lh-glyph" style={{ fontSize: '22px' }}>Ag</span></div>
                                    </div>
                                </div>
                                <div className="ftd-lh-info">
                                    <p className="ftd-lh-name">{token.name}</p>
                                    <p className="ftd-lh-var">{`var(${token.cssVariable})`}</p>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── LETTER SPACING ─────────────────────────────────────────────────────
    const isLetterSpacing = norm.includes('letterspacing') || namNorm.includes('letterspacing') || namNorm === 'tracking';
    if (isLetterSpacing) {
        const parseEm = (s: string) => { const t = String(s).trim(); if (t.endsWith('em')) return parseFloat(t); if (t.endsWith('px')) return parseFloat(t) / 16; const n = parseFloat(t); return isNaN(n) ? 0 : n; };
        const sorted = [...tokens].sort((a, b) => parseEm(a.resolvedValue || a.value) - parseEm(b.resolvedValue || b.value));
        const maxAbs = Math.max(...sorted.map(t => Math.abs(parseEm(t.resolvedValue || t.value))), 0.001);
        return (
            <div className="ftd-ls-grid">
                    {sorted.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const em = parseEm(raw);
                        const barW = Math.max(3, (Math.abs(em) / maxAbs) * 80);
                        return (
                            <div key={token.name} className="ftd-ls-card" data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-ls-preview">
                                    <span className="ftd-ls-badge">{raw}</span>
                                    <span className="ftd-ls-specimen" style={{ letterSpacing: raw }}>ABCDE</span>
                                    <div className="ftd-ls-track">
                                        <div className="ftd-ls-axis-line"/>
                                        {em !== 0 && <div className={`ftd-ls-bar ${em < 0 ? 'is-neg' : 'is-pos'}`} style={{ width: `${barW}px`, ...(em < 0 ? { right: '50%' } : { left: '50%' }) }}/>}
                                        {em === 0 && <div className="ftd-ls-zero-dot"/>}
                                    </div>
                                </div>
                                <div className="ftd-ls-info">
                                    <p className="ftd-ls-name">{token.name}</p>
                                    <p className="ftd-ls-var">{`var(${token.cssVariable})`}</p>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── OPACITY ────────────────────────────────────────────────────────────
    const isOpacity = norm.includes('opacity') || namNorm.includes('opacity');
    if (isOpacity) {
        const toOp = (v: string) => { const s = String(v).trim(); if (s.endsWith('%')) return parseFloat(s) / 100; const n = parseFloat(s); return isNaN(n) ? 0 : n > 1 ? n / 100 : n; };
        const sorted = [...tokens].sort((a, b) => toOp(a.resolvedValue || a.value) - toOp(b.resolvedValue || b.value));
        return (
            <div className="ftd-op-grid">
                    {sorted.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const op = toOp(raw);
                        return (
                            <div key={token.name} className="ftd-op-card" data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-op-preview">
                                    <span className="ftd-op-badge">{`${Math.round(op * 100)}%`}</span>
                                    <div className="ftd-op-checker"/>
                                    <div className="ftd-op-block" style={{ opacity: op }}/>
                                </div>
                                <div className="ftd-op-info">
                                    <p className="ftd-op-name">{token.name}</p>
                                    <p className="ftd-op-var">{`var(${token.cssVariable})`}</p>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── BOX SHADOW ─────────────────────────────────────────────────────────
    const isBoxShadow = norm.includes('boxshadow') || norm.includes('shadow') || namNorm.includes('shadow') || namNorm === 'elevation';
    if (isBoxShadow) {
        const sw = (raw: string) => { if (raw === 'none' || raw === '0') return -1; if (raw.startsWith('inset')) return 9999; return [...raw.matchAll(/\S+px\s+([\d.]+)px/g)].reduce((a, m) => a + parseFloat(m[1]), 0); };
        const sorted = [...tokens].sort((a, b) => sw(a.resolvedValue || a.value) - sw(b.resolvedValue || b.value));
        return (
            <div className="ftd-bs-grid">
                    {sorted.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const isNone = raw === 'none' || raw === '0';
                        return (
                            <div key={token.name} className="ftd-bs-card" data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-bs-preview">
                                    <div className="ftd-bs-badges">{isNone && <span className="ftd-bs-tag">none</span>}{raw.startsWith('inset') && <span className="ftd-bs-tag">inset</span>}</div>
                                    <div className="ftd-bs-box" style={{ boxShadow: isNone ? 'none' : raw }}/>
                                </div>
                                <div className="ftd-bs-info">
                                    <p className="ftd-bs-name">{token.name}</p>
                                    <p className="ftd-bs-var">{`var(${token.cssVariable})`}</p>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── DURATION ───────────────────────────────────────────────────────────
    const isDuration = norm.includes('duration') || norm.includes('transition') || namNorm.includes('duration') || namNorm.includes('transition');
    if (isDuration) {
        const ms = (v: string) => { const s = String(v).trim(); if (s.endsWith('ms')) return parseFloat(s); if (s.endsWith('s')) return parseFloat(s) * 1000; return parseFloat(s) || 0; };
        const sorted = [...tokens].sort((a, b) => ms(a.resolvedValue || a.value) - ms(b.resolvedValue || b.value));
        const maxMs = Math.max(...sorted.map(t => ms(t.resolvedValue || t.value)), 1);
        return (
            <div className="ftd-dur-list">
                    {sorted.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const barW = ms(raw) === 0 ? 3 : Math.max(6, (ms(raw) / maxMs) * 280);
                        return (
                            <div key={token.name} className="ftd-dur-row" onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-dur-meta">
                                    <span className="ftd-dur-label">{token.name.split('.').pop()}</span>
                                    <span className="ftd-dur-var">{`var(${token.cssVariable})`}</span>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                                <div className="ftd-dur-track-wrap">
                                    <div className="ftd-dur-track"><div className="ftd-dur-bar" style={{ width: `${barW}px` }}/></div>
                                    <span className="ftd-dur-value">{raw}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── EASING ─────────────────────────────────────────────────────────────
    const isEasing = norm.includes('easing') || norm.includes('ease') || norm.includes('bezier') || namNorm.includes('easing');
    if (isEasing) {
        const pb = (v: string): [number,number,number,number] | null => {
            const m = v.match(/cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/);
            if (m) return [parseFloat(m[1]),parseFloat(m[2]),parseFloat(m[3]),parseFloat(m[4])];
            const lut: Record<string,[number,number,number,number]> = { linear:[0,0,1,1], ease:[0.25,0.1,0.25,1], 'ease-in':[0.42,0,1,1], 'ease-out':[0,0,0.58,1], 'ease-in-out':[0.42,0,0.58,1] };
            return lut[v] ?? null;
        };
        const bPath = (cp:[number,number,number,number]) => { const [x1,y1,x2,y2]=cp,sx=8,sy=52,ex=72,ey=8; return `M${sx},${sy} C${sx+x1*(ex-sx)},${sy-y1*(sy-ey)} ${sx+x2*(ex-sx)},${sy-y2*(sy-ey)} ${ex},${ey}`; };
        return (
            <div className="ftd-ease-grid">
                    {tokens.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const cp = pb(raw);
                        return (
                            <div key={token.name} className="ftd-ease-card" onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-ease-preview">
                                    <svg className="ftd-ease-svg" viewBox="0 0 80 60" fill="none">
                                        <line x1="8" y1="8" x2="8" y2="52" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
                                        <line x1="8" y1="52" x2="72" y2="52" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
                                        <line x1="8" y1="52" x2="72" y2="8" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.2"/>
                                        {cp && <path d={bPath(cp)} stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>}
                                        <circle cx="8" cy="52" r="2.5" fill="currentColor" opacity="0.5"/>
                                        <circle cx="72" cy="8" r="2.5" fill="currentColor" opacity="0.5"/>
                                    </svg>
                                </div>
                                <div className="ftd-ease-info">
                                    <p className="ftd-ease-name">{token.name}</p>
                                    <p className="ftd-ease-var">{`var(${token.cssVariable})`}</p>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── Z-INDEX ────────────────────────────────────────────────────────────
    const isZIndex = norm.includes('zindex') || namNorm.includes('zindex');
    if (isZIndex) {
        const sorted = [...tokens].sort((a, b) => (parseInt(a.resolvedValue || a.value, 10) || 0) - (parseInt(b.resolvedValue || b.value, 10) || 0));
        const maxV = Math.max(...sorted.map(t => parseInt(t.resolvedValue || t.value, 10) || 0), 1);
        return (
            <div className="ftd-zi-grid">
                    {sorted.map(token => {
                        const raw = token.resolvedValue || token.value;
                        const n = parseInt(raw, 10) || 0;
                        const layers = Math.max(1, Math.round((n / maxV) * 6));
                        return (
                            <div key={token.name} className="ftd-zi-card" data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                                <div className="ftd-zi-preview">
                                    <span className="ftd-zi-badge">{raw}</span>
                                    <div className="ftd-zi-stack">
                                        {Array.from({ length: layers }).map((_, i) => (
                                            <div key={i} className={`ftd-zi-layer ${i === layers - 1 ? 'is-top' : ''}`} style={{ bottom: `${i * 6}px`, zIndex: i, opacity: 0.3 + (i / layers) * 0.7 }}/>
                                        ))}
                                    </div>
                                </div>
                                <div className="ftd-zi-info">
                                    <p className="ftd-zi-name">{token.name}</p>
                                    <p className="ftd-zi-var">{`var(${token.cssVariable})`}</p>
                                    {token.value.startsWith('{') && <AliasChip value={token.value} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
        );
    }

    // ── FALLBACK — generic card grid ───────────────────────────────────────
    return (
        <div className="ftd-token-grid">
                {tokens.map(token => {
                    const displayValue = token.resolvedValue || token.value;
                    return (
                        <div key={token.name} className="ftd-display-card ftd-clickable-card" data-token-name={token.name} onClick={() => void handleCopy(token)} title={`Click to copy: ${getVar(token.name)}`}>
                            <div className="ftd-sem-generic-preview">
                                <span className="ftd-sem-generic-value">{displayValue}</span>
                                {token.value.startsWith('{') && <AliasChip value={token.value} />}
                            </div>
                            <p className="ftd-token-card-label">{token.name}</p>
                            <div className="ftd-token-values-row">
                                <span className="ftd-token-css-var">{getVar(token.name)}</span>
                                <span className="ftd-token-hex">{displayValue.substring(0, 18)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SemanticColorGroups
// ─────────────────────────────────────────────────────────────────────────────

function SemanticColorGroups({ tokens, onCopy, copyFormat }: {
    tokens: ParsedToken[];
    onCopy: (token: ParsedToken) => void;
    copyFormat: CopyFormat;
}) {
    const groups = useMemo(() => {
        const map: Record<string, ParsedToken[]> = {} as Record<string, ParsedToken[]>;
        const cats = ['background', 'bg', 'text', 'foreground', 'border', 'outline', 'surface', 'icon', 'interactive', 'brand', 'action', 'feedback', 'status', 'error', 'warning', 'success', 'info'];
        tokens.forEach(token => {
            const parts = token.name.split(/[-_.]/);
            let group = parts[0];
            for (const p of parts) { if (cats.includes(p.toLowerCase())) { group = p; break; } }
            if (!map[group]) map[group] = [];
            map[group].push(token);
        });
        return map;
    }, [tokens]);

    return (
        <div className="ftd-semantic-groups">
            {(Object.entries(groups) as [string, ParsedToken[]][]).map(([groupName, groupTokens]) => {
                const rep = groupTokens[0];
                const repColor = rep?.resolvedValue || rep?.value || '#888';
                const swatchColor = repColor.startsWith('{') ? '#888' : repColor;

                return (
                    <div key={groupName} className="ftd-semantic-group">
                        <div className="ftd-semantic-group-header">
                            <div className="ftd-color-family-swatch" style={{ backgroundColor: swatchColor }} />
                            <h3 className="ftd-semantic-group-name">{groupName.charAt(0).toUpperCase() + groupName.slice(1)}</h3>
                            <span className="ftd-semantic-group-count">{groupTokens.length} tokens</span>
                        </div>
                        <div className="ftd-token-grid">
                            {groupTokens.map(token => {
                                const isAlias = token.value.startsWith('{');
                                const bg = token.resolvedValue || token.value;
                                const canRender = bg && !bg.startsWith('{');
                                const textColor = canRender ? getContrastColor(bg) : 'white';
                                const formattedVar = formatTokenPath(token.name, copyFormat);
                                return (
                                    <div key={token.name} className="ftd-token-card" data-token-name={token.name} data-token-css-var={token.cssVariable} onClick={() => onCopy(token)}>
                                        <div className="ftd-token-swatch" style={{ backgroundColor: canRender ? bg : 'transparent', color: textColor, border: canRender ? undefined : '1px dashed var(--ftd-border)' }}>
                                            {canRender && (
                                                <span className="ftd-sem-swatch-hex">{bg.substring(0, 7).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="ftd-token-info">
                                            <p className="ftd-token-name">{token.name}</p>
                                            <div className="ftd-token-values-row">
                                                <span className="ftd-token-css-var">{formattedVar}</span>
                                                {isAlias && (
                                                    <span className="ftd-sem-foundation-ref">
                                                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                                        {token.value.slice(1, -1)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// AliasChip
// ─────────────────────────────────────────────────────────────────────────────

function AliasChip({ value }: { value: string }) {
    const ref = value.startsWith('{') && value.endsWith('}') ? value.slice(1, -1) : value;
    return (
        <span className="ftd-sem-alias-chip">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            {ref}
        </span>
    );
}


export default SemanticTab;