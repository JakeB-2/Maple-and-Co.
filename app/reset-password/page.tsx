'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser-client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login')
      } else {
        setReady(true)
      }
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Could not update password. Check the new password and try again.')
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/')
    router.refresh()
  }

  if (!ready) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-xl font-medium text-foreground">Set new password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a new password for your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? 'reset-password-error' : undefined}>
          <div>
            <label htmlFor="reset-password-new" className="block text-sm text-muted-foreground mb-1">New Password</label>
            <input
              id="reset-password-new"
              name="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-border-strong"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="reset-password-confirm" className="block text-sm text-muted-foreground mb-1">Confirm Password</label>
            <input
              id="reset-password-confirm"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-border-strong"
              placeholder="••••••••"
            />
          </div>
          <p id="reset-password-error" role="alert" aria-live="polite" className="text-sm text-destructive min-h-[1.25rem]">
            {error ?? ''}
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Saving...' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  )
}
