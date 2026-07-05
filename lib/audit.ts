/**
 * Audit field helpers — usable in both server and client components.
 *
 * These functions produce the standard audit column payloads used on every
 * write operation. Using them ensures consistency across all tables and
 * makes it easy to change the audit pattern in one place.
 *
 * Usage:
 *   // Server component
 *   const userId = await getCurrentUserId(supabase)
 *   await supabase.from('clients').insert({ ...data, ...getCreateAuditFields(userId) })
 *
 *   // Client component (browser client)
 *   const { data: { user } } = await supabase.auth.getUser()
 *   await supabase.from('clients').update({ ...data, ...getUpdateAuditFields(user?.id ?? null) })
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Resolves the current authenticated user's ID. Works with both server and browser clients. */
export async function getCurrentUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Fields to spread into an INSERT payload. */
export function getCreateAuditFields(userId: string | null) {
  return {
    created_at: new Date().toISOString(),
    created_by_user_id: userId,
  }
}

/** Fields to spread into an UPDATE payload when editing a record. */
export function getUpdateAuditFields(userId: string | null) {
  return {
    updated_at: new Date().toISOString(),
    updated_by_user_id: userId,
  }
}

/** Fields to spread into an UPDATE payload when soft-deleting a record. */
export function getDeleteAuditFields(userId: string | null) {
  const now = new Date().toISOString()
  return {
    deleted_at: now,
    deleted_by_user_id: userId,
    updated_at: now,
    updated_by_user_id: userId,
  }
}

/** Fields to spread into an UPDATE payload when restoring (un-deleting) a soft-deleted record. */
export function getRestoreAuditFields(userId: string | null) {
  return {
    deleted_at: null,
    deleted_by_user_id: null,
    updated_at: new Date().toISOString(),
    updated_by_user_id: userId,
  }
}
