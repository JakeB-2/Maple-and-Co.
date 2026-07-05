'use client'

// Reactions + comments shared by entity detail drawers — polymorphic over the
// comments/reactions entity_type union (spend, grocery_item, …).

import { useState, useTransition } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommentRow, ReactionRow } from '@/lib/queries/comments'
import { addComment, toggleReaction, type CommentEntityType } from '@/lib/actions/comments'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useSoftDeleteWithUndo } from '@/lib/hooks/use-soft-delete-with-undo'
import { SectionHeader } from '@/components/screens/surface'
import { AvatarChip } from '@/components/shell/avatar-chip'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const REACTION_EMOJI = ['❤️', '😂', '😮', '👍', '🎉']

export type ProfileChip = { id: string; display_name: string; signature_color: string }

export function ReactionsRow({
  entityType,
  entityId,
  reactions,
  currentUserId,
}: {
  entityType: CommentEntityType
  entityId: string
  reactions: ReactionRow[]
  currentUserId: string
}) {
  const [isPending, startTransition] = useTransition()
  const { refreshNow } = useMutationRefresh()
  const emojis = [...new Set([...REACTION_EMOJI, ...reactions.map((r) => r.emoji)])]

  function onToggle(emoji: string) {
    startTransition(async () => {
      const result = await toggleReaction({ entity_type: entityType, entity_id: entityId, emoji })
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

export function CommentsSection({
  entityType,
  entityId,
  comments,
  profilesById,
  currentUserId,
}: {
  entityType: CommentEntityType
  entityId: string
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
      const result = await addComment({
        entity_type: entityType,
        entity_id: entityId,
        body: trimmed,
      })
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
