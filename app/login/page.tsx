'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser-client'
import { safeNextPath } from '@/lib/auth/safe-redirect'
import { Button } from '@/components/ui/button'

// Next.js requires components that call useSearchParams() to live inside a
// Suspense boundary so the page can still be statically prerendered. The
// outer default export provides that boundary; the real form lives in
// LoginPageInner so it can read query params freely.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginPageInner />
    </Suspense>
  )
}

// Shared centered-card chrome. The root layout's <main> is a row-direction
// flex container, so this wrapper needs w-full to fill it — without it the card
// shrinks to its content width and hugs the left edge. Semantic tokens (not
// hardcoded grays) keep the screen correct in both light and dark themes.
function LoginCard({ subtitle, children }: { subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-xl font-medium text-foreground">Maple &amp; Co</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

function LoginShell() {
  return <LoginCard subtitle="Sign in to continue" />
}

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const otpExpired = searchParams.get('error_code') === 'otp_expired'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Initial state derives from URL; subsequent user actions own these.
  const [error, setError] = useState<string | null>(
    otpExpired ? 'Your reset link has expired. Enter your email to get a new one.' : null,
  )
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'reset'>(otpExpired ? 'reset' : 'login')
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Sign-in failed. Check your email and password, then try again.')
      setLoading(false)
      return
    }

    setLoading(false)
    // proxy.ts appends ?next=<original path> when bouncing logged-out visitors.
    router.push(safeNextPath(searchParams.get('next')))
    router.refresh()
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError('Could not send reset link. Check the email address and try again.')
      return
    }
    setResetSent(true)
  }

  function switchMode(next: 'login' | 'reset') {
    setMode(next)
    setError(null)
    setResetSent(false)
  }

  return (
    <LoginCard subtitle={mode === 'login' ? 'Sign in to continue' : 'Reset your password'}>
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4" aria-describedby={error ? 'login-error' : undefined}>
            <div>
              <label htmlFor="login-email" className="block text-sm text-muted-foreground mb-1">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border-strong"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-sm text-muted-foreground">Password</label>
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border-strong"
                placeholder="••••••••"
              />
            </div>
            <p id="login-error" role="alert" aria-live="polite" className="text-sm text-destructive min-h-[1.25rem]">
              {error ?? ''}
            </p>
            <Button type="submit" disabled={loading} className="w-full rounded-lg">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {resetSent ? (
              <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
                Check your email for a password reset link.
              </p>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4" aria-describedby={error ? 'reset-error' : undefined}>
                <div>
                  <label htmlFor="reset-email" className="block text-sm text-muted-foreground mb-1">Email</label>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border-strong"
                    placeholder="you@example.com"
                  />
                </div>
                <p id="reset-error" role="alert" aria-live="polite" className="text-sm text-destructive min-h-[1.25rem]">
                  {error ?? ''}
                </p>
                <Button type="submit" disabled={loading} className="w-full rounded-lg">
                  {loading ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>
            )}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </button>
          </div>
        )}
    </LoginCard>
  )
}
