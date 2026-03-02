import React, { useState, useEffect } from 'react';

interface TokenPreviewProps {
    type: string;
    value: string;
    name: string;
}

export function TokenPreview({ type, value, name }: TokenPreviewProps) {
    const normalizedType = type.toLowerCase().replace(/[-_]/g, '');

    // Specific typographic types first to avoid collisions (e.g., 'letterspacing' vs 'spacing')
    if (normalizedType.includes('fontsize') || normalizedType === 'fontsizes') {
        return <FontSizePreview value={value} />;
    }
    if (normalizedType.includes('fontweight') || normalizedType === 'fontweights') {
        return <FontWeightPreview value={value} />;
    }
    if (normalizedType.includes('lineheight') || normalizedType === 'lineheights') {
        return <LineHeightPreview value={value} />;
    }
    if (normalizedType.includes('letterspacing')) {
        return <LetterSpacingPreview value={value} />;
    }
    if (normalizedType.includes('fontfamil') || normalizedType === 'fontfamilies') {
        return <FontFamilyPreview value={value} />;
    }

    // Generic layout/style types
    if (normalizedType.includes('spacing')) {
        return <SpacingPreview value={value} />;
    }
    if (normalizedType.includes('sizing') || normalizedType.includes('size')) {
        return <SizingPreview value={value} />;
    }
    if (normalizedType.includes('radius') || normalizedType.includes('borderradius')) {
        return <RadiusPreview value={value} />;
    }
    if (normalizedType.includes('shadow') || normalizedType === 'boxshadow') {
        return <ShadowPreview value={value} />;
    }
    if (normalizedType.includes('opacity')) {
        return <OpacityPreview value={value} />;
    }
    if (normalizedType.includes('borderwidth')) {
        return <BorderWidthPreview value={value} />;
    }
    if (normalizedType.includes('zindex') || normalizedType === 'zindex') {
        return <ZIndexPreview value={value} />;
    }
    if (normalizedType.includes('duration') || normalizedType.includes('time')) {
        return <DurationPreview value={value} />;
    }
    if (normalizedType.includes('easing') || normalizedType.includes('transition')) {
        return <EasingPreview value={value} />;
    }

    return <GenericPreview value={value} />;
}

function SpacingPreview({ value }: { value: string }) {
    return (
        <div className="ftd-preview-spacing">
            <div className="ftd-preview-spacing-bar" style={{ width: value }}>
                <div className="ftd-preview-spacing-fill" />
            </div>
            <div className="ftd-preview-spacing-label">{value}</div>
        </div>
    );
}

function SizingPreview({ value }: { value: string }) {
    const numValue = parseFloat(value);
    const maxSize = 80;
    const size = Math.min(numValue, maxSize);

    return (
        <div className="ftd-preview-sizing">
            <div
                className="ftd-preview-sizing-box"
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                }}
            >
                <span className="ftd-preview-sizing-label">{value}</span>
            </div>
        </div>
    );
}

function RadiusPreview({ value }: { value: string }) {
    return (
        <div className="ftd-preview-radius">
            <div
                className="ftd-preview-radius-box"
                style={{ borderRadius: value }}
            >
                <span className="ftd-preview-radius-label">{value}</span>
            </div>
        </div>
    );
}

function FontSizePreview({ value }: { value: string }) {
    return (
        <div className="ftd-preview-fontsize">
            <div className="ftd-preview-fontsize-canvas">
                <div className="ftd-fontsize-specimen">
                    <span
                        className="ftd-preview-fontsize-text"
                        style={{ fontSize: value }}
                    >
                        Aa
                    </span>
                </div>
                <div className="ftd-fontsize-badge">
                    {value}
                </div>
            </div>
        </div>
    );
}

function FontWeightPreview({ value }: { value: string }) {
    return (
        <div className="ftd-preview-fontweight">
            <div
                className="ftd-preview-fontweight-text"
                style={{ fontWeight: value }}
            >
                Aa
            </div>
            <div className="ftd-preview-fontweight-label">{value}</div>
        </div>
    );
}

function LineHeightPreview({ value }: { value: string }) {
    return (
        <div className="ftd-preview-lineheight">
            <div
                className="ftd-preview-lineheight-text"
                style={{ lineHeight: value }}
            >
                <div>Aa</div>
                <div>Aa</div>
            </div>
            <div className="ftd-preview-lineheight-label">{value}</div>
        </div>
    );
}

function LetterSpacingPreview({ value }: { value: string }) {
    return (
        <div className="ftd-preview-letterspacing">
            <div
                className="ftd-preview-letterspacing-text"
                style={{ letterSpacing: value }}
            >
                AaBbCc
            </div>
            <div className="ftd-preview-letterspacing-label">{value}</div>
        </div>
    );
}

function FontFamilyPreview({ value }: { value: string }) {
    const cleanValue = value.replace(/['"]/g, '').split(',')[0].trim();

    return (
        <div className="ftd-preview-fontfamily">
            <div
                className="ftd-preview-fontfamily-text"
                style={{ fontFamily: value }}
            >
                Aa Bb Cc
            </div>
            <div className="ftd-preview-fontfamily-label">{cleanValue}</div>
        </div>
    );
}

function ShadowPreview({ value }: { value: string }) {
    return (
        <div className="ftd-preview-shadow">
            <div
                className="ftd-preview-shadow-box"
                style={{ boxShadow: value }}
            />
        </div>
    );
}

function OpacityPreview({ value }: { value: string }) {
    const percentage = Math.round(parseFloat(value) * 100);

    return (
        <div className="ftd-preview-opacity">
            <div className="ftd-preview-opacity-bg">
                <div
                    className="ftd-preview-opacity-box"
                    style={{ opacity: value }}
                />
            </div>
            <div className="ftd-preview-opacity-label">{percentage}%</div>
        </div>
    );
}

function BorderWidthPreview({ value }: { value: string }) {
    return (
        <div className="ftd-preview-borderwidth">
            <div
                className="ftd-preview-borderwidth-line"
                style={{ height: value }}
            />
            <div className="ftd-preview-borderwidth-label">{value}</div>
        </div>
    );
}

function ZIndexPreview({ value }: { value: string }) {
    return (
        <div className="ftd-preview-zindex">
            <div className="ftd-preview-zindex-stack">
                <div className="ftd-preview-zindex-layer ftd-preview-zindex-layer-1" />
                <div className="ftd-preview-zindex-layer ftd-preview-zindex-layer-2" />
                <div className="ftd-preview-zindex-layer ftd-preview-zindex-layer-3" />
            </div>
            <div className="ftd-preview-zindex-label">{value}</div>
        </div>
    );
}

function DurationPreview({ value }: { value: string }) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), parseFloat(value) || 200);
        }, 2000);

        return () => clearInterval(interval);
    }, [value]);

    return (
        <div className="ftd-preview-duration">
            <div className="ftd-preview-duration-track">
                <div
                    className={`ftd-preview-duration-dot ${isAnimating ? 'animating' : ''}`}
                    style={{
                        transitionDuration: value,
                    }}
                />
            </div>
            <div className="ftd-preview-duration-label">{value}</div>
        </div>
    );
}

function EasingPreview({ value }: { value: string }) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 600);
        }, 2000);

        return () => clearInterval(interval);
    }, [value]);

    return (
        <div className="ftd-preview-easing">
            <div className="ftd-preview-easing-track">
                <div
                    className={`ftd-preview-easing-dot ${isAnimating ? 'animating' : ''}`}
                    style={{
                        transitionTimingFunction: value,
                    }}
                />
            </div>
            <div className="ftd-preview-easing-label">{value.split('(')[0]}</div>
        </div>
    );
}

function GenericPreview({ value }: { value: string }) {
    const displayValue = String(value).substring(0, 30);

    return (
        <div className="ftd-preview-generic">
            <div className="ftd-preview-generic-text">
                {displayValue}{String(value).length > 30 ? '...' : ''}
            </div>
        </div>
    );
}

export default TokenPreview;
