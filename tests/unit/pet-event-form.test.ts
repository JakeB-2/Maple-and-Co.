import { describe, expect, it } from 'vitest'
import {
  buildEventFormSchema,
  eventFormDefaults,
  formValuesToEventValues,
} from '@/lib/calculations/pet-event-form'
import type { PetEventAttributeRow } from '@/lib/queries/pet-event-types'
import type { PetEventValueRow } from '@/lib/queries/pet-events'

function attr(overrides: Partial<PetEventAttributeRow>): PetEventAttributeRow {
  return {
    id: crypto.randomUUID(),
    event_type_id: 'type-1',
    label: 'Detail',
    system_key: null,
    value_kind: 'text',
    unit: null,
    required: false,
    sort_order: 10,
    config: {},
    created_at: '2026-07-04T12:00:00Z',
    created_by_user_id: null,
    updated_at: '2026-07-04T12:00:00Z',
    updated_by_user_id: null,
    deleted_at: null,
    deleted_by_user_id: null,
    ...overrides,
  }
}

function existingValue(
  overrides: Partial<PetEventValueRow> & Pick<PetEventValueRow, 'attribute_id'>
): PetEventValueRow {
  return {
    id: crypto.randomUUID(),
    value_text: null,
    value_number: null,
    value_boolean: null,
    choice_ids: null,
    file_path: null,
    ...overrides,
  }
}

// One optional attribute per kind, shared by the defaults/values tests.
const food = attr({ value_kind: 'text', label: 'Food' })
const story = attr({ value_kind: 'long_text', label: 'Story' })
const weight = attr({ value_kind: 'number', label: 'Weight', unit: 'kg' })
const limped = attr({ value_kind: 'boolean', label: 'Limped' })
const mood = attr({
  value_kind: 'single_choice',
  label: 'Mood',
  config: { options: [{ id: 'happy', label: 'Happy' }, { id: 'sleepy', label: 'Sleepy' }] },
})
const symptoms = attr({
  value_kind: 'multi_choice',
  label: 'Symptoms',
  config: { options: [{ id: 'itchy', label: 'Itchy' }, { id: 'tired', label: 'Tired' }] },
})
const photo = attr({ value_kind: 'photo', label: 'Photo' })
const allKinds = [food, story, weight, limped, mood, symptoms, photo]

describe('buildEventFormSchema', () => {
  it('rejects an empty required text field with a labeled message', () => {
    const requiredFood = attr({ value_kind: 'text', label: 'Food', required: true })
    const schema = buildEventFormSchema([requiredFood])
    const result = schema.safeParse({ [requiredFood.id]: '' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Food is required')
    expect(schema.safeParse({ [requiredFood.id]: 'Chicken' }).success).toBe(true)
  })

  it('coerces an optional number left blank to null', () => {
    const schema = buildEventFormSchema([weight])
    const blank = schema.safeParse({ [weight.id]: '' })
    expect(blank.success).toBe(true)
    if (blank.success) expect(blank.data[weight.id]).toBeNull()

    const typed = schema.safeParse({ [weight.id]: '12.5' })
    expect(typed.success).toBe(true)
    if (typed.success) expect(typed.data[weight.id]).toBe(12.5)
  })

  it('rejects a blank required number', () => {
    const requiredWeight = attr({ value_kind: 'number', label: 'Weight', required: true })
    const schema = buildEventFormSchema([requiredWeight])
    expect(schema.safeParse({ [requiredWeight.id]: '' }).success).toBe(false)
    expect(schema.safeParse({ [requiredWeight.id]: '12.5' }).success).toBe(true)
  })

  it('requires a selection for a required single_choice', () => {
    const requiredMood = attr({
      value_kind: 'single_choice',
      label: 'Mood',
      required: true,
      config: { options: [{ id: 'happy', label: 'Happy' }] },
    })
    const schema = buildEventFormSchema([requiredMood])
    expect(schema.safeParse({ [requiredMood.id]: '' }).success).toBe(false)
    expect(schema.safeParse({ [requiredMood.id]: 'happy' }).success).toBe(true)
  })

  it('defaults multi_choice to an empty array', () => {
    const schema = buildEventFormSchema([symptoms])
    const result = schema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data[symptoms.id]).toEqual([])
  })

  it('rejects an empty required multi_choice with a labeled message', () => {
    const requiredSymptoms = attr({
      value_kind: 'multi_choice',
      label: 'Symptoms',
      required: true,
      config: { options: [{ id: 'itchy', label: 'Itchy' }] },
    })
    const schema = buildEventFormSchema([requiredSymptoms])
    const empty = schema.safeParse({ [requiredSymptoms.id]: [] })
    expect(empty.success).toBe(false)
    if (!empty.success) expect(empty.error.issues[0]?.message).toBe('Symptoms is required')
    expect(schema.safeParse({ [requiredSymptoms.id]: ['itchy'] }).success).toBe(true)
  })
})

describe('eventFormDefaults', () => {
  it('fills blank defaults per kind when nothing was logged', () => {
    expect(eventFormDefaults(allKinds)).toEqual({
      [food.id]: '',
      [story.id]: '',
      [weight.id]: '',
      [limped.id]: false,
      [mood.id]: '',
      [symptoms.id]: [],
      [photo.id]: '',
    })
  })

  it('round-trips existing values, unpacking choice_ids per kind', () => {
    const defaults = eventFormDefaults(allKinds, [
      existingValue({ attribute_id: food.id, value_text: 'Chicken breast' }),
      existingValue({ attribute_id: story.id, value_text: 'A very long walk story' }),
      existingValue({ attribute_id: weight.id, value_number: 12.5 }),
      existingValue({ attribute_id: limped.id, value_boolean: true }),
      existingValue({ attribute_id: mood.id, choice_ids: ['happy'] }),
      existingValue({ attribute_id: symptoms.id, choice_ids: ['itchy', 'tired'] }),
      existingValue({ attribute_id: photo.id, file_path: 'pets/maple.jpg' }),
    ])
    expect(defaults).toEqual({
      [food.id]: 'Chicken breast',
      [story.id]: 'A very long walk story',
      [weight.id]: 12.5,
      [limped.id]: true,
      [mood.id]: 'happy',
      [symptoms.id]: ['itchy', 'tired'],
      [photo.id]: 'pets/maple.jpg',
    })
  })
})

describe('formValuesToEventValues', () => {
  it('skips empty strings, nulls, false booleans and empty arrays', () => {
    // story.id is deliberately absent — a missing key is skipped too.
    const values = {
      [food.id]: '',
      [weight.id]: null,
      [limped.id]: false,
      [mood.id]: '',
      [symptoms.id]: [],
      [photo.id]: '',
    }
    expect(formValuesToEventValues(allKinds, values)).toEqual([])
  })

  it('maps each kind onto its typed column', () => {
    const result = formValuesToEventValues(allKinds, {
      [food.id]: 'Chicken breast',
      [story.id]: 'A very long walk story',
      [weight.id]: 12.5,
      [limped.id]: true,
      [mood.id]: 'happy',
      [symptoms.id]: ['itchy', 'tired'],
      [photo.id]: 'pets/maple.jpg',
    })
    expect(result).toHaveLength(7)
    const byAttr = new Map(result.map((value) => [value.attribute_id, value]))
    expect(byAttr.get(food.id)?.value_text).toBe('Chicken breast')
    expect(byAttr.get(story.id)?.value_text).toBe('A very long walk story')
    expect(byAttr.get(weight.id)?.value_number).toBe(12.5)
    expect(byAttr.get(limped.id)?.value_boolean).toBe(true)
    expect(byAttr.get(mood.id)?.choice_ids).toEqual(['happy'])
    expect(byAttr.get(symptoms.id)?.choice_ids).toEqual(['itchy', 'tired'])
    expect(byAttr.get(photo.id)?.file_path).toBe('pets/maple.jpg')
  })
})
