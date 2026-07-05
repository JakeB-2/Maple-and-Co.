'use client'

import { SortableSettingsList } from './sortable-settings-list'
import { VALUE_KIND_LABELS, type ValueKind } from './attribute-form'

export type AttributeListRow = {
  id: string
  label: string
  value_kind: string
  unit: string | null
  required: boolean
  system_key: string | null
}

export function AttributeList({
  typeId,
  attributes,
}: {
  typeId: string
  attributes: AttributeListRow[]
}) {
  return (
    <SortableSettingsList
      items={attributes}
      table="pet_event_attributes"
      editHref={(attribute) => `/settings/pet-events/${typeId}?edit=${attribute.id}`}
      rowLabel={(attribute) => attribute.label}
      deleteNoun="Attribute"
      newLabel="New attribute"
      emptyText="No fields yet — add the first one."
      // system_key attributes anchor analytics (e.g. the weight sparkline) and
      // can never be recreated from the UI — deleting is disabled.
      canDelete={(attribute) => attribute.system_key === null}
      deleteDisabledReason="Built-in fields power charts and can’t be deleted."
      renderLead={(attribute) => {
        const kindLabel =
          VALUE_KIND_LABELS[attribute.value_kind as ValueKind] ?? attribute.value_kind
        return (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="min-w-0 truncate text-sm">{attribute.label}</span>
            <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-micro text-muted-foreground">
              {kindLabel}
            </span>
            {attribute.unit && (
              <span className="shrink-0 text-xs text-muted-foreground">{attribute.unit}</span>
            )}
            {attribute.required && (
              <span title="Required" className="size-1.5 shrink-0 rounded-full bg-primary">
                <span className="sr-only">Required</span>
              </span>
            )}
          </div>
        )
      }}
    />
  )
}
