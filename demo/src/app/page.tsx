'use client'

import { useEffect, useMemo, useState } from 'react'
import { TokenDocumentation } from 'tokvista'
import 'tokvista/styles.css'
import defaultTokens from '../../../tokens.json' // Real tokens from Figma Token Studio
import styles from './page.module.css'

type TokensPayload = Record<string, unknown>
type TrackPayload = Record<string, string | number | boolean>
type CompareSummary = { added: number; changed: number; removed: number }
type TokenLeaf = { type: string; value: unknown }
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
const SNAPSHOT_ONBOARDING_KEY = 'tokvista_snapshot_history_hint_dismissed'
const SNAPSHOT_COPY_VARIANT_KEY = 'tokvista_snapshot_copy_variant'
const SNAPSHOT_PM_KEY = 'tokvista_preferred_pm'
const SNAPSHOT_METRICS_KEY = 'tokvista_snapshot_metrics_v1'
const SNAPSHOT_UNLOCKED_ITEMS = 3
const SNAPSHOT_TEASER_DIFF_LIMIT = 5
const SNAPSHOT_FULL_DIFF_LIMIT = 15
const SNAPSHOT_HISTORY_RENDER_CAP = 120
const SNAPSHOT_COMPARE_RANGE_DISABLED_MESSAGE = 'Compare range unlocks after installing tokvista in your project.'

type PackageManagerId = (typeof QUICK_START_COMMANDS)[number]['id']
type ConversionVariant = 'a' | 'b'
type SnapshotMetricId =
  | 'history_open'
  | 'locked_item_click'
  | 'unlock_cta_click'
  | 'install_command_copy'
  | 'quickstart_copy'
  | 'install_click'
type SnapshotMetrics = Record<SnapshotMetricId, number>

const SNAPSHOT_METRIC_LABELS: Array<{ id: SnapshotMetricId; label: string }> = [
  { id: 'history_open', label: 'History Opens' },
  { id: 'locked_item_click', label: 'Locked Item Clicks' },
  { id: 'unlock_cta_click', label: 'Unlock CTA Clicks' },
  { id: 'install_command_copy', label: 'Install Cmd Copies' },
  { id: 'quickstart_copy', label: 'Quick Start Copies' },
  { id: 'install_click', label: 'Install Link Clicks' },
]

function createEmptySnapshotMetrics(): SnapshotMetrics {
  return {
    history_open: 0,
    locked_item_click: 0,
    unlock_cta_click: 0,
    install_command_copy: 0,
    quickstart_copy: 0,
    install_click: 0,
  }
}

function readSnapshotMetrics(): SnapshotMetrics {
  if (typeof window === 'undefined') return createEmptySnapshotMetrics()
  const fallback = createEmptySnapshotMetrics()
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_METRICS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<SnapshotMetrics>
    return {
      history_open: Number(parsed.history_open || 0),
      locked_item_click: Number(parsed.locked_item_click || 0),
      unlock_cta_click: Number(parsed.unlock_cta_click || 0),
      install_command_copy: Number(parsed.install_command_copy || 0),
      quickstart_copy: Number(parsed.quickstart_copy || 0),
      install_click: Number(parsed.install_click || 0),
    }
  } catch {
    return fallback
  }
}

function writeSnapshotMetrics(metrics: SnapshotMetrics) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SNAPSHOT_METRICS_KEY, JSON.stringify(metrics))
}

function getPackageManagerFromQuery(): PackageManagerId | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const pm = (params.get('pm') || '').trim().toLowerCase()
  return pm === 'npm' || pm === 'pnpm' || pm === 'yarn' ? pm : null
}

function getPreferredPackageManager(): PackageManagerId {
  const fromQuery = getPackageManagerFromQuery()
  if (fromQuery) return fromQuery
  if (typeof window !== 'undefined') {
    const fromStorage = (window.localStorage.getItem(SNAPSHOT_PM_KEY) || '').trim().toLowerCase()
    if (fromStorage === 'npm' || fromStorage === 'pnpm' || fromStorage === 'yarn') return fromStorage
  }
  return 'npm'
}

function getPreferredInstallCommand(pm: PackageManagerId): string {
  return QUICK_START_COMMANDS.find((item) => item.id === pm)?.command || QUICK_START_COMMANDS[0].command
}

function getConversionVariant(): ConversionVariant {
  if (typeof window === 'undefined') return 'a'
  const stored = (window.localStorage.getItem(SNAPSHOT_COPY_VARIANT_KEY) || '').trim().toLowerCase()
  if (stored === 'a' || stored === 'b') return stored
  const nextVariant: ConversionVariant = Math.random() < 0.5 ? 'a' : 'b'
  window.localStorage.setItem(SNAPSHOT_COPY_VARIANT_KEY, nextVariant)
  return nextVariant
}

function getLockContent(variant: ConversionVariant): { message: string; cta: string } {
  if (variant === 'b') {
    return {
      message: 'Preview is intentionally restricted. Install tokvista to unlock complete snapshot timelines and clear value diffs.',
      cta: 'Install To Unlock All',
    }
  }
  return {
    message: 'You are seeing only a teaser: 3 snapshots, masked old values, and locked restore actions. Install for full access.',
    cta: 'Get Full Snapshot Access',
  }
}

function groupKeyFromTokenPath(path: string): string {
  const parts = path.split('.')
  if (parts.length <= 2) return path
  return parts.slice(0, 3).join('.')
}

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
    if (isLiveSource) {
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
    }
    
    if (parsed.host === 'raw.githubusercontent.com') {
      const parts = path.split('/').filter(Boolean)
      if (parts.length >= 4) {
        const [owner, repo, branch, ...filePath] = parts
        const file = filePath.join('/')
        const projectId = `${owner}/${repo}`
        const historyEndpoint = `https://api.github.com/repos/${owner}/${repo}/commits?path=${file}&sha=${branch}&per_page=15`
        return {
          sourceUrl: parsed.toString(),
          sourceHost: 'github.com',
          relayOrigin: `https://github.com/${owner}/${repo}`,
          projectId,
          environment: branch,
          historyEndpoint,
        }
      }
    }
    
    return null
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

function flattenTokenLeaves(input: unknown, path: string[] = [], out: Map<string, TokenLeaf> = new Map()): Map<string, TokenLeaf> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return out
  }
  const record = input as Record<string, unknown>
  const hasLeafShape = typeof record.type === 'string' && Object.prototype.hasOwnProperty.call(record, 'value')
  if (hasLeafShape) {
    const key = path.join('.')
    if (key) {
      out.set(key, { type: record.type as string, value: record.value })
    }
    return out
  }
  Object.entries(record).forEach(([key, value]) => {
    flattenTokenLeaves(value, [...path, key], out)
  })
  return out
}

function serializeLeaf(leaf: TokenLeaf): string {
  return `${leaf.type}:${JSON.stringify(leaf.value)}`
}

function getAliasTarget(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^\{([^{}]+)\}$/)
  return match?.[1]?.trim() || null
}

function normalizeAliasCandidates(alias: string): string[] {
  const trimmed = alias.trim()
  if (!trimmed) return []
  return [trimmed, trimmed.replace(/\//g, '.'), trimmed.replace(/\./g, '/')].filter(
    (candidate, index, list) => candidate && list.indexOf(candidate) === index
  )
}

function resolveTokenValue(value: unknown, tokensByPath: Map<string, TokenLeaf>, visited: Set<string> = new Set()): unknown {
  const alias = getAliasTarget(value)
  if (!alias) return value
  const candidates = normalizeAliasCandidates(alias)
  for (const candidate of candidates) {
    if (visited.has(candidate)) return value
    const target = tokensByPath.get(candidate)
    if (!target) continue
    visited.add(candidate)
    return resolveTokenValue(target.value, tokensByPath, visited)
  }
  return value
}

function formatTokenValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
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
    const selectedValue = selectedMap.get(key)
    if (!selectedValue || serializeLeaf(selectedValue) !== serializeLeaf(value)) {
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

function normalizeHistoryItems(items: unknown, sourceUrl?: string): SnapshotHistoryItem[] {
  if (!Array.isArray(items)) return []
  
  const isGitHub = sourceUrl?.includes('raw.githubusercontent.com')
  
  return items
    .map((item, index) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null
      if (!record) return null
      
      if (isGitHub) {
        const sha = typeof record.sha === 'string' ? record.sha : ''
        const commit = record.commit && typeof record.commit === 'object' ? (record.commit as Record<string, unknown>) : null
        const message = commit && typeof commit.message === 'string' ? commit.message : ''
        const author = commit && commit.author && typeof commit.author === 'object' ? (commit.author as Record<string, unknown>) : null
        const date = author && typeof author.date === 'string' ? author.date : ''
        const htmlUrl = typeof record.html_url === 'string' ? record.html_url : ''
        
        let rawUrl = ''
        if (sourceUrl && sha) {
          const parsed = new URL(sourceUrl)
          const parts = parsed.pathname.split('/')
          if (parts.length >= 4) {
            parts[3] = sha
            rawUrl = `${parsed.origin}${parts.join('/')}`
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
        }
      }
      
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
  const [preferredPm, setPreferredPm] = useState<PackageManagerId>('npm')
  const [conversionVariant, setConversionVariant] = useState<ConversionVariant>('a')
  const [isHistoryHintDismissed, setIsHistoryHintDismissed] = useState(false)
  const [snapshotMetrics, setSnapshotMetrics] = useState<SnapshotMetrics>(createEmptySnapshotMetrics())
  const hasInstallIntent = isSharedPreview
  const snapshotActionsLocked = hasInstallIntent
  const lockContent = useMemo(() => getLockContent(conversionVariant), [conversionVariant])
  const preferredInstallCommand = useMemo(() => getPreferredInstallCommand(preferredPm), [preferredPm])
  const quickStartCommandsOrdered = useMemo(() => {
    const preferred = QUICK_START_COMMANDS.find((item) => item.id === preferredPm)
    const rest = QUICK_START_COMMANDS.filter((item) => item.id !== preferredPm)
    return preferred ? [preferred, ...rest] : QUICK_START_COMMANDS
  }, [preferredPm])
  const renderedHistoryItems = useMemo(() => historyItems.slice(0, SNAPSHOT_HISTORY_RENDER_CAP), [historyItems])
  const fallbackSourceContext = useMemo(() => {
    const source = getSourceFromQuery()
    if (!source) return null
    return parseSourceContext(source)
  }, [])
  const effectiveSourceContext = sourceContext || fallbackSourceContext
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
    setPreferredPm(getPreferredPackageManager())
    setConversionVariant(getConversionVariant())
    if (typeof window === 'undefined') return
    setIsHistoryHintDismissed(window.localStorage.getItem(SNAPSHOT_ONBOARDING_KEY) === '1')
    setSnapshotMetrics(readSnapshotMetrics())
  }, [])

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
      const items = normalizeHistoryItems(
        sourceContext?.sourceHost === 'github.com' ? payload : (payload as { items?: unknown }).items,
        sourceContext?.sourceUrl
      )
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

  function bumpSnapshotMetric(metricId: SnapshotMetricId) {
    setSnapshotMetrics((prev) => {
      const next = { ...prev, [metricId]: prev[metricId] + 1 }
      writeSnapshotMetrics(next)
      return next
    })
  }

  function resetSnapshotMetrics() {
    const next = createEmptySnapshotMetrics()
    setSnapshotMetrics(next)
    writeSnapshotMetrics(next)
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
      if (id === 'npm' || id === 'pnpm' || id === 'yarn') {
        setPreferredPm(id)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SNAPSHOT_PM_KEY, id)
        }
      }
      bumpSnapshotMetric('quickstart_copy')
      trackEvent('tokvista_quickstart_copy', { type: id, source: installIntentLabel })
    } catch {
      setCopiedId('')
    }
  }

  function handleInstallClick() {
    bumpSnapshotMetric('install_click')
    trackEvent('tokvista_install_click', { source: installIntentLabel })
  }

  function handleDocsClick() {
    trackEvent('tokvista_docs_click', { source: installIntentLabel })
  }

  function openQuickStart(origin: 'header' | 'advanced_info' | 'sandbox_lock' | 'snapshot_history_lock' | 'history_hint') {
    setIsAdvancedInfoOpen(false)
    setIsHistoryOpen(false)
    setIsQuickStartOpen(true)
    trackEvent('tokvista_quickstart_open', { origin, source: installIntentLabel })
  }

  function dismissHistoryHint() {
    setIsHistoryHintDismissed(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SNAPSHOT_ONBOARDING_KEY, '1')
    }
    trackEvent('tokvista_snapshot_hint_dismiss', { source: installIntentLabel })
  }

  async function copyPreferredInstallCommand() {
    await copyText(preferredInstallCommand, preferredPm)
    bumpSnapshotMetric('install_command_copy')
    trackEvent('tokvista_snapshot_install_command_copy', { source: installIntentLabel, pm: preferredPm })
  }

  function refreshAfterInstall() {
    trackEvent('tokvista_snapshot_install_refresh', { source: installIntentLabel })
    window.location.reload()
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
    bumpSnapshotMetric('history_open')
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

  function renderVisualDiff(currentTokens: TokensPayload, oldTokens: TokensPayload) {
    const currentMap = flattenTokenLeaves(getComparableRoot(currentTokens))
    const oldMap = flattenTokenLeaves(getComparableRoot(oldTokens))
    const changes: Array<{
      name: string
      type: string
      oldValue: string
      newValue: string
      changeType: 'added' | 'changed' | 'removed'
      group: string
    }> = []

    currentMap.forEach((value, key) => {
      if (!oldMap.has(key)) {
        const resolvedNew = resolveTokenValue(value.value, currentMap)
        changes.push({
          name: key,
          type: value.type,
          oldValue: '',
          newValue: formatTokenValue(resolvedNew),
          changeType: 'added',
          group: groupKeyFromTokenPath(key),
        })
      } else {
        const oldLeaf = oldMap.get(key)
        if (oldLeaf && serializeLeaf(oldLeaf) !== serializeLeaf(value)) {
          const resolvedOld = resolveTokenValue(oldLeaf.value, oldMap)
          const resolvedNew = resolveTokenValue(value.value, currentMap)
          changes.push({
            name: key,
            type: value.type,
            oldValue: formatTokenValue(resolvedOld),
            newValue: formatTokenValue(resolvedNew),
            changeType: 'changed',
            group: groupKeyFromTokenPath(key),
          })
        }
      }
    })

    oldMap.forEach((value, key) => {
      if (!currentMap.has(key)) {
        const resolvedOld = resolveTokenValue(value.value, oldMap)
        changes.push({
          name: key,
          type: value.type,
          oldValue: formatTokenValue(resolvedOld),
          newValue: '',
          changeType: 'removed',
          group: groupKeyFromTokenPath(key),
        })
      }
    })

    const orderedChanges = [...changes].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
    const visibleCount = snapshotActionsLocked ? SNAPSHOT_TEASER_DIFF_LIMIT : SNAPSHOT_FULL_DIFF_LIMIT
    const limitedChanges = orderedChanges.slice(0, visibleCount)
    const hiddenCount = Math.max(orderedChanges.length - limitedChanges.length, 0)

    const groups = limitedChanges.reduce((acc, change) => {
      if (!acc[change.group]) acc[change.group] = []
      acc[change.group].push(change)
      return acc
    }, {} as Record<string, typeof limitedChanges>)

    return (
      <div className={styles.visualDiffSection}>
        <div className={styles.visualDiffTitle}>Visual Comparison ({orderedChanges.length} changes)</div>
        <div className={styles.visualDiffGrid}>
          {limitedChanges.length === 0 ? (
            <div className={styles.diffEmpty}>No visual changes detected</div>
          ) : (
            Object.entries(groups).map(([groupName, groupItems]) => (
              <section key={groupName} className={styles.diffGroup}>
                <div className={styles.diffGroupTitle}>{groupName}</div>
                {groupItems.map((change, idx) => (
                  <div
                    key={`${change.name}-${idx}`}
                    className={`${styles.diffCard} ${
                      change.changeType === 'added'
                        ? styles.diffCardAdded
                        : change.changeType === 'removed'
                          ? styles.diffCardRemoved
                          : styles.diffCardChanged
                    }`}
                  >
                    <div className={styles.diffCardHeader}>
                      <div className={styles.diffCardName}>{change.name}</div>
                      <div className={styles.diffCardType}>{change.type}</div>
                    </div>
                    <div className={styles.diffCardBody}>
                      {change.type === 'color' ? (
                        <>
                          {change.oldValue && (
                            <div className={`${styles.diffValue} ${snapshotActionsLocked ? styles.diffValueObfuscated : ''}`}>
                              <div className={styles.diffLabel}>Old</div>
                              <div className={snapshotActionsLocked ? styles.diffValueMask : ''}>
                                <div
                                  className={`${styles.colorSwatch} ${!getRenderableColor(change.oldValue) ? styles.colorSwatchInvalid : ''}`}
                                  style={{ background: getRenderableColor(change.oldValue) || undefined }}
                                />
                                <div className={styles.colorValue}>{parseColorValue(change.oldValue)}</div>
                              </div>
                            </div>
                          )}
                          {change.oldValue && change.newValue && <div className={styles.diffArrow}>→</div>}
                          {change.newValue && (
                            <div className={styles.diffValue}>
                              <div className={styles.diffLabel}>New</div>
                              <div>
                                <div
                                  className={`${styles.colorSwatch} ${!getRenderableColor(change.newValue) ? styles.colorSwatchInvalid : ''}`}
                                  style={{ background: getRenderableColor(change.newValue) || undefined }}
                                />
                                <div className={styles.colorValue}>{parseColorValue(change.newValue)}</div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : change.type === 'number' || change.type === 'dimension' || change.type === 'spacing' ? (
                        <>
                          {change.oldValue && (
                            <div className={`${styles.diffValue} ${snapshotActionsLocked ? styles.diffValueObfuscated : ''}`}>
                              <div className={styles.diffLabel}>Old</div>
                              <div
                                className={`${styles.spacingBar} ${snapshotActionsLocked ? styles.diffValueMask : ''}`}
                                style={{ width: `${Math.min(parseFloat(change.oldValue) * 2, 200)}px` }}
                              >
                                {change.oldValue}
                              </div>
                            </div>
                          )}
                          {change.oldValue && change.newValue && <div className={styles.diffArrow}>→</div>}
                          {change.newValue && (
                            <div className={styles.diffValue}>
                              <div className={styles.diffLabel}>New</div>
                              <div className={styles.spacingBar} style={{ width: `${Math.min(parseFloat(change.newValue) * 2, 200)}px` }}>
                                {change.newValue}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {change.oldValue && (
                            <div className={`${styles.diffValue} ${snapshotActionsLocked ? styles.diffValueObfuscated : ''}`}>
                              <div className={styles.diffLabel}>Old</div>
                              <div className={`${styles.typographySample} ${snapshotActionsLocked ? styles.diffValueMask : ''}`}>
                                Sample Text
                                <div className={styles.typographyValue}>{change.oldValue}</div>
                              </div>
                            </div>
                          )}
                          {change.oldValue && change.newValue && <div className={styles.diffArrow}>→</div>}
                          {change.newValue && (
                            <div className={styles.diffValue}>
                              <div className={styles.diffLabel}>New</div>
                              <div className={styles.typographySample}>
                                Sample Text
                                <div className={styles.typographyValue}>{change.newValue}</div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            ))
          )}
          {snapshotActionsLocked && hiddenCount > 0 ? (
            <button
              type="button"
              className={styles.diffLockedTeaser}
              onClick={() => openQuickStart('snapshot_history_lock')}
            >
              +{hiddenCount} more changes in full package
            </button>
          ) : null}
        </div>
        {!snapshotActionsLocked && orderedChanges.length > SNAPSHOT_FULL_DIFF_LIMIT && (
          <div className={styles.diffEmpty} style={{ marginTop: '10px' }}>
            Showing {SNAPSHOT_FULL_DIFF_LIMIT} of {orderedChanges.length} changes
          </div>
        )}
      </div>
    )
  }

  function parseColorValue(value: string): string {
    try {
      const parsed = JSON.parse(value)
      return typeof parsed === 'string' ? parsed : value
    } catch {
      return value
    }
  }

  function getRenderableColor(value: string): string {
    const normalized = parseColorValue(value).trim()
    if (!normalized) return ''
    if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
      return CSS.supports('color', normalized) ? normalized : ''
    }
    return normalized
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
        snapshotHistory={{
          enabled: true,
          accessMode: hasInstallIntent ? 'preview' : 'full',
          historyEndpoint: effectiveSourceContext?.historyEndpoint || '',
          sourceUrl: effectiveSourceContext?.sourceUrl || getSourceFromQuery(),
          title: 'Snapshot History',
        }}
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
                className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                onClick={() => openQuickStart('header')}
              >
                Quick Start
              </button>
              <button
                type="button"
                title="Advanced export is available after installing tokvista in your project."
                aria-expanded={isAdvancedInfoOpen ? 'true' : 'false'}
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
              {snapshotActionsLocked && !isHistoryHintDismissed ? (
                <div className={styles.historyHint}>
                  <p>Preview mode lets you inspect recent changes. Install tokvista to unlock full history and restore actions.</p>
                  <div className={styles.historyHintActions}>
                    <button
                      type="button"
                      className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionPrimary}`}
                      onClick={() => openQuickStart('history_hint')}
                    >
                      Open install steps
                    </button>
                    <button
                      type="button"
                      className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                      onClick={dismissHistoryHint}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}
              {snapshotActionsLocked ? (
                <div className={styles.historyMetrics}>
                  <div className={styles.historyMetricsHeader}>
                    <strong>Local Conversion Dashboard</strong>
                    <button
                      type="button"
                      className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                      onClick={resetSnapshotMetrics}
                    >
                      Reset
                    </button>
                  </div>
                  <div className={styles.historyMetricsGrid}>
                    {SNAPSHOT_METRIC_LABELS.map((metric) => (
                      <div key={metric.id} className={styles.historyMetricCard}>
                        <span>{metric.label}</span>
                        <strong>{snapshotMetrics[metric.id]}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className={styles.historyLayout}>
                <div className={styles.historyList}>
                  {!historyItems.length && !historyLoading ? (
                    <div className={styles.historyEmpty}>No versions found yet.</div>
                  ) : null}
                  {renderedHistoryItems.map((item, index) => {
                    const isSelectionLocked = snapshotActionsLocked && index >= SNAPSHOT_UNLOCKED_ITEMS
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={`${styles.historyItem} ${item.id === selectedHistoryId ? styles.historyItemActive : ''} ${
                          isSelectionLocked ? styles.historyItemDisabled : ''
                        }`}
                        onClick={() => {
                          if (isSelectionLocked) {
                            bumpSnapshotMetric('locked_item_click')
                            trackEvent('tokvista_snapshot_locked_item_click', { source: installIntentLabel, index })
                            void openQuickStart('snapshot_history_lock')
                            return
                          }
                          void loadSnapshotVersion(item)
                        }}
                        title={isSelectionLocked ? 'Install tokvista in your project to unlock this snapshot.' : undefined}
                        aria-disabled={isSelectionLocked ? 'true' : 'false'}
                      >
                        <div className={styles.historyItemHead}>
                          <span className={styles.historyItemVersion}>{item.versionId}</span>
                          <span className={styles.historyItemTime}>{formatLocalTimestamp(item.publishedAt)}</span>
                        </div>
                        {isSelectionLocked ? <div className={styles.historyItemLockedTag}>Locked in preview</div> : null}
                      </button>
                    )
                  })}
                  {historyItems.length > SNAPSHOT_HISTORY_RENDER_CAP ? (
                    <div className={styles.historyListGuardrail}>
                      Showing first {SNAPSHOT_HISTORY_RENDER_CAP} snapshots for preview performance.
                    </div>
                  ) : null}
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
                      {selectedSnapshotTokens && renderVisualDiff(tokens, selectedSnapshotTokens)}
                      {snapshotActionsLocked ? (
                        <div className={styles.historyLockedNotice}>
                          <p>{lockContent.message}</p>
                          <div className={styles.historyLockedActions}>
                            <button
                              type="button"
                              className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                              onClick={() => void copyPreferredInstallCommand()}
                            >
                              {copiedId === preferredPm ? 'Copied command' : `Copy ${preferredPm} install`}
                            </button>
                            <button
                              type="button"
                              className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionPrimary}`}
                              onClick={() => {
                                bumpSnapshotMetric('unlock_cta_click')
                                trackEvent('tokvista_snapshot_unlock_cta_click', { source: installIntentLabel, variant: conversionVariant })
                                openQuickStart('snapshot_history_lock')
                              }}
                            >
                              {lockContent.cta}
                            </button>
                            <button
                              type="button"
                              className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary}`}
                              onClick={refreshAfterInstall}
                            >
                              I installed, refresh
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <div className={styles.historyDetailLinks}>
                        <button
                          type="button"
                          className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary} ${snapshotActionsLocked ? styles.lockedFeatureButton : ''}`}
                          onClick={openOldSnapshot}
                          disabled={snapshotActionsLocked}
                        >
                          Open old snapshot
                        </button>
                        <button
                          type="button"
                          className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionPrimary} ${snapshotActionsLocked ? styles.lockedFeatureButton : ''}`}
                          onClick={() => void restoreInFigma()}
                          disabled={snapshotActionsLocked}
                        >
                          Restore in Figma
                        </button>
                        {selectedHistoryItem.referenceUrl ? (
                          <button
                            type="button"
                            className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary} ${snapshotActionsLocked ? styles.lockedFeatureButton : ''}`}
                            onClick={() => window.open(selectedHistoryItem.referenceUrl, '_blank', 'noopener,noreferrer')}
                            disabled={snapshotActionsLocked}
                          >
                            Open commit
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary} ${styles.lockedFeatureButton}`}
                          onClick={() => {
                            trackEvent('tokvista_snapshot_compare_range_click', { source: installIntentLabel })
                            void openQuickStart('snapshot_history_lock')
                          }}
                          title={SNAPSHOT_COMPARE_RANGE_DISABLED_MESSAGE}
                        >
                          Compare range (Locked)
                        </button>
                      </div>
                      {selectedHistoryRestoreUrl && !snapshotActionsLocked ? (
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
                              className={`${styles.sharedHeaderAction} ${styles.sharedHeaderActionSecondary} ${styles.lockedFeatureButton}`}
                              onClick={() => void copyRestoreUrl()}
                              disabled={snapshotActionsLocked}
                            >
                              Copy URL
                            </button>
                          </div>
                        </div>
                      ) : snapshotActionsLocked ? (
                        <div className={styles.historyRestoreMissing}>{lockContent.message}</div>
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
              <div className={styles.quickStartLabel}>Install (recommended: {preferredPm})</div>
              <div className={styles.quickStartGrid}>
                {quickStartCommandsOrdered.map((item) => (
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
