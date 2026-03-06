'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ColorDisplayProps, ParsedColorToken, NestedTokens } from '../types';
import { parseBaseColors, parseSemanticColors, getContrastColor } from '../utils/color';
import { copyToClipboard } from '../utils/ui';
import { createTokenMap } from '../utils/core';
import { Icon } from './Icon';

/**
 * ColorDisplay - Beautiful visualization of color tokens
 */
export function ColorDisplay({
    baseColors,
    fillColors,
    strokeColors,
    textColors,
    tokenMap: externalTokenMap,
    onColorClick,
}: ColorDisplayProps) {
    const [copiedToast, setCopiedToast] = useState<{ id: number; value: string } | null>(null);
    const [activeSection, setActiveSection] = useState<string>('base-colors');
    const observer = useRef<IntersectionObserver | null>(null);
    const toastIdRef = useRef(0);
    const toastTimerRef = useRef<number | null>(null);

    // Build internal token map if external is not provided
    const tokenMap = useMemo(() => {
        if (externalTokenMap) return externalTokenMap;
        return createTokenMap({ base: baseColors, fill: fillColors, stroke: strokeColors, text: textColors });
    }, [externalTokenMap, baseColors, fillColors, strokeColors, textColors]);

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

    // Scroll Spy
    useEffect(() => {
        const options = { rootMargin: '-180px 0px -50% 0px', threshold: 0 };
        observer.current = new IntersectionObserver((entries) => {
            const intersecting = entries.find(entry => entry.isIntersecting);
            if (intersecting) setActiveSection(intersecting.target.id);
        }, options);

        const sections = document.querySelectorAll('.ftd-color-section');
        sections.forEach((section) => observer.current?.observe(section));
        return () => observer.current?.disconnect();
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            setActiveSection(id);
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleCopy = useCallback(async (color: ParsedColorToken) => {
        const valueToCopy = color.resolvedValue || color.value;
        const success = await copyToClipboard(valueToCopy);
        if (success) showToast(valueToCopy);
        onColorClick?.(color);
    }, [onColorClick, showToast]);

    const colorFamilies = useMemo(() => baseColors ? parseBaseColors(baseColors, tokenMap) : [], [baseColors, tokenMap]);

    const semanticFill = useMemo(() => fillColors ? parseSemanticColors(fillColors, 'fill', tokenMap) : [], [fillColors, tokenMap]);
    const semanticStroke = useMemo(() => strokeColors ? parseSemanticColors(strokeColors, 'stroke', tokenMap) : [], [strokeColors, tokenMap]);
    const semanticText = useMemo(() => textColors ? parseSemanticColors(textColors, 'text', tokenMap) : [], [textColors, tokenMap]);

    const groupColorsByFamily = (colors: ParsedColorToken[]) => {
        const groups: Record<string, ParsedColorToken[]> = {};
        colors.forEach(color => {
            const family = color.name.split('.')[0] || 'Other';
            if (!groups[family]) groups[family] = [];
            groups[family].push(color);
        });
        return Object.entries(groups).map(([family, groupColors]) => ({
            family,
            colors: groupColors,
            primaryColor: groupColors[0].resolvedValue || groupColors[0].value
        }));
    };

    const navItems = [
        { id: 'base-colors', label: 'Base', icon: 'colors' as const, count: colorFamilies.length },
        { id: 'fill-colors', label: 'Fill', icon: 'fill' as const, count: semanticFill.length },
        { id: 'stroke-colors', label: 'Stroke', icon: 'stroke' as const, count: semanticStroke.length },
        { id: 'text-colors', label: 'Text', icon: 'text' as const, count: semanticText.length },
    ].filter(item => item.count > 0);

    return (
        <div className="ftd-color-layout">
            <aside className="ftd-color-sidebar">
                <nav className="ftd-color-nav">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            className={`ftd-color-nav-link ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => scrollToSection(item.id)}
                        >
                            <span className="ftd-nav-icon"><Icon name={item.icon} /></span>
                            <span className="ftd-nav-label">{item.label}</span>
                            <span className="ftd-nav-count">{item.count}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <div className="ftd-color-content">
                {colorFamilies.length > 0 && (
                    <div id="base-colors" className="ftd-section ftd-color-section">
                        <div className="ftd-section-header">
                            <div className="ftd-section-icon"><Icon name="colors" /></div>
                            <h2 className="ftd-section-title">Base Colors</h2>
                        </div>
                        <div className="ftd-color-family-container">
                            {colorFamilies.map((family) => {
                                const primaryHex = family.primaryColor.startsWith('#')
                                    ? family.primaryColor.substring(0, 7)
                                    : family.primaryColor;
                                const heroTextColor = getContrastColor(family.primaryColor);
                                return (
                                    <div key={family.name} className="ftd-color-family-card">
                                        {/* Hero swatch */}
                                        <div
                                            className="ftd-color-family-hero"
                                            style={{ background: `linear-gradient(135deg, ${family.primaryColor}, ${family.shades[family.shades.length - 1]?.resolvedValue || family.primaryColor})` }}
                                        >
                                            <div className="ftd-color-family-hero-overlay" />
                                            <span className="ftd-color-family-hero-name" style={{ color: heroTextColor === 'white' ? '#fff' : '#000' }}>
                                                {family.name}
                                            </span>
                                        </div>
                                        {/* Shade strip */}
                                        <div className="ftd-color-shades-strip">
                                            {family.shades.map(shade => (
                                                <div
                                                    key={shade.name}
                                                    className="ftd-color-shade-pip"
                                                    style={{ background: shade.resolvedValue || shade.value }}
                                                />
                                            ))}
                                        </div>
                                        {/* Meta row */}
                                        <div className="ftd-color-family-meta">
                                            <span className="ftd-color-family-count">{family.shades.length} shades</span>
                                            <span className="ftd-color-family-hex">{primaryHex}</span>
                                        </div>
                                        {/* Expanded shade list on hover */}
                                        <div className="ftd-color-shade-rows">
                                            {family.shades.map((shade) => (
                                                <div
                                                    key={shade.name}
                                                    className="ftd-color-shade-row-item"
                                                    data-token-name={shade.name}
                                                    data-token-css-var={shade.cssVariable}
                                                    onClick={() => handleCopy(shade)}
                                                >
                                                    <div
                                                        className="ftd-color-shade-row-dot"
                                                        style={{ background: shade.resolvedValue || shade.value }}
                                                    />
                                                    <span className="ftd-color-shade-row-name">{shade.shade}</span>
                                                    <span className="ftd-color-shade-row-hex">
                                                        {shade.value.startsWith('{') ? shade.resolvedValue?.substring(0, 7) : shade.value.substring(0, 7)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {[
                    { id: 'fill-colors', title: 'Fill Colors', icon: 'fill' as const, data: semanticFill },
                    { id: 'stroke-colors', title: 'Stroke Colors', icon: 'stroke' as const, data: semanticStroke },
                    { id: 'text-colors', title: 'Text Colors', icon: 'text' as const, data: semanticText }
                ].map(section => section.data.length > 0 && (
                    <div key={section.id} id={section.id} className="ftd-section ftd-color-section">
                        <div className="ftd-section-header">
                            <div className="ftd-section-icon"><Icon name={section.icon} /></div>
                            <h2 className="ftd-section-title">{section.title}</h2>
                        </div>
                        <div className="ftd-semantic-families">
                            {groupColorsByFamily(section.data).map((group) => (
                                <div key={group.family} className="ftd-semantic-family">
                                    <div className="ftd-semantic-family-header">
                                        <div className="ftd-color-family-swatch" style={{ backgroundColor: group.primaryColor }} />
                                        <h3 className="ftd-color-family-name">{group.family}</h3>
                                    </div>
                                    <div className="ftd-semantic-family-colors">
                                        {group.colors.map((color) => (
                                            <ColorCard key={color.name} color={color} onCopy={handleCopy} onCopyText={showToast} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {copiedToast &&
                    (typeof document !== 'undefined'
                        ? createPortal(
                            <div className="ftd-copied-toast" key={copiedToast.id}>
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
        </div>
    );
}

function ColorCard({ color, onCopy, onCopyText }: { color: ParsedColorToken; onCopy: (c: ParsedColorToken) => void; onCopyText: (t: string) => void }) {
    const isAlias = color.value.startsWith('{');
    const bgColor = color.resolvedValue || color.value;
    const textColor = getContrastColor(bgColor);

    return (
        <div className="ftd-token-card" data-token-name={color.name} data-token-css-var={color.cssVariable}>
            <div className="ftd-token-swatch" style={{ backgroundColor: bgColor, color: textColor }}>
                {isAlias && <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8 }}>Alias</span>}
            </div>
            <div className="ftd-token-info">
                <p className="ftd-token-name">{color.name}</p>
                <div className="ftd-token-values-row">
                    <span className="ftd-token-css-var" onClick={() => copyToClipboard(color.cssVariable).then((success) => { if (success) onCopyText(color.cssVariable); })}>
                        {color.cssVariable}
                    </span>
                    <span className="ftd-token-hex" onClick={() => onCopy(color)}>
                        {isAlias ? color.resolvedValue?.substring(0, 9) : color.value.substring(0, 9)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default ColorDisplay;