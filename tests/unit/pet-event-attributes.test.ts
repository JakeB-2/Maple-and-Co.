import { describe, expect, it } from 'vitest'
import { mergeAttributeOptions } from '@/lib/queries/pet-event-types'
import type { ChoiceOption } from '@/lib/queries/pet-event-types'

// D-013: choice options are append-only. Logged choice_ids point at option ids,
// so a merge on edit must NEVER drop a kept id — it archives ids the user
// removed, un-archives/updates ids they kept, and appends brand-new ids.
describe('mergeAttributeOptions (D-013 append-only)', () => {
  const wet: ChoiceOption = { id: 'wet', label: 'Wet food', emoji: '🥫' }
  const dry: ChoiceOption = { id: 'dry', label: 'Dry food', emoji: '🦴' }

  it('archives a kept id the user removed instead of dropping it', () => {
    const merged = mergeAttributeOptions([wet, dry], [wet])
    expect(merged).toEqual([
      { id: 'wet', label: 'Wet food', emoji: '🥫', archived: false },
      { id: 'dry', label: 'Dry food', emoji: '🦴', archived: true },
    ])
  })

  it('never drops a kept id, whatever the submission', () => {
    const keptIds = ['wet', 'dry']
    const merged = mergeAttributeOptions([wet, dry], [])
    expect(merged.map((o) => o.id).sort()).toEqual(keptIds.sort())
    expect(merged.every((o) => o.archived)).toBe(true)
  })

  it('takes the payload label/emoji for a kept id and marks it un-archived', () => {
    const renamed: ChoiceOption = { id: 'wet', label: 'Wet (pouch)', emoji: '🍲' }
    const merged = mergeAttributeOptions([wet], [renamed])
    expect(merged).toEqual([{ id: 'wet', label: 'Wet (pouch)', emoji: '🍲', archived: false }])
  })

  it('un-archives a previously-archived option when its id is re-submitted', () => {
    const archivedDry: ChoiceOption = { ...dry, archived: true }
    const merged = mergeAttributeOptions([wet, archivedDry], [wet, dry])
    expect(merged.find((o) => o.id === 'dry')).toEqual({
      id: 'dry',
      label: 'Dry food',
      emoji: '🦴',
      archived: false,
    })
  })

  it('appends a brand-new id as active after the kept options', () => {
    const treat: ChoiceOption = { id: 'treat', label: 'Treat', emoji: '🍖' }
    const merged = mergeAttributeOptions([wet], [wet, treat])
    expect(merged).toEqual([
      { id: 'wet', label: 'Wet food', emoji: '🥫', archived: false },
      { id: 'treat', label: 'Treat', emoji: '🍖' },
    ])
  })
})
