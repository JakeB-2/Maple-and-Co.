'use server'

// Generic over the five commentable entity types (one polymorphic table,
// D-012) — no per-entity clones.

import { z } from 'zod'
import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getCreateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'

const ENTITY_TYPES = ['spend', 'grocery_item', 'entity_event', 'calendar_event', 'task'] as const
export type CommentEntityType = (typeof ENTITY_TYPES)[number]

const commentInputSchema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.uuid(),
  body: z.string().trim().min(1, 'Say something first').max(1000),
})

export async function addComment(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = commentInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase
    .from('comments')
    .insert({ ...parsed.data, ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('comments')
  return ok({ id: data.id })
}

const reactionInputSchema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.uuid(),
  emoji: z.string().trim().min(1).max(8),
})

// Toggle: insert if absent, hard-delete if present (D-020).
export async function toggleReaction(input: unknown): Promise<ActionResult<{ reacted: boolean }>> {
  const { user, supabase } = await requireAuth()

  const parsed = reactionInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')
  const { entity_type, entity_id, emoji } = parsed.data

  const { data: existing, error: findError } = await supabase
    .from('reactions')
    .select('id')
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .eq('emoji', emoji)
    .eq('created_by_user_id', user.id)
    .maybeSingle()

  if (findError) return fail(sanitizeActionError(findError))

  if (existing) {
    const { error } = await supabase.from('reactions').delete().eq('id', existing.id)
    if (error) return fail(sanitizeActionError(error))
    revalidateTable('reactions')
    return ok({ reacted: false })
  }

  const { error } = await supabase
    .from('reactions')
    .insert({ entity_type, entity_id, emoji, created_by_user_id: user.id })

  // A concurrent double-tap can race the toggle into a duplicate insert; the
  // UNIQUE constraint makes that a no-op outcome, not an error worth showing.
  if (error && error.code !== '23505') return fail(sanitizeActionError(error))
  revalidateTable('reactions')
  return ok({ reacted: true })
}
