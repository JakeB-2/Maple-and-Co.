'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { SortableSettingsList } from './sortable-settings-list'

export type EventTypeListRow = {
  id: string
  name: string
  emoji: string
  system_key: string | null
}

export function EventTypeList({ types }: { types: EventTypeListRow[] }) {
  return (
    <SortableSettingsList
      items={types}
      table="pet_event_types"
      editHref={(type) => `/settings/pet-events?edit=${type.id}`}
      rowLabel={(type) => type.name}
      deleteNoun="Event type"
      newLabel="New event type"
      emptyText="No event types yet — add the first one."
      // system_key anchors analytics + task linkage, so built-ins can be
      // renamed/reordered but never deleted.
      canDelete={(type) => type.system_key === null}
      deleteDisabledReason="Built-in types can be renamed, not deleted."
      renderLead={(type) => (
        <Link
          href={`/settings/pet-events/${type.id}`}
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
