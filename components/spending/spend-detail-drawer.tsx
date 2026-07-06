'use client'

import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/format-date'
import { formatSpendAmount } from '@/lib/queries/spend-totals'
import type { SpendRow } from '@/lib/queries/spends'
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
import { AvatarChip } from '@/components/shell/avatar-chip'
import { Button } from '@/components/ui/button'

export function SpendDetailDrawer({
  spend,
  comments,
  reactions,
  profiles,
  currentUserId,
}: {
  spend: SpendRow
  comments: CommentRow[]
  reactions: ReactionRow[]
  profiles: ProfileChip[]
  currentUserId: string
}) {
  const layer = useDrawerNavHref()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const { replaceAndRefresh } = useMutationRefresh()
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const amountLabel = formatSpendAmount(spend)

  async function onDelete() {
    const deleted = await runDelete({
      table: 'spends',
      id: spend.id,
      noun: 'Spend',
      label: spend.note ?? spend.category?.name ?? amountLabel,
    })
    if (!deleted) return
    // The row is gone; drop ?selected= so the empty drawer doesn't linger.
    replaceAndRefresh(layer('/finance'))
  }

  return (
    <DetailDrawer
      paramKey="selected"
      paramValue={spend.id}
      size="sm"
      header={{
        eyebrow: spend.category ? `${spend.category.emoji} ${spend.category.name}` : 'Spend',
        title: amountLabel,
        subtitle: `${spend.spent_by.display_name} · ${formatDate(spend.spent_on)}`,
        extraActions: (
          <Button asChild variant="ghost" size="icon" aria-label="Edit spend">
            <Link href={layer(`/finance?selected=${spend.id}&edit=${spend.id}`)}>
              <Pencil />
            </Link>
          </Button>
        ),
      }}
      footer={
        <DetailDrawerFooter
          destructive={
            <Button
              variant="ghost"
              className="text-destructive"
              disabled={deletingId === spend.id}
              onClick={onDelete}
            >
              <Trash2 /> Delete
            </Button>
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        {spend.photo_path && (
          // eslint-disable-next-line @next/next/no-img-element -- authed same-origin proxy; next/image can't fetch it
          <img
            src={`/media/${spend.photo_path}`}
            alt="Spend photo"
            className="max-h-72 w-full rounded-lg border object-cover"
          />
        )}
        <div>
          <Field label="Amount">
            <span className="tabular-nums">{amountLabel}</span>
          </Field>
          <Field label="Category">
            {spend.category ? `${spend.category.emoji} ${spend.category.name}` : '—'}
          </Field>
          <Field label="Spent by">
            <AvatarChip
              name={spend.spent_by.display_name}
              color={spend.spent_by.signature_color}
              size="sm"
              withName
            />
          </Field>
          <Field label="Date">{formatDate(spend.spent_on)}</Field>
          {spend.note && (
            <Field label="Note" alignTop>
              <span className="whitespace-pre-wrap break-words">{spend.note}</span>
            </Field>
          )}
        </div>
        <ReactionsRow
          entityType="spend"
          entityId={spend.id}
          reactions={reactions}
          currentUserId={currentUserId}
        />
        <CommentsSection
          entityType="spend"
          entityId={spend.id}
          comments={comments}
          profilesById={profilesById}
          currentUserId={currentUserId}
        />
      </div>
    </DetailDrawer>
  )
}
