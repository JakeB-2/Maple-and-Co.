'use server'

// Server actions are public POST endpoints — requireAuth() gates every one.

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import {
  getCreateAuditFields,
  getUpdateAuditFields,
  getDeleteAuditFields,
  getRestoreAuditFields,
} from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { spendInputSchema } from '@/lib/schemas/spend'

export async function createSpend(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = spendInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase
    .from('spends')
    .insert({ ...parsed.data, ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('spends')
  return ok({ id: data.id })
}

export async function updateSpend(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = spendInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { error } = await supabase
    .from('spends')
    .update({ ...parsed.data, ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('spends')
  return ok({ id })
}

export async function softDeleteSpend(id: string): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const { error } = await supabase
    .from('spends')
    .update(getDeleteAuditFields(user.id))
    .eq('id', id)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('spends')
  return ok({ id })
}

export async function restoreSpend(id: string): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const { error } = await supabase
    .from('spends')
    .update(getRestoreAuditFields(user.id))
    .eq('id', id)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('spends')
  return ok({ id })
}

// Uploads go through this action (never from the browser client — the
// lint-browser-mutations gate enforces that). Returns the storage path to put
// in spends.photo_path; unique path per upload so /media can cache hard.
export async function uploadSpendPhoto(formData: FormData): Promise<ActionResult<{ path: string }>> {
  const { user, supabase } = await requireAuth()

  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) return fail('No photo attached.')
  if (file.size > 8 * 1024 * 1024) return fail('Photo is too large (8 MB max).')
  if (!file.type.startsWith('image/')) return fail('Only images can be attached.')

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `spends/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from('media').upload(path, file, {
    contentType: file.type,
    // cache hint for the /media proxy; paths are unique so immutable is safe
    cacheControl: '86400',
  })

  if (error) return fail('Upload failed. Try again?')
  // Stamp who uploaded via path convention only; the spends row carries audit.
  void user
  return ok({ path })
}
