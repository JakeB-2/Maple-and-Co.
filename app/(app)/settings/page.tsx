import { requireAuth } from '@/lib/auth/dal'
import { LinkedRowList } from '@/components/screens/row-list'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  await requireAuth()
  return (
    <div className="flex flex-col gap-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>

      <LinkedRowList
        title="Spending"
        rows={[
          {
            name: 'Categories',
            meta: 'Names, emoji, colors, order',
            href: '/settings/categories',
          },
        ]}
      />

      <LinkedRowList
        title="Groceries"
        rows={[
          {
            name: 'Stores & sections',
            meta: 'Where you shop, aisle by aisle',
            href: '/settings/stores',
          },
        ]}
      />

      <LinkedRowList
        title="Maple"
        rows={[
          {
            name: 'Event types',
            meta: 'What you log about Maple',
            href: '/settings/pet-events',
          },
        ]}
      />

      <p className="px-1 text-sm text-muted-foreground">
        Profile colors arrive with their features. 🐾
      </p>
    </div>
  )
}
