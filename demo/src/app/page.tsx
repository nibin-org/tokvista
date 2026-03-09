'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TokenDocumentation, buildGitHubHistoryEndpoint } from 'tokvista'
import 'tokvista/styles.css'
import styles from './page.module.css'

type TokensPayload = Record<string, unknown>
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
const SOURCE_REFRESH_LOCK_MS = 30000
const LOCAL_SAMPLE_TOKENS_PATH = '/token-sample.json'

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
        const historyEndpoint = buildGitHubHistoryEndpoint({
          owner,
          repo,
          branch,
          path: file,
          perPage: 15,
        })
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

function extractHistoryItems(payload: unknown): unknown {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  return Array.isArray((payload as { items?: unknown }).items) ? (payload as { items: unknown[] }).items : []
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

function normalizeEventEndpoint(value: string): string {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('/')) {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}${trimmed}`
  }
  return normalizeHttpUrl(trimmed)
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
  return normalizeHttpUrl(source)
}

const DEFAULT_TOKENS: TokensPayload = {}

function getResolvedSource(): string {
  const sourceFromQuery = getSourceFromQuery()
  if (sourceFromQuery) return sourceFromQuery

  const envFallback = normalizeHttpUrl(process.env.NEXT_PUBLIC_DEMO_SOURCE || '')
  return envFallback
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
  const [tokens, setTokens] = useState<TokensPayload>(DEFAULT_TOKENS)
  const [usageData, setUsageData] = useState<any>(undefined)
  const [subtitle, setSubtitle] = useState(
    `Real tokens from Figma Token Studio - Version ${process.env.NEXT_PUBLIC_PACKAGE_VERSION}`
  )
  const [sourceLastSyncedAt, setSourceLastSyncedAt] = useState<number | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [sourceContext, setSourceContext] = useState<SourceContext | null>(null)
  const latestSourceRequestRef = useRef(0)
  const sourceRefreshLockUntilRef = useRef(0)
  const sourceFromQuery = useMemo(() => getSourceFromQuery(), [])
  const resolvedSource = useMemo(() => sourceFromQuery || getResolvedSource(), [sourceFromQuery])
  const fallbackSourceContext = useMemo(() => {
    if (!resolvedSource) return null
    return parseSourceContext(resolvedSource)
  }, [resolvedSource])
  const effectiveSourceContext = sourceContext || fallbackSourceContext
  const hasConfiguredSource = Boolean(resolvedSource)
  const shouldBlockDocumentation = hasConfiguredSource && Boolean(loadError)
  const eventsEndpoint = useMemo(
    () => normalizeEventEndpoint(process.env.NEXT_PUBLIC_DEMO_EVENTS_ENDPOINT || ''),
    []
  )
  const subtitleWithSync = useMemo(() => {
    if (!hasConfiguredSource || !sourceLastSyncedAt) return subtitle
    const syncedAt = new Date(sourceLastSyncedAt).toLocaleTimeString()
    return `${subtitle} · Last sync ${syncedAt}`
  }, [hasConfiguredSource, sourceLastSyncedAt, subtitle])

  // Load usage data from public folder
  useEffect(() => {
    fetch('/usage.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => setUsageData(data))
      .catch(() => setUsageData(undefined))
  }, [])

  async function resolveLatestSourceForLoad(source: string): Promise<string> {
    const context = parseSourceContext(source)
    if (!context?.historyEndpoint) return source
    try {
      const response = await fetch(withCacheBust(context.historyEndpoint), { cache: 'no-store' })
      if (!response.ok) return source
      const payload = await response.json()
      const items = normalizeHistoryItems(extractHistoryItems(payload), context.sourceUrl)
      const latestRaw = normalizeHttpUrl(items[0]?.rawUrl || '')
      return latestRaw || source
    } catch {
      return source
    }
  }

  useEffect(() => {
    let disposed = false
    let inFlight = false
    setIsBootstrapping(true)
    const inlineTokens = getInlineTokensFromHash()
    if (inlineTokens) {
      setTokens(inlineTokens)
      setSubtitle('Shared preview from Figma plugin')
      setSourceContext(null)
      setLoadError('')
      setSourceLastSyncedAt(Date.now())
      setIsBootstrapping(false)
      return
    }

    const source = resolvedSource
    if (!source) {
      setSourceContext(null)

      async function loadLocalSample() {
        const requestId = ++latestSourceRequestRef.current
        try {
          const response = await fetch(withCacheBust(LOCAL_SAMPLE_TOKENS_PATH), { cache: 'no-store' })
          if (!response.ok) {
            throw new Error(`Failed to load local sample tokens (${response.status})`)
          }
          const parsed = await response.json()
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Local sample token JSON is invalid')
          }
          if (disposed || requestId !== latestSourceRequestRef.current) return
          setTokens(parsed as TokensPayload)
          setSubtitle(`Local sample tokens (token-sample.json) - Version ${process.env.NEXT_PUBLIC_PACKAGE_VERSION}`)
          setLoadError('')
        } catch (error) {
          if (disposed || requestId !== latestSourceRequestRef.current) return
          const message = error instanceof Error ? error.message : String(error)
          setTokens({})
          setLoadError(message)
        } finally {
          if (disposed || requestId !== latestSourceRequestRef.current) return
          setSourceLastSyncedAt(null)
          setIsBootstrapping(false)
        }
      }

      void loadLocalSample()
      return
    }

    try {
      const parsedSource = new URL(source)
      setSourceContext(parseSourceContext(parsedSource.toString()))
      if (sourceFromQuery) {
        setSubtitle(`Shared preview from ${parsedSource.host}`)
      }
    } catch {
      setSourceContext(null)
    }

    async function loadFromSource() {
      if (inFlight) return
      if (!sourceFromQuery && sourceRefreshLockUntilRef.current > Date.now()) {
        setIsBootstrapping(false)
        return
      }
      inFlight = true
      const requestId = ++latestSourceRequestRef.current
      try {
        const sourceToLoad = await resolveLatestSourceForLoad(source)
        if (disposed || requestId !== latestSourceRequestRef.current) return
        const response = await fetch(withCacheBust(sourceToLoad), { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Failed to load preview tokens (${response.status})`)
        }
        const parsed = await response.json()
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Preview source returned invalid token JSON')
        }
        if (disposed || requestId !== latestSourceRequestRef.current) return
        setTokens(parsed as TokensPayload)
        const parsedSource = new URL(sourceToLoad)
        const host = parsedSource.host
        if (sourceFromQuery) {
          setSubtitle(`Shared preview from ${host}`)
        }
        setLoadError('')
        setSourceLastSyncedAt(Date.now())
      } catch (error) {
        if (disposed || requestId !== latestSourceRequestRef.current) return
        const message = error instanceof Error ? error.message : String(error)
        setTokens({})
        setLoadError(message)
      } finally {
        inFlight = false
        if (disposed || requestId !== latestSourceRequestRef.current) return
        setIsBootstrapping(false)
      }
    }

    void loadFromSource()
    return () => {
      disposed = true
    }
  }, [resolvedSource, sourceFromQuery])

  const refreshSourceNow = useCallback(async (options?: { preferredSourceUrl?: string }) => {
    const preferredSource = normalizeHttpUrl(options?.preferredSourceUrl || '')
    const source = preferredSource || resolvedSource
    if (!source) return

    const requestId = ++latestSourceRequestRef.current
    const response = await fetch(withCacheBust(source), { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`Failed to load preview tokens (${response.status})`)
    }
    const parsed = await response.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Preview source returned invalid token JSON')
    }
    if (requestId !== latestSourceRequestRef.current) return

    setTokens(parsed as TokensPayload)
    if (sourceFromQuery) {
      const host = new URL(source).host
      setSubtitle(`Shared preview from ${host}`)
    }
    if (preferredSource && preferredSource !== resolvedSource) {
      // Keep commit-based update visible; avoid stale branch overwrite immediately after.
      sourceRefreshLockUntilRef.current = Date.now() + SOURCE_REFRESH_LOCK_MS
    }
    setLoadError('')
    setSourceLastSyncedAt(Date.now())
  }, [resolvedSource, sourceFromQuery])

  useEffect(() => {
    if (!resolvedSource) return
    const onFocusOrOnline = () => {
      void refreshSourceNow()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshSourceNow()
      }
    }
    window.addEventListener('focus', onFocusOrOnline)
    window.addEventListener('online', onFocusOrOnline)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('focus', onFocusOrOnline)
      window.removeEventListener('online', onFocusOrOnline)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [resolvedSource, refreshSourceNow])

  useEffect(() => {
    if (!eventsEndpoint) return
    const eventStream = new EventSource(eventsEndpoint)
    eventStream.onmessage = () => {
      void refreshSourceNow()
    }
    eventStream.onerror = () => {
      // Keep app functional without forcing periodic polling fallback.
    }
    return () => {
      eventStream.close()
    }
  }, [eventsEndpoint, refreshSourceNow])

  if (shouldBlockDocumentation) {
    return (
      <main>
        <section className={styles.sourceErrorState} role="alert" aria-live="polite">
          <h2 className={styles.sourceErrorTitle}>No token JSON loaded</h2>
          <p className={styles.sourceErrorText}>
            Could not load tokens from the configured source. Fix the URL and restart the demo server.
          </p>
          <code className={styles.sourceErrorCode}>{resolvedSource}</code>
          <p className={styles.sourceErrorText}>
            Error: {loadError}
          </p>
          <p className={styles.sourceErrorHint}>
            Set `NEXT_PUBLIC_DEMO_SOURCE` in `demo/.env.local` to a valid `raw.githubusercontent.com/.../tokens.json`
            URL, then restart `npm run dev`.
          </p>
        </section>
      </main>
    )
  }

  if (isBootstrapping) {
    return (
      <main className={styles.sourceLoadingViewport}>
        <section
          className={styles.sourceLoadingState}
          role="status"
          aria-live="polite"
        >
          <div className={styles.sourceLoadingHeader}>
            <svg
              className={styles.sourceLoadingMark}
              viewBox="0 0 88 88"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <rect
                x="30"
                y="30"
                width="52"
                height="52"
                rx="13"
                className={styles.sourceLoadingMarkGhost}
              />
              <rect
                x="6"
                y="6"
                width="52"
                height="52"
                rx="13"
                className={styles.sourceLoadingMarkFront}
              />
            </svg>
            <div className={styles.sourceLoadingWordmark} aria-label="Tokvista">
              <span className={styles.sourceLoadingTok}>tok</span>
              <span className={styles.sourceLoadingVista}>vista</span>
            </div>
            <span className={styles.sourceLoadingBadge}>Syncing preview</span>
          </div>
          <h2 className={styles.sourceLoadingTitle}>Loading tokens</h2>
          <p className={styles.sourceLoadingText}>
            Fetching latest token JSON and preparing preview...
          </p>
          <div className={styles.sourceLoadingTrack} aria-hidden="true">
            <span className={styles.sourceLoadingBar} />
          </div>
        </section>
      </main>
    )
  }

  return (
    <main>
      {loadError ? (
        <aside className={styles.errorBanner} role="alert">
          Preview link failed: {loadError}
        </aside>
      ) : null}
      <TokenDocumentation
        tokens={tokens}
        title="Tokvista"
        subtitle={subtitleWithSync}
        usageData={usageData}
        theme={{
          colors: {
            primary: '#FF6B6B',
            background: '#FFFFFF',
            surface: '#F9FAFB',
            border: '#E5E7EB',
            text: '#111827',
            textSecondary: '#6B7280',
          },
        }}
        snapshotHistory={{
          enabled: true,
          accessMode: 'full',
          historyEndpoint: effectiveSourceContext?.historyEndpoint || '',
          sourceUrl: effectiveSourceContext?.sourceUrl || resolvedSource,
          onRefreshSource: refreshSourceNow,
          title: 'Snapshot History',
        }}
        onTokenClick={(token) => {
          console.log('Token clicked:', token)
        }}
      />
    </main>
  )
}
