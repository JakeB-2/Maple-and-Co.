// Constrains the post-auth `?next=` redirect target to a same-origin relative
// path. The auth callback/confirm routes interpolate `next` into
// `${origin}${next}`; the `origin` prefix already blunts most off-origin
// payloads, but `//host` and backslash variants can still be normalized to an
// off-origin target by some browsers. Anything that is not a plain
// single-leading-slash path falls back to the default landing route.
const DEFAULT_NEXT = '/'

export function safeNextPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_NEXT
  // Must be a relative path: one leading slash, not `//` (protocol-relative)
  // and not `/\` (backslash escape). Reject anything with a scheme or host.
  if (!next.startsWith('/')) return DEFAULT_NEXT
  if (next.startsWith('//')) return DEFAULT_NEXT
  if (next.startsWith('/\\')) return DEFAULT_NEXT
  if (next.includes('\\')) return DEFAULT_NEXT
  return next
}
