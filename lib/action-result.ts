// Uniform result envelope for all server actions. Actions never throw to the
// client — they return an ActionResult so forms can render errors and
// warnings without a crash boundary.
//
// Warnings protocol (matches the copied CrudForm/useActionSubmit machinery):
// warnings WITHOUT an error means the write was NOT committed — the UI shows
// the warnings with a force checkbox and resubmits with force=true.

export type ActionWarning = {
  kind: string
  message: string
  meta?: Record<string, unknown>
}

export type ActionResult<T = void> =
  | { data: T; error: null; warnings?: ActionWarning[] }
  | { data: null; error: string; warnings?: ActionWarning[] }

export function ok<T>(data: T, warnings?: ActionWarning[]): ActionResult<T> {
  return warnings?.length ? { data, error: null, warnings } : { data, error: null }
}

export function fail<T = void>(error: string, warnings?: ActionWarning[]): ActionResult<T> {
  return warnings?.length ? { data: null, error, warnings } : { data: null, error }
}

/** Soft-warning result: data present but NOT committed — see protocol above. */
export function warn<T>(data: T, warnings: ActionWarning[]): ActionResult<T> {
  return { data, error: null, warnings }
}

// Postgres SQLSTATE → household-friendly message. Anything unmapped gets a
// generic message: raw DB errors leak schema details and help nobody.
const SQLSTATE_MESSAGES: Record<string, string> = {
  '23505': 'That one already exists.',
  '23503': "Something this depends on is missing or was deleted.",
  '23502': 'A required field was left empty.',
  '23514': "That value isn't allowed here.",
  '42501': "You're not allowed to do that.",
}

export function sanitizeActionError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : undefined

  if (code && SQLSTATE_MESSAGES[code]) return SQLSTATE_MESSAGES[code]

  return 'Something went wrong. Try again?'
}
