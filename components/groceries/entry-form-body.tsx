// Async server body for the entry edit drawer — fetch the row inside the
// drawer's Suspense boundary, then hand plain props to the client form.

import { requireAuth } from '@/lib/auth/dal'
import { fetchEntry } from '@/lib/queries/grocery-list'
import { EntryForm, type EntryFormDefaults } from './entry-form'

type EntryFormBodyProps = { mode: 'edit'; id: string }

export async function EntryFormBody(props: EntryFormBodyProps) {
  const { supabase } = await requireAuth()
  const entry = await fetchEntry(supabase, props.id)

  if (!entry) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        This entry is gone — it may have just been deleted.
      </p>
    )
  }

  const defaults: EntryFormDefaults = {
    qty: entry.qty ?? '',
    note: entry.note ?? '',
  }
  return <EntryForm mode="edit" id={entry.id} defaultValues={defaults} />
}
