'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { EntityKind } from '@/lib/queries/entities'
import { KIND_COPY } from '@/components/entities/entity-kind'
import { SortableSettingsList } from './sortable-settings-list'

export type EventTypeListRow = {
  id: string
  name: string
  emoji: string
  system_key: string | null
}

export function EventTypeList({
  kind,
  types,
  typeIdsInUse,
}: {
  kind: EntityKind
  types: EventTypeListRow[]
  /** Types referenced by a live need — deleting one would strand the need as a
   *  permanent un-loggable chip on the profile/Today (D-032). */
  typeIdsInUse: string[]
}) {
  const typesBase = `${KIND_COPY[kind].base}/types`
  const inUse = new Set(typeIdsInUse)
  return (
    <SortableSettingsList
      items={types}
      table="event_types"
      editHref={(type) => `${typesBase}?edit=${type.id}`}
      rowLabel={(type) => type.name}
      deleteNoun="Event type"
      newLabel="New event type"
      emptyText="No event types yet — add the first one."
      // system_key anchors analytics + task linkage, so built-ins can be
      // renamed/reordered but never deleted; in-use types would orphan needs.
      canDelete={(type) => type.system_key === null && !inUse.has(type.id)}
      deleteDisabledReason={(type) =>
        type.system_key !== null
          ? 'Built-in types can be renamed, not deleted.'
          : 'In use by a need — remove it from the pet or plant profile first.'
      }
      renderLead={(type) => (
        <Link
          href={`${typesBase}/${type.id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <span aria-hidden className="text-base">
            {type.emoji}
          </span>
          <span className="min-w-0 truncate text-sm">{type.name}</span>
          {type.system_key && (
            <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-micro text-muted-foreground">
              {type.system_key}
            </span>
          )}
          <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      )}
    />
  )
}
