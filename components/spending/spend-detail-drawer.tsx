'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format-date'
import { formatSpendAmount } from '@/lib/queries/spend-totals'
import type { SpendRow } from '@/lib/queries/spends'
import type { CommentRow, ReactionRow } from '@/lib/queries/comments'
import { addComment, toggleReaction } from '@/lib/actions/comments'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useSoftDeleteWithUndo } from '@/lib/hooks/use-soft-delete-with-undo'
import { DetailDrawer, DetailDrawerFooter } from '@/components/screens/detail-drawer'
import { Field } from '@/components/screens/field'
import { SectionHeader } from '@/components/screens/surface'
import { AvatarChip } from '@/components/shell/avatar-chip'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const REACTION_EMOJI = ['❤️', '😂', '😮', '👍', '🎉']

type ProfileChip = { id: string; display_name: string; signature_color: string }

function ReactionsRow({
  spendId,
  reactions,
  currentUserId,
}: {
  spendId: string
  reactions: ReactionRow[]
  currentUserId: string
}) {
  const [isPending, startTransition] = useTransition()
  const { refreshNow } = useMutationRefresh()
  const emojis = [...new Set([...REACTION_EMOJI, ...reactions.map((r) => r.emoji)])]

  function onToggle(emoji: string) {
    startTransition(async () => {
      const result = await toggleReaction({ entity_type: 'spend', entity_id: spendId, emoji })
      if (result.error) toast.error(result.error)
      else refreshNow()
    })
  }

  return (
    <div className="flex flex-wrap gap-1.5 py-3">
      {emojis.map((emoji) => {
        const count = reactions.filter((r) => r.emoji === emoji).length
        const mine = reactions.some(
          (r) => r.emoji === emoji && r.created_by_user_id === currentUserId
        )
        return (
          <button
            key={emoji}
            type="button"
            disabled={isPending}
            onClick={() => onToggle(emoji)}
            aria-pressed={mine}
            aria-label={`React with ${emoji}`}
            className={cn(
              'inline-flex min-h-8 touch:min-h-9 items-center gap-1 rounded-full border px-2.5 text-sm transition-colors disabled:opacity-60',
              mine ? 'border-primary bg-primary-soft' : 'hover:bg-surface-2'
            )}
          >
            <span aria-hidden>{emoji}</span>
            {count > 0 && <span className="text-xs tabular-nums text-muted-foreground">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

function CommentsSection({
  spendId,
  comments,
  profilesById,
  currentUserId,
}: {
  spendId: string
  comments: CommentRow[]
  profilesById: Map<string, ProfileChip>
  currentUserId: string
}) {
  const [body, setBody] = useState('')
  const [isPending, startTransition] = useTransition()
  const { refreshNow } = useMutationRefresh()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()

  function onSubmit() {
    const trimmed = body.trim()
    if (!trimmed) return
    startTransition(async () => {
      const result = await addComment({ entity_type: 'spend', entity_id: spendId, body: trimmed })
      if (result.error) {
        toast.error(result.error)
      } else {
        setBody('')
        refreshNow()
      }
    })
  }

  return (
    <section className="flex flex-col gap-3 pt-2">
      <SectionHeader title="Comments" size="eyebrow" />
      {comments.length > 0 && (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => {
            const author = comment.created_by_user_id
              ? profilesById.get(comment.created_by_user_id)
              : undefined
            return (
              <li key={comment.id} className="flex items-start gap-2.5">
                <AvatarChip
                  name={author?.display_name ?? '?'}
                  color={author?.signature_color ?? '#8b8b8b'}
                  size="sm"
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {author?.display_name ?? 'Someone'}
                    </span>{' '}
                    · {formatDistanceToNowStrict(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{comment.body}</p>
                </div>
                {comment.created_by_user_id === currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 touch:size-9 text-muted-foreground"
                    aria-label="Delete comment"
                    disabled={deletingId === comment.id}
                    onClick={() =>
                      runDelete({ table: 'comments', id: comment.id, noun: 'Comment' })
                    }
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Say something…"
          aria-label="Add a comment"
        />
        <Button
          type="button"
          size="sm"
          className="self-end"
          disabled={isPending || body.trim() === ''}
          onClick={onSubmit}
        >
          Comment
        </Button>
      </div>
    </section>
  )
}

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
    replaceAndRefresh(layer('/spending'))
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
            <Link href={layer(`/spending?selected=${spend.id}&edit=${spend.id}`)}>
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
        <ReactionsRow spendId={spend.id} reactions={reactions} currentUserId={currentUserId} />
        <CommentsSection
          spendId={spend.id}
          comments={comments}
          profilesById={profilesById}
          currentUserId={currentUserId}
        />
      </div>
    </DetailDrawer>
  )
}
