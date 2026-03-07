'use client';

import React, { useMemo } from 'react';
import type { StandaloneTokenProps } from '../types';
import { ColorDisplay } from './ColorDisplay';
import { SpacingDisplay } from './SpacingDisplay';
import { SizeDisplay } from './SizeDisplay';
import { RadiusDisplay } from './RadiusDisplay';
import { createTokenMap, getFoundationTokenTree, extractSemanticSet } from '../utils/core';

/**
 * Spacing - Standalone component to display spacing tokens
 */
export function Spacing({ tokens, onTokenClick, title }: StandaloneTokenProps) {
    const spacingData = useMemo(() => {
        const foundation = getFoundationTokenTree(tokens);
        const baseGroup = (foundation as any).base || {};
        return (foundation as any).spacing || (foundation as any).space || baseGroup.spacing || baseGroup.space || {};
    }, [tokens]);

    return (
        <div className="ftd-standalone">
            {title && <h2 className="ftd-standalone-title">{title}</h2>}
            <SpacingDisplay tokens={spacingData} onTokenClick={onTokenClick} />
        </div>
    );
}

/**
 * Colors - Standalone component to display color tokens
 */
export function Colors({ tokens, onTokenClick, title }: StandaloneTokenProps) {
    const { base, fill, stroke, text } = useMemo(() => {
        const foundation = getFoundationTokenTree(tokens);
        const baseGroup = (foundation as any).base || {};
        const semantic = extractSemanticSet(tokens) as any;
        const hasBaseGroup = typeof baseGroup === 'object' && baseGroup !== null && Object.keys(baseGroup).length > 0;
        const semanticColorRoot = semantic.color || semantic.colors || {};
        const semanticHasExplicitChannels = semantic.fill || semantic.stroke || semantic.text;

        return {
            base: baseGroup.color || baseGroup.colors || (hasBaseGroup ? baseGroup : undefined) || (foundation as any).color || (foundation as any).colors || foundation || {},
            fill: semantic.fill || semanticColorRoot || {},
            stroke: semantic.stroke || (semanticHasExplicitChannels ? {} : semanticColorRoot) || {},
            text: semantic.text || (semanticHasExplicitChannels ? {} : semanticColorRoot) || {}
        };
    }, [tokens]);

    const tokenMap = useMemo(() => createTokenMap(tokens), [tokens]);

    return (
        <div className="ftd-standalone">
            {title && <h2 className="ftd-standalone-title">{title}</h2>}
            <ColorDisplay
                baseColors={base}
                fillColors={fill}
                strokeColors={stroke}
                textColors={text}
                tokenMap={tokenMap}
                onColorClick={onTokenClick}
            />
        </div>
    );
}

/**
 * Sizes - Standalone component to display sizing tokens
 */
export function Sizes({ tokens, onTokenClick, title }: StandaloneTokenProps) {
    const sizingData = useMemo(() => {
        const foundation = getFoundationTokenTree(tokens);
        const baseGroup = (foundation as any).base || {};
        return (foundation as any).sizing || (foundation as any).size || baseGroup.sizing || baseGroup.size || {};
    }, [tokens]);

    return (
        <div className="ftd-standalone">
            {title && <h2 className="ftd-standalone-title">{title}</h2>}
            <SizeDisplay tokens={sizingData} onTokenClick={onTokenClick} />
        </div>
    );
}

/**
 * Radius - Standalone component to display border radius tokens
 */
export function Radius({ tokens, onTokenClick, title }: StandaloneTokenProps) {
    const radiusData = useMemo(() => {
        const foundation = getFoundationTokenTree(tokens);
        const baseGroup = (foundation as any).base || {};
        return (foundation as any).borderRadius || (foundation as any).radius || baseGroup.borderRadius || baseGroup.radius || {};
    }, [tokens]);

    return (
        <div className="ftd-standalone">
            {title && <h2 className="ftd-standalone-title">{title}</h2>}
            <RadiusDisplay tokens={radiusData} onTokenClick={onTokenClick} />
        </div>
    );
}
