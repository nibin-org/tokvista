'use client'

import { useEffect, useState } from 'react'
import { TokenDocumentation } from 'tokvista'
import 'tokvista/styles.css'
import defaultTokens from '../../../tokens.json' // Real tokens from Figma Token Studio

type TokensPayload = Record<string, unknown>

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

  useEffect(() => {
    let disposed = false
    const inlineTokens = getInlineTokensFromHash()
    if (inlineTokens) {
      setTokens(inlineTokens)
      setSubtitle('Shared preview from Figma plugin')
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
        const host = new URL(source).host
        setSubtitle(`Shared preview from ${host}`)
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

  return (
    <main>
      {loadError ? (
        <div
          style={{
            margin: '16px auto 0',
            maxWidth: 1280,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#fff4e5',
            border: '1px solid #f0c36d',
            color: '#7a4b00',
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          Preview link failed: {loadError}. Showing bundled tokens instead.
        </div>
      ) : null}
      <TokenDocumentation
        tokens={tokens}
        title="Tokvista Demo"
        subtitle={subtitle}
        onTokenClick={(token) => {
          console.log('Token clicked:', token)
        }}
      />
    </main>
  )
}
