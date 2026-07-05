import { z } from 'zod'

// Shared by forms (client) and actions (server) — one source of truth.

export const groceryItemInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  emoji: z.string().trim().min(1, 'Pick an emoji').max(8),
  default_qty: z
    .string()
    .trim()
    .max(30)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
})

export type GroceryItemInput = z.infer<typeof groceryItemInputSchema>

/** The one-tap paths: add by known item, or find-or-create by typed name. */
export const addEntryInputSchema = z.object({
  grocery_item_id: z.uuid(),
})

export const quickAddInputSchema = z.object({
  name: z.string().trim().min(1, 'Type something to add').max(60),
})

/** Entry edit is qty/note only — the item identity never changes on an entry. */
export const groceryEntryInputSchema = z.object({
  qty: z
    .string()
    .trim()
    .max(30)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  note: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
})

export type GroceryEntryInput = z.infer<typeof groceryEntryInputSchema>

export const checkOffInputSchema = z.object({
  entry_id: z.uuid(),
  store_id: z.uuid(),
  // Optional at the till — skipping the prompt still checks the item off.
  price: z.number().positive('Price must be more than zero').multipleOf(0.01).nullable(),
})

export const uncheckInputSchema = z.object({
  entry_id: z.uuid(),
})

export const placementInputSchema = z.object({
  grocery_item_id: z.uuid(),
  store_id: z.uuid(),
  section_id: z.uuid(),
})
