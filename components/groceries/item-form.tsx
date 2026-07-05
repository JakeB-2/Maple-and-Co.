'use client'

import type { z } from 'zod'
import { groceryItemInputSchema } from '@/lib/schemas/grocery'
import { updateGroceryItem } from '@/lib/actions/grocery-items'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection } from '@/components/screens/form-shell'
import { TextField } from '@/components/screens/form-fields-text'

// Edit-only: items are created by quick-add on the list, never a drawer.
export type ItemFormDefaults = z.input<typeof groceryItemInputSchema>

type ItemFormProps = {
  mode: 'edit'
  id: string
  defaultValues: ItemFormDefaults
  /** The entry drawer this edit was opened from — save/cancel return to it. */
  selectedEntryId?: string | null
}

export function ItemForm(props: ItemFormProps) {
  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={groceryItemInputSchema}
      label="Item"
      listHref="/groceries"
      redirectMode={props.selectedEntryId ? 'selected' : 'list'}
      selectedId={props.selectedEntryId ?? undefined}
      defaultValues={props.defaultValues}
      updateAction={(id, values) => updateGroceryItem(id, values)}
    >
      <FormSection>
        <TextField name="name" label="Name" required autoFocus />
        <TextField name="emoji" label="Emoji" required placeholder="🛒" maxLength={8} />
        <TextField name="default_qty" label="Usual amount" />
      </FormSection>
    </ResourceCrudForm>
  )
}
