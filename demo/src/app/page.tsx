'use client'

import { TokenDocumentation } from '@nibin-org/tokens'
import '@nibin-org/tokens/styles.css'
import tokens from '../../../tokens.json' // Real tokens from Figma Token Studio

export default function Home() {
  return (
    <main>
      <TokenDocumentation 
        tokens={tokens}
        title="@nibin-org/tokens Demo"
        subtitle="Real tokens from Figma Token Studio - v1.0.6 with Components support"
        onTokenClick={(token) => {
          console.log('Token clicked:', token)
        }}
      />
    </main>
  )
}