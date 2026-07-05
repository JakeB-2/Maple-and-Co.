// Async server bodies for the create/edit drawers — fetch options (and the
// row for edit) inside the drawer's Suspense boundary, then hand plain props
// to the client form.

import { requireAuth } from '@/lib/auth/dal'
import { DEFAULT_CURRENCY, HOUSEHOLD_TZ } from '@/lib/config'
import { todayInTimeZone } from '@/lib/format-date'
import { fetchSpend } from '@/lib/queries/spends'
import { fetchSpendCategories } from '@/lib/queries/spend-categories'
import { fetchProfiles } from '@/lib/queries/profiles'
import { SpendForm, type SpendFormDefaults } from './spend-form'

type SpendFormBodyProps = { mode: 'new' } | { mode: 'edit'; id: string }

export async function SpendFormBody(props: SpendFormBodyProps) {
  const { user, supabase } = await requireAuth()
  const [categories, profiles, spend] = await Promise.all([
    fetchSpendCategories(supabase),
    fetchProfiles(supabase),
    props.mode === 'edit' ? fetchSpend(supabase, props.id) : null,
  ])

  const categoryOptions = categories.map(({ id, name, emoji }) => ({ id, name, emoji }))
  const profileOptions = profiles.map(({ id, display_name }) => ({ id, display_name }))

  if (props.mode === 'edit') {
    if (!spend) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          This spend is gone — it may have just been deleted.
        </p>
      )
    }
    const defaults: SpendFormDefaults = {
      amount: spend.amount,
      currency: spend.currency,
      spent_on: spend.spent_on,
      spent_by_user_id: spend.spent_by_user_id,
      category_id: spend.category_id ?? '',
      note: spend.note ?? '',
      photo_path: spend.photo_path ?? '',
    }
    return (
      <SpendForm
        mode="edit"
        id={spend.id}
        defaultValues={defaults}
        categories={categoryOptions}
        profiles={profileOptions}
      />
    )
  }

  // Smart defaults (≤2-tap budget): me, today in household time, MXN, no category.
  const defaults: SpendFormDefaults = {
    amount: null,
    currency: DEFAULT_CURRENCY,
    spent_on: todayInTimeZone(HOUSEHOLD_TZ),
    spent_by_user_id: user.id,
    category_id: '',
    note: '',
    photo_path: '',
  }
  return (
    <SpendForm
      mode="new"
      defaultValues={defaults}
      categories={categoryOptions}
      profiles={profileOptions}
    />
  )
}
