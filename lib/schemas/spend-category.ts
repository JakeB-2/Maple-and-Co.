import { z } from 'zod'

export const spendCategoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50),
  emoji: z.string().trim().min(1).max(8),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #c9702e'),
  sort_order: z.coerce.number().int(),
})

export type SpendCategoryInput = z.infer<typeof spendCategoryInputSchema>
