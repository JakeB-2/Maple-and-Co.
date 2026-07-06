// The navigation IA as a code-level config (D-033): one array defines both the
// bottom bar and the More Actions menu. Moving an entry between them is a
// one-line `placement` flip — deliberately NOT a DB table or in-app editor;
// nav shape is a dev-time decision, unlike Needs, which are per-household data.
//
// Bar order matters: Today sits center (primary thumb position); the bar's
// fifth slot is always the More hamburger, rendered by TabBar itself.

import {
  CalendarDays,
  Coins,
  Leaf,
  ListChecks,
  PawPrint,
  Settings,
  ShoppingBasket,
  Sun,
  type LucideIcon,
} from 'lucide-react'

export type NavPlacement = 'bar' | 'menu'

export type NavItem = {
  key: string
  href: string
  label: string
  icon: LucideIcon
  placement: NavPlacement
  /** Pathname prefixes that count as active; defaults to [href]. */
  match?: readonly string[]
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'calendar', href: '/calendar', label: 'Calendar', icon: CalendarDays, placement: 'bar' },
  { key: 'pets', href: '/pets', label: 'Pets', icon: PawPrint, placement: 'bar' },
  { key: 'today', href: '/', label: 'Today', icon: Sun, placement: 'bar' },
  { key: 'plants', href: '/plants', label: 'Plants', icon: Leaf, placement: 'bar' },
  { key: 'finance', href: '/finance', label: 'Finance', icon: Coins, placement: 'menu' },
  { key: 'groceries', href: '/groceries', label: 'Groceries', icon: ShoppingBasket, placement: 'menu' },
  { key: 'tasks', href: '/tasks', label: 'Tasks', icon: ListChecks, placement: 'menu' },
  { key: 'household', href: '/household', label: 'Household', icon: Settings, placement: 'menu' },
]

export function barItems(): NavItem[] {
  return NAV_ITEMS.filter((item) => item.placement === 'bar')
}

export function menuItems(): NavItem[] {
  return NAV_ITEMS.filter((item) => item.placement === 'menu')
}

export function isNavActive(pathname: string, item: NavItem): boolean {
  const match = item.match ?? [item.href]
  return match.some((m) => (m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(`${m}/`)))
}
