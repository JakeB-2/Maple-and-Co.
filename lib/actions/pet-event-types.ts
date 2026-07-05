'use server'

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getCreateAuditFields, getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { petEventTypeInputSchema, type PetEventTypeInput } from '@/lib/schemas/pet-event-type'

// Flat form fields → row columns + config jsonb. system_key is never written
// here — analytics anchor on seeded types, seed-owned (D-013).
function typeRow(input: PetEventTypeInput) {
  const { name, emoji, sort_order, show_on_today, expect_every_hours, warn_after_hours } = input
  return {
    name,
    emoji,
    sort_order,
    config: {
      show_on_today,
      ...(expect_every_hours
        ? { recency: { expect_every_hours, warn_after_hours: warn_after_hours ?? undefined } }
        : {}),
    },
  }
}

export async function createPetEventType(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = petEventTypeInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase
    .from('pet_event_types')
    .insert({ ...typeRow(parsed.data), ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('pet_event_types')
  return ok({ id: data.id })
}

export async function updatePetEventType(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = petEventTypeInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { error } = await supabase
    .from('pet_event_types')
    .update({ ...typeRow(parsed.data), ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('pet_event_types')
  return ok({ id })
}
