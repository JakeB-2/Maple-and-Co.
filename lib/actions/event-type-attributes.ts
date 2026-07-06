'use server'

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getCreateAuditFields, getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import {
  attributeOptions,
  mergeAttributeOptions,
  type ChoiceOption,
} from '@/lib/queries/event-types'
import { eventTypeAttributeInputSchema } from '@/lib/schemas/event-type'

const CHOICE_KINDS: readonly string[] = ['single_choice', 'multi_choice']

export async function createEventTypeAttribute(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = eventTypeAttributeInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { options, ...fields } = parsed.data
  const config = CHOICE_KINDS.includes(fields.value_kind) ? { options: options ?? [] } : undefined

  const { data, error } = await supabase
    .from('event_type_attributes')
    .insert({ ...fields, ...(config ? { config } : {}), ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('event_type_attributes')
  return ok({ id: data.id })
}

export async function updateEventTypeAttribute(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = eventTypeAttributeInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data: existing, error: existingError } = await supabase
    .from('event_type_attributes')
    .select('value_kind, config')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (existingError) return fail(sanitizeActionError(existingError))
  if (!existing) return fail('That attribute is gone.')

  const { options, ...fields } = parsed.data

  // A kind change would strand every value already logged in the old column.
  if (fields.value_kind !== existing.value_kind) {
    const { data: logged, error: loggedError } = await supabase
      .from('entity_event_values')
      .select('id')
      .eq('attribute_id', id)
      .limit(1)

    if (loggedError) return fail(sanitizeActionError(loggedError))
    if (logged.length > 0) {
      return fail("Kind can't change once logged — add a new attribute instead.")
    }
  }

  // Options are append-only (D-013): logged choice_ids point at option ids, so
  // an id is never dropped. Ids missing from the payload are ARCHIVED (kept for
  // history, hidden from new-log pickers); ids present take the payload's
  // label/emoji and are un-archived (re-typing a removed line brings it back);
  // new ids append active.
  let config: { options: ChoiceOption[] } | undefined
  if (CHOICE_KINDS.includes(fields.value_kind)) {
    config = { options: mergeAttributeOptions(attributeOptions(existing), options ?? []) }
  }

  const { error } = await supabase
    .from('event_type_attributes')
    .update({ ...fields, ...(config ? { config } : {}), ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('event_type_attributes')
  return ok({ id })
}
