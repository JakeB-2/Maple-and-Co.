'use client'

// The two (and only two) global settings: the app's title and the household
// photo (D-033 — everything else moved into its module). One form submits
// both fields together, always seeded with the current values of each, so
// changing the photo can never clobber an untouched title and vice versa.

import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import {
  householdSettingsInputSchema,
  type HouseholdSettingsInput,
} from '@/lib/schemas/household-settings'
import { updateHouseholdSettings } from '@/lib/actions/household-settings'
import { CrudForm } from '@/components/screens/crud-form'
import { FormSection } from '@/components/screens/form-shell'
import { TextField } from '@/components/screens/form-fields-text'
import { PhotoField } from '@/components/screens/form-fields-photo'

export function HouseholdForm({ defaultValues }: { defaultValues: HouseholdSettingsInput }) {
  const { refreshNow } = useMutationRefresh()

  return (
    <CrudForm
      schema={householdSettingsInputSchema}
      defaultValues={defaultValues}
      onSubmit={(values) => updateHouseholdSettings(values)}
      title="Household"
      backHref="/household"
      // Inline page form, not a drawer: there's nowhere to "cancel" to, so the
      // empty href suppresses the Cancel button (title/backHref are unused in
      // drawer chrome — the page's PageHeader is the header).
      cancelHref=""
      chrome="drawer"
      submitLabel="Save Changes"
      successMessage="Household updated"
      // The new title feeds the root generateMetadata — refresh the RSC tree so
      // the browser tab (and any header brand) picks it up without a reload.
      onSuccess={() => refreshNow()}
    >
      <FormSection>
        <TextField name="app_title" label="App title" required maxLength={40} />
        <PhotoField
          name="photo_path"
          folder="household"
          label="Household photo"
          alt="Household photo"
        />
      </FormSection>
    </CrudForm>
  )
}
