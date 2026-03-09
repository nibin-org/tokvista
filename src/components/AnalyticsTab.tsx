'use client';

import React, { useMemo, useState } from 'react';
import type { FigmaTokens, TokenUsageData } from '../types';
import { createTokenMap, resolveTokenValue, extractFoundationSet, extractSemanticSet, extractComponentSet } from '../utils/core';

interface AnalyticsTabProps {
    tokens: FigmaTokens;
    usageData?: TokenUsageData;
}

interface TokenStats {
    total: number;
    foundation: number;
    semantic: number;
    components: number;
    byType: Record<string, { total: number; foundation: number; semantic: number; components: number }>;
    aliases: number;
    hardcoded: number;
    brokenAliases: Array<{ path: string; reference: string }>;
    hardcodedInSemantic: number;
    hardcodedInComponents: number;
    hardcodedSemanticPaths: string[];
    hardcodedComponentPaths: string[];
    otherTypes: Record<string, number>;
}

function isTokenLeaf(value: unknown): value is { type: string; value: unknown } {
    return typeof value === 'object' && value !== null && 'type' in value && 'value' in value;
}

function isAlias(value: unknown): boolean {
    return typeof value === 'string' && /^\{[^{}]+\}$/.test(value.trim());
}

function collectStats(
    obj: unknown,
    tokenMap: Record<string, string>,
    layer: 'foundation' | 'semantic' | 'components',
    path: string[] = [],
    stats: TokenStats
): TokenStats {
    if (!obj || typeof obj !== 'object') return stats;

    if (isTokenLeaf(obj)) {
        stats.total++;
        stats[layer]++;

        const type = obj.type || 'unknown';
        if (!stats.byType[type]) {
            stats.byType[type] = { total: 0, foundation: 0, semantic: 0, components: 0 };
        }
        stats.byType[type].total++;
        stats.byType[type][layer]++;

        if (type === 'unknown') {
            const rawType = String((obj as any).type || 'missing');
            stats.otherTypes[rawType] = (stats.otherTypes[rawType] || 0) + 1;
        }

        if (isAlias(obj.value)) {
            stats.aliases++;
            const resolved = resolveTokenValue(obj.value as string, tokenMap);
            if (resolved === obj.value) {
                stats.brokenAliases.push({ path: path.join('.'), reference: obj.value as string });
            }
        } else {
            stats.hardcoded++;
            if (layer === 'semantic') {
                stats.hardcodedInSemantic++;
                stats.hardcodedSemanticPaths.push(path.join('.'));
            }
            if (layer === 'components') {
                stats.hardcodedInComponents++;
                stats.hardcodedComponentPaths.push(path.join('.'));
            }
        }
        return stats;
    }

    if (Array.isArray(obj)) {
        obj.forEach((item, i) => collectStats(item, tokenMap, layer, [...path, String(i)], stats));
    } else {
        Object.entries(obj as Record<string, unknown>).forEach(([key, value]) =>
            collectStats(value, tokenMap, layer, [...path, key], stats)
        );
    }

    return stats;
}

function copyReport(stats: TokenStats) {
    const lines = [
        '# Token Analytics Report',
        '',
        '## Overview',
        `Total Tokens: ${stats.total}`,
        `Foundation: ${stats.foundation}`,
        `Semantic: ${stats.semantic}`,
        `Components: ${stats.components}`,
        '',
        '## Composition',
        `Aliases: ${stats.aliases} (${((stats.aliases / stats.total) * 100).toFixed(1)}%)`,
        `Hardcoded: ${stats.hardcoded} (${((stats.hardcoded / stats.total) * 100).toFixed(1)}%)`,
        '',
        '## Alias Health',
        `Valid: ${stats.aliases - stats.brokenAliases.length}`,
        `Broken: ${stats.brokenAliases.length}`,
    ];

    if (stats.brokenAliases.length > 0) {
        lines.push('', '### Broken Aliases');
        stats.brokenAliases.forEach(({ path, reference }) => {
            lines.push(`- ${path} → ${reference}`);
        });
    }

    if (stats.hardcodedInSemantic > 0 || stats.hardcodedInComponents > 0) {
        lines.push('', '## Quality Issues');
        if (stats.hardcodedInSemantic > 0) {
            lines.push(`⚠️  ${stats.hardcodedInSemantic} hardcoded values in Semantic layer`);
            stats.hardcodedSemanticPaths.forEach((path) => {
                lines.push(`  - ${path}`);
            });
        }
        if (stats.hardcodedInComponents > 0) {
            lines.push(`⚠️  ${stats.hardcodedInComponents} hardcoded values in Components layer`);
            stats.hardcodedComponentPaths.forEach((path) => {
                lines.push(`  - ${path}`);
            });
        }
    }

    lines.push('', '## Token Types');
    Object.entries(stats.byType)
        .sort(([, a], [, b]) => b.total - a.total)
        .forEach(([type, counts]) => {
            const coverage = [counts.foundation > 0 && 'F', counts.semantic > 0 && 'S', counts.components > 0 && 'C']
                .filter(Boolean)
                .join('+');
            lines.push(`${type}: ${counts.total} (${coverage || 'none'})`);
        });

    return lines.join('\n');
}

export function AnalyticsTab({ tokens, usageData }: AnalyticsTabProps) {
    const [expandedHardcoded, setExpandedHardcoded] = useState<'semantic' | 'components' | null>(null);
    const [expandedOther, setExpandedOther] = useState(false);

    const stats = useMemo(() => {
        const tokenMap = createTokenMap(tokens);
        const foundation = extractFoundationSet(tokens);
        const semantic = extractSemanticSet(tokens);
        const components = extractComponentSet(tokens);

        const combined: TokenStats = {
            total: 0,
            foundation: 0,
            semantic: 0,
            components: 0,
            byType: {},
            aliases: 0,
            hardcoded: 0,
            brokenAliases: [],
            hardcodedInSemantic: 0,
            hardcodedInComponents: 0,
            hardcodedSemanticPaths: [],
            hardcodedComponentPaths: [],
            otherTypes: {},
        };

        collectStats(foundation, tokenMap, 'foundation', [], combined);
        collectStats(semantic, tokenMap, 'semantic', [], combined);
        collectStats(components, tokenMap, 'components', [], combined);

        return combined;
    }, [tokens]);

    const sortedTypes = useMemo(() => {
        return Object.entries(stats.byType)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([type, counts]) => {
                const coverage = [counts.foundation > 0 && 'F', counts.semantic > 0 && 'S', counts.components > 0 && 'C']
                    .filter(Boolean)
                    .join('+');
                const hasOnlyFoundation = counts.foundation > 0 && !counts.semantic && !counts.components;
                return {
                    type,
                    count: counts.total,
                    percentage: ((counts.total / stats.total) * 100).toFixed(1),
                    coverage: coverage || 'none',
                    hasGaps: hasOnlyFoundation,
                };
            });
    }, [stats]);

    const layerHealth = useMemo(() => {
        if (stats.semantic === 0 || stats.components === 0) return null;
        if (stats.semantic < stats.components) {
            return { type: 'info', message: `${stats.semantic} Semantic · ${stats.components} Components — is your semantic layer fully covering component usage?` };
        }
        return null;
    }, [stats.semantic, stats.components]);

    const aliasPercentage = stats.total > 0 ? ((stats.aliases / stats.total) * 100).toFixed(1) : '0';
    const hardcodedPercentage = stats.total > 0 ? ((stats.hardcoded / stats.total) * 100).toFixed(1) : '0';
    const aliasHealth = stats.aliases > 0 ? (((stats.aliases - stats.brokenAliases.length) / stats.aliases) * 100).toFixed(1) : '100';

    const handleCopyReport = async () => {
        const report = copyReport(stats);
        try {
            await navigator.clipboard.writeText(report);
        } catch {}
    };

    if (stats.total === 0) {
        return (
            <div className="ftd-analytics-container">
                <div className="ftd-analytics-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 3v18h18" />
                        <path d="M18 9l-5 5-4-4-3 3" />
                    </svg>
                    <h3>No tokens found</h3>
                    <p>Load a token file to see analytics</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ftd-analytics-container">
            <div className="ftd-analytics-header">
                <button className="ftd-analytics-copy-btn" onClick={handleCopyReport} title="Copy report to clipboard">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy Report
                </button>
            </div>
            <div className="ftd-analytics-grid">
                <div className="ftd-analytics-card ftd-analytics-overview">
                    <div className="ftd-analytics-card-header">
                        <h3>Overview</h3>
                    </div>
                    <div className="ftd-analytics-stats">
                        <div className="ftd-analytics-stat">
                            <div className="ftd-analytics-stat-value">{stats.total}</div>
                            <div className="ftd-analytics-stat-label">Total Tokens</div>
                        </div>
                        <div className="ftd-analytics-stat">
                            <div className="ftd-analytics-stat-value">{Object.keys(stats.byType).length}</div>
                            <div className="ftd-analytics-stat-label">Token Types</div>
                        </div>
                    </div>
                    <div className="ftd-analytics-breakdown">
                        <div className="ftd-analytics-breakdown-item">
                            <span className="ftd-analytics-breakdown-label">Foundation</span>
                            <span className="ftd-analytics-breakdown-value">{stats.foundation}</span>
                        </div>
                        <div className="ftd-analytics-breakdown-item">
                            <span className="ftd-analytics-breakdown-label">Semantic</span>
                            <span className="ftd-analytics-breakdown-value">{stats.semantic}</span>
                        </div>
                        <div className="ftd-analytics-breakdown-item">
                            <span className="ftd-analytics-breakdown-label">Components</span>
                            <span className="ftd-analytics-breakdown-value">{stats.components}</span>
                        </div>
                        {layerHealth && (
                            <div className="ftd-analytics-breakdown-warning">
                                ⚠️  {layerHealth.message}
                            </div>
                        )}
                        {stats.brokenAliases.length === 0 && (
                            <div className="ftd-analytics-breakdown-badge">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                All aliases valid
                            </div>
                        )}
                    </div>
                </div>

                <div className="ftd-analytics-card ftd-analytics-composition">
                    <div className="ftd-analytics-card-header">
                        <h3>Token Composition</h3>
                    </div>
                    <div className="ftd-analytics-composition-grid">
                        <div className="ftd-analytics-composition-item">
                            <div className="ftd-analytics-composition-bar">
                                <div className="ftd-analytics-composition-fill ftd-analytics-alias" style={{ width: `${aliasPercentage}%` }} />
                            </div>
                            <div className="ftd-analytics-composition-label">
                                <span className="ftd-analytics-composition-dot ftd-analytics-alias" />
                                <span>Aliases ({stats.aliases})</span>
                                <span className="ftd-analytics-composition-percent">{aliasPercentage}%</span>
                            </div>
                        </div>
                        <div className="ftd-analytics-composition-item">
                            <div className="ftd-analytics-composition-bar">
                                <div className="ftd-analytics-composition-fill ftd-analytics-hardcoded" style={{ width: `${hardcodedPercentage}%` }} />
                            </div>
                            <div className="ftd-analytics-composition-label">
                                <span className="ftd-analytics-composition-dot ftd-analytics-hardcoded" />
                                <span>Hardcoded ({stats.hardcoded})</span>
                                <span className="ftd-analytics-composition-percent">{hardcodedPercentage}%</span>
                            </div>
                        </div>
                    </div>
                    {(stats.hardcodedInSemantic > 0 || stats.hardcodedInComponents > 0) && (
                        <div className="ftd-analytics-composition-warning">
                            {stats.hardcodedInSemantic > 0 && (
                                <>
                                    <div 
                                        className="ftd-analytics-composition-warning-item"
                                        onClick={() => setExpandedHardcoded(expandedHardcoded === 'semantic' ? null : 'semantic')}
                                    >
                                        <span>⚠️  {stats.hardcodedInSemantic} hardcoded in Semantic</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedHardcoded === 'semantic' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                    {expandedHardcoded === 'semantic' && (
                                        <div className="ftd-analytics-composition-warning-list">
                                            {stats.hardcodedSemanticPaths.slice(0, 10).map((path) => (
                                                <div key={path} className="ftd-analytics-composition-warning-path">{path}</div>
                                            ))}
                                            {stats.hardcodedSemanticPaths.length > 10 && (
                                                <div className="ftd-analytics-composition-warning-more">+{stats.hardcodedSemanticPaths.length - 10} more</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                            {stats.hardcodedInComponents > 0 && (
                                <>
                                    <div 
                                        className="ftd-analytics-composition-warning-item"
                                        onClick={() => setExpandedHardcoded(expandedHardcoded === 'components' ? null : 'components')}
                                    >
                                        <span>⚠️  {stats.hardcodedInComponents} hardcoded in Components</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedHardcoded === 'components' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                    {expandedHardcoded === 'components' && (
                                        <div className="ftd-analytics-composition-warning-list">
                                            {stats.hardcodedComponentPaths.slice(0, 10).map((path) => (
                                                <div key={path} className="ftd-analytics-composition-warning-path">{path}</div>
                                            ))}
                                            {stats.hardcodedComponentPaths.length > 10 && (
                                                <div className="ftd-analytics-composition-warning-more">+{stats.hardcodedComponentPaths.length - 10} more</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {stats.brokenAliases.length > 0 && (
                    <div className="ftd-analytics-card ftd-analytics-health ftd-analytics-health-error">
                        <div className="ftd-analytics-card-header">
                            <h3>Alias Health</h3>
                        </div>
                        <div className="ftd-analytics-health-content">
                            <div className="ftd-analytics-health-score">
                                <div className="ftd-analytics-health-value ftd-analytics-health-error">
                                    {aliasHealth}%
                                </div>
                                <div className="ftd-analytics-health-label">
                                    {stats.brokenAliases.length} broken reference{stats.brokenAliases.length === 1 ? '' : 's'}
                                </div>
                            </div>
                            <div className="ftd-analytics-health-list">
                                {stats.brokenAliases.slice(0, 10).map(({ path, reference }) => (
                                    <div key={path} className="ftd-analytics-health-item">
                                        <div className="ftd-analytics-health-item-path">{path}</div>
                                        <div className="ftd-analytics-health-item-ref">{reference}</div>
                                    </div>
                                ))}
                                {stats.brokenAliases.length > 10 && (
                                    <div className="ftd-analytics-health-more">+{stats.brokenAliases.length - 10} more broken aliases</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="ftd-analytics-card ftd-analytics-types">
                    <div className="ftd-analytics-card-header">
                        <h3>Token Types</h3>
                        <div className="ftd-analytics-types-legend">
                            <span className="ftd-analytics-types-legend-item">F = Foundation</span>
                            <span className="ftd-analytics-types-legend-sep">·</span>
                            <span className="ftd-analytics-types-legend-item">S = Semantic</span>
                            <span className="ftd-analytics-types-legend-sep">·</span>
                            <span className="ftd-analytics-types-legend-item">C = Components</span>
                        </div>
                    </div>
                    <div className="ftd-analytics-types-list">
                        {sortedTypes.map(({ type, count, percentage, coverage, hasGaps }) => (
                            <div key={type} className="ftd-analytics-type-row">
                                <div className="ftd-analytics-type-info">
                                    <span className="ftd-analytics-type-name">{type}</span>
                                    <span className="ftd-analytics-type-count">{count}</span>
                                </div>
                                <div className="ftd-analytics-type-bar">
                                    <div className="ftd-analytics-type-fill" style={{ width: `${percentage}%` }} />
                                </div>
                                <span className="ftd-analytics-type-percent">{percentage}%</span>
                                <span className={`ftd-analytics-type-coverage ${hasGaps ? 'ftd-analytics-type-coverage-gap' : ''}`} title={hasGaps ? 'Only in Foundation layer' : coverage === 'none' ? 'No coverage' : 'Multi-layer coverage'}>
                                    {coverage}
                                </span>
                                {type === 'unknown' && Object.keys(stats.otherTypes).length > 0 && (
                                    <button 
                                        className="ftd-analytics-type-expand"
                                        onClick={() => setExpandedOther(!expandedOther)}
                                        title="Show unrecognized types"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedOther ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                        {expandedOther && Object.keys(stats.otherTypes).length > 0 && (
                            <div className="ftd-analytics-type-other-list">
                                {Object.entries(stats.otherTypes)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([rawType, count]) => (
                                        <div key={rawType} className="ftd-analytics-type-other-item">
                                            <span className="ftd-analytics-type-other-name">{rawType}</span>
                                            <span className="ftd-analytics-type-other-count">{count}</span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>

                {usageData && (
                    <div className="ftd-analytics-card ftd-analytics-usage">
                        <div className="ftd-analytics-card-header">
                            <h3>Token Usage</h3>
                            <div className="ftd-analytics-usage-hint">From scan command</div>
                        </div>
                        <div className="ftd-analytics-usage-info">
                            <p>To update this data, run:</p>
                            <code>npx tokvista scan ./src --tokens tokens.json --format json &gt; usage.json</code>
                        </div>
                        <div className="ftd-analytics-usage-stats">
                            <div className="ftd-analytics-usage-stat">
                                <div className="ftd-analytics-usage-stat-value">{usageData.usedTokens.length}</div>
                                <div className="ftd-analytics-usage-stat-label">Used</div>
                            </div>
                            <div className="ftd-analytics-usage-stat">
                                <div className="ftd-analytics-usage-stat-value ftd-analytics-usage-stat-unused">{usageData.unusedTokens.length}</div>
                                <div className="ftd-analytics-usage-stat-label">Unused</div>
                            </div>
                            <div className="ftd-analytics-usage-stat">
                                <div className="ftd-analytics-usage-stat-value">{Math.round((usageData.usedTokens.length / usageData.totalTokens) * 100)}%</div>
                                <div className="ftd-analytics-usage-stat-label">Adoption</div>
                            </div>
                            <div className="ftd-analytics-usage-stat">
                                <div className="ftd-analytics-usage-stat-value">{usageData.filesScanned}</div>
                                <div className="ftd-analytics-usage-stat-label">Files Scanned</div>
                            </div>
                        </div>
                        {usageData.unusedTokens.length > 0 && (
                            <div className="ftd-analytics-usage-unused">
                                <div className="ftd-analytics-usage-unused-header">Unused Tokens (safe to remove)</div>
                                <div className="ftd-analytics-usage-unused-list">
                                    {usageData.unusedTokens.slice(0, 20).map((token) => (
                                        <div key={token} className="ftd-analytics-usage-unused-item">{token}</div>
                                    ))}
                                    {usageData.unusedTokens.length > 20 && (
                                        <div className="ftd-analytics-usage-unused-more">+{usageData.unusedTokens.length - 20} more</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
