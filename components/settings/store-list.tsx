'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { SortableSettingsList } from './sortable-settings-list'

export type StoreListRow = { id: string; name: string; emoji: string; currency: string }

export function StoreList({ stores }: { stores: StoreListRow[] }) {
  return (
    <SortableSettingsList
      items={stores}
      table="stores"
      editHref={(store) => `/groceries/stores?edit=${store.id}`}
      rowLabel={(store) => store.name}
      deleteNoun="Store"
      newLabel="New store"
      emptyText="No stores yet — add the first one."
      renderLead={(store) => (
        <Link href={`/groceries/stores/${store.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span aria-hidden className="text-base">
            {store.emoji}
          </span>
          <span className="min-w-0 truncate text-sm">{store.name}</span>
          <span className="text-xs text-muted-foreground">{store.currency}</span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      )}
    />
  )
}
