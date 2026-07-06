// Async server bodies for the category create/edit drawers.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import { fetchSpendCategories } from '@/lib/queries/spend-categories'
import { CategoryForm, type CategoryFormDefaults } from './category-form'

type CategoryFormBodyProps = { mode: 'new' } | { mode: 'edit'; id: string }

export async function CategoryFormBody(props: CategoryFormBodyProps) {
  const { supabase } = await requireAuth()
  const categories = await fetchSpendCategories(supabase)

  if (props.mode === 'edit') {
    const row = categories.find((category) => category.id === props.id)
    if (!row) {
      return (
        <FormBodyNotFound noun="category" />
      )
    }
    const defaults: CategoryFormDefaults = {
      name: row.name,
      emoji: row.emoji,
      color: row.color,
      sort_order: row.sort_order,
    }
    return <CategoryForm mode="edit" id={row.id} defaultValues={defaults} />
  }

  const nextSortOrder =
    categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 0
  const defaults: CategoryFormDefaults = {
    name: '',
    emoji: '',
    color: null,
    sort_order: nextSortOrder,
  }
  return <CategoryForm mode="new" defaultValues={defaults} />
}
