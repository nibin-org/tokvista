import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { FigmaTokens } from '../types';
import { indexTokens, searchTokens, highlightMatch, type SearchableToken, type SearchResult } from '../utils/searchUtils';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    tokens: FigmaTokens;
    onTokenClick?: (token: any) => void;
    onNavigateToTab?: (tab: 'foundation' | 'semantic' | 'components') => void;
    onScrollToToken?: (tokenName: string, category: string) => void;
}

export function SearchModal({ isOpen, onClose, tokens, onTokenClick, onNavigateToTab, onScrollToToken }: SearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Index tokens once
    const indexedTokens = useMemo(() => indexTokens(tokens), [tokens]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                const searchResults = searchTokens(query, indexedTokens);
                setResults(searchResults);
                setSelectedIndex(0);
            } else {
                setResults([]);
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [query, indexedTokens]);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && results[selectedIndex]) {
                e.preventDefault();
                handleTokenClick(results[selectedIndex].token);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current && results.length > 0) {
            // Find the selected result item by data attribute or class
            const selectedElement = resultsRef.current.querySelector('.ftd-search-result-selected') as HTMLElement;
            if (selectedElement) {
                // Scroll only the selected element into view, not the entire container
                selectedElement.scrollIntoView({
                    block: 'nearest',
                    behavior: 'auto', // Changed from 'smooth' to 'auto' for instant response
                    inline: 'nearest'
                });
            }
        }
    }, [selectedIndex, results]);

    const handleTokenClick = async (token: SearchableToken) => {
        const fullCssVar = `var(${token.cssVariable})`;

        try {
            await navigator.clipboard.writeText(fullCssVar);

            // Navigate to the appropriate tab based on token category
            if (onNavigateToTab) {
                onNavigateToTab(token.category as 'foundation' | 'semantic' | 'components');
            }

            // Scroll to and highlight the token
            if (onScrollToToken) {
                // Use setTimeout to ensure tab switch completes before scrolling
                setTimeout(() => {
                    onScrollToToken(token.name, token.category);
                }, 100);
            }

            onTokenClick?.({ value: token.value, cssVariable: token.cssVariable });
            onClose();
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    // Group results by category
    const groupedResults = results.reduce((acc, result) => {
        const key = `${result.token.category}-${result.token.type}`;
        if (!acc[key]) {
            acc[key] = {
                category: result.token.category,
                type: result.token.type,
                results: [],
            };
        }
        acc[key].results.push(result);
        return acc;
    }, {} as Record<string, { category: string; type: string; results: SearchResult[] }>);

    return (
        <div className="ftd-search-modal" onClick={handleBackdropClick}>
            <div className="ftd-search-container">
                <div className="ftd-search-header">
                    <svg className="ftd-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        className="ftd-search-input"
                        placeholder="Search tokens... (name, value, or CSS variable)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <kbd className="ftd-search-kbd">ESC</kbd>
                </div>

                <div className="ftd-search-results" ref={resultsRef}>
                    {query.trim() === '' && (
                        <div className="ftd-search-empty">
                            <p>Start typing to search across all tokens</p>
                            <div className="ftd-search-tips">
                                <span>Try: "blue", "16px", "var(--", or "radius"</span>
                            </div>
                        </div>
                    )}

                    {query.trim() !== '' && results.length === 0 && (
                        <div className="ftd-search-empty">
                            <p>No tokens found for "{query}"</p>
                            <div className="ftd-search-tips">
                                <span>Try searching by name, value, or CSS variable</span>
                            </div>
                        </div>
                    )}

                    {Object.entries(groupedResults).map(([key, group]) => (
                        <div key={key} className="ftd-search-group">
                            <div className="ftd-search-category-header">
                                {group.category.charAt(0).toUpperCase() + group.category.slice(1)} · {group.type.charAt(0).toUpperCase() + group.type.slice(1)}
                                <span className="ftd-search-count">{group.results.length}</span>
                            </div>
                            {group.results.map((result, index) => {
                                const globalIndex = results.indexOf(result);
                                const isSelected = globalIndex === selectedIndex;

                                return (
                                    <div
                                        key={result.token.id}
                                        className={`ftd-search-result-item ${isSelected ? 'ftd-search-result-selected' : ''}`}
                                        onClick={() => handleTokenClick(result.token)}
                                    >
                                        {result.token.type === 'color' && (
                                            <div
                                                className="ftd-search-result-preview"
                                                style={{ backgroundColor: result.token.preview }}
                                            />
                                        )}
                                        <div className="ftd-search-result-content">
                                            <div
                                                className="ftd-search-result-name"
                                                dangerouslySetInnerHTML={{ __html: highlightMatch(result.token.name, query) }}
                                            />
                                            <div className="ftd-search-result-meta">
                                                <span
                                                    className="ftd-search-result-value"
                                                    dangerouslySetInnerHTML={{ __html: highlightMatch(result.token.value, query) }}
                                                />
                                                <span className="ftd-search-result-separator">·</span>
                                                <span
                                                    className="ftd-search-result-css"
                                                    dangerouslySetInnerHTML={{ __html: highlightMatch(result.token.cssVariable, query) }}
                                                />
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <kbd className="ftd-search-enter-kbd">↵</kbd>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {results.length > 0 && (
                    <div className="ftd-search-footer">
                        <div className="ftd-search-footer-hint">
                            <kbd>↑</kbd><kbd>↓</kbd> Navigate
                            <kbd>↵</kbd> Copy
                            <kbd>ESC</kbd> Close
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
