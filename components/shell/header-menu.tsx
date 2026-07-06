'use client'

// Per-module settings menu in the page header (D-033): the vertical-ellipsis
// dropdown that replaced the dedicated Settings page. A thin adapter over the
// existing MoreActionsMenu (no clones) so every header menu stays one shape —
// add an item to the array and it's in the menu.

import type { LucideIcon } from 'lucide-react'
import { MoreActionsMenu } from '@/components/ui/more-actions-menu'

export type HeaderMenuItem = { label: string; href: string; icon?: LucideIcon }

export function HeaderMenu({ label = 'Page options', items }: { label?: string; items: HeaderMenuItem[] }) {
  return (
    <MoreActionsMenu
      triggerLabel={label}
      actions={items.map(({ label: itemLabel, href, icon }) => ({ label: itemLabel, href, icon }))}
    />
  )
}
