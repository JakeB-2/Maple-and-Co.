// Per-kind UI copy + routing for the entities module (D-032/D-033): pets and
// plants share every component; ONLY the words, emoji and base route differ.
// This map is that entire difference — no component branches on kind directly.

import type { EntityKind } from '@/lib/queries/entities'

export type EntityKindCopy = {
  /** Route base: '/pets' | '/plants'. */
  base: string
  /** Module title for PageHeader / nav ('Pets' / 'Plants'). */
  label: string
  /** Singular noun for buttons and toasts ('pet' / 'plant'). */
  noun: string
  /** Avatar fallback when there's no photo. */
  emoji: string
  /** Media upload folder (mirrors lib/actions/media.ts MEDIA_FOLDERS). */
  folder: 'pets' | 'plants'
  /** Date-field label: pets are born, plants are acquired. */
  birthdayLabel: string
  /** Trailing flourish on the quick-log success toast. */
  logFlourish: string
  /** Empty-feed copy; takes the entity's name. */
  emptyFeed: (name: string) => string
}

export const KIND_COPY: Record<EntityKind, EntityKindCopy> = {
  pet: {
    base: '/pets',
    label: 'Pets',
    noun: 'pet',
    emoji: '🐕',
    folder: 'pets',
    birthdayLabel: 'Birthday',
    logFlourish: '🐾',
    emptyFeed: (name) => `Nothing logged yet — ${name} awaits their biographers. 🐾`,
  },
  plant: {
    base: '/plants',
    label: 'Plants',
    noun: 'plant',
    emoji: '🪴',
    folder: 'plants',
    birthdayLabel: 'Got it on',
    logFlourish: '🌿',
    emptyFeed: (name) => `Nothing logged yet — ${name} grows in silence. 🌿`,
  },
}

/** Profile route for an entity: `/pets/<id>` | `/plants/<id>`. */
export function entityPath(kind: EntityKind, id: string): string {
  return `${KIND_COPY[kind].base}/${id}`
}
