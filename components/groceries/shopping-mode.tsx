'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Check, ChevronLeft, ShoppingCart } from 'lucide-react'
import { CURRENCY_SYMBOLS, type Currency } from '@/lib/config'
import { formatCents, toCents } from '@/lib/queries/spend-totals'
import type { StorePlacementRow, StoreRow, StoreSectionRow } from '@/lib/queries/stores'
import type { GroceryEntryRow } from '@/lib/queries/grocery-list'
import { groupShoppingEntries } from '@/lib/queries/shopping'
import { checkOffEntry, setItemPlacement, uncheckEntry } from '@/lib/actions/grocery-list'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useOptimisticList } from '@/lib/hooks/use-optimistic-list'
import type { ProfileChip } from '@/components/screens/entity-social'
import { Surface } from '@/components/screens/surface'
import { AvatarChip } from '@/components/shell/avatar-chip'
import { Button } from '@/components/ui/button'
import { DrawerShell } from '@/components/screens/detail-drawer'
import { FormDrawerChrome } from '@/components/screens/form-drawer'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// The per-item price check-off. This is THE one-handed hot path ("one hand on
// the cart") — so it rides the app's bottom Sheet (mobilePresentation="bottom")
// like every other create/edit surface, not a centered Dialog. DrawerShell also
// lifts the sheet above the soft keyboard so the numeric input stays visible.
function PricePromptSheet({
  entry,
  currency,
  lastPrice,
  onSubmit,
  onClose,
}: {
  entry: GroceryEntryRow
  currency: Currency
  lastPrice: number | undefined
  onSubmit: (price: number | null) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(lastPrice != null ? lastPrice.toFixed(2) : '')

  const trimmed = value.trim()
  const parsed = Number(trimmed)
  // Validate the ROUNDED value: '0.004' rounds to 0 cents, which the server
  // rightly rejects — catch it here instead of after the round-trip.
  const cents = Math.round(parsed * 100)
  const invalid = trimmed !== '' && (!Number.isFinite(parsed) || cents <= 0)

  // Empty input means "skip the price" — Save still checks the item off.
  function save() {
    if (trimmed === '') {
      onSubmit(null)
      return
    }
    if (invalid) return
    onSubmit(cents / 100)
  }

  return (
    <DrawerShell
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      mobilePresentation="bottom"
      size="sm"
      title={`${entry.item.emoji} ${entry.item.name}`}
    >
      <FormDrawerChrome
        mode="create"
        title={
          <>
            {entry.item.emoji} {entry.item.name}
          </>
        }
        subtitle="How much was it?"
      >
        <div className="flex flex-col gap-4">
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>{CURRENCY_SYMBOLS[currency]}</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              inputMode="decimal"
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  save()
                }
              }}
              placeholder="0.00"
              aria-label="Price"
            />
          </InputGroup>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onSubmit(null)}>
              Skip price
            </Button>
            <Button onClick={save} disabled={invalid}>
              Save
            </Button>
          </div>
        </div>
      </FormDrawerChrome>
    </DrawerShell>
  )
}

export function ShoppingMode({
  store,
  sections,
  placements,
  activeEntries,
  tripEntries,
  lastPriceByItem,
  profiles,
  currentUserId,
}: {
  store: StoreRow
  sections: StoreSectionRow[]
  placements: StorePlacementRow[]
  activeEntries: GroceryEntryRow[]
  tripEntries: GroceryEntryRow[]
  lastPriceByItem: Record<string, number>
  profiles: ProfileChip[]
  currentUserId: string
}) {
  const { refreshNow } = useMutationRefresh()
  const [, startTransition] = useTransition()
  const [pricePrompt, setPricePrompt] = useState<{ entry: GroceryEntryRow } | null>(null)
  // Section assigns regroup instantly: overrides layer over the server
  // placements. Once the write lands ('settled') a server row for the item
  // wins again, so the partner's later re-placements show through on refresh.
  const [placementOverrides, setPlacementOverrides] = useState<
    Record<string, { sectionId: string; settled: boolean }>
  >({})

  const all = [...activeEntries, ...tripEntries]
  const [optimisticEntries, applyOptimistic] = useOptimisticList(all)

  const mergedPlacements = useMemo(() => {
    const serverItemIds = new Set(placements.map((placement) => placement.grocery_item_id))
    const active = Object.entries(placementOverrides).filter(
      ([itemId, override]) => !(override.settled && serverItemIds.has(itemId))
    )
    if (active.length === 0) return placements
    const overriddenIds = new Set(active.map(([itemId]) => itemId))
    return [
      ...placements.filter((placement) => !overriddenIds.has(placement.grocery_item_id)),
      ...active.map(([grocery_item_id, override]) => ({
        grocery_item_id,
        section_id: override.sectionId,
      })),
    ]
  }, [placements, placementOverrides])

  const { toBuy, cart, totalCents } = groupShoppingEntries({
    entries: optimisticEntries,
    sections,
    placements: mergedPlacements,
  })

  const currency = store.currency as Currency
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))

  function doCheckOff(entry: GroceryEntryRow, price: number | null) {
    setPricePrompt(null)
    startTransition(async () => {
      applyOptimistic({
        kind: 'update',
        row: {
          ...entry,
          purchased_at: new Date().toISOString(),
          purchased_by_user_id: currentUserId,
          purchased_store_id: store.id,
          purchased_price: price,
        },
      })
      const result = await checkOffEntry({ entry_id: entry.id, store_id: store.id, price })
      if (result.error) toast.error(result.error)
      // Refresh on failure too: losing the two-shopper race means the
      // partner's state is the truth, and only a re-fetch shows it.
      refreshNow()
    })
  }

  function doUncheck(entry: GroceryEntryRow) {
    startTransition(async () => {
      applyOptimistic({
        kind: 'update',
        row: {
          ...entry,
          purchased_at: null,
          purchased_by_user_id: null,
          purchased_store_id: null,
          purchased_price: null,
        },
      })
      const result = await uncheckEntry({ entry_id: entry.id })
      if (result.error) toast.error(result.error)
      refreshNow()
    })
  }

  function assignSection(entry: GroceryEntryRow, sectionId: string) {
    setPlacementOverrides((prev) => ({
      ...prev,
      [entry.grocery_item_id]: { sectionId, settled: false },
    }))
    startTransition(async () => {
      const result = await setItemPlacement({
        grocery_item_id: entry.grocery_item_id,
        store_id: store.id,
        section_id: sectionId,
      })
      if (result.error) {
        toast.error(result.error)
        // Plain state doesn't auto-revert like useOptimistic — drop the
        // override (unless a newer assignment already replaced it) so the
        // row falls back to Unsorted and can be retried.
        setPlacementOverrides((prev) => {
          if (prev[entry.grocery_item_id]?.sectionId !== sectionId) return prev
          const next = { ...prev }
          delete next[entry.grocery_item_id]
          return next
        })
      } else {
        // Settled: the server owns this placement now, fresh props may win.
        setPlacementOverrides((prev) => {
          const current = prev[entry.grocery_item_id]
          if (!current || current.sectionId !== sectionId) return prev
          return { ...prev, [entry.grocery_item_id]: { sectionId, settled: true } }
        })
        refreshNow()
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 pt-2">
        <Link
          href="/groceries"
          className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" /> List
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {store.emoji} {store.name}
          </h1>
          <p className="text-sm text-muted-foreground">Tap it when it lands in the cart.</p>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {toBuy.map((group) => (
          <section key={group.section?.id ?? 'unsorted'} className="flex flex-col gap-1.5">
            <h2 className="px-1 text-eyebrow text-muted-foreground">
              {group.section?.name ?? 'Unsorted'}
            </h2>
            <Surface className="overflow-hidden">
              <ul className="hairline-rows">
                {group.entries.map((entry) => {
                  const lastPrice = lastPriceByItem[entry.grocery_item_id]
                  return (
                    <li key={entry.id} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setPricePrompt({ entry })}
                        className="flex w-full min-w-0 min-h-16 touch:min-h-[4.5rem] items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2"
                      >
                        <span
                          aria-hidden
                          className="size-7 touch:size-8 shrink-0 rounded-full border-2 border-muted-foreground/40"
                        />
                        <span aria-hidden className="text-base">
                          {entry.item.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-medium">
                            {entry.item.name}
                          </span>
                          {entry.qty && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {entry.qty}
                            </span>
                          )}
                        </span>
                        {lastPrice != null && (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatCents(toCents(lastPrice), currency)}
                          </span>
                        )}
                      </button>
                      {group.section === null && sections.length > 0 && (
                        <span className="pr-3" onClick={(event) => event.stopPropagation()}>
                          <Select onValueChange={(value) => assignSection(entry, value)}>
                            <SelectTrigger className="h-7 touch:h-9 w-auto text-xs text-muted-foreground">
                              <SelectValue placeholder="Aisle?" />
                            </SelectTrigger>
                            <SelectContent>
                              {sections.map((section) => (
                                <SelectItem key={section.id} value={section.id}>
                                  {section.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Surface>
          </section>
        ))}

        {toBuy.length === 0 && cart.length > 0 && (
          <Surface className="px-6 py-10 text-center text-sm text-muted-foreground">
            “That’s everything — well walked.” 🐾
          </Surface>
        )}

        {toBuy.length === 0 && cart.length === 0 && (
          <Surface className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
            <p>Nothing on the list for this trip.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/groceries">
                <ChevronLeft /> Back to the list
              </Link>
            </Button>
          </Surface>
        )}

        {cart.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <h2 className="px-1 text-eyebrow text-muted-foreground">
              In the cart · {cart.length}
            </h2>
            <Surface className="overflow-hidden">
              <ul className="hairline-rows">
                {cart.map((entry) => {
                  const grabbedBy = entry.purchased_by_user_id
                    ? profilesById.get(entry.purchased_by_user_id)
                    : undefined
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => doUncheck(entry)}
                        className="flex min-h-14 touch:min-h-16 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2"
                      >
                        <span
                          aria-hidden
                          className="flex size-7 touch:size-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary"
                        >
                          <Check className="size-4 text-white" />
                        </span>
                        <span aria-hidden className="text-base">
                          {entry.item.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-medium text-muted-foreground">
                            {entry.item.name}
                          </span>
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {entry.purchased_price != null
                            ? formatCents(toCents(entry.purchased_price), currency)
                            : '—'}
                        </span>
                        {grabbedBy && (
                          <AvatarChip
                            name={grabbedBy.display_name}
                            color={grabbedBy.signature_color}
                            size="sm"
                          />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Surface>
          </section>
        )}
      </div>

      {cart.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex w-full max-w-lg justify-center px-4">
          <Surface elevated className="pointer-events-auto flex items-center gap-3 rounded-full px-5 py-2.5">
            <ShoppingCart className="size-4" aria-hidden />
            <span className="text-sm">{cart.length} in cart</span>
            <strong className="text-sm tabular-nums">
              Total {formatCents(totalCents, currency)}
            </strong>
          </Surface>
        </div>
      )}

      {pricePrompt && (
        <PricePromptSheet
          key={pricePrompt.entry.id}
          entry={pricePrompt.entry}
          currency={currency}
          lastPrice={lastPriceByItem[pricePrompt.entry.grocery_item_id]}
          onSubmit={(price) => doCheckOff(pricePrompt.entry, price)}
          onClose={() => setPricePrompt(null)}
        />
      )}
    </div>
  )
}
