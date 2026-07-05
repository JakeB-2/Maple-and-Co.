// Read-side for the spending diary. Small data (two people), so grouping and
// totals happen in TS — no views, no RPCs (plan: GROUP BY in code).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { Currency } from '@/lib/config'

export const SPEND_SELECT = `
  id, amount, currency, spent_on, note, photo_path, category_id, spent_by_user_id,
  created_at, created_by_user_id,
  category:spend_categories(id, name, emoji, color),
  spent_by:profiles!spends_spent_by_user_id_fkey(id, display_name, signature_color)
` as const

export type SpendRow = {
  id: string
  amount: number
  currency: Currency
  spent_on: string
  note: string | null
  photo_path: string | null
  category_id: string | null
  spent_by_user_id: string
  created_at: string
  created_by_user_id: string | null
  category: { id: string; name: string; emoji: string; color: string } | null
  spent_by: { id: string; display_name: string; signature_color: string }
}

export async function fetchSpendsForMonth(
  supabase: SupabaseClient<Database>,
  month: string // 'YYYY-MM'
): Promise<SpendRow[]> {
  const monthStart = `${month}-01`
  // Postgres date arithmetic without pulling a date lib into the query layer:
  // filter [start, start + 1 month) via the next month's first day.
  const [y, m] = month.split('-').map(Number)
  const nextMonthStart = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('spends')
    .select(SPEND_SELECT)
    .is('deleted_at', null)
    .gte('spent_on', monthStart)
    .lt('spent_on', nextMonthStart)
    .order('spent_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as SpendRow[]
}

export async function fetchSpend(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<SpendRow | null> {
  const { data, error } = await supabase
    .from('spends')
    .select(SPEND_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data as unknown as SpendRow | null
}

export async function fetchRecentPartnerSpends(
  supabase: SupabaseClient<Database>,
  currentUserId: string,
  limit = 5
): Promise<SpendRow[]> {
  const { data, error } = await supabase
    .from('spends')
    .select(SPEND_SELECT)
    .is('deleted_at', null)
    .neq('spent_by_user_id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as unknown as SpendRow[]
}
