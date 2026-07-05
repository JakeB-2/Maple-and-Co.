'use client'

import { useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

function normalizeUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

export function UrlDisplay({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const href = normalizeUrl(url)

  function handleCopy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm truncate">{url}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="shrink-0"
        aria-label="Copy URL"
        title={copied ? 'Copied!' : 'Copy'}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" asChild className="shrink-0" aria-label="Open URL">
        <a href={href} target="_blank" rel="noopener noreferrer" title="Open URL in New Tab">
          <ExternalLink className="h-4 w-4" />
        </a>
      </Button>
    </div>
  )
}
