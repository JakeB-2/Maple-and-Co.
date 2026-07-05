'use client'

// Shared error boundary UI. Each `error.tsx` re-exports this default so the
// look stays consistent across route segments and a future tweak only edits
// one file. Per Next.js docs, error boundaries must be client components.
//
// In production builds Next.js redacts server-side error messages and only
// exposes a `digest` — a short ID that maps to the full stack trace in the
// server runtime logs. Showing the digest here lets a real error be located
// quickly without opening the logs blind.

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    // Echo to the browser console so it appears in DevTools alongside the
    // visible UI — easier to copy when reporting.
    console.error('Route error:', error)
  }, [error])

  const isRedacted =
    !error.message ||
    error.message.includes('Server Components render') ||
    error.message.includes('omitted in production')

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <h2 className="text-section font-medium">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {isRedacted
          ? 'The server hit an error rendering this page. The exact message is hidden in production — use the digest below to find it in the server runtime logs.'
          : error.message}
      </p>
      {error.digest && (
        <code className="text-xs text-muted-foreground font-mono px-2 py-1 rounded bg-muted">
          digest: {error.digest}
        </code>
      )}
      <button
        onClick={unstable_retry}
        className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
      >
        Try again
      </button>
    </div>
  )
}
