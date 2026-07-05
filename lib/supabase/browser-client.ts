// Browser-side Supabase client. Uses the public anon key + RLS — safe to call
// from "use client" components. Pair with server-client.ts for server actions
// (cookies-aware) and service-client.ts for RLS-bypass operations.

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
