import { z } from 'zod'
import { CURRENCIES } from '@/lib/config'

// Shared by the form (client) and the action (server) — one source of truth.
export const storeInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  emoji: z.string().trim().min(1, 'Pick an emoji').max(8),
  // The running total during a trip renders in this currency (D-008).
  currency: z.enum(CURRENCIES),
  sort_order: z.coerce.number().int(),
})

export type StoreInput = z.infer<typeof storeInputSchema>

export const storeSectionInputSchema = z.object({
  store_id: z.uuid(),
  name: z.string().trim().min(1, 'Name is required').max(60),
  // Aisle walk order for this store — shopping mode groups in this order.
  sort_order: z.coerce.number().int(),
})

export type StoreSectionInput = z.infer<typeof storeSectionInputSchema>
