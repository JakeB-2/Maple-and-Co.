import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth/dal'
import { sanitizeUuidParam } from '@/lib/utils'
import { fetchSpendCategories } from '@/lib/queries/spend-categories'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { CategoryList } from '@/components/settings/category-list'
import { CategoryFormBody } from '@/components/settings/category-form-body'

export const dynamic = 'force-dynamic'

export default async function SpendCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>
}) {
  const { supabase } = await requireAuth()
  const params = await searchParams
  const editId = sanitizeUuidParam(params.edit)

  const categories = await fetchSpendCategories(supabase)

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" /> Settings
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Spend categories</h1>
        <p className="text-sm text-muted-foreground">
          Name, emoji, and color — ordered the way you want them in the picker.
        </p>
      </header>

      <CategoryList
        categories={categories.map(({ id, name, emoji, color }) => ({ id, name, emoji, color }))}
      />

      <ResourceFormDrawers
        isNew={params.new === '1'}
        editId={editId}
        newTitle="New category"
        editTitle="Edit category"
        newSize="sm"
        editSize="sm"
        newBody={<CategoryFormBody mode="new" />}
        editBody={editId ? <CategoryFormBody mode="edit" id={editId} /> : null}
      />
    </div>
  )
}
