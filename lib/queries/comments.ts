// Read-side for the polymorphic comments/reactions attached to an entity.
// Authors are resolved from the (two-row) profiles table by the caller —
// audit columns have no FK into profiles, so there is nothing to embed.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { CommentEntityType } from '@/lib/actions/comments'

export type CommentRow = Database['public']['Tables']['comments']['Row']
export type ReactionRow = Database['public']['Tables']['reactions']['Row']

export async function fetchComments(
  supabase: SupabaseClient<Database>,
  entityType: CommentEntityType,
  entityId: string
): Promise<CommentRow[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('deleted_at', null)
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export async function fetchReactions(
  supabase: SupabaseClient<Database>,
  entityType: CommentEntityType,
  entityId: string
): Promise<ReactionRow[]> {
  const { data, error } = await supabase
    .from('reactions')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at')

  if (error) throw error
  return data ?? []
}
