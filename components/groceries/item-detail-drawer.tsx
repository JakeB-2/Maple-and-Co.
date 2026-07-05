'use client'

import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import { Pencil, SquarePen, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/format-date'
import { formatCents, toCents } from '@/lib/queries/spend-totals'
import type { GroceryEntryRow } from '@/lib/queries/grocery-list'
import type { PriceObservationRow } from '@/lib/queries/price-history'
import type { CommentRow, ReactionRow } from '@/lib/queries/comments'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useSoftDeleteWithUndo } from '@/lib/hooks/use-soft-delete-with-undo'
import { DetailDrawer, DetailDrawerFooter } from '@/components/screens/detail-drawer'
import {
  ReactionsRow,
  CommentsSection,
  type ProfileChip,
} from '@/components/screens/entity-social'
import { Field } from '@/components/screens/field'
import { SectionHeader, Surface } from '@/components/screens/surface'
import { AvatarChip } from '@/components/shell/avatar-chip'
import { Button } from '@/components/ui/button'

export function ItemDetailDrawer({
  entry,
  prices,
  comments,
  reactions,
  profiles,
  currentUserId,
}: {
  entry: GroceryEntryRow
  prices: PriceObservationRow[]
  comments: CommentRow[]
  reactions: ReactionRow[]
  profiles: ProfileChip[]
  currentUserId: string
}) {
  const layer = useDrawerNavHref()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const { replaceAndRefresh } = useMutationRefresh()
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const adder = entry.created_by_user_id ? profilesById.get(entry.created_by_user_id) : undefined
  // A Today link can arrive after the partner already shopped this entry —
  // render it as picked up instead of pretending it is still needed.
  const purchased = entry.purchased_at != null
  const buyer = entry.purchased_by_user_id
    ? profilesById.get(entry.purchased_by_user_id)
    : undefined

  async function onDelete() {
    const deleted = await runDelete({
      table: 'grocery_list_entries',
      id: entry.id,
      noun: 'Entry',
      label: entry.item.name,
    })
    if (!deleted) return
    // The row is gone; drop ?selected= so the empty drawer doesn't linger.
    replaceAndRefresh(layer('/groceries'))
  }

  async function onDeleteItem() {
    const deleted = await runDelete({
      table: 'grocery_items',
      id: entry.item.id,
      noun: 'Item',
      label: entry.item.name,
    })
    if (!deleted) return
    // Tombstoning the item hides its entries too (undo brings both back).
    replaceAndRefresh(layer('/groceries'))
  }

  return (
    <DetailDrawer
      paramKey="selected"
      paramValue={entry.id}
      size="sm"
      header={{
        eyebrow: purchased ? 'Picked up' : 'On the list',
        title: `${entry.item.emoji} ${entry.item.name}`,
        subtitle: entry.qty ?? entry.item.default_qty ?? undefined,
        extraActions: purchased ? undefined : (
          <Button asChild variant="ghost" size="icon" aria-label="Edit entry">
            <Link href={layer(`/groceries?selected=${entry.id}&edit=${entry.id}`)}>
              <Pencil />
            </Link>
          </Button>
        ),
      }}
      footer={
        purchased ? undefined : (
          <DetailDrawerFooter
            destructive={
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={deletingId === entry.id}
                onClick={onDelete}
              >
                <Trash2 /> Remove from list
              </Button>
            }
          />
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Field label="Qty">{entry.qty ?? '—'}</Field>
          {entry.note && (
            <Field label="Note" alignTop>
              <span className="whitespace-pre-wrap break-words">{entry.note}</span>
            </Field>
          )}
          <Field label="Added">
            <span className="flex items-center gap-2">
              <AvatarChip
                name={adder?.display_name ?? '?'}
                color={adder?.signature_color ?? '#8b8b8b'}
                size="sm"
                withName
              />
              <span className="text-muted-foreground">
                {formatDistanceToNowStrict(new Date(entry.created_at), { addSuffix: true })}
              </span>
            </span>
          </Field>
          {entry.purchased_at && (
            <Field label="Picked up">
              <span className="flex items-center gap-2">
                <AvatarChip
                  name={buyer?.display_name ?? '?'}
                  color={buyer?.signature_color ?? '#8b8b8b'}
                  size="sm"
                  withName
                />
                <span className="text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(entry.purchased_at), { addSuffix: true })}
                </span>
              </span>
            </Field>
          )}
        </div>

        <section className="flex flex-col gap-1.5">
          <SectionHeader title="Price history" size="eyebrow" />
          {prices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No prices yet — they collect as you shop.
            </p>
          ) : (
            <Surface className="overflow-hidden">
              <ul className="hairline-rows">
                {prices.map((price) => (
                  <li
                    key={price.id}
                    className="flex min-h-14 touch:min-h-16 items-center gap-3 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {price.store ? `${price.store.emoji} ${price.store.name}` : 'Unknown store'}
                    </span>
                    {price.source !== 'checkoff' && (
                      <span className="text-micro text-muted-foreground">{price.source}</span>
                    )}
                    <span className="text-sm tabular-nums">
                      {formatCents(toCents(price.price), price.store?.currency ?? 'MXN')}
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(price.observed_on)}
                    </span>
                  </li>
                ))}
              </ul>
            </Surface>
          )}
        </section>

        <div className="flex gap-1 self-start">
          <Button asChild variant="ghost" size="sm">
            <Link href={layer(`/groceries?selected=${entry.id}&edit_item=${entry.item.id}`)}>
              <SquarePen /> Edit item
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={deletingId === entry.item.id}
            onClick={onDeleteItem}
          >
            <Trash2 /> Delete item
          </Button>
        </div>

        {/* Social hangs on the item, not the entry — history survives re-adds. */}
        <ReactionsRow
          entityType="grocery_item"
          entityId={entry.item.id}
          reactions={reactions}
          currentUserId={currentUserId}
        />
        <CommentsSection
          entityType="grocery_item"
          entityId={entry.item.id}
          comments={comments}
          profilesById={profilesById}
          currentUserId={currentUserId}
        />
      </div>
    </DetailDrawer>
  )
}
