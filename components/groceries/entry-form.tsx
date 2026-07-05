'use client'

import type { z } from 'zod'
import { groceryEntryInputSchema } from '@/lib/schemas/grocery'
import { updateEntry } from '@/lib/actions/grocery-list'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection } from '@/components/screens/form-shell'
import { TextField, TextareaField } from '@/components/screens/form-fields-text'

// Edit-only: entries are created by the one-tap add paths, never a drawer.
// The item identity never changes on an entry — qty/note only.
export type EntryFormDefaults = z.input<typeof groceryEntryInputSchema>

type EntryFormProps = { mode: 'edit'; id: string; defaultValues: EntryFormDefaults }

export function EntryForm(props: EntryFormProps) {
  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={groceryEntryInputSchema}
      label="Entry"
      listHref="/groceries"
      defaultValues={props.defaultValues}
      updateAction={(id, values) => updateEntry(id, values)}
    >
      <FormSection>
        <TextField name="qty" label="Qty" placeholder="2, 1 kg, big bag…" autoFocus />
        <TextareaField name="note" label="Note" span="full" />
      </FormSection>
    </ResourceCrudForm>
  )
}
