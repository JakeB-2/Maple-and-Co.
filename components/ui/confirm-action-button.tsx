'use client'


// Generic confirm-then-act button used by booking cancel/delete and similar flows. Calls onConfirm on accept and surfaces success/error via toast.

import * as React from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Props = {
  triggerLabel: string
  triggerVariant?: 'outline' | 'ghost' | 'destructive'
  triggerClassName?: string
  title: string
  description: React.ReactNode
  confirmLabel: string
  confirmVariant?: 'destructive' | 'default'
  /** Must return { error: string | null }. Called when the user confirms. */
  onConfirm: () => Promise<{ error: string | null }>
  /** Called after a successful confirm, before the dialog closes. */
  onSuccess: () => void
  /** Toast shown on success. Set to false to suppress. Defaults to "Done". */
  successMessage?: string | false
  /** Controlled open state. When provided, the parent drives the dialog —
   *  pair with `hideTrigger` to open it from an external control (e.g. a
   *  row's ••• menu item). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Skip rendering the built-in trigger button (use with controlled `open`). */
  hideTrigger?: boolean
  /** Gates the confirm button behind an acknowledgement checkbox — for
   *  destructive flows (DB reset/restore) where a plain confirm isn't enough. */
  requireAcknowledge?: { label: React.ReactNode }
  /** Extra classes for DialogContent — use to widen the dialog for richer
   *  description content (e.g. a two-column preserved/deleted breakdown). */
  contentClassName?: string
}

export function ConfirmActionButton({
  triggerLabel,
  triggerVariant = 'outline',
  triggerClassName,
  title,
  description,
  confirmLabel,
  confirmVariant = 'destructive',
  onConfirm,
  onSuccess,
  successMessage = 'Done',
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  requireAcknowledge,
  contentClassName,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acked, setAcked] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    const { error: err } = await onConfirm()
    setLoading(false)
    if (err) {
      setError(err)
      toast.error(err)
      return
    }
    if (successMessage !== false) toast.success(successMessage)
    setOpen(false)
    onSuccess()
  }

  function handleOpenChange(next: boolean) {
    if (!loading) {
      setOpen(next)
      if (!next) {
        setError(null)
        setAcked(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant={triggerVariant} size="sm" className={triggerClassName}>
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {typeof description === 'string' ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {requireAcknowledge && (
          <label className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <Checkbox
              checked={acked}
              onCheckedChange={(value) => { setAcked(value === true); setError(null) }}
              disabled={loading}
            />
            <span>{requireAcknowledge.label}</span>
          </label>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={handleConfirm}
            disabled={loading || (!!requireAcknowledge && !acked)}
          >
            {loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {loading ? 'Please wait…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
