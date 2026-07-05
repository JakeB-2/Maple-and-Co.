import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Service role Supabase client — BYPASSES RLS entirely.
 *
 * Use only in server-side code (server actions, API routes, cron/webhook
 * handlers) where the caller has already been authenticated. Never expose
 * the service role key client-side, and never import this module from a
 * "use client" file.
 *
 * Reasons a caller may legitimately need the service client:
 *   - Writes to append-only / restricted-read tables.
 *   - Dynamic `.from(<string>)` calls where TypeScript can't narrow the table.
 *   - Calls into `auth.admin.*` which require the service role.
 *   - Sessionless contexts: cron routes, webhook receivers, integration sync
 *     state — no user cookie exists, so the cookie-auth client can't satisfy
 *     any RLS at all.
 */
export function createServiceClient() {
  // Surface missing env vars with a precise message rather than the library's
  // generic 'supabaseKey is required'. Common cause: env var added to Vercel
  // but the deployment hasn't been rebuilt to pick it up.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL env var on this deployment')
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env var on this deployment (check Vercel → Settings → Environment Variables → Production scope, then redeploy)')

  return createClient<Database>(url, key)
}
