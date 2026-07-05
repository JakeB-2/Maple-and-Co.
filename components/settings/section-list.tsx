'use client'

import { SortableSettingsList } from './sortable-settings-list'

export type SectionListRow = { id: string; name: string }

export function SectionList({ storeId, sections }: { storeId: string; sections: SectionListRow[] }) {
  return (
    <SortableSettingsList
      items={sections}
      table="store_sections"
      editHref={(section) => `/settings/stores/${storeId}?edit=${section.id}`}
      rowLabel={(section) => section.name}
      deleteNoun="Section"
      newLabel="New section"
      emptyText="No sections yet — add the first one."
      renderLead={(section) => (
        <span className="min-w-0 flex-1 truncate text-sm">{section.name}</span>
      )}
    />
  )
}
