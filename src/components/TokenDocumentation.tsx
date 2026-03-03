'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type {
    TokenDocumentationProps,
    FigmaTokens,
    NestedTokens,
    VariantTokens,
    DimensionGroup,
    SnapshotAccessMode,
} from '../types';
import { FoundationTab } from './FoundationTab';
import { SemanticTab } from './SemanticTab';
import { ComponentsTab } from './ComponentsTab';
import { SearchModal } from './SearchModal';
import { ExportModal } from './ExportModal';
import { ResetModal } from './ResetModal';
import { PlaygroundTab, type PlaygroundConfig } from './PlaygroundTab';
import { createTokenMap, resolveTokenValue, findAllTokens, toCssVariable, deepMergeRecords, getFoundationTokenTree } from '../utils/core';
import { copyToClipboard } from '../utils/ui';
import { Icon } from './Icon';
import { FormatSelector, type CopyFormat } from './FormatSelector';
import { formatTokenForCopy, formatCopiedLabel } from '../utils/formatUtils';

type TabType = 'foundation' | 'semantic' | 'components' | 'playground';

interface ComponentData {
    variants: Record<string, VariantTokens>;
    dimensions: Record<string, DimensionGroup>;
}

type TokensPayload = Record<string, unknown>;
type CompareSummary = { added: number; changed: number; removed: number };
type TokenLeaf = { type: string; value: unknown };
type SnapshotHistoryItem = {
    id: string;
    versionId: string;
    commitSha: string;
    commitMessage: string;
    publishedAt: string;
    rawUrl: string;
    previewUrl: string;
    referenceUrl: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStructuredSets(record: Record<string, unknown>): boolean {
    if (isRecord(record['Foundation/Value']) || isRecord(record['Semantic/Value'])) {
        return true;
    }
    if (isRecord(record.Foundation) || isRecord(record.Semantic) || isRecord(record.Components)) {
        return true;
    }
    return Object.keys(record).some((key) => key.startsWith('Components/'));
}

function normalizeTokenSetsRoot(input: unknown): Record<string, unknown> {
    if (!isRecord(input)) return {};

    const directRoot = isRecord(input.tokens) ? (input.tokens as Record<string, unknown>) : input;
    if (hasStructuredSets(directRoot)) {
        return directRoot;
    }

    const candidateKeys = Object.keys(directRoot).filter((key) => !key.startsWith('$'));
    if (candidateKeys.length === 1) {
        const inner = directRoot[candidateKeys[0]];
        if (isRecord(inner) && hasStructuredSets(inner)) {
            return inner;
        }
    }

    return directRoot;
}

function extractSemanticSet(tokensRoot: Record<string, unknown>): NestedTokens {
    if (isRecord(tokensRoot['Semantic/Value'])) {
        return tokensRoot['Semantic/Value'] as NestedTokens;
    }
    if (isRecord(tokensRoot.Semantic)) {
        const semanticRoot = tokensRoot.Semantic as Record<string, unknown>;
        if (isRecord(semanticRoot.Value)) {
            return semanticRoot.Value as NestedTokens;
        }
        return semanticRoot as NestedTokens;
    }
    return {};
}

function extractComponentSet(tokensRoot: Record<string, unknown>): Record<string, unknown> {
    const mergedFromPrefixed = Object.entries(tokensRoot)
        .filter(([key]) => key.startsWith('Components/'))
        .reduce((acc, [_key, value]) => {
            if (isRecord(value)) {
                return deepMergeRecords(acc, value as Record<string, unknown>);
            }
            return acc;
        }, {} as Record<string, unknown>);

    if (isRecord(tokensRoot.Components)) {
        const componentsRoot = tokensRoot.Components as Record<string, unknown>;
        const directComponents = isRecord(componentsRoot.Value)
            ? (componentsRoot.Value as Record<string, unknown>)
            : componentsRoot;
        return deepMergeRecords(mergedFromPrefixed, directComponents);
    }

    return mergedFromPrefixed;
}

function extractFoundationSet(tokensRoot: Record<string, unknown>): NestedTokens {
    if (isRecord(tokensRoot.Foundation)) {
        const foundationRoot = tokensRoot.Foundation as Record<string, unknown>;
        const directFoundation = isRecord(foundationRoot.Value)
            ? (foundationRoot.Value as Record<string, unknown>)
            : foundationRoot;
        const extracted = getFoundationTokenTree(directFoundation);
        if (Object.keys(extracted).length > 0) {
            return extracted as NestedTokens;
        }
    }
    return getFoundationTokenTree(tokensRoot) as NestedTokens;
}

function getComparableRoot(payload: TokensPayload): unknown {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
    const maybeTokens = (payload as Record<string, unknown>).tokens;
    if (maybeTokens && typeof maybeTokens === 'object' && !Array.isArray(maybeTokens)) {
        return maybeTokens;
    }
    return payload;
}

function flattenTokenLeaves(input: unknown, path: string[] = [], out: Map<string, TokenLeaf> = new Map()): Map<string, TokenLeaf> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return out;
    }
    const record = input as Record<string, unknown>;
    const hasLeafShape = typeof record.type === 'string' && Object.prototype.hasOwnProperty.call(record, 'value');
    if (hasLeafShape) {
        const key = path.join('.');
        if (key) out.set(key, { type: record.type as string, value: record.value });
        return out;
    }
    Object.entries(record).forEach(([key, value]) => {
        flattenTokenLeaves(value, [...path, key], out);
    });
    return out;
}

function serializeLeaf(leaf: TokenLeaf): string {
    return `${leaf.type}:${JSON.stringify(leaf.value)}`;
}

function getAliasTarget(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const match = value.trim().match(/^\{([^{}]+)\}$/);
    return match?.[1]?.trim() || null;
}

function normalizeAliasCandidates(alias: string): string[] {
    const trimmed = alias.trim();
    if (!trimmed) return [];
    return [trimmed, trimmed.replace(/\//g, '.'), trimmed.replace(/\./g, '/')].filter(
        (candidate, index, list) => candidate && list.indexOf(candidate) === index
    );
}

function resolveLeafValue(value: unknown, tokensByPath: Map<string, TokenLeaf>, visited: Set<string> = new Set()): unknown {
    const alias = getAliasTarget(value);
    if (!alias) return value;
    const candidates = normalizeAliasCandidates(alias);
    for (const candidate of candidates) {
        if (visited.has(candidate)) return value;
        const target = tokensByPath.get(candidate);
        if (!target) continue;
        visited.add(candidate);
        return resolveLeafValue(target.value, tokensByPath, visited);
    }
    return value;
}

function formatLeafValue(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function buildCompareSummary(currentPayload: TokensPayload, selectedPayload: TokensPayload): CompareSummary {
    const currentMap = flattenTokenLeaves(getComparableRoot(currentPayload));
    const selectedMap = flattenTokenLeaves(getComparableRoot(selectedPayload));
    let added = 0;
    let changed = 0;
    let removed = 0;

    currentMap.forEach((value, key) => {
        if (!selectedMap.has(key)) {
            added += 1;
            return;
        }
        const selectedValue = selectedMap.get(key);
        if (!selectedValue || serializeLeaf(selectedValue) !== serializeLeaf(value)) {
            changed += 1;
        }
    });

    selectedMap.forEach((_value, key) => {
        if (!currentMap.has(key)) {
            removed += 1;
        }
    });

    return { added, changed, removed };
}

function normalizeHistoryItems(items: unknown, sourceUrl?: string): SnapshotHistoryItem[] {
    if (!Array.isArray(items)) return [];
    const isGitHub = sourceUrl?.includes('raw.githubusercontent.com');

    return items
        .map((item, index) => {
            const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
            if (!record) return null;
            if (isGitHub) {
                const sha = typeof record.sha === 'string' ? record.sha : '';
                const commit = record.commit && typeof record.commit === 'object' ? (record.commit as Record<string, unknown>) : null;
                const message = commit && typeof commit.message === 'string' ? commit.message : '';
                const author = commit && commit.author && typeof commit.author === 'object' ? (commit.author as Record<string, unknown>) : null;
                const date = author && typeof author.date === 'string' ? author.date : '';
                const htmlUrl = typeof record.html_url === 'string' ? record.html_url : '';
                let rawUrl = '';
                if (sourceUrl && sha) {
                    try {
                        const parsed = new URL(sourceUrl);
                        const parts = parsed.pathname.split('/');
                        if (parts.length >= 4) {
                            parts[3] = sha;
                            rawUrl = `${parsed.origin}${parts.join('/')}`;
                        }
                    } catch {
                        rawUrl = '';
                    }
                }
                return {
                    id: sha || `github-${index}`,
                    versionId: sha ? sha.slice(0, 7) : `commit-${index + 1}`,
                    commitSha: sha,
                    commitMessage: message.split('\n')[0] || 'No commit message',
                    publishedAt: date,
                    rawUrl,
                    previewUrl: '',
                    referenceUrl: htmlUrl,
                };
            }

            const commitSha = typeof record.commitSha === 'string' ? record.commitSha : '';
            const versionId =
                typeof record.versionId === 'string' && record.versionId.trim()
                    ? record.versionId.trim()
                    : commitSha
                      ? `c${commitSha.slice(0, 7)}`
                      : `snapshot-${index + 1}`;
            const id = typeof record.id === 'string' && record.id ? record.id : `${versionId}-${index}`;
            return {
                id,
                versionId,
                commitSha,
                commitMessage: typeof record.commitMessage === 'string' ? record.commitMessage : '',
                publishedAt: typeof record.publishedAt === 'string' ? record.publishedAt : '',
                rawUrl: typeof record.rawUrl === 'string' ? record.rawUrl : '',
                previewUrl: typeof record.previewUrl === 'string' ? record.previewUrl : '',
                referenceUrl: typeof record.referenceUrl === 'string' ? record.referenceUrl : '',
            };
        })
        .filter((item): item is SnapshotHistoryItem => Boolean(item));
}

function formatLocalTimestamp(value: string): string {
    if (!value) return 'Unknown time';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
}

function normalizeHttpUrl(value: string): string {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    try {
        const parsed = new URL(trimmed);
        if (!/^https?:$/i.test(parsed.protocol)) return '';
        return parsed.toString();
    } catch {
        return '';
    }
}

function buildLocalPreviewUrl(rawUrl: string): string {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}/`;
    return `${base}?source=${encodeURIComponent(rawUrl)}`;
}

function parseColorValue(value: string): string {
    try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'string' ? parsed : value;
    } catch {
        return value;
    }
}

/**
 * TokenDocumentation - Production-ready Design System Documentation
 * Displays tokens in three main tabs: Foundation, Semantic, and Components
 */
export function TokenDocumentation({
    tokens,
    title = 'Design Tokens',
    subtitle = 'Interactive documentation for your design system',
    defaultTab,
    showSearch = true,
    darkMode: initialDarkMode = false,
    fontFamilySans,
    fontFamilyMono,
    loadDefaultFonts = true,
    onTokenClick,
    playgroundLock,
    snapshotHistory,
}: TokenDocumentationProps) {
    const normalizedTokenSets = useMemo(() => normalizeTokenSetsRoot(tokens), [tokens]);

    // State
    const [activeTab, setActiveTab] = useState<TabType>((defaultTab as TabType) || 'foundation');
    const [isMounted, setIsMounted] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
    const [copiedToken, setCopiedToken] = useState<{ id: number; value: string } | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [snapshotOpen, setSnapshotOpen] = useState(false);
    const [snapshotLoading, setSnapshotLoading] = useState(false);
    const [snapshotError, setSnapshotError] = useState('');
    const [snapshotStatus, setSnapshotStatus] = useState('');
    const [snapshotItems, setSnapshotItems] = useState<SnapshotHistoryItem[]>([]);
    const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
    const [selectedSnapshotTokens, setSelectedSnapshotTokens] = useState<TokensPayload | null>(null);
    const [snapshotCompare, setSnapshotCompare] = useState<CompareSummary>({ added: 0, changed: 0, removed: 0 });
    const copiedToastIdRef = useRef(0);
    const copiedToastTimerRef = useRef<number | null>(null);

    // Copy format state
    const [copyFormat, setCopyFormat] = useState<CopyFormat>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('ftd-copy-format');
                if (saved === 'css' || saved === 'scss' || saved === 'tailwind') {
                    return saved;
                }
            } catch {}
        }
        return 'css';
    });

    // Default configuration
    const defaultPlaygroundConfig: PlaygroundConfig = {
        backgroundColor: 'fill-blue',
        textColor: 'text-white',
        borderColor: 'stroke-blue',
        borderRadius: 'radius-sm',
        paddingX: 'space-md',
        paddingY: 'space-sm',
        fontSize: 'font-size-md',
        lineHeight: 'line-height-md',
        hoverBackgroundColor: 'fill-blue-dark',
        hoverTextColor: 'text-white',
        hoverBorderColor: 'stroke-blue-dark',
        // content
        buttonText: 'Button Preview',
        isFullWidth: false,
        showIcon: false,
        // active state
        activeBackgroundColor: 'fill-blue-darker',
        activeTextColor: 'text-white',
        activeBorderColor: 'stroke-blue-dark',
        className: 'custom-button',
    };

    // Playground state - initialize from localStorage and merge with defaults
    const [playgroundConfig, setPlaygroundConfig] = useState<PlaygroundConfig>(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedConfig = localStorage.getItem('ftd-playground-config');
                if (savedConfig) {
                    const parsed = JSON.parse(savedConfig);
                    // Migration: if old data has 'padding', split into paddingX and paddingY
                    const migrated = { ...parsed };
                    if (parsed.padding && !parsed.paddingX) {
                        migrated.paddingX = parsed.padding;
                        migrated.paddingY = parsed.padding;
                        delete migrated.padding;
                    }

                    // Fix typo in activeBorderColor migration
                    if (migrated.activeBorderColor === 'stroke-blue-darker') {
                        migrated.activeBorderColor = 'stroke-blue-dark';
                    }

                    if (migrated.className === 'button') {
                        migrated.className = 'custom-button';
                    }

                    // Merge with defaults to ensure new fields are always present
                    return { ...defaultPlaygroundConfig, ...migrated };
                }
            } catch {
                // Ignore storage access errors
            }
        }
        return defaultPlaygroundConfig;
    });

    // Load saved states on mount (Client-side only)

    useEffect(() => {
        setIsMounted(true);
        if (typeof window !== 'undefined') {
            try {
                // Restore Active Tab
                const savedTab = localStorage.getItem('ftd-active-tab');
                if (savedTab && ['foundation', 'semantic', 'components', 'playground'].includes(savedTab)) {
                    setActiveTab(savedTab as TabType);
                }
            } catch {
                // Ignore storage access errors (e.g., privacy mode)
            }
        }
    }, []);

    const resetPlaygroundConfig = () => {
        setResetModalOpen(true);
    };

    const confirmReset = () => {
        setPlaygroundConfig(defaultPlaygroundConfig);
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('ftd-playground-config');
            } catch {
                // Ignore storage access errors
            }
        }
    };

    const [playgroundActiveTab, setPlaygroundActiveTab] = useState<'css' | 'scss' | 'tailwind'>(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedTab = localStorage.getItem('ftd-playground-active-tab');
                if (savedTab && (savedTab === 'css' || savedTab === 'scss' || savedTab === 'tailwind')) {
                    return savedTab;
                }
            } catch {
                // Ignore storage access errors
            }
        }
        return 'css';
    });

    // Initial theme restoration
    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('ftd-theme-preference');
            if (savedTheme === 'dark') setIsDarkMode(true);
            else if (savedTheme === 'light') setIsDarkMode(false);
        } catch {
            // Ignore storage access errors
        }
    }, []);

    // Load default fonts only when requested
    useEffect(() => {
        if (!loadDefaultFonts) return;
        if (typeof document === 'undefined' || typeof window === 'undefined') return;
        const isHappyDom = typeof navigator !== 'undefined' && /happy-dom/i.test(navigator.userAgent || '');
        const isTestEnv =
            typeof process !== 'undefined' &&
            !!process.env &&
            (process.env.NODE_ENV === 'test' || !!process.env.VITEST || !!process.env.VITEST_WORKER_ID);
        if (isHappyDom || isTestEnv) return;
        const existing = document.getElementById('ftd-google-fonts');
        if (existing) return;
        const link = document.createElement('link');
        link.id = 'ftd-google-fonts';
        link.rel = 'stylesheet';
        link.href =
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
        document.head.appendChild(link);
    }, [loadDefaultFonts]);

    const toggleTheme = () => {
        setIsDarkMode(prev => {
            const next = !prev;
            try {
                localStorage.setItem('ftd-theme-preference', next ? 'dark' : 'light');
            } catch {
                // Ignore storage access errors
            }
            return next;
        });
    };

    // Save playground state to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('ftd-playground-config', JSON.stringify(playgroundConfig));
        } catch {
            // Ignore storage access errors
        }
    }, [playgroundConfig]);

    useEffect(() => {
        try {
            localStorage.setItem('ftd-playground-active-tab', playgroundActiveTab);
        } catch {
            // Ignore storage access errors
        }
    }, [playgroundActiveTab]);

    // Save active tab state
    useEffect(() => {
        if (typeof window !== 'undefined' && isMounted) {
            try {
                localStorage.setItem('ftd-active-tab', activeTab);
            } catch {
                // Ignore storage access errors
            }
        }
    }, [activeTab, isMounted]);

    // Save copy format preference
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('ftd-copy-format', copyFormat);
            } catch {}
        }
    }, [copyFormat]);

    // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
    useEffect(() => {
        if (!showSearch) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSearch]);

    useEffect(() => {
        if (!showSearch && searchOpen) setSearchOpen(false);
    }, [showSearch, searchOpen]);

    useEffect(() => {
        if (!selectedSnapshotTokens) return;
        setSnapshotCompare(buildCompareSummary(normalizedTokenSets as TokensPayload, selectedSnapshotTokens));
    }, [normalizedTokenSets, selectedSnapshotTokens]);

    // Handle scrolling to and highlighting a specific token
    const handleScrollToToken = (tokenName: string, category: string, cssVariable?: string) => {
        const normalizeCssVar = (value?: string) => {
            if (!value) return '';
            let v = value.trim();
            if (v.startsWith('var(') && v.endsWith(')')) v = v.slice(4, -1).trim();
            return v;
        };

        const targetCssVar = normalizeCssVar(cssVariable);

        const tryFindAndHighlight = (attempt: number) => {
            // Try to find the token element by data attribute or text content
            const possibleSelectors = [
                `[data-token-name="${tokenName}"]`,
                `[data-token="${tokenName}"]`,
            ];

            let tokenElement: HTMLElement | null = null;

            for (const selector of possibleSelectors) {
                tokenElement = document.querySelector(selector);
                if (tokenElement) break;
            }

            if (!tokenElement && targetCssVar) {
                tokenElement = document.querySelector(`[data-token-css-var="${targetCssVar}"]`) as HTMLElement | null;
            }

            if (!tokenElement && targetCssVar) {
                const cssVarNodes = document.querySelectorAll('.ftd-token-css-var, .ftd-shade-css-var');
                for (const node of Array.from(cssVarNodes)) {
                    const text = normalizeCssVar(node.textContent || '');
                    if (!text) continue;
                    if (text === targetCssVar) {
                        const candidate = (node as HTMLElement).closest(
                            '.ftd-color-shade, .ftd-token-card, .ftd-spacing-item, .ftd-size-item, .ftd-radius-item, .ftd-dimension-item, .ftd-display-card'
                        ) as HTMLElement | null;
                        if (candidate) {
                            tokenElement = candidate;
                            break;
                        }
                    }
                }
            }

            // If not found by data attribute, try finding by text content
            if (!tokenElement) {
                const allElements = document.querySelectorAll('.ftd-color-shade, .ftd-spacing-item, .ftd-size-item, .ftd-radius-item, .ftd-token-card, .ftd-search-result-item');
                for (const el of Array.from(allElements)) {
                    if (el.textContent?.includes(tokenName)) {
                        tokenElement = el as HTMLElement;
                        break;
                    }
                }
            }

            if (!tokenElement && attempt < 15) {
                setTimeout(() => tryFindAndHighlight(attempt + 1), 160);
                return;
            }

            if (tokenElement) {
                const toRgb = (color: string): { r: number; g: number; b: number; a: number } | null => {
                    const c = color.trim();
                    if (c.startsWith('rgb')) {
                        const match = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?/i);
                        if (!match) return null;
                        return {
                            r: parseInt(match[1], 10),
                            g: parseInt(match[2], 10),
                            b: parseInt(match[3], 10),
                            a: match[4] ? parseFloat(match[4]) : 1,
                        };
                    }
                    if (c.startsWith('#')) {
                        let hex = c.slice(1);
                        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
                        if (hex.length !== 6) return null;
                        const r = parseInt(hex.slice(0, 2), 16);
                        const g = parseInt(hex.slice(2, 4), 16);
                        const b = parseInt(hex.slice(4, 6), 16);
                        return { r, g, b, a: 1 };
                    }
                    return null;
                };

                const isTransparent = (color: string) =>
                    color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || color === 'rgba(0,0,0,0)';

                const isUsable = (rgb: { r: number; g: number; b: number; a: number } | null) => {
                    if (!rgb) return false;
                    if (rgb.a < 0.1) return false;
                    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
                    return luminance < 0.92;
                };

                const getHighlightColor = (el: HTMLElement): { r: number; g: number; b: number; a: number } | null => {
                    const swatch = el.querySelector(
                        '.ftd-token-swatch, .ftd-token-preview, .ftd-color-family-swatch, .ftd-color-shade, .ftd-search-result-preview'
                    ) as HTMLElement | null;
                    if (swatch) {
                        const swatchBg = getComputedStyle(swatch).backgroundColor;
                        if (swatchBg && !isTransparent(swatchBg)) {
                            const rgb = toRgb(swatchBg);
                            if (isUsable(rgb)) return rgb;
                        }
                    }

                    const bg = getComputedStyle(el).backgroundColor;
                    if (bg && !isTransparent(bg)) {
                        const rgb = toRgb(bg);
                        if (isUsable(rgb)) return rgb;
                    }

                    const rootPrimary = getComputedStyle(document.documentElement).getPropertyValue('--ftd-primary').trim();
                    const fallback = toRgb(rootPrimary);
                    return fallback || { r: 59, g: 130, b: 246, a: 1 };
                };

                const rgb = getHighlightColor(tokenElement);
                if (rgb) {
                    tokenElement.style.setProperty('--ftd-highlight', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`);
                    tokenElement.style.setProperty('--ftd-highlight-strong', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.48)`);
                    tokenElement.style.setProperty('--ftd-highlight-bg', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`);
                }

                // Scroll to the element
                tokenElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });

                // Add highlight class
                tokenElement.classList.add('ftd-token-highlight');

                // Helper to remove highlight
                const removeHighlight = () => {
                    tokenElement?.classList.remove('ftd-token-highlight');
                    tokenElement?.style.removeProperty('--ftd-highlight');
                    tokenElement?.style.removeProperty('--ftd-highlight-strong');
                    tokenElement?.style.removeProperty('--ftd-highlight-bg');
                    document.removeEventListener('mousedown', removeHighlight);
                };

                // Remove highlight after 8 seconds automatically
                const timeoutId = setTimeout(removeHighlight, 8000);

                // Or remove immediately on any click
                document.addEventListener('mousedown', () => {
                    clearTimeout(timeoutId);
                    removeHighlight();
                }, { once: true });
            }
        };

        // Wait a bit for tab content to render
        setTimeout(() => tryFindAndHighlight(0), 200);
    };

    // --- Extract the three main token sets ---
    const { foundationTokens, semanticTokens, componentTokens } = useMemo(() => {
        const foundation = extractFoundationSet(normalizedTokenSets);
        const semantic = extractSemanticSet(normalizedTokenSets);
        const components = extractComponentSet(normalizedTokenSets);
        return {
            foundationTokens: foundation,
            semanticTokens: semantic,
            componentTokens: components,
        };
    }, [normalizedTokenSets]);

    // --- Create Global Token Map for Resolution ---
    const tokenMap = useMemo(() => createTokenMap(normalizedTokenSets), [normalizedTokenSets]);

    // --- Determine which tabs to show ---
    const availableTabs = useMemo(() => {
        const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [];

        if (Object.keys(foundationTokens).length > 0) {
            tabs.push({ id: 'foundation', label: 'Foundation', icon: <Icon name="foundation" /> });
        }

        if (Object.keys(semanticTokens).length > 0) {
            tabs.push({ id: 'semantic', label: 'Semantic', icon: <Icon name="semantic" /> });
        }

        if (Object.keys(componentTokens).length > 0) {
            tabs.push({ id: 'components', label: 'Components', icon: <Icon name="components" /> });
        }

        // Always add Playground
        tabs.push({ id: 'playground', label: 'Interactive Sandbox', icon: <Icon name="playground" /> });

        return tabs;
    }, [foundationTokens, semanticTokens, componentTokens]);

    // --- Component Processing (Dynamic Variants) ---
    const mergedComponents = useMemo(() => {
        const components: Record<string, ComponentData> = {};

        const isSingleToken = (obj: any): boolean =>
            obj && typeof obj === 'object' && obj.hasOwnProperty('value') && obj.hasOwnProperty('type');

        const isDimensionGroup = (obj: any): boolean => {
            if (!obj || typeof obj !== 'object') return false;
            const values = Object.values(obj);
            return values.length > 0 && values.every((v: any) => isSingleToken(v) && (v.type === 'dimension' || v.type === 'spacing' || v.type === 'sizing' || v.type === 'borderRadius'));
        };

        const isNestedDimensionGroup = (obj: any): boolean => {
            if (!obj || typeof obj !== 'object') return false;
            const values = Object.values(obj);
            return values.length > 0 && values.every((v: any) => isDimensionGroup(v));
        };

        Object.entries(componentTokens).forEach(([compName, content]) => {
            if (!content || typeof content !== 'object' || isSingleToken(content)) return;

            if (!components[compName]) components[compName] = { variants: {}, dimensions: {} };

            Object.entries(content as any).forEach(([itemKey, itemValue]) => {
                if (isDimensionGroup(itemValue)) {
                    components[compName].dimensions[itemKey] = itemValue as DimensionGroup;
                    return;
                }

                if (isNestedDimensionGroup(itemValue)) {
                    Object.entries(itemValue as Record<string, any>).forEach(([subKey, subValue]) => {
                        if (isDimensionGroup(subValue)) {
                            components[compName].dimensions[`${itemKey}-${subKey}`] = subValue as DimensionGroup;
                        }
                    });
                    return;
                }

                if (typeof itemValue === 'object' && !isSingleToken(itemValue)) {
                    // It's a variant (e.g. "Primary", "Ghost", "Large")
                    components[compName].variants[itemKey] = itemValue as VariantTokens;
                }
            });
        });

        return components;
    }, [componentTokens]);

    // --- Interaction ---


    async function loadSnapshotVersion(item: SnapshotHistoryItem) {
        setSelectedSnapshotId(item.id);
        setSnapshotStatus('');
        if (!item.rawUrl) {
            setSelectedSnapshotTokens(null);
            setSnapshotCompare({ added: 0, changed: 0, removed: 0 });
            setSnapshotStatus('Selected snapshot has no raw token URL.');
            return;
        }
        try {
            const response = await fetch(item.rawUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Snapshot load failed (${response.status})`);
            const payload = await response.json();
            if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
                throw new Error('Snapshot payload is invalid.');
            }
            const nextSnapshot = payload as TokensPayload;
            setSelectedSnapshotTokens(nextSnapshot);
            setSnapshotCompare(buildCompareSummary(normalizedTokenSets as TokensPayload, nextSnapshot));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setSelectedSnapshotTokens(null);
            setSnapshotCompare({ added: 0, changed: 0, removed: 0 });
            setSnapshotStatus(message);
        }
    }

    async function loadSnapshotHistory(force = false) {
        const endpoint = snapshotHistory?.historyEndpoint || '';
        if (!endpoint) {
            setSnapshotError('Snapshot history endpoint is not configured.');
            return;
        }
        if (snapshotLoading && !force) return;
        setSnapshotLoading(true);
        setSnapshotError('');
        setSnapshotStatus('');
        try {
            const response = await fetch(endpoint, { cache: 'no-store' });
            if (!response.ok) throw new Error(`History request failed (${response.status})`);
            const payload = await response.json();
            const sourceUrl = snapshotHistory?.sourceUrl;
            const items = normalizeHistoryItems(
                sourceUrl?.includes('raw.githubusercontent.com') ? payload : (payload as { items?: unknown }).items,
                sourceUrl
            );
            setSnapshotItems(items);
            if (!items.length) {
                setSelectedSnapshotId('');
                setSelectedSnapshotTokens(null);
                setSnapshotCompare({ added: 0, changed: 0, removed: 0 });
                setSnapshotStatus('No snapshot history available yet.');
                return;
            }
            const selected = items.find((item) => item.id === selectedSnapshotId) || items[0];
            await loadSnapshotVersion(selected);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setSnapshotError(message);
        } finally {
            setSnapshotLoading(false);
        }
    }

    function openSnapshotPanel() {
        setSnapshotOpen(true);
        if (!snapshotItems.length || snapshotError) {
            void loadSnapshotHistory(true);
        }
    }

    function openOldSnapshot() {
        if (!selectedSnapshotItem) return;
        const targetUrl =
            selectedSnapshotItem.previewUrl ||
            (selectedSnapshotItem.rawUrl ? buildLocalPreviewUrl(selectedSnapshotItem.rawUrl) : '');
        if (!targetUrl) {
            setSnapshotStatus('Selected snapshot has no preview URL.');
            return;
        }
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }

    async function copyRestoreUrl() {
        const url = normalizeHttpUrl(selectedSnapshotItem?.rawUrl || '');
        if (!url) {
            setSnapshotStatus('No restorable URL available for this snapshot.');
            return;
        }
        try {
            await copyToClipboard(url);
            setSnapshotStatus('Snapshot URL copied.');
        } catch {
            setSnapshotStatus('Could not copy URL. Copy manually from the row.');
        }
    }

    function renderSnapshotDiff(currentTokens: TokensPayload, oldTokens: TokensPayload) {
        const currentMap = flattenTokenLeaves(getComparableRoot(currentTokens));
        const oldMap = flattenTokenLeaves(getComparableRoot(oldTokens));
        const changes: Array<{ name: string; type: string; oldValue: string; newValue: string; changeType: 'added' | 'changed' | 'removed' }> = [];

        currentMap.forEach((value, key) => {
            if (!oldMap.has(key)) {
                const resolvedNew = resolveLeafValue(value.value, currentMap);
                changes.push({ name: key, type: value.type, oldValue: '', newValue: formatLeafValue(resolvedNew), changeType: 'added' });
            } else {
                const oldLeaf = oldMap.get(key);
                if (oldLeaf && serializeLeaf(oldLeaf) !== serializeLeaf(value)) {
                    const resolvedOld = resolveLeafValue(oldLeaf.value, oldMap);
                    const resolvedNew = resolveLeafValue(value.value, currentMap);
                    changes.push({
                        name: key,
                        type: value.type,
                        oldValue: formatLeafValue(resolvedOld),
                        newValue: formatLeafValue(resolvedNew),
                        changeType: 'changed',
                    });
                }
            }
        });

        oldMap.forEach((value, key) => {
            if (!currentMap.has(key)) {
                const resolvedOld = resolveLeafValue(value.value, oldMap);
                changes.push({ name: key, type: value.type, oldValue: formatLeafValue(resolvedOld), newValue: '', changeType: 'removed' });
            }
        });

        const visibleCount = snapshotActionsLocked ? maxPreviewDiffs : maxFullDiffs;
        const visible = changes.slice(0, visibleCount);
        const hiddenCount = Math.max(changes.length - visible.length, 0);

        return (
            <div className="ftd-snapshot-diff">
                {visible.length === 0 ? (
                    <div className="ftd-snapshot-empty">No visual changes detected.</div>
                ) : (
                    visible.map((change) => (
                        <div key={`${change.name}-${change.changeType}`} className={`ftd-snapshot-diff-card ftd-snapshot-diff-${change.changeType}`}>
                            <div className="ftd-snapshot-diff-head">
                                <span className="ftd-snapshot-diff-name">{change.name}</span>
                                <span className="ftd-snapshot-diff-type">{change.type}</span>
                            </div>
                            <div className="ftd-snapshot-diff-body">
                                {change.oldValue ? (
                                    <div className={`ftd-snapshot-diff-value ${snapshotActionsLocked ? 'is-blurred' : ''}`}>
                                        <span>Old</span>
                                        <code>{parseColorValue(change.oldValue)}</code>
                                    </div>
                                ) : null}
                                {change.oldValue && change.newValue ? <span className="ftd-snapshot-arrow">→</span> : null}
                                {change.newValue ? (
                                    <div className="ftd-snapshot-diff-value">
                                        <span>New</span>
                                        <code>{parseColorValue(change.newValue)}</code>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))
                )}
                {snapshotActionsLocked && hiddenCount > 0 ? (
                    <div className="ftd-snapshot-locked-teaser">+{hiddenCount} more changes in full package</div>
                ) : null}
            </div>
        );
    }

    const handleCopy = async (value: string, label: string, tokenPath?: string) => {
        try {
            const formattedValue = formatTokenForCopy(value, tokenPath || label, copyFormat);
            const success = await copyToClipboard(formattedValue);
            if (!success) return;
            const id = ++copiedToastIdRef.current;
            setCopiedToken({ id, value: formatCopiedLabel(label, formattedValue, copyFormat) });
            if (copiedToastTimerRef.current !== null) window.clearTimeout(copiedToastTimerRef.current);
            copiedToastTimerRef.current = window.setTimeout(() => {
                setCopiedToken((current) => (current && current.id === id ? null : current));
                copiedToastTimerRef.current = null;
            }, 2000);
        } catch {
            // Clipboard access denied — do not show toast
        }
    };

    useEffect(() => () => {
        if (copiedToastTimerRef.current !== null) {
            window.clearTimeout(copiedToastTimerRef.current);
        }
    }, []);

    useEffect(() => {
        if (!snapshotOpen) return;
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setSnapshotOpen(false);
        };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [snapshotOpen]);

    const getResolvedColor = (variantTokens: VariantTokens, patterns: string[]) => {
        for (const pattern of patterns) {
            const entry = Object.entries(variantTokens).find(([key]) => {
                const k = key.toLowerCase();
                return k === pattern || k.includes(pattern);
            });
            if (entry && isSingleToken(entry[1])) {
                const val = (entry[1] as any).value;
                return { name: entry[0], reference: val, resolved: resolveTokenValue(val, tokenMap) };
            }
        }
        return null;
    };

    const isSingleToken = (obj: any): boolean =>
        obj && typeof obj === 'object' && obj.hasOwnProperty('value') && obj.hasOwnProperty('type');

    const fontOverrides = useMemo(() => {
        const overrides: Record<string, string> = {};
        if (fontFamilySans) overrides['--ftd-font-sans'] = fontFamilySans;
        if (fontFamilyMono) overrides['--ftd-font-mono'] = fontFamilyMono;
        return overrides;
    }, [fontFamilySans, fontFamilyMono]);

    // --- Sub-Components ---
    const isPlaygroundLocked = Boolean(playgroundLock?.enabled);
    const snapshotMode: SnapshotAccessMode = snapshotHistory?.accessMode === 'preview' ? 'preview' : 'full';
    const snapshotEnabled = Boolean(snapshotHistory?.enabled);
    const maxPreviewSnapshots = snapshotHistory?.maxPreviewSnapshots ?? 3;
    const maxPreviewDiffs = snapshotHistory?.maxPreviewDiffs ?? 5;
    const maxFullDiffs = 15;
    const snapshotActionsLocked = snapshotMode === 'preview';
    const selectedSnapshotItem = useMemo(
        () => snapshotItems.find((item) => item.id === selectedSnapshotId) || null,
        [snapshotItems, selectedSnapshotId]
    );

    const TableSwatch = ({ data }: { data: { reference: string; resolved: string } | null }) => {
        if (!data) return <span className="ftd-cell-empty">-</span>;

        return (
            <div className="ftd-table-swatch-container" onClick={() => handleCopy(data.resolved, data.reference)}>
                <div className="ftd-table-swatch" style={{ backgroundColor: data.resolved }} />
                <div className="ftd-table-value-group">
                    <code className="ftd-table-hex">{data.resolved}</code>
                    <span className="ftd-table-ref" title={data.reference}>
                        {data.reference.startsWith('{') ? data.reference.slice(1, -1).split('.').pop() : 'Raw'}
                    </span>
                </div>
            </div>
        );
    };

    // Skeleton Component
    const SkeletonLoader = () => (
        <div className="ftd-container" data-theme={isDarkMode ? 'dark' : 'light'} style={fontOverrides}>
            <div className="ftd-navbar-sticky">
                <header className="ftd-header">
                    <div className="ftd-title-wrapper">
                        <div className="ftd-skeleton-pulse ftd-skeleton-title" />
                        <div className="ftd-skeleton-pulse ftd-skeleton-subtitle" />
                    </div>
                    <div className="ftd-header-actions">
                        <div className="ftd-skeleton-pulse ftd-skeleton-action-pulse ftd-skeleton-export" />
                        <div className="ftd-skeleton-pulse ftd-skeleton-action-pulse ftd-skeleton-search" />
                        <div className="ftd-skeleton-pulse ftd-skeleton-action-pulse ftd-skeleton-theme" />
                    </div>
                </header>
                <div className="ftd-skeleton-tabs">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="ftd-skeleton-pulse ftd-skeleton-tab" />
                    ))}
                </div>
            </div>
            <div className="ftd-content">
                <div className="ftd-skeleton-content">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="ftd-skeleton-pulse ftd-skeleton-card" />
                    ))}
                </div>
            </div>
        </div>
    );

    if (!isMounted) {
        return <SkeletonLoader />;
    }

    // Return statement using isMounted for flash prevention
    return (
        <div
            className={`ftd-container ftd-container-animated`}
            data-theme={isDarkMode ? 'dark' : 'light'}
            style={{ opacity: isMounted ? 1 : 0, ...fontOverrides }}
        >
            {copiedToken &&
                (typeof document !== 'undefined'
                    ? createPortal(
                        <div className="ftd-copied-toast" role="status" aria-live="polite" key={copiedToken.id}>
                            <div className="ftd-toast-icon">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <div className="ftd-toast-content">
                                <span className="ftd-toast-label">Copied</span>
                                <span className="ftd-toast-value">{copiedToken.value}</span>
                            </div>
                        </div>,
                        document.body
                    )
                    : null)}

            <div className="ftd-navbar-sticky">
                <header className="ftd-header">
                    <div className="ftd-title-wrapper">
                        <h1 className="ftd-title">{title}</h1>
                        <p className="ftd-subtitle">{subtitle}</p>
                    </div>
                    <div className="ftd-header-actions">
                        <FormatSelector format={copyFormat} onChange={setCopyFormat} />
                        <button className="ftd-export-button-nav" onClick={() => setExportOpen(true)} type="button">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2v4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span>Export</span>
                        </button>
                        {snapshotEnabled && (
                            <button
                                className="ftd-search-button"
                                onClick={openSnapshotPanel}
                                title="Open snapshot history"
                                aria-label="Open snapshot history"
                                type="button"
                            >
                                <Icon name="components" />
                                <span>Snapshot History</span>
                            </button>
                        )}
                        {showSearch && (
                            <button
                                className="ftd-search-button"
                                onClick={() => setSearchOpen(true)}
                                title="Search tokens (Cmd+K)"
                                aria-label="Search tokens"
                                type="button"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                                <span>Search</span>
                                <kbd className="ftd-search-shortcut">⌘K</kbd>
                            </button>
                        )}
                        <button
                            className="ftd-theme-toggle"
                            onClick={toggleTheme}
                            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                            type="button"
                        >
                            <Icon name={isDarkMode ? 'sun' : 'moon'} />
                            {isDarkMode ? 'Light' : 'Dark'}
                        </button>
                    </div>
                </header>

                {availableTabs.length > 1 && (
                    <nav className="ftd-tabs" aria-label="Documentation types">
                        {availableTabs.map((tab) => (
                            <button
                                type="button"
                                key={tab.id}
                                className={`ftd-tab ${activeTab === tab.id ? 'active' : ''} ${tab.id === 'playground' && isPlaygroundLocked ? 'ftd-tab-locked' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                title={tab.id === 'playground' && isPlaygroundLocked ? 'Interactive Sandbox is read-only in shared preview' : undefined}
                            >
                                <span style={{ marginRight: '8px' }}>{tab.icon}</span>
                                {tab.label}
                                {tab.id === 'playground' && isPlaygroundLocked && (
                                    <span className="ftd-tab-badge ftd-tab-badge-lock">Read only</span>
                                )}
                            </button>
                        ))}
                    </nav>
                )}
            </div>

            <div className="ftd-content">
                {activeTab === 'foundation' && (
                    <FoundationTab
                        tokens={foundationTokens}
                        tokenMap={tokenMap}
                        onTokenClick={onTokenClick}
                        copyFormat={copyFormat}
                        onCopy={handleCopy}
                    />
                )}

                {activeTab === 'semantic' && (
                    <SemanticTab
                        tokens={semanticTokens}
                        tokenMap={tokenMap}
                        onTokenClick={onTokenClick}
                        copyFormat={copyFormat}
                        onCopy={handleCopy}
                    />
                )}

                {activeTab === 'components' && (
                    <ComponentsTab
                        tokens={componentTokens as NestedTokens}
                        tokenMap={tokenMap}
                        onTokenClick={onTokenClick}
                        copyFormat={copyFormat}
                        onCopy={handleCopy}
                    />
                )}

                {activeTab === 'playground' && (
                    <PlaygroundTab
                        tokens={normalizedTokenSets as FigmaTokens}
                        tokenMap={tokenMap}
                        config={playgroundConfig}
                        setConfig={setPlaygroundConfig}
                        activeTab={playgroundActiveTab}
                        setActiveTab={setPlaygroundActiveTab}
                        onReset={resetPlaygroundConfig}
                        lock={playgroundLock}
                    />
                )}
            </div>

            {snapshotOpen && (
                <div className="ftd-snapshot-backdrop" role="dialog" aria-modal="true" aria-label="Snapshot history" onClick={() => setSnapshotOpen(false)}>
                    <aside className="ftd-snapshot-panel" onClick={(event) => event.stopPropagation()}>
                        <header className="ftd-snapshot-header">
                            <div>
                                <h3>{snapshotHistory?.title || 'Snapshot History'}</h3>
                                <p>{snapshotActionsLocked ? 'Preview mode (limited)' : 'Full access mode'}</p>
                            </div>
                            <div className="ftd-snapshot-actions">
                                <button type="button" className="ftd-search-button" onClick={() => void loadSnapshotHistory(true)} disabled={snapshotLoading}>
                                    {snapshotLoading ? 'Loading...' : 'Refresh'}
                                </button>
                                <button type="button" className="ftd-search-button" onClick={() => setSnapshotOpen(false)}>
                                    Close
                                </button>
                            </div>
                        </header>

                        {snapshotError ? <div className="ftd-snapshot-error">{snapshotError}</div> : null}
                        {snapshotStatus ? <div className="ftd-snapshot-status">{snapshotStatus}</div> : null}
                        {snapshotActionsLocked ? (
                            <div className="ftd-snapshot-lock-note">Preview mode shows limited history. Install tokvista locally for full access.</div>
                        ) : null}

                        <div className="ftd-snapshot-layout">
                            <div className="ftd-snapshot-list">
                                {!snapshotItems.length && !snapshotLoading ? <div className="ftd-snapshot-empty">No versions found yet.</div> : null}
                                {snapshotItems.map((item, index) => {
                                    const isLocked = snapshotActionsLocked && index >= maxPreviewSnapshots;
                                    return (
                                        <button
                                            type="button"
                                            key={item.id}
                                            className={`ftd-snapshot-item ${item.id === selectedSnapshotId ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                                            onClick={() => {
                                                if (isLocked) return;
                                                void loadSnapshotVersion(item);
                                            }}
                                            aria-disabled={isLocked}
                                            title={isLocked ? 'Install tokvista for full snapshot access.' : undefined}
                                        >
                                            <div className="ftd-snapshot-item-head">
                                                <span>{item.versionId}</span>
                                                <span>{formatLocalTimestamp(item.publishedAt)}</span>
                                            </div>
                                            {isLocked ? <div className="ftd-snapshot-item-lock">Locked</div> : null}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="ftd-snapshot-detail">
                                {selectedSnapshotItem && selectedSnapshotTokens ? (
                                    <>
                                        <div className="ftd-snapshot-summary">
                                            <span className="added">+{snapshotCompare.added} Added</span>
                                            <span className="changed">~{snapshotCompare.changed} Changed</span>
                                            <span className="removed">-{snapshotCompare.removed} Removed</span>
                                        </div>
                                        {renderSnapshotDiff(normalizedTokenSets as TokensPayload, selectedSnapshotTokens)}
                                        <div className="ftd-snapshot-links">
                                            <button type="button" className="ftd-search-button" onClick={openOldSnapshot} disabled={snapshotActionsLocked}>
                                                Open snapshot
                                            </button>
                                            {selectedSnapshotItem.referenceUrl ? (
                                                <button
                                                    type="button"
                                                    className="ftd-search-button"
                                                    onClick={() => window.open(selectedSnapshotItem.referenceUrl, '_blank', 'noopener,noreferrer')}
                                                    disabled={snapshotActionsLocked}
                                                >
                                                    Open commit
                                                </button>
                                            ) : null}
                                            <button type="button" className="ftd-search-button" onClick={() => void copyRestoreUrl()} disabled={snapshotActionsLocked}>
                                                Copy restore URL
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="ftd-snapshot-empty">Select a snapshot version to compare.</div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {showSearch && (
                <SearchModal
                    isOpen={searchOpen}
                    onClose={() => setSearchOpen(false)}
                    tokens={normalizedTokenSets as FigmaTokens}
                    onTokenClick={onTokenClick}
                    onNavigateToTab={(tab) => setActiveTab(tab)}
                    onScrollToToken={handleScrollToToken}
                />
            )}

            <ExportModal
                isOpen={exportOpen}
                onClose={() => setExportOpen(false)}
                tokens={normalizedTokenSets as FigmaTokens}
            />

            <ResetModal
                isOpen={resetModalOpen}
                onClose={() => setResetModalOpen(false)}
                onConfirm={confirmReset}
            />
        </div>
    );
}

export default TokenDocumentation;
