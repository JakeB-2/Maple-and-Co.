'use client'

import { SortableSettingsList } from './sortable-settings-list'

export type CategoryListRow = { id: string; name: string; emoji: string; color: string }

export function CategoryList({ categories }: { categories: CategoryListRow[] }) {
  return (
    <SortableSettingsList
      items={categories}
      table="spend_categories"
      editHref={(category) => `/finance/categories?edit=${category.id}`}
      rowLabel={(category) => category.name}
      deleteNoun="Category"
      newLabel="New category"
      emptyText="No categories yet — add the first one."
      renderLead={(category) => (
        <>
          <span aria-hidden className="text-base">
            {category.emoji}
          </span>
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="min-w-0 flex-1 truncate text-sm">{category.name}</span>
        </>
      )}
    />
  )
}
