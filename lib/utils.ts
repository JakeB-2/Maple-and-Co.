// Tiny, generic utilities used across the codebase:
//   - cn(...) — conditional Tailwind class merger (shadcn convention)
//   - nullifyEmpty(obj) — convert empty strings to null before DB writes
//   - sanitizeUuidParam(value) — validate uuid-shaped URL params before querying

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Returns the value only if it is a valid uuid, else null. Guards Postgres
 * from invalid-uuid throws on ids taken from URL search params.
 */
export function sanitizeUuidParam(value: string | undefined): string | null {
  return value && UUID_RE.test(value) ? value : null
}
