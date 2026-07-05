// EAV value rendering for pet events (D-013) — the one place a raw
// pet_event_values row becomes a human-readable string. Server-safe.

import { attributeOptions, type PetEventAttributeRow } from '@/lib/queries/pet-event-types'
import type { PetEventRow, PetEventValueRow } from '@/lib/queries/pet-events'
import { Field } from '@/components/screens/field'

type ValuePair = { value: PetEventValueRow; attr: PetEventAttributeRow }

// Values whose attribute was since deleted are skipped — the event survives
// its schema (D-013), so orphan values are expected, not an error.
function sortedValues(
  event: PetEventRow,
  attributesById: Record<string, PetEventAttributeRow>
): ValuePair[] {
  return event.values
    .flatMap((value) => {
      const attr = attributesById[value.attribute_id]
      return attr ? [{ value, attr }] : []
    })
    .sort((a, b) => a.attr.sort_order - b.attr.sort_order)
}

// Display text per value_kind; null = nothing to show (empty value, false
// boolean, photo — photos render as images, never text).
function valueText(value: PetEventValueRow, attr: PetEventAttributeRow): string | null {
  switch (attr.value_kind) {
    case 'text':
    case 'long_text':
      return value.value_text
    case 'number':
      if (value.value_number == null) return null
      return `${value.value_number}${attr.unit ? ` ${attr.unit}` : ''}`
    case 'boolean':
      return value.value_boolean ? attr.label : null
    case 'single_choice':
    case 'multi_choice': {
      const ids = Array.isArray(value.choice_ids)
        ? value.choice_ids.filter((id): id is string => typeof id === 'string')
        : []
      const options = attributeOptions(attr)
      const labels = ids.flatMap((id) => {
        const option = options.find((o) => o.id === id)
        if (!option) return []
        return [option.emoji ? `${option.emoji} ${option.label}` : option.label]
      })
      return labels.length > 0 ? labels.join(', ') : null
    }
    default:
      return null
  }
}

/** One-line digest for feed rows: first two value displays, ' · '-joined. */
export function eventSummary(
  event: PetEventRow,
  attributesById: Record<string, PetEventAttributeRow>
): string {
  return sortedValues(event, attributesById)
    .flatMap(({ value, attr }) => {
      const text = valueText(value, attr)
      return text ? [text] : []
    })
    .slice(0, 2)
    .join(' · ')
}

/** Drawer body: photos above, then a Field row per non-photo value. */
export function EventValueLines({
  event,
  attributesById,
}: {
  event: PetEventRow
  attributesById: Record<string, PetEventAttributeRow>
}) {
  const pairs = sortedValues(event, attributesById)
  const photos = pairs.filter(({ value, attr }) => attr.value_kind === 'photo' && value.file_path)
  const fields = pairs.flatMap((pair) => {
    const text = valueText(pair.value, pair.attr)
    return text ? [{ ...pair, text }] : []
  })

  return (
    <>
      {photos.map(({ value, attr }) => (
        // eslint-disable-next-line @next/next/no-img-element -- authed same-origin proxy; next/image can't fetch it
        <img
          key={value.id}
          src={`/media/${value.file_path}`}
          alt={`${attr.label} photo`}
          className="max-h-72 w-full rounded-lg border object-cover"
        />
      ))}
      {fields.map(({ value, attr, text }) =>
        attr.value_kind === 'long_text' ? (
          <Field key={value.id} label={attr.label} alignTop>
            <span className="whitespace-pre-wrap break-words">{text}</span>
          </Field>
        ) : (
          <Field key={value.id} label={attr.label}>
            {attr.value_kind === 'boolean' ? 'Yes' : text}
          </Field>
        )
      )}
    </>
  )
}
