// Async server bodies for the section create/edit drawers.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import { fetchStoreSections } from '@/lib/queries/stores'
import { SectionForm, type SectionFormDefaults } from './section-form'

type SectionFormBodyProps = { storeId: string } & ({ mode: 'new' } | { mode: 'edit'; id: string })

export async function SectionFormBody(props: SectionFormBodyProps) {
  const { supabase } = await requireAuth()
  const sections = await fetchStoreSections(supabase, props.storeId)

  if (props.mode === 'edit') {
    const row = sections.find((section) => section.id === props.id)
    if (!row) {
      return (
        <FormBodyNotFound noun="section" />
      )
    }
    const defaults: SectionFormDefaults = {
      store_id: row.store_id,
      name: row.name,
      sort_order: row.sort_order,
    }
    return <SectionForm mode="edit" id={row.id} defaultValues={defaults} />
  }

  const nextSortOrder =
    sections.length > 0 ? Math.max(...sections.map((s) => s.sort_order)) + 1 : 0
  const defaults: SectionFormDefaults = {
    store_id: props.storeId,
    name: '',
    sort_order: nextSortOrder,
  }
  return <SectionForm mode="new" defaultValues={defaults} />
}
