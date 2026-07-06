// /household — the only global settings left after the IA rework (D-033):
// the app's title (feeds the root generateMetadata) and the household photo.
// Everything else that used to live under /settings moved into its module.

import { requireAuth } from '@/lib/auth/dal'
import { fetchHouseholdSettings } from '@/lib/queries/household-settings'
import { PageHeader } from '@/components/shell/page-header'
import { HouseholdForm } from '@/components/household/household-form'

export const dynamic = 'force-dynamic'

export default async function HouseholdPage() {
  const { supabase } = await requireAuth()
  const settings = await fetchHouseholdSettings(supabase)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Household" subtitle="Your home's name and face, everywhere in the app." />

      <HouseholdForm
        defaultValues={{
          app_title: settings.app_title,
          // PhotoField holds '' for "no photo"; the default nullifyEmpty
          // transform turns it back into null on save.
          photo_path: settings.photo_path ?? '',
        }}
      />
    </div>
  )
}
