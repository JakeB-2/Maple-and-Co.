'use client'

import { z } from 'zod'
import { VALUE_KINDS } from '@/lib/schemas/event-type'
import type { ChoiceOption } from '@/lib/queries/event-types'
import type { EntityKind } from '@/lib/queries/entities'
import { createEventTypeAttribute, updateEventTypeAttribute } from '@/lib/actions/event-type-attributes'
import { KIND_COPY } from '@/components/entities/entity-kind'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection, useFormContext } from '@/components/screens/form-shell'
import { CheckboxField, TextField, TextareaField } from '@/components/screens/form-fields-text'
import { SelectField } from '@/components/screens/form-fields-select'

export type ValueKind = (typeof VALUE_KINDS)[number]

export const VALUE_KIND_LABELS: Record<ValueKind, string> = {
  text: 'Text',
  long_text: 'Long text',
  number: 'Number',
  boolean: 'Yes / no',
  single_choice: 'Single choice',
  multi_choice: 'Multi choice',
  photo: 'Photo',
}

const CHOICE_KINDS: readonly string[] = ['single_choice', 'multi_choice']

// Client form-values shape: choice options are edited as text lines;
// `toAttributeInput` parses them into the server's structured options.
const attributeFormSchema = z.object({
  event_type_id: z.uuid(),
  label: z.string().trim().min(1, 'Label is required').max(60),
  value_kind: z.enum(VALUE_KINDS),
  unit: z.string().max(12),
  required: z.boolean(),
  options_text: z.string(),
  sort_order: z.coerce.number().int(),
})

type AttributeFormValues = z.infer<typeof attributeFormSchema>
export type AttributeFormDefaults = z.input<typeof attributeFormSchema>

// Option ids are identity — logged choice_ids point at them — so the id must
// derive deterministically from the label (re-typing a line keeps its id).
function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const EMOJI_TOKEN_RE = /\p{Extended_Pictographic}/u

function parseOptionLines(text: string): ChoiceOption[] {
  const seen = new Set<string>()
  const options: ChoiceOption[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const [first = '', ...rest] = line.split(/\s+/)
    const hasEmoji = rest.length > 0 && EMOJI_TOKEN_RE.test(first)
    const label = hasEmoji ? rest.join(' ') : line
    const id = slugify(label)
    if (!id || seen.has(id)) continue
    seen.add(id)
    options.push(hasEmoji ? { id, label, emoji: first } : { id, label })
  }
  return options
}

function toAttributeInput(values: AttributeFormValues): Record<string, unknown> {
  const { options_text, ...fields } = values
  return {
    ...fields,
    // A "required" yes/no is nonsense (unchecked = not logged, never "no"), so
    // the flag is meaningless for booleans — force it off, neutralizing any
    // already-saved value on the next edit.
    required: fields.value_kind === 'boolean' ? false : fields.required,
    ...(CHOICE_KINDS.includes(fields.value_kind)
      ? { options: parseOptionLines(options_text) }
      : {}),
  }
}

// Not user-facing — event_type_id pins the attribute to its type; sort_order
// is assigned on create, changed via the list's move arrows.
function HiddenFields() {
  const { register } = useFormContext()
  return (
    <>
      <input type="hidden" {...register('event_type_id')} />
      <input type="hidden" {...register('sort_order')} />
    </>
  )
}

function ChoiceOptionsField() {
  const { watch } = useFormContext()
  const valueKind = watch('value_kind') as string
  if (!CHOICE_KINDS.includes(valueKind)) return null
  return (
    <div className="md:col-span-2">
      <TextareaField
        name="options_text"
        label="Options (one per line, emoji first — e.g. 🌅 Breakfast)"
        rows={5}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Removing a line retires it from new logs but keeps it readable in past
        ones. Editing a label adds a new option — the old one is retired.
      </p>
    </div>
  )
}

// A "required" yes/no is meaningless (an unchecked box means "not logged"), so
// the flag is hidden for booleans.
function RequiredField() {
  const { watch } = useFormContext()
  const valueKind = watch('value_kind') as string
  if (valueKind === 'boolean') return null
  return <CheckboxField name="required" label="Required" />
}

type AttributeFormProps = { kind: EntityKind; defaultValues: AttributeFormDefaults } & (
  | { mode: 'new' }
  | { mode: 'edit'; id: string; hasLogged: boolean }
)

export function AttributeForm(props: AttributeFormProps) {
  const listHref = `${KIND_COPY[props.kind].base}/types/${props.defaultValues.event_type_id}`
  // Kind is only immutable once a value has been logged against it (matches the
  // server guard); an unlogged attribute can still be re-typed.
  const kindLocked = props.mode === 'edit' && props.hasLogged

  const fields = (
    <FormSection>
      <TextField name="label" label="Label" required autoFocus />
      <SelectField
        name="value_kind"
        label="Kind"
        options={VALUE_KINDS.map((kind) => ({ label: VALUE_KIND_LABELS[kind], value: kind }))}
        locked={kindLocked}
        lockReason={kindLocked ? "Kind can't change once logged" : undefined}
      />
      <TextField name="unit" label="Unit" placeholder="kg, min, …" maxLength={12} />
      <RequiredField />
      <ChoiceOptionsField />
      <HiddenFields />
    </FormSection>
  )

  if (props.mode === 'new') {
    return (
      <ResourceCrudForm
        mode="new"
        schema={attributeFormSchema}
        label="Attribute"
        listHref={listHref}
        redirectMode="list"
        defaultValues={props.defaultValues}
        transform={toAttributeInput}
        createAction={(values) => createEventTypeAttribute(values)}
      >
        {fields}
      </ResourceCrudForm>
    )
  }

  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={attributeFormSchema}
      label="Attribute"
      listHref={listHref}
      redirectMode="list"
      defaultValues={props.defaultValues}
      transform={toAttributeInput}
      updateAction={(id, values) => updateEventTypeAttribute(id, values)}
    >
      {fields}
    </ResourceCrudForm>
  )
}
