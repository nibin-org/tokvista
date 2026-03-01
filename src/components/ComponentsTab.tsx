'use client';

import React, { useMemo, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { toCssVariable, resolveTokenValue } from '../utils/core';
import { getContrastColor } from '../utils/color';
import { highlightCode } from '../utils/highlighter';
import { copyToClipboard } from '../utils/ui';

interface ComponentsTabProps {
    components: Record<string, ComponentData>;
    tokenMap: Record<string, string>;
    onCopy: (value: string, label: string) => void;
}

interface ComponentData {
    variants: Record<string, any>;
    dimensions: Record<string, any>;
}

interface Section {
    id: string;
    name: string;
    icon: IconName;
    data: ComponentData;
}

/**
 * ComponentsTab - Displays component tokens with sidebar navigation
 */
export function ComponentsTab({ components, tokenMap, onCopy }: ComponentsTabProps) {
    // Build sections from components
    const sections: Section[] = Object.entries(components)
        .filter(([_, data]) => {
            const hasVariants = Object.keys(data.variants).length > 0;
            const hasDimensions = Object.keys(data.dimensions).length > 0;
            return hasVariants || hasDimensions;
        })
        .map(([name, data]) => ({
            id: name.toLowerCase(),
            name: name.charAt(0).toUpperCase() + name.slice(1),
            icon: getComponentIcon(name),
            data
        }));

    const [activeSection, setActiveSection] = useState(sections[0]?.id || '');

    const activeData = sections.find(s => s.id === activeSection);

    if (sections.length === 0) {
        return (
            <div className="ftd-empty">
                <div className="ftd-empty-icon"><Icon name="components" /></div>
                <h3 className="ftd-empty-title">No component tokens found</h3>
                <p className="ftd-empty-text">Add component tokens to your tokens.json file</p>
            </div>
        );
    }

    return (
        <div className="ftd-color-layout">
            {/* Sidebar Navigation */}
            <div className="ftd-color-sidebar">
                <nav className="ftd-color-nav">
                    {sections.map((section) => {
                        const variantCount = Object.keys(section.data.variants).length;
                        const dimensionCount = Object.keys(section.data.dimensions).length;
                        const count = variantCount > 0 ? variantCount : dimensionCount;

                        return (
                            <button
                                key={section.id}
                                className={`ftd-color-nav-link ${activeSection === section.id ? 'active' : ''}`}
                                onClick={() => setActiveSection(section.id)}
                            >
                                <span className="ftd-nav-icon"><Icon name={section.icon} /></span>
                                <span className="ftd-nav-label">{section.name}</span>
                                <span className="ftd-nav-count">{count}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Content Area */}
            <div className="ftd-color-content">
                <div className="ftd-tab-intro">
                    <span className="ftd-tab-badge">Source: tokens.json</span>
                    <p className="ftd-tab-helper">Figma spec view. Fixed variants and sizes derived from component tokens.</p>
                </div>
                {activeData && (
                    <div id={activeData.id} className="ftd-color-section">
                        <ComponentDisplay
                            name={activeData.name}
                            componentId={activeData.id}
                            data={activeData.data}
                            tokenMap={tokenMap}
                            onCopy={onCopy}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function getCssVarFromValue(value: string): string | null {
    if (!value || typeof value !== 'string') return null;
    if (value.startsWith('{') && value.endsWith('}')) {
        const refPath = value.slice(1, -1);
        return toCssVariable(refPath);
    }
    return null;
}

function getResolvedValue(value: string, tokenMap: Record<string, string>): string {
    if (!value || typeof value !== 'string') return value as any;
    // Resolve aliases to raw values (e.g. px)
    const resolved = resolveTokenValue(value, tokenMap);
    return resolved || value;
}

function formatDisplayName(name: string): string {
    return name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

type SingleToken = { value: string; type: string };

function isSingleToken(obj: any): obj is SingleToken {
    return !!obj && typeof obj === 'object' && 'value' in obj && 'type' in obj;
}

function isTokenGroup(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;
    const values = Object.values(obj);
    return values.length > 0 && values.every((value) => isSingleToken(value));
}

function isColorToken(token: SingleToken, resolvedValue: string): boolean {
    if (!token) return false;
    if (token.type === 'color') return true;
    const normalized = resolvedValue?.toLowerCase?.() || '';
    return normalized.startsWith('#') || normalized.startsWith('rgb') || normalized.startsWith('hsl');
}

const SIZE_ORDER = [
    '2xs', 'xs', 'sm', 'md', 'lg', 'xl',
    '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl',
];
const SIZE_INDEX = new Map(SIZE_ORDER.map((key, index) => [key, index]));

const BUTTON_STATES = ['normal', 'hover', 'focus', 'disabled'] as const;
type ButtonState = typeof BUTTON_STATES[number];
type ButtonView = 'variants' | 'dimensions' | 'tokens';
type CodeTab = 'tsx' | 'css' | 'scss' | 'tailwind';
type ButtonCode = { tsx: string; css: string; scss: string; tailwind: string };
type VariantColorToken = {
    key: string;
    value: string;
    resolvedValue: string;
    cssVariable: string | null;
};

function sortDimensionEntries(entries: Array<[string, any]>): Array<[string, any]> {
    return [...entries].sort(([a], [b]) => {
        const aKey = a.toLowerCase();
        const bKey = b.toLowerCase();
        const aIdx = SIZE_INDEX.get(aKey);
        const bIdx = SIZE_INDEX.get(bKey);

        if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
        if (aIdx !== undefined) return -1;
        if (bIdx !== undefined) return 1;

        const aNum = Number.parseFloat(aKey.replace(/[^0-9.]/g, ''));
        const bNum = Number.parseFloat(bKey.replace(/[^0-9.]/g, ''));
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;

        return aKey.localeCompare(bKey);
    });
}

const getButtonVariantToken = (variantTokens: Record<string, any>, baseKey: string, state: ButtonState) => {
    const stateKey = state === 'normal'
        ? baseKey
        : state === 'hover'
            ? `${baseKey}-hover`
            : state === 'disabled'
                ? `${baseKey}-disabled`
                : `${baseKey}-focus`;
    const fallbackKey = state === 'focus' ? `${baseKey}-hover` : baseKey;
    const candidate = variantTokens[stateKey] || variantTokens[fallbackKey];
    return isSingleToken(candidate) ? candidate : null;
};

const getButtonDimensionToken = (dimensions: Record<string, any>, groupKey: string, sizeKey: string) => {
    const group = dimensions[groupKey];
    if (!group || typeof group !== 'object') return null;
    const token = group[sizeKey];
    return isSingleToken(token) ? token : null;
};

const getButtonDimensionValue = (dimensions: Record<string, any>, tokenMap: Record<string, string>, groupKey: string, sizeKey: string) => {
    const token = getButtonDimensionToken(dimensions, groupKey, sizeKey);
    return token ? getResolvedValue(token.value, tokenMap) : null;
};

const buildButtonSpecStyle = (
    variantTokens: Record<string, any>,
    dimensions: Record<string, any>,
    tokenMap: Record<string, string>,
    sizeKey: string,
    state: ButtonState
): React.CSSProperties => {
    const fillToken = getButtonVariantToken(variantTokens, 'fill', state);
    const strokeToken = getButtonVariantToken(variantTokens, 'stroke', state);
    const textToken = getButtonVariantToken(variantTokens, 'text', state);
    const strokeFocusToken = getButtonVariantToken(variantTokens, 'stroke', 'focus')
        || getButtonVariantToken(variantTokens, 'stroke', 'hover')
        || getButtonVariantToken(variantTokens, 'stroke', 'normal');

    const backgroundColor = fillToken ? getResolvedValue(fillToken.value, tokenMap) : 'transparent';
    const borderColor = strokeToken ? getResolvedValue(strokeToken.value, tokenMap) : 'transparent';
    const textColor = textToken ? getResolvedValue(textToken.value, tokenMap) : 'var(--ftd-text-main)';
    const focusColor = strokeFocusToken ? getResolvedValue(strokeFocusToken.value, tokenMap) : borderColor;

    const heightValue = getButtonDimensionValue(dimensions, tokenMap, 'height', sizeKey);
    const fontSizeValue = getButtonDimensionValue(dimensions, tokenMap, 'font-size', sizeKey);
    const lineHeightValue = getButtonDimensionValue(dimensions, tokenMap, 'line-height', sizeKey);
    const radiusValue = getButtonDimensionValue(dimensions, tokenMap, 'radius', sizeKey);
    const paddingXValue = getButtonDimensionValue(dimensions, tokenMap, 'padding-x', sizeKey);
    const paddingYValue = getButtonDimensionValue(dimensions, tokenMap, 'padding-y', sizeKey);
    const paddingValue = paddingXValue && paddingYValue ? `${paddingYValue} ${paddingXValue}` : undefined;

    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: backgroundColor,
        color: textColor,
        border: strokeToken ? `1px solid ${borderColor}` : '1px solid transparent',
        borderRadius: radiusValue || '8px',
        fontSize: fontSizeValue || undefined,
        lineHeight: lineHeightValue || undefined,
        fontWeight: 500,
        height: heightValue || undefined,
        minHeight: heightValue || undefined,
        padding: paddingValue,
        outline: state === 'focus' ? `2px solid ${focusColor}` : undefined,
        outlineOffset: state === 'focus' ? '2px' : undefined,
        opacity: state === 'disabled' ? 0.7 : 1,
        cursor: state === 'disabled' ? 'not-allowed' : 'pointer',
    };
};

const VariantSpecCard = ({
    sizeKey,
    variantName,
    variantTokens,
    variantCode,
    dimensions,
    tokenMap,
    onCopy
}: {
    sizeKey: string;
    variantName: string;
    variantTokens: Record<string, any>;
    variantCode: ButtonCode | null;
    dimensions: Record<string, any>;
    tokenMap: Record<string, string>;
    onCopy: (value: string, label: string) => void;
}) => {
    const [view, setView] = useState<'spec' | 'code'>('spec');
    const [previewState, setPreviewState] = useState<ButtonState>('normal');

    return (
        <div className={`ftd-variant-spec-card ${view === 'code' ? 'view-code' : ''}`}>
            <div className="ftd-variant-spec-header">
                <div className="ftd-variant-spec-header-main">
                    <span className="ftd-variant-spec-name">{variantName.replace(/-/g, ' ')}</span>
                </div>
                <div className="ftd-variant-spec-actions">
                    <button
                        type="button"
                        className={`ftd-variant-spec-toggle ${view === 'spec' ? 'active' : ''}`}
                        onClick={() => setView('spec')}
                    >
                        Blueprint
                    </button>
                    <button
                        type="button"
                        className={`ftd-variant-spec-toggle ${view === 'code' ? 'active' : ''}`}
                        onClick={() => setView('code')}
                    >
                        Code
                    </button>
                </div>
            </div>

            <div className="ftd-variant-spec-content">
                {view === 'spec' ? (
                    <div className="ftd-variant-spec-blueprint-view">
                        <div className="ftd-variant-spec-hero">
                            <div className="ftd-blueprint-dimensions horizontal">
                                <div className="ftd-dimension-line"></div>
                                <span className="ftd-dimension-label">{sizeKey.toUpperCase()}</span>
                                <div className="ftd-dimension-line"></div>
                            </div>
                            <div className="ftd-blueprint-dimensions vertical">
                                <div className="ftd-dimension-line"></div>
                                <span className="ftd-dimension-label">{variantName.split('-')[0].substring(0, 1)}</span>
                                <div className="ftd-dimension-line"></div>
                            </div>
                            <button
                                type="button"
                                className="ftd-spec-button-hero"
                                style={buildButtonSpecStyle(variantTokens, dimensions, tokenMap, sizeKey, previewState)}
                            >
                                Button
                            </button>
                            <div className="ftd-blueprint-corner top-left"></div>
                            <div className="ftd-blueprint-corner top-right"></div>
                            <div className="ftd-blueprint-corner bottom-left"></div>
                            <div className="ftd-blueprint-corner bottom-right"></div>
                        </div>

                        <div className="ftd-variant-spec-states">
                            {BUTTON_STATES.map((state) => {
                                const label = state === 'normal' ? 'Normal' : state === 'hover' ? 'Hover' : state === 'focus' ? 'Focus' : 'Disabled';
                                return (
                                    <div
                                        key={state}
                                        className={`ftd-spec-state-item ${previewState === state ? 'active' : ''}`}
                                        onMouseEnter={() => setPreviewState(state)}
                                        onClick={() => setPreviewState(state)}
                                    >
                                        <button
                                            type="button"
                                            className="ftd-spec-button-mini"
                                            style={buildButtonSpecStyle(variantTokens, dimensions, tokenMap, sizeKey, state)}
                                            disabled={state === 'disabled'}
                                        >
                                            {state === 'normal' ? 'N' : state === 'hover' ? 'H' : state === 'focus' ? 'F' : 'D'}
                                        </button>
                                        <span className="ftd-spec-state-label">{label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="ftd-variant-spec-footer">
                            <div className="ftd-spec-property-grid">
                                {['fill', 'stroke', 'text'].map((type) => {
                                    const token = getButtonVariantToken(variantTokens, type, previewState);
                                    if (!token) return null;

                                    const resolvedValue = getResolvedValue(token.value, tokenMap);
                                    const cssVar = getCssVarFromValue(token.value) || '';
                                    const label = type.charAt(0).toUpperCase() + type.slice(1);

                                    // Find technical key name (e.g. "fill-hover")
                                    const tokenKey = Object.entries(variantTokens).find(([k, v]) => v === token)?.[0] || type;

                                    return (
                                        <div
                                            key={type}
                                            className="ftd-spec-prop"
                                            title={`Click to copy ${cssVar}`}
                                            onClick={() => onCopy(cssVar, cssVar)}
                                        >
                                            <span className="ftd-spec-prop-label">{label}</span>
                                            <div className="ftd-spec-prop-info">
                                                <div
                                                    className="ftd-spec-swatch"
                                                    style={{ backgroundColor: resolvedValue }}
                                                />
                                                <div className="ftd-spec-prop-details">
                                                    <span className="ftd-spec-prop-value">{tokenKey}</span>
                                                    <div className="ftd-spec-prop-meta">
                                                        <span className="ftd-spec-prop-hex">{resolvedValue}</span>
                                                        <span className="ftd-spec-prop-divider">•</span>
                                                        <span className="ftd-spec-prop-var">{cssVar.replace(/^--/, '')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ftd-spec-prop-copy">
                                                <Icon name="copy" size={12} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="ftd-variant-spec-code-view">
                        {variantCode && <VariantCodeBlock code={variantCode} />}
                    </div>
                )}
            </div>
        </div>
    );
};

const renderDimensionPreview = (groupName: string, previewValue: string) => {
    const group = groupName.toLowerCase();
    if (group.includes('font') || group.includes('size')) {
        return (
            <div style={{ fontSize: previewValue, fontWeight: 600, color: 'var(--ftd-primary)', lineHeight: 1 }}>
                Aa
            </div>
        );
    }
    if (group.includes('line')) {
        return (
            <div
                style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    lineHeight: previewValue,
                    color: 'var(--ftd-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0px',
                    maxHeight: '48px',
                    overflow: 'hidden',
                }}
            >
                <div>Aa</div>
                <div>Aa</div>
            </div>
        );
    }
    if (group.includes('radius')) {
        return (
            <div
                className="ftd-token-preview"
                style={{ width: '36px', height: '36px', borderRadius: previewValue }}
            />
        );
    }
    if (group.includes('height')) {
        return (
            <div
                style={{
                    width: '14px',
                    height: previewValue,
                    borderRadius: '6px',
                    background: 'var(--ftd-primary)',
                    boxShadow: '0 4px 12px rgba(var(--ftd-primary-rgb), 0.25)',
                }}
            />
        );
    }
    if (group.includes('padding')) {
        const paddingValue = group.includes('padding-x')
            ? `0 ${previewValue}`
            : group.includes('padding-y')
                ? `${previewValue} 0`
                : previewValue;
        return (
            <div
                style={{
                    padding: paddingValue,
                    borderRadius: '8px',
                    background: 'rgba(var(--ftd-primary-rgb), 0.08)',
                    border: '1px solid rgba(var(--ftd-primary-rgb), 0.18)',
                }}
            >
                <div style={{ width: '14px', height: '14px', background: 'var(--ftd-primary)', borderRadius: '4px' }} />
            </div>
        );
    }

    return <div className="ftd-token-preview" style={{ width: '20px', height: '20px', borderRadius: '6px' }} />;
};

const renderVariantPreview = (
    variantTokens: Record<string, any>,
    dimensions: Record<string, any>,
    tokenMap: Record<string, string>,
    isButtonComponent: boolean,
    defaultButtonSize: string
) => {
    if (!isTokenGroup(variantTokens)) return null;

    const findToken = (keys: string[]) => {
        const normalizedKeys = keys.map((key) => key.toLowerCase());

        // Exact match first
        for (const key of keys) {
            const entry = Object.entries(variantTokens).find(([tokenKey]) => tokenKey.toLowerCase() === key);
            if (entry && isSingleToken(entry[1])) return entry[1] as SingleToken;
        }

        // Fuzzy contains match (handles keys like bg-default, text-muted, border-strong)
        for (const [tokenKey, tokenValue] of Object.entries(variantTokens)) {
            if (!isSingleToken(tokenValue)) continue;
            const lowered = tokenKey.toLowerCase();
            if (normalizedKeys.some((candidate) => lowered.includes(candidate))) {
                return tokenValue as SingleToken;
            }
        }
        return null;
    };

    const activeState: ButtonState = 'normal';
    const previewSize = defaultButtonSize || 'md';
    const fillToken = isButtonComponent
        ? getButtonVariantToken(variantTokens, 'fill', activeState)
        : findToken(['fill', 'background', 'bg', 'surface', 'container']);
    const strokeToken = isButtonComponent
        ? getButtonVariantToken(variantTokens, 'stroke', activeState)
        : findToken(['stroke', 'border', 'outline', 'ring']);
    const textToken = isButtonComponent
        ? getButtonVariantToken(variantTokens, 'text', activeState)
        : findToken(['text', 'label', 'fg', 'foreground', 'content']);
    const radiusToken = !isButtonComponent ? findToken(['radius', 'round']) : null;

    if (!fillToken && !strokeToken && !textToken) return null;

    const backgroundColor = fillToken
        ? getResolvedValue(fillToken.value, tokenMap)
        : 'rgba(var(--ftd-primary-rgb), 0.07)';
    const borderColor = strokeToken
        ? getResolvedValue(strokeToken.value, tokenMap)
        : 'rgba(var(--ftd-primary-rgb), 0.22)';
    const textColor = textToken ? getResolvedValue(textToken.value, tokenMap) : 'var(--ftd-text-main)';
    const heightValue = isButtonComponent ? getButtonDimensionValue(dimensions, tokenMap, 'height', previewSize) : null;
    const fontSizeValue = isButtonComponent ? getButtonDimensionValue(dimensions, tokenMap, 'font-size', previewSize) : null;
    const lineHeightValue = isButtonComponent ? getButtonDimensionValue(dimensions, tokenMap, 'line-height', previewSize) : null;
    const radiusValue = isButtonComponent ? getButtonDimensionValue(dimensions, tokenMap, 'radius', previewSize) : null;
    const paddingXValue = isButtonComponent ? getButtonDimensionValue(dimensions, tokenMap, 'padding-x', previewSize) : null;
    const paddingYValue = isButtonComponent ? getButtonDimensionValue(dimensions, tokenMap, 'padding-y', previewSize) : null;
    const paddingValue = paddingXValue && paddingYValue ? `${paddingYValue} ${paddingXValue}` : undefined;


    return (
        <div className="ftd-variant-preview">
            <button
                type="button"
                className="ftd-variant-button"
                style={{
                    background: backgroundColor,
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: radiusValue || (radiusToken ? getResolvedValue(radiusToken.value, tokenMap) : '8px'),
                    fontSize: fontSizeValue || undefined,
                    lineHeight: lineHeightValue || undefined,
                    height: heightValue || undefined,
                    minHeight: heightValue || undefined,
                    padding: paddingValue,
                    cursor: 'pointer',
                }}
            >
                {isButtonComponent ? 'Button' : 'Preview'}
            </button>
        </div>
    );
};

/**
 * Display a single component with its variants and/or dimensions
 */
function ComponentDisplay({
    name,
    componentId,
    data,
    tokenMap,
    onCopy
}: {
    name: string;
    componentId: string;
    data: ComponentData;
    tokenMap: Record<string, string>;
    onCopy: (value: string, label: string) => void;
}) {
    const variants = Object.keys(data.variants);
    const dimensions = Object.keys(data.dimensions);
    const isButtonComponent = componentId === 'button';

    const sizeOptions = useMemo(() => {
        const groupPriority = ['height', 'font-size', 'padding-x', 'padding-y', 'radius', 'line-height'];
        for (const group of groupPriority) {
            if (data.dimensions[group]) {
                return sortDimensionEntries(Object.entries(data.dimensions[group])).map(([key]) => key);
            }
        }
        return [];
    }, [data.dimensions]);

    const [buttonView, setButtonView] = useState<ButtonView>('variants');
    const buttonVariantOptions = useMemo(
        () => Object.entries(data.variants)
            .filter(([, value]) => isTokenGroup(value))
            .map(([key]) => key),
        [data.variants]
    );
    const defaultButtonSize = sizeOptions.includes('md') ? 'md' : (sizeOptions[0] || 'md');


    const buildButtonCode = (variantName: string, sizeKey?: string | null): ButtonCode | null => {
        if (!isButtonComponent) return null;
        const variantTokens = data.variants[variantName] as Record<string, any>;
        if (!isTokenGroup(variantTokens)) return null;

        const sizes = sizeKey ? [sizeKey] : (sizeOptions.length > 0 ? sizeOptions : [defaultButtonSize]);

        const toCssValue = (token: SingleToken | null, fallback: string) => {
            if (!token) return fallback;
            const cssVar = getCssVarFromValue(token.value);
            return cssVar ? `var(${cssVar})` : token.value;
        };

        const getTokenName = (token: SingleToken | null) => {
            if (!token) return null;
            const cssVar = getCssVarFromValue(token.value);
            if (!cssVar) return null;
            return cssVar.replace(/^--/, '');
        };

        const toScssValue = (token: SingleToken | null, fallback: string) => {
            if (!token) return fallback;
            const name = getTokenName(token);
            if (name) return `$${name}`;
            return token.value;
        };

        const toTailwindValue = (prefix: string, value: string | null) => {
            if (!value) return '';
            if (value === 'transparent') return `${prefix}-transparent`;
            return `${prefix}-[${value}]`;
        };

        const fillNormalToken = getButtonVariantToken(variantTokens, 'fill', 'normal');
        const fillHoverToken = getButtonVariantToken(variantTokens, 'fill', 'hover') || fillNormalToken;
        const fillDisabledToken = getButtonVariantToken(variantTokens, 'fill', 'disabled') || fillNormalToken;
        const textNormalToken = getButtonVariantToken(variantTokens, 'text', 'normal');
        const textHoverToken = getButtonVariantToken(variantTokens, 'text', 'hover') || textNormalToken;
        const textDisabledToken = getButtonVariantToken(variantTokens, 'text', 'disabled') || textNormalToken;
        const strokeNormalToken = getButtonVariantToken(variantTokens, 'stroke', 'normal');
        const strokeHoverToken = getButtonVariantToken(variantTokens, 'stroke', 'hover') || strokeNormalToken;
        const strokeDisabledToken = getButtonVariantToken(variantTokens, 'stroke', 'disabled') || strokeNormalToken;
        const strokeFocusToken = getButtonVariantToken(variantTokens, 'stroke', 'focus') || strokeHoverToken || strokeNormalToken;

        const fillNormalCss = toCssValue(fillNormalToken, 'transparent');
        const fillHoverCss = toCssValue(fillHoverToken, fillNormalCss);
        const fillDisabledCss = toCssValue(fillDisabledToken, fillNormalCss);
        const textNormalCss = toCssValue(textNormalToken, 'inherit');
        const textHoverCss = toCssValue(textHoverToken, textNormalCss);
        const textDisabledCss = toCssValue(textDisabledToken, textNormalCss);
        const strokeNormalCss = toCssValue(strokeNormalToken, 'transparent');
        const strokeHoverCss = toCssValue(strokeHoverToken, strokeNormalCss);
        const strokeDisabledCss = toCssValue(strokeDisabledToken, strokeNormalCss);
        const strokeFocusCss = toCssValue(strokeFocusToken, strokeHoverCss);

        const baseClass = '.button';
        const variantClass = `.button--${variantName}`;

        const sizeBlocks = sizes.map((sizeKey) => {
            const heightToken = getButtonDimensionToken(data.dimensions, 'height', sizeKey);
            const paddingXToken = getButtonDimensionToken(data.dimensions, 'padding-x', sizeKey);
            const paddingYToken = getButtonDimensionToken(data.dimensions, 'padding-y', sizeKey);
            const radiusToken = getButtonDimensionToken(data.dimensions, 'radius', sizeKey);
            const fontSizeToken = getButtonDimensionToken(data.dimensions, 'font-size', sizeKey);
            const lineHeightToken = getButtonDimensionToken(data.dimensions, 'line-height', sizeKey);

            const heightCss = heightToken ? toCssValue(heightToken, '') : '';
            const paddingXCss = paddingXToken ? toCssValue(paddingXToken, '') : '';
            const paddingYCss = paddingYToken ? toCssValue(paddingYToken, '') : '';
            const radiusCss = radiusToken ? toCssValue(radiusToken, '') : '';
            const fontSizeCss = fontSizeToken ? toCssValue(fontSizeToken, '') : '';
            const lineHeightCss = lineHeightToken ? toCssValue(lineHeightToken, '') : '';

            const sizeLines = [
                heightCss ? `  height: ${heightCss};` : '',
                paddingXCss || paddingYCss ? `  padding: ${paddingYCss || '0'} ${paddingXCss || '0'};` : '',
                radiusCss ? `  border-radius: ${radiusCss};` : '',
                fontSizeCss ? `  font-size: ${fontSizeCss};` : '',
                lineHeightCss ? `  line-height: ${lineHeightCss};` : '',
            ].filter(Boolean);

            return `.button--${sizeKey} {\n${sizeLines.join('\n')}\n}`;
        });

        const sizeScssBlocks = sizes.map((sizeKey) => {
            const heightToken = getButtonDimensionToken(data.dimensions, 'height', sizeKey);
            const paddingXToken = getButtonDimensionToken(data.dimensions, 'padding-x', sizeKey);
            const paddingYToken = getButtonDimensionToken(data.dimensions, 'padding-y', sizeKey);
            const radiusToken = getButtonDimensionToken(data.dimensions, 'radius', sizeKey);
            const fontSizeToken = getButtonDimensionToken(data.dimensions, 'font-size', sizeKey);
            const lineHeightToken = getButtonDimensionToken(data.dimensions, 'line-height', sizeKey);

            const heightScss = heightToken ? toScssValue(heightToken, '') : '';
            const paddingXScss = paddingXToken ? toScssValue(paddingXToken, '') : '';
            const paddingYScss = paddingYToken ? toScssValue(paddingYToken, '') : '';
            const radiusScss = radiusToken ? toScssValue(radiusToken, '') : '';
            const fontSizeScss = fontSizeToken ? toScssValue(fontSizeToken, '') : '';
            const lineHeightScss = lineHeightToken ? toScssValue(lineHeightToken, '') : '';

            const sizeLines = [
                heightScss ? `  height: ${heightScss};` : '',
                paddingXScss || paddingYScss ? `  padding: ${paddingYScss || '0'} ${paddingXScss || '0'};` : '',
                radiusScss ? `  border-radius: ${radiusScss};` : '',
                fontSizeScss ? `  font-size: ${fontSizeScss};` : '',
                lineHeightScss ? `  line-height: ${lineHeightScss};` : '',
            ].filter(Boolean);

            return `.button--${sizeKey} {\n${sizeLines.join('\n')}\n}`;
        });

        const css = `${baseClass} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

${sizeBlocks.join('\n\n')}

${variantClass} {
  background-color: ${fillNormalCss};
  color: ${textNormalCss};
  border-color: ${strokeNormalCss};
}

${variantClass}:hover {
  background-color: ${fillHoverCss};
  color: ${textHoverCss};
  border-color: ${strokeHoverCss};
}

${variantClass}:focus-visible {
  outline: 2px solid ${strokeFocusCss};
  outline-offset: 2px;
}

${variantClass}:disabled {
  background-color: ${fillDisabledCss};
  color: ${textDisabledCss};
  border-color: ${strokeDisabledCss};
  cursor: not-allowed;
  opacity: 0.7;
}`;

        const scss = `${baseClass} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

${sizeScssBlocks.join('\n\n')}

${variantClass} {
  background-color: ${toScssValue(fillNormalToken, 'transparent')};
  color: ${toScssValue(textNormalToken, 'inherit')};
  border-color: ${toScssValue(strokeNormalToken, 'transparent')};

  &:hover {
    background-color: ${toScssValue(fillHoverToken, toScssValue(fillNormalToken, 'transparent'))};
    color: ${toScssValue(textHoverToken, toScssValue(textNormalToken, 'inherit'))};
    border-color: ${toScssValue(strokeHoverToken, toScssValue(strokeNormalToken, 'transparent'))};
  }

  &:focus-visible {
    outline: 2px solid ${toScssValue(strokeFocusToken, toScssValue(strokeHoverToken, 'transparent'))};
    outline-offset: 2px;
  }

  &:disabled {
    background-color: ${toScssValue(fillDisabledToken, toScssValue(fillNormalToken, 'transparent'))};
    color: ${toScssValue(textDisabledToken, toScssValue(textNormalToken, 'inherit'))};
    border-color: ${toScssValue(strokeDisabledToken, toScssValue(strokeNormalToken, 'transparent'))};
    cursor: not-allowed;
    opacity: 0.7;
  }
}`;

        const tailwindBase = [
            'inline-flex items-center justify-center font-medium transition-colors duration-200',
            strokeNormalToken ? 'border' : '',
            toTailwindValue('bg', fillNormalCss),
            toTailwindValue('text', textNormalCss),
            strokeNormalToken ? toTailwindValue('border', strokeNormalCss) : '',
            fillHoverToken ? toTailwindValue('hover:bg', fillHoverCss) : '',
            textHoverToken ? toTailwindValue('hover:text', textHoverCss) : '',
            strokeHoverToken ? toTailwindValue('hover:border', strokeHoverCss) : '',
            strokeFocusToken ? `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[${strokeFocusCss}]` : 'focus-visible:outline-none',
            fillDisabledToken ? toTailwindValue('disabled:bg', fillDisabledCss) : '',
            textDisabledToken ? toTailwindValue('disabled:text', textDisabledCss) : '',
            strokeDisabledToken ? toTailwindValue('disabled:border', strokeDisabledCss) : '',
            'disabled:cursor-not-allowed disabled:opacity-70',
        ].filter(Boolean).join(' ');

        const tailwind = sizes.map((s) => {
            const heightToken = getButtonDimensionToken(data.dimensions, 'height', s);
            const paddingXToken = getButtonDimensionToken(data.dimensions, 'padding-x', s);
            const paddingYToken = getButtonDimensionToken(data.dimensions, 'padding-y', s);
            const radiusToken = getButtonDimensionToken(data.dimensions, 'radius', s);
            const fontSizeToken = getButtonDimensionToken(data.dimensions, 'font-size', s);
            const lineHeightToken = getButtonDimensionToken(data.dimensions, 'line-height', s);

            const heightCss = heightToken ? toCssValue(heightToken, '') : '';
            const paddingXCss = paddingXToken ? toCssValue(paddingXToken, '') : '';
            const paddingYCss = paddingYToken ? toCssValue(paddingYToken, '') : '';
            const radiusCss = radiusToken ? toCssValue(radiusToken, '') : '';
            const fontSizeCss = fontSizeToken ? toCssValue(fontSizeToken, '') : '';
            const lineHeightCss = lineHeightToken ? toCssValue(lineHeightToken, '') : '';

            const sizeClasses = [
                heightCss ? `h-[${heightCss}]` : '',
                paddingXCss ? `px-[${paddingXCss}]` : '',
                paddingYCss ? `py-[${paddingYCss}]` : '',
                radiusCss ? `rounded-[${radiusCss}]` : '',
                fontSizeCss ? `text-[${fontSizeCss}]` : '',
                lineHeightCss ? `leading-[${lineHeightCss}]` : '',
            ].filter(Boolean).join(' ');

            return `<button className="${[tailwindBase, sizeClasses].filter(Boolean).join(' ')}">Button</button>`;
        }).join('\n');

        const tsx = sizes.map((s) => (
            `<button className="button button--${variantName} button--${s}">Button</button>`
        )).join('\n');

        return { tsx, css, scss, tailwind };
    };

    const buildVariantColorGroups = (variantName: string) => {
        const variantTokens = data.variants[variantName] as Record<string, any>;
        if (!isTokenGroup(variantTokens)) return null;

        const groups: Record<'fill' | 'stroke' | 'text', VariantColorToken[]> = {
            fill: [],
            stroke: [],
            text: [],
        };

        Object.entries(variantTokens).forEach(([tokenKey, tokenValue]) => {
            if (!isSingleToken(tokenValue)) return;
            const resolvedValue = getResolvedValue(tokenValue.value, tokenMap);
            if (!isColorToken(tokenValue, resolvedValue)) return;

            const keyLower = tokenKey.toLowerCase();
            const group = keyLower.includes('stroke') || keyLower.includes('border')
                ? 'stroke'
                : keyLower.includes('text') || keyLower.includes('label')
                    ? 'text'
                    : 'fill';

            groups[group].push({
                key: tokenKey,
                value: tokenValue.value,
                resolvedValue,
                cssVariable: getCssVarFromValue(tokenValue.value),
            });
        });

        return groups;
    };


    const renderButtonSpecGrid = () => {
        if (!isButtonComponent || buttonVariantOptions.length === 0 || sizeOptions.length === 0) return null;

        return (
            <div className="ftd-button-spec">
                {sizeOptions.map((sizeKey) => (
                    <section key={sizeKey} className="ftd-button-spec-section">
                        <header className="ftd-button-spec-size-header">
                            <div className="ftd-button-spec-size-title">
                                <span className="ftd-button-spec-size-kicker">Core System Spec</span>
                                <h3>{sizeKey.toUpperCase()}</h3>
                            </div>
                            <div className="ftd-button-spec-meta">
                                <span>{buttonVariantOptions.length} Variants</span>
                                <span className="ftd-text-muted">|</span>
                                <span>{BUTTON_STATES.length} States</span>
                            </div>
                        </header>
                        <div className="ftd-variant-spec-grid">
                            {buttonVariantOptions.map((variantName) => {
                                const variantTokens = data.variants[variantName] as Record<string, any>;
                                if (!isTokenGroup(variantTokens)) return null;
                                const variantCode = buildButtonCode(variantName, sizeKey);

                                return (
                                    <VariantSpecCard
                                        key={`${sizeKey}-${variantName}`}
                                        sizeKey={sizeKey}
                                        variantName={variantName}
                                        variantTokens={variantTokens}
                                        variantCode={variantCode}
                                        dimensions={data.dimensions}
                                        tokenMap={tokenMap}
                                        onCopy={onCopy}
                                    />
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        );
    };

    return (
        <div className="ftd-section">
            <div className="ftd-section-header">
                <div className="ftd-section-icon"><Icon name="components" /></div>
                <h2 className="ftd-section-title">{name}</h2>
                {variants.length > 0 && (
                    <span className="ftd-section-badge">{variants.length} Variants</span>
                )}
                {dimensions.length > 0 && (
                    <span className="ftd-section-badge">{dimensions.length} Dimensions</span>
                )}
            </div>

            <div className="ftd-source-banner">
                <div className="ftd-source-badge">Source: tokens.json</div>
                <p className="ftd-source-text">
                    Official system specifications. These variants and dimensions are derived directly from the component tokens.
                </p>
            </div>

            {isButtonComponent && (variants.length > 0 || dimensions.length > 0) && (
                <div className="ftd-component-tabs" role="tablist" aria-label={`${name} views`}>
                    {variants.length > 0 && (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={buttonView === 'variants'}
                            className={`ftd-component-tab ${buttonView === 'variants' ? 'active' : ''}`}
                            onClick={() => setButtonView('variants')}
                        >
                            Variants
                        </button>
                    )}
                    {dimensions.length > 0 && (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={buttonView === 'dimensions'}
                            className={`ftd-component-tab ${buttonView === 'dimensions' ? 'active' : ''}`}
                            onClick={() => setButtonView('dimensions')}
                        >
                            Dimensions
                        </button>
                    )}
                    {variants.length > 0 && (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={buttonView === 'tokens'}
                            className={`ftd-component-tab ${buttonView === 'tokens' ? 'active' : ''}`}
                            onClick={() => setButtonView('tokens')}
                        >
                            Tokens
                        </button>
                    )}
                </div>
            )}

            {/* Display dimensions */}
            {dimensions.length > 0 && (!isButtonComponent || buttonView === 'dimensions') && (
                <div className="ftd-dimensions-display">
                    {Object.entries(data.dimensions).map(([dimName, dimGroup]) => (
                        <div key={dimName} className="ftd-dimension-group">
                            <h3 className="ftd-dimension-title">{formatDisplayName(dimName)}</h3>
                            <div className="ftd-token-grid">
                                {sortDimensionEntries(Object.entries(dimGroup as any)).map(([sizeName, sizeToken]: [string, any]) => {
                                    const rawValue = sizeToken.value;
                                    const cssVar = getCssVarFromValue(rawValue);
                                    const resolvedValue = getResolvedValue(rawValue, tokenMap);
                                    const copyValue = cssVar ? `var(${cssVar})` : rawValue;
                                    const cssVarText = cssVar || '--';
                                    const tokenName = `${componentId} ${dimName} ${sizeName}`;
                                    const componentCssVar = `--${componentId}-${dimName}-${sizeName}`;
                                    return (
                                        <div
                                            key={sizeName}
                                            className="ftd-display-card ftd-clickable-card"
                                            data-token-name={tokenName}
                                            data-token-css-var={componentCssVar}
                                            onClick={() => onCopy(copyValue, cssVar || sizeName)}
                                            title={`Click to copy: ${copyValue}`}
                                        >
                                            <div className="ftd-token-preview-container">
                                                {renderDimensionPreview(dimName, resolvedValue)}
                                            </div>
                                            <p className="ftd-token-card-label">{sizeName}</p>
                                            <div className="ftd-token-values-row">
                                                <span className="ftd-token-css-var">{cssVarText}</span>
                                                <span className="ftd-token-hex">{resolvedValue}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Display variants (if any) */}
            {isButtonComponent && buttonView === 'tokens' && (
                <div className="ftd-component-tokens">
                    {buttonVariantOptions.map((variantName) => {
                        const groups = buildVariantColorGroups(variantName);
                        if (!groups) return null;
                        const groupEntries = (['fill', 'stroke', 'text'] as const).filter((group) => groups[group].length > 0);
                        if (groupEntries.length === 0) return null;
                        return (
                            <div key={variantName} className="ftd-component-token-group">
                                <div className="ftd-section-header">
                                    <div className="ftd-section-icon"><Icon name="components" /></div>
                                    <h3 className="ftd-section-title">{formatDisplayName(variantName)} Tokens</h3>
                                </div>
                                {groupEntries.map((group) => (
                                    <div key={group} className="ftd-semantic-group">
                                        <div className="ftd-semantic-group-header">
                                            <h4 className="ftd-semantic-group-name">{formatDisplayName(group)}</h4>
                                            <span className="ftd-semantic-group-count">{groups[group].length} tokens</span>
                                        </div>
                                        <div className="ftd-token-grid">
                                            {groups[group].map((token) => {
                                                const isAlias = token.value.startsWith('{');
                                                const bgColor = token.resolvedValue || token.value;
                                                const textColor = getContrastColor(bgColor);
                                                const cssVarText = token.cssVariable || '--';
                                                const copyValue = token.cssVariable ? `var(${token.cssVariable})` : token.value;
                                                const copyLabel = cssVarText !== '--' ? cssVarText : copyValue;

                                                return (
                                                    <div
                                                        key={`${variantName}-${token.key}`}
                                                        className="ftd-token-card"
                                                        data-token-name={`${variantName}.${token.key}`}
                                                        data-token-css-var={token.cssVariable || ''}
                                                        onClick={() => onCopy(copyValue, copyLabel)}
                                                    >
                                                        <div className="ftd-token-swatch" style={{ backgroundColor: bgColor, color: textColor }}>
                                                            {isAlias && <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8 }}>Alias</span>}
                                                        </div>
                                                        <div className="ftd-token-info">
                                                            <p className="ftd-token-name">{formatDisplayName(token.key)}</p>
                                                            <div className="ftd-token-values-row">
                                                                <span className="ftd-token-css-var">{cssVarText}</span>
                                                                <span className="ftd-token-hex">
                                                                    {isAlias ? token.resolvedValue?.substring(0, 9) : token.value.substring(0, 9)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}

            {isButtonComponent && buttonView === 'variants' && (
                <div className="ftd-variants-section">
                    <div className="ftd-variants-header">
                        <h4 className="ftd-variants-title">Variants</h4>
                    </div>
                    {renderButtonSpecGrid()}
                </div>
            )}

            {!isButtonComponent && variants.length > 0 && (
                <div className="ftd-variants-section">
                    <div className="ftd-variants-header">
                        <h4 className="ftd-variants-title">Variants</h4>
                    </div>
                    <div className="ftd-variants-grid">
                        {variants.map(variantName => {
                            const variantTokens = data.variants[variantName] as Record<string, any>;
                            return (
                                <div key={variantName} className="ftd-variant-card">
                                    <div className="ftd-variant-header">
                                        <h5 className="ftd-variant-name">{variantName}</h5>
                                    </div>
                                    <div className="ftd-variant-body">
                                        {renderVariantPreview(variantTokens, data.dimensions, tokenMap, isButtonComponent, defaultButtonSize)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Get icon for component type
 */
function getComponentIcon(componentName: string): IconName {
    const iconMap: Record<string, IconName> = {
        button: 'button',
        input: 'input',
        card: 'card',
        modal: 'modal',
        dropdown: 'dropdown',
        checkbox: 'checkbox',
        radio: 'radio',
        toggle: 'toggle',
        slider: 'slider',
        badge: 'badge',
        alert: 'alert',
        tooltip: 'tooltip',
        avatar: 'avatar',
        default: 'components'
    };

    const key = componentName.toLowerCase();
    return iconMap[key] || iconMap.default;
}

function VariantCodeBlock({ code, label }: { code: ButtonCode; label?: string }) {
    const [activeTab, setActiveTab] = useState<CodeTab>('tsx');
    const [copied, setCopied] = useState(false);

    const snippet = code[activeTab];
    const highlightLang = activeTab === 'tsx' ? 'tailwind' : activeTab;
    const highlighted = highlightCode(snippet, highlightLang);

    return (
        <div className="ftd-component-code ftd-playground-code">
            {label && <div className="ftd-component-code-label">{label}</div>}
            <div className="ftd-code-header">
                <div className="ftd-playground-tabs">
                    {(['tsx', 'css', 'scss', 'tailwind'] as CodeTab[]).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            className={`ftd-playground-tab-btn ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.toUpperCase()}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={async () => {
                        if (!snippet) return;
                        try {
                            const success = await copyToClipboard(snippet);
                            if (!success) return;
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        } catch {
                            // Clipboard access denied
                        }
                    }}
                    className="ftd-playground-copy-btn"
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <pre className={`ftd-lang-${highlightLang}`}>
                <code dangerouslySetInnerHTML={{ __html: highlighted }} />
            </pre>
        </div>
    );
}

export default ComponentsTab;
