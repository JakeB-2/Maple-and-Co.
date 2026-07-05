// Canonical drawer-navigation URL math (project-wide rule).
//
// Table view-state — sort (`sort`/`dir`), search (`q`), facet/date filters, and
// `page` — lives in the URL (see components/tables/use-table-url-state.ts). Any
// drawer navigation that only means to change WHICH record is open (open create,
// open edit, return after save, return after delete, cancel) must therefore
// preserve every other query param, or the list silently resets its sort/filter
// the moment you touch a row.
//
// The rule: start from the CURRENT url's params, drop the drawer-control keys
// (`selected` / `new` / `edit` + their `_<entity>` secondary-entity variants),
// then overlay the target href's params. Same-route only — a target on a
// different path is a genuine navigation and keeps its own (clean) query string.
//
// This is the single source of truth for that math. `buildDeleteRedirectHref`
// (record-actions-navigation.ts) and the `useDrawerNavHref` hook both delegate
// here so open / save / cancel / delete can never drift apart again.

const LOCAL_ORIGIN = 'https://maple.local'

/** Drawer-control param keys owned by the drawer URL grammar (CLAUDE.md). */
export function isRecordStateParam(key: string): boolean {
  return (
    key === 'selected' ||
    key === 'new' ||
    key === 'edit' ||
    key.startsWith('selected_') ||
    key.startsWith('new_') ||
    key.startsWith('edit_')
  )
}

function relativeHref(url: URL): string {
  const search = url.searchParams.toString()
  return `${url.pathname}${search ? `?${search}` : ''}${url.hash}`
}

type LayerArgs = {
  /** Where the drawer navigation wants to go (e.g. `/settings/x?selected=<id>`). */
  targetHref: string
  /** The list route the user is currently on (usePathname()). */
  currentPathname: string
  /** The current query string (searchParams.toString()), with or without `?`. */
  currentSearch: string
}

/**
 * Layer a drawer-navigation target onto the current list URL so table view-state
 * survives. Returns the target unchanged when it points at a different path or an
 * external origin (a real navigation — don't smuggle the old list's sort along).
 */
export function layerDrawerHrefOntoCurrentUrl({
  targetHref,
  currentPathname,
  currentSearch,
}: LayerArgs): string {
  let target: URL
  let current: URL
  try {
    target = new URL(targetHref, LOCAL_ORIGIN)
    current = new URL(currentPathname, LOCAL_ORIGIN)
  } catch {
    return targetHref
  }

  if (target.origin !== LOCAL_ORIGIN || target.pathname !== current.pathname) {
    return target.origin === LOCAL_ORIGIN ? relativeHref(target) : targetHref
  }

  const params = new URLSearchParams(
    currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch,
  )

  // Drop the current drawer-control keys — the target owns those now.
  for (const key of new Set(params.keys())) {
    if (isRecordStateParam(key)) params.delete(key)
  }

  // Overlay the target's own params (its drawer keys + anything else it sets).
  const targetParams = new URLSearchParams(target.search)
  for (const key of new Set(targetParams.keys())) {
    params.delete(key)
    for (const value of targetParams.getAll(key)) params.append(key, value)
  }

  // A target that sets NO drawer key (e.g. a bare list return) leaves us with
  // the current drawer keys already stripped above; nothing more to do. But if
  // the target itself carried a stale drawer key we didn't want, this is a
  // no-op. Kept for symmetry with the previous delete-redirect behaviour.
  const search = params.toString()
  return `${target.pathname}${search ? `?${search}` : ''}${target.hash}`
}
