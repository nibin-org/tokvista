'use client'

import { useEffect, useMemo, useState } from 'react'
import { TokenDocumentation } from 'tokvista'
import 'tokvista/styles.css'
import defaultTokens from '../../../tokens.json' // Real tokens from Figma Token Studio
import styles from './page.module.css'

type TokensPayload = Record<string, unknown>
type TrackPayload = Record<string, string | number | boolean>
type CompareSummary = { added: number; changed: number; removed: number }
type SourceContext = {
  sourceUrl: string
  sourceHost: string
  relayOrigin: string
  projectId: string
  environment: string
  historyEndpoint: string
}
type SnapshotHistoryItem = {
  id: string
  versionId: string
  commitSha: string
  commitMessage: string
  publishedAt: string
  rawUrl: string
  previewUrl: string
  referenceUrl: string
}

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void
  plausible?: (eventName: string, options?: { props?: Record<string, string> }) => void
}

const UTM_QUERY = 'utm_source=figma_plugin&utm_medium=shared_preview&utm_campaign=tokvista_install'
const INSTALL_URL = `https://www.npmjs.com/package/tokvista?${UTM_QUERY}`
const DOCS_URL = `https://github.com/nibin-org/tokvista?${UTM_QUERY}#readme`
const FIGMA_FILES_URL = 'https://www.figma.com/files/recent'
const QUICK_START_COMMANDS = [
  { id: 'npm', label: 'npm', command: 'npm i tokvista' },
  { id: 'pnpm', label: 'pnpm', command: 'pnpm add tokvista' },
  { id: 'yarn', label: 'yarn', command: 'yarn add tokvista' },
] as const
const QUICK_START_SNIPPET = [
  "import { TokenDocumentation } from 'tokvista'",
  "import 'tokvista/styles.css'",
  '',
  '<TokenDocumentation',
  '  tokens={tokensJson}',
  '  title="Design System"',
  '/>',
].join('\n')

function formatLocalTimestamp(value: string): string {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function parseSourceContext(source: string): SourceContext | null {
  try {
    const parsed = new URL(source)
    const path = parsed.pathname || ''
    const isLiveSource = /\/(api\/)?live-tokens$/i.test(path)
    if (!isLiveSource) return null
    const projectId = (parsed.searchParams.get('projectId') || '').trim()
    if (!projectId) return null
    const environment = (parsed.searchParams.get('environment') || 'dev').trim() || 'dev'
    const historyPath = path.includes('/api/') ? '/api/version-history' : '/version-history'
    const historyEndpoint = `${parsed.origin}${historyPath}?projectId=${encodeURIComponent(projectId)}&environment=${encodeURIComponent(environment)}&limit=15`
    return {
      sourceUrl: parsed.toString(),
      sourceHost: parsed.host,
      relayOrigin: parsed.origin,
      projectId,
      environment,
      historyEndpoint,
    }
  } catch {
    return null
  }
}

function getComparableRoot(payload: TokensPayload): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
  const maybeTokens = (payload as Record<string, unknown>).tokens
  if (maybeTokens && typeof maybeTokens === 'object' && !Array.isArray(maybeTokens)) {
    return maybeTokens
  }
  return payload
}

function flattenTokenLeaves(input: unknown, path: string[] = [], out: Map<string, string> = new Map()): Map<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return out
  }
  const record = input as Record<string, unknown>
  const hasLeafShape = typeof record.type === 'string' && Object.prototype.hasOwnProperty.call(record, 'value')
  if (hasLeafShape) {
    const key = path.join('.')
    if (key) {
      const value = JSON.stringify(record.value)
      out.set(key, `${record.type}:${value}`)
    }
    return out
  }
  Object.entries(record).forEach(([key, value]) => {
    flattenTokenLeaves(value, [...path, key], out)
  })
  return out
}

function buildCompareSummary(currentPayload: TokensPayload, selectedPayload: TokensPayload): CompareSummary {
  const currentMap = flattenTokenLeaves(getComparableRoot(currentPayload))
  const selectedMap = flattenTokenLeaves(getComparableRoot(selectedPayload))
  let added = 0
  let changed = 0
  let removed = 0

  currentMap.forEach((value, key) => {
    if (!selectedMap.has(key)) {
      added += 1
      return
    }
    if (selectedMap.get(key) !== value) {
      changed += 1
    }
  })

  selectedMap.forEach((_value, key) => {
    if (!currentMap.has(key)) {
      removed += 1
    }
  })

  return { added, changed, removed }
}

function normalizeHistoryItems(items: unknown): SnapshotHistoryItem[] {
  if (!Array.isArray(items)) return []
  return items
    .map((item, index) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null
      if (!record) return null
      const commitSha = typeof record.commitSha === 'string' ? record.commitSha : ''
      const versionId =
        typeof record.versionId === 'string' && record.versionId.trim()
          ? record.versionId.trim()
          : commitSha
            ? `c${commitSha.slice(0, 7)}`
            : `snapshot-${index + 1}`
      const id = typeof record.id === 'string' && record.id ? record.id : `${versionId}-${index}`
      return {
        id,
        versionId,
        commitSha,
        commitMessage: typeof record.commitMessage === 'string' ? record.commitMessage : '',
        publishedAt: typeof record.publishedAt === 'string' ? record.publishedAt : '',
        rawUrl: typeof record.rawUrl === 'string' ? record.rawUrl : '',
        previewUrl: typeof record.previewUrl === 'string' ? record.previewUrl : '',
        referenceUrl: typeof record.referenceUrl === 'string' ? record.referenceUrl : '',
      }
    })
    .filter((item): item is SnapshotHistoryItem => Boolean(item))
}

function buildLocalPreviewUrl(rawUrl: string): string {
  if (typeof window === 'undefined') return ''
  const base = `${window.location.origin}/`
  return `${base}?source=${encodeURIComponent(rawUrl)}`
}

function normalizeHttpUrl(value: string): string {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    if (!/^https?:$/i.test(parsed.protocol)) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

function getRestorableUrl(item: SnapshotHistoryItem | null): string {
  if (!item) return ''
  const rawUrl = normalizeHttpUrl(item.rawUrl)
  if (rawUrl) return rawUrl
  const previewUrl = normalizeHttpUrl(item.previewUrl)
  if (!previewUrl) return ''
  try {
    const parsed = new URL(previewUrl)
    const source = normalizeHttpUrl(parsed.searchParams.get('source') || '')
    if (source) return source
    return previewUrl.toLowerCase().includes('/tokens.json') ? previewUrl : ''
  } catch {
    return ''
  }
}

function trackEvent(eventName: string, payload: TrackPayload = {}) {
  if (typeof window === 'undefined') return
  const analyticsWindow = window as AnalyticsWindow
  if (typeof analyticsWindow.gtag === 'function') {
    analyticsWindow.gtag('event', eventName, payload)
  }
  if (typeof analyticsWindow.plausible === 'function') {
    const props: Record<string, string> = {}
    Object.entries(payload).forEach(([key, value]) => {
      props[key] = String(value)
    })
    analyticsWindow.plausible(eventName, { props })
  }
}

function decodeBase64UrlUtf8(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function getInlineTokensFromHash(): TokensPayload | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash || ''
  if (!hash.startsWith('#')) return null
  const params = new URLSearchParams(hash.slice(1))
  const encoded = params.get('data') || ''
  if (!encoded) return null
  try {
    const decoded = decodeBase64UrlUtf8(encoded)
    const parsed = JSON.parse(decoded)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as TokensPayload
  } catch {
    return null
  }
}

function getSourceFromQuery(): string {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search)
  const source = params.get('source') || ''
  if (!source) return ''
  try {
    const parsed = new URL(source)
    if (!/^https?:$/i.test(parsed.protocol)) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

function withCacheBust(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('__tokvista_ts', String(Date.now()))
    return parsed.toString()
  } catch {
    return url
  }
}

export default function Home() {
  const [tokens, setTokens] = useState<TokensPayload>(defaultTokens as TokensPayload)
  const [subtitle, setSubtitle] = useState(
    `Real tokens from Figma Token Studio - Version ${process.env.NEXT_PUBLIC_PACKAGE_VERSION}`
  )
  const [loadError, setLoadError] = useState('')
  const [isSharedPreview, setIsSharedPreview] = useState(false)
  const [sharedSourceLabel, setSharedSourceLabel] = useState('')
  const [sourceContext, setSourceContext] = useState<SourceContext | null>(null)
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false)
  const [isAdvancedInfoOpen, setIsAdvancedInfoOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historyItems, setHistoryItems] = useState<SnapshotHistoryItem[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState('')
  const [selectedSnapshotTokens, setSelectedSnapshotTokens] = useState<TokensPayload | null>(null)
  const [historyCompare, setHistoryCompare] = useState<CompareSummary>({ added: 0, changed: 0, removed: 0 })
  const [historyStatus, setHistoryStatus] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const hasInstallIntent = isSharedPreview
  const selectedHistoryItem = useMemo(
    () => historyItems.find((item) => item.id === selectedHistoryId) || null,
    [historyItems, selectedHistoryId]
  )
  const selectedHistoryRestoreUrl = useMemo(() => getRestorableUrl(selectedHistoryItem), [selectedHistoryItem])
  const historyAvailable = Boolean(sourceContext?.historyEndpoint)
  const installIntentLabel = useMemo(
    () => (sharedSourceLabel ? sharedSourceLabel.toLowerCase().replace(/\s+/g, '-') : 'shared-preview'),
    [sharedSourceLabel]
  )

  useEffect(() => {
    let disposed = false
    const inlineTokens = getInlineTokensFromHash()
    if (inlineTokens) {
      setTokens(inlineTokens)
      setSubtitle('Shared preview from Figma plugin')
      setSharedSourceLabel('Figma plugin')
      setSourceContext(null)
      setIsSharedPreview(true)
      setLoadError('')
      return
    }

    const source = getSourceFromQuery()
    if (!source) return

    async function loadFromSource() {
      try {
        const response = await fetch(withCacheBust(source), { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Failed to load preview tokens (${response.status})`)
        }
        const parsed = await response.json()
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Preview source returned invalid token JSON')
        }
        if (disposed) return
        setTokens(parsed as TokensPayload)
        const parsedSource = new URL(source)
        const host = parsedSource.host
        setSourceContext(parseSourceContext(parsedSource.toString()))
        setSubtitle(`Shared preview from ${host}`)
        setSharedSourceLabel(host)
        setIsSharedPreview(true)
        setLoadError('')
      } catch (error) {
        if (disposed) return
        const message = error instanceof Error ? error.message : String(error)
        setLoadError(message)
      }
    }

    void loadFromSource()
    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    if (!isQuickStartOpen && !isAdvancedInfoOpen && !isHistoryOpen) return
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsQuickStartOpen(false)
        setIsAdvancedInfoOpen(false)
        setIsHistoryOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isQuickStartOpen, isAdvancedInfoOpen, isHistoryOpen])

  useEffect(() => {
    if (!copiedId) return
    const timeout = window.setTimeout(() => setCopiedId(''), 1800)
    return () => window.clearTimeout(timeout)
  }, [copiedId])

  useEffect(() => {
    if (!selectedSnapshotTokens) return
    setHistoryCompare(buildCompareSummary(tokens, selectedSnapshotTokens))
  }, [tokens, selectedSnapshotTokens])

  async function loadSnapshotVersion(item: SnapshotHistoryItem) {
    setSelectedHistoryId(item.id)
    setHistoryStatus('')
    const targetRawUrl = item.rawUrl
    if (!targetRawUrl) {
      setSelectedSnapshotTokens(null)
      setHistoryCompare({ added: 0, changed: 0, removed: 0 })
      setHistoryStatus('Selected snapshot has no raw token URL.')
      return
    }
    try {
      const response = await fetch(withCacheBust(targetRawUrl), { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`Snapshot load failed (${response.status})`)
      }
      const parsed = await response.json()
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Snapshot payload is invalid.')
      }
      const nextSnapshot = parsed as TokensPayload
      setSelectedSnapshotTokens(nextSnapshot)
      setHistoryCompare(buildCompareSummary(tokens, nextSnapshot))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSelectedSnapshotTokens(null)
      setHistoryCompare({ added: 0, changed: 0, removed: 0 })
      setHistoryStatus(message)
    }
  }

  async function loadSnapshotHistory(force = false) {
    const historyEndpoint = sourceContext?.historyEndpoint
    if (!historyEndpoint) {
      setHistoryError('Snapshot history is available only for live relay links.')
      return
    }
    if (historyLoading && !force) return
    setHistoryLoading(true)
    setHistoryError('')
    setHistoryStatus('')
    try {
      const response = await fetch(withCacheBust(historyEndpoint), { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`History request failed (${response.status})`)
      }
      const payload = await response.json()
      const items = normalizeHistoryItems((payload as { items?: unknown }).items)
      setHistoryItems(items)
      if (!items.length) {
        setSelectedHistoryId('')
        setSelectedSnapshotTokens(null)
        setHistoryCompare({ added: 0, changed: 0, removed: 0 })
        setHistoryStatus('No snapshot history available yet.')
        return
      }
      const selected = items.find((item) => item.id === selectedHistoryId) || items[0]
      await loadSnapshotVersion(selected)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setHistoryError(message)
    } finally {
      setHistoryLoading(false)
    }
  }

  async function copyText(text: string, id: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', 'true')
        textarea.className = styles.clipboardHelper
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      trackEvent('tokvista_quickstart_copy', { type: id, source: installIntentLabel })
    } catch {
      setCopiedId('')
    }
  }

  function handleInstallClick() {
    trackEvent('tokvista_install_click', { source: installIntentLabel })
  }

  function handleDocsClick() {
    trackEvent('tokvista_docs_click', { source: installIntentLabel })
  }

  function openQuickStart(origin: 'header' | 'advanced_info' | 'sandbox_lock') {
    setIsAdvancedInfoOpen(false)
    setIsHistoryOpen(false)
    setIsQuickStartOpen(true)
    trackEvent('tokvista_quickstart_open', { origin, source: installIntentLabel })
  }

  function toggleAdvancedInfo() {
    setIsHistoryOpen(false)
    setIsAdvancedInfoOpen((prev) => {
      const next = !prev
      if (next) {
        trackEvent('tokvista_advanced_export_info_open', { source: installIntentLabel })
      }
      return next
    })
  }

  function openHistoryPanel() {
    setIsAdvancedInfoOpen(false)
    setIsQuickStartOpen(false)
    setIsHistoryOpen(true)
    trackEvent('tokvista_snapshot_history_open', { source: installIntentLabel })
    if (!historyItems.length || historyError) {
      void loadSnapshotHistory(true)
    }
  }

  function openOldSnapshot() {
    if (!selectedHistoryItem) return
    const targetUrl =
      selectedHistoryItem.previewUrl ||
      (selectedHistoryItem.rawUrl ? buildLocalPreviewUrl(selectedHistoryItem.rawUrl) : '')
    if (!targetUrl) {
      setHistoryStatus('Selected snapshot has no preview URL.')
      return
    }
    trackEvent('tokvista_snapshot_open_old', { source: installIntentLabel, version: selectedHistoryItem.versionId })
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  async function restoreInFigma() {
    if (!selectedHistoryItem) return
    const restoreUrl = selectedHistoryRestoreUrl
    if (!restoreUrl) {
      setHistoryStatus('Selected snapshot has no restorable URL.')
      return
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(restoreUrl)
      }
    } catch {
      // Ignore clipboard failure, still open Figma.
    }
    setHistoryStatus(
      'Snapshot URL copied. In Figma run Tokvista from Plugins > Development, then Import tab > Import from URL.'
    )
    trackEvent('tokvista_snapshot_restore_figma', {
      source: installIntentLabel,
      version: selectedHistoryItem.versionId,
    })
    window.open(FIGMA_FILES_URL, '_blank', 'noopener,noreferrer')
  }

  async function copyRestoreUrl() {
    if (!selectedHistoryRestoreUrl) {
      setHistoryStatus('No restorable URL available for this snapshot.')
      return
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedHistoryRestoreUrl)
      }
      setHistoryStatus('Snapshot URL copied. Paste it into Tokvista plugin > Import > Import from URL.')
    } catch {
      setHistoryStatus('Could not copy URL. Copy it manually from the field below.')
    }
  }

  return (
    <main>
      {loadError ? (
        <aside className={styles.errorBanner} role="alert">
          Preview link failed: {loadError}. Showing bundled tokens instead.
        </aside>
      ) : null}
      <TokenDocumentation
        tokens={tokens}
        title="Tokvista Demo"
        subtitle={subtitle}
        playgroundLock={
          hasInstallIntent
            ? {
                enabled: true,
                title: 'Interactive Sandbox is locked in shared preview',
                description:
                  'Use shared preview for review. Install tokvista in your app to unlock full sandbox editing and export workflow.',
                actionLabel: 'Open Quick Start',
                onAction: () => openQuickStart('sandbox_lock'),
              }
            : undefined
        }
        onTokenClick={(token) => {
          console.log('Token clicked:', token)
        }}
      />
      {hasInstallIntent ? (
        <>
          <aside className={styles.sharedHeaderNotice} role="note" aria-label="Shared preview notice">
            <div className={styles.sharedHeaderTitle}>Preview Only</div>
            <div className={styles.sharedHeaderBody}>
              {sharedSourceLabel || 'shared source'} - use tokvista package for production
            </div>
            <div className={styles.sharedHeaderActions}>
              <a
                href={INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionPrimary}`}
                onClick={handleInstallClick}
              >
                Install tokvista
              </a>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                onClick={handleDocsClick}
              >
                Docs
              </a>
              <button
                type="button"
                title={
                  historyAvailable
                    ? 'Open snapshot history and compare versions'
                    : 'Snapshot history is available only for live relay links'
                }
                disabled={!historyAvailable}
                className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary} ${!historyAvailable ? styles.sharedHeaderActionDisabled : ''}`}
                onClick={openHistoryPanel}
              >
                Snapshot History
              </button>
              <button
                type="button"
                className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                onClick={() => openQuickStart('header')}
              >
                Quick Start
              </button>
              <button
                type="button"
                title="Advanced export is available after installing tokvista in your project."
                aria-expanded={isAdvancedInfoOpen}
                className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionDisabled}`}
                onClick={toggleAdvancedInfo}
              >
                Advanced Export
              </button>
            </div>
          </aside>
          {isAdvancedInfoOpen ? (
            <aside className={styles.advancedInfoPanel} role="dialog" aria-label="Advanced export info">
              <header className={styles.advancedInfoHeader}>
                <h3 className={styles.advancedInfoTitle}>Advanced Export</h3>
                <button
                  type="button"
                  className={styles.advancedInfoClose}
                  aria-label="Close advanced export info"
                  onClick={() => setIsAdvancedInfoOpen(false)}
                >
                  x
                </button>
              </header>
              <p className={styles.advancedInfoText}>
                Shared preview keeps export simple for review. Install tokvista in your project to unlock
                advanced export flow for development.
              </p>
              <ul className={styles.advancedInfoList}>
                <li>Typed export helpers</li>
                <li>Integration-ready code snippets</li>
                <li>App-level workflow with your build setup</li>
              </ul>
              <div className={styles.advancedInfoActions}>
                <button
                  type="button"
                  className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                  onClick={() => openQuickStart('advanced_info')}
                >
                  Open Quick Start
                </button>
                <a
                  href={INSTALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionPrimary}`}
                  onClick={handleInstallClick}
                >
                  Install tokvista
                </a>
              </div>
            </aside>
          ) : null}
          {isHistoryOpen ? (
            <aside className={styles.historyPanel} role="dialog" aria-label="Snapshot history">
              <header className={styles.historyPanelHeader}>
                <div>
                  <h3 className={styles.historyPanelTitle}>Snapshot History</h3>
                  <p className={styles.historyPanelMeta}>
                    {sourceContext?.projectId || 'Unknown project'} · {sourceContext?.environment || 'dev'}
                  </p>
                </div>
                <div className={styles.historyPanelActions}>
                  <button
                    type="button"
                    className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                    onClick={() => void loadSnapshotHistory(true)}
                    disabled={historyLoading}
                  >
                    {historyLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                    onClick={() => setIsHistoryOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </header>

              {historyError ? <div className={styles.historyError}>{historyError}</div> : null}
              {historyStatus ? <div className={styles.historyStatus}>{historyStatus}</div> : null}

              <div className={styles.historyLayout}>
                <div className={styles.historyList}>
                  {!historyItems.length && !historyLoading ? (
                    <div className={styles.historyEmpty}>No versions found yet.</div>
                  ) : null}
                  {historyItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`${styles.historyItem} ${item.id === selectedHistoryId ? styles.historyItemActive : ''}`}
                      onClick={() => void loadSnapshotVersion(item)}
                    >
                      <div className={styles.historyItemHead}>
                        <span className={styles.historyItemVersion}>{item.versionId}</span>
                        <span className={styles.historyItemTime}>{formatLocalTimestamp(item.publishedAt)}</span>
                      </div>
                      <div className={styles.historyItemMessage}>{item.commitMessage || 'No commit message'}</div>
                    </button>
                  ))}
                </div>

                <div className={styles.historyDetail}>
                  {selectedHistoryItem ? (
                    <>
                      <div className={styles.historyCompareTitle}>Current vs Selected Snapshot</div>
                      <div className={styles.historyComparePills}>
                        <span className={`${styles.historyComparePill} ${styles.historyCompareAdded}`}>
                          +{historyCompare.added} Added
                        </span>
                        <span className={`${styles.historyComparePill} ${styles.historyCompareChanged}`}>
                          ~{historyCompare.changed} Changed
                        </span>
                        <span className={`${styles.historyComparePill} ${styles.historyCompareRemoved}`}>
                          -{historyCompare.removed} Removed
                        </span>
                      </div>
                      <div className={styles.historyDetailLinks}>
                        <button
                          type="button"
                          className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                          onClick={openOldSnapshot}
                        >
                          Open old snapshot
                        </button>
                        <button
                          type="button"
                          className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionPrimary}`}
                          onClick={() => void restoreInFigma()}
                        >
                          Restore in Figma
                        </button>
                        {selectedHistoryItem.referenceUrl ? (
                          <a
                            href={selectedHistoryItem.referenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                          >
                            Open commit
                          </a>
                        ) : null}
                      </div>
                      {selectedHistoryRestoreUrl ? (
                        <div className={styles.historyRestoreBox}>
                          <div className={styles.historyRestoreLabel}>Restore URL (paste in plugin Import from URL)</div>
                          <div className={styles.historyRestoreRow}>
                            <input
                              type="text"
                              readOnly
                              value={selectedHistoryRestoreUrl}
                              className={styles.historyRestoreInput}
                              aria-label="Restorable snapshot URL"
                            />
                            <button
                              type="button"
                              className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                              onClick={() => void copyRestoreUrl()}
                            >
                              Copy URL
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.historyRestoreMissing}>This snapshot has no raw tokens URL to restore.</div>
                      )}
                    </>
                  ) : (
                    <div className={styles.historyEmpty}>Select a snapshot version to compare.</div>
                  )}
                </div>
              </div>
            </aside>
          ) : null}
        </>
      ) : null}
      {isQuickStartOpen ? (
        <div
          className={styles.quickStartBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Tokvista quick start"
          onClick={() => setIsQuickStartOpen(false)}
        >
          <section className={styles.quickStartModal} onClick={(event) => event.stopPropagation()}>
            <header className={styles.quickStartHeader}>
              <div>
                <h2 className={styles.quickStartTitle}>Start in your project</h2>
                <p className={styles.quickStartSubtitle}>
                  Preview is for review. Install tokvista to unlock full developer workflow.
                </p>
              </div>
              <button
                type="button"
                className={styles.quickStartClose}
                onClick={() => setIsQuickStartOpen(false)}
                aria-label="Close quick start"
              >
                x
              </button>
            </header>

            <div className={styles.quickStartSection}>
              <div className={styles.quickStartLabel}>Install</div>
              <div className={styles.quickStartGrid}>
                {QUICK_START_COMMANDS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={styles.quickStartCommand}
                    onClick={() => copyText(item.command, item.id)}
                  >
                    <span>{item.label}</span>
                    <code>{item.command}</code>
                    <strong>{copiedId === item.id ? 'Copied' : 'Copy'}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.quickStartSection}>
              <div className={styles.quickStartLabel}>Starter snippet</div>
              <button
                type="button"
                className={styles.quickStartSnippet}
                onClick={() => copyText(QUICK_START_SNIPPET, 'snippet')}
              >
                <pre>{QUICK_START_SNIPPET}</pre>
                <strong>{copiedId === 'snippet' ? 'Copied' : 'Copy snippet'}</strong>
              </button>
            </div>

            <div className={styles.quickStartFooter}>
              <a
                href={INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionPrimary}`}
                onClick={handleInstallClick}
              >
                Install tokvista
              </a>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                onClick={handleDocsClick}
              >
                View docs
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
