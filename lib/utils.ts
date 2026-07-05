// Tiny, generic utilities used across the codebase. Two helpers only:
//   - cn(...) — conditional Tailwind class merger (shadcn convention)
//   - nullifyEmpty(obj) — convert empty strings to null before DB writes

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Converts empty strings to null in a plain object. Use before DB inserts/updates. */
export function nullifyEmpty<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v])
  ) as T
}
