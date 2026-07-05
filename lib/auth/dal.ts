// Data access layer — the real auth boundary.
//
// requireAuth() must be called at the top of EVERY page and EVERY server
// action (actions are public POST endpoints; proxy.ts is only an optimistic
// convenience layer and Server Function calls can bypass it entirely).
// React cache() dedupes the getUser() round-trip within a single request.

import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'

export const requireAuth = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return { user, supabase }
})
