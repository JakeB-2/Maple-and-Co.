'use client'

/**
 * useSoftDeleteWithUndo — replaces "click bin → confirm dialog → soft-delete →
 * toast" with "click bin → soft-delete → toast w/ Undo".
 *
 * Soft-deletes in this codebase are reversible (deleted_at flag), so a
 * confirm dialog is friction without value. Show a 15s Undo toast instead;
 * if the user actually meant to delete, they ignore it.
 *
 * Scope: row-level entities only (spends, comments, spend_categories rows,
 * etc.). Do NOT use for cascade parents — restoring the parent without
 * un-cascading the children would leave orphan rows.
 *
 * Usage:
 *   const { runDelete, deletingId } = useSoftDeleteWithUndo()
 *   <Button
 *     disabled={deletingId === spend.id}
 *     onClick={() => runDelete({ table: 'spends', id: spend.id, label: spend.note })}
 *   />
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { softDelete, restoreSoftDelete } from '@/lib/actions/soft-delete'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'

export type RunDeleteArgs = {
  table: string
  id: string
  /** Shown in the toast: "{label} deleted". Defaults to "Item". */
  label?: string
  /** Override the noun in messages, e.g. "Line", "Expense". Defaults to "Item". */
  noun?: string
}

export function useSoftDeleteWithUndo() {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { refreshNow } = useMutationRefresh()

  async function runDelete({ table, id, label, noun = 'Item' }: RunDeleteArgs) {
    setDeletingId(id)
    const result = await softDelete(table, id)
    setDeletingId(null)

    if (result.error) {
      toast.error(result.error)
      return
    }
    if (result.warnings && result.warnings.length > 0) {
      // Soft warnings shouldn't appear in list-row contexts (these are never
      // high-stakes settings rows), but guard defensively.
      toast.error(result.warnings[0].message)
      return
    }

    // Refresh now so the row disappears from the list immediately. Restore
    // (if the user clicks Undo) will refresh again.
    refreshNow()

    const subject = label ? `${noun}: ${label}` : noun
    toast.success(`${subject} deleted`, {
      duration: 15000,
      action: {
        label: 'Undo',
        onClick: async () => {
          const restoreResult = await restoreSoftDelete(table, id)
          if (restoreResult.error) {
            toast.error(`Could not restore: ${restoreResult.error}`)
            return
          }
          toast.success(`${subject} restored`)
          refreshNow()
        },
      },
    })
  }

  return { runDelete, deletingId }
}
