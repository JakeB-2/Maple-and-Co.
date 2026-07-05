// The one place the freshness fade is defined (D-017). A task's saturation
// decays with its freshness ratio (0 = just done, 1.5 = long neglected) — it
// NEVER turns red or otherwise shames. We hold the hue on Maple's warm green and
// only pull saturation out (and lift lightness a touch) as a task ages, so a
// stale chore reads as "quietly faded", never "alarm". Shared by the tasks board
// and the Today digest so the two views can't drift.

const RATIO_CAP = 1.5

/** A green that desaturates toward grey as `ratio` (0..1.5) climbs. Never red. */
export function freshnessColor(ratio: number): string {
  const t = Math.min(1, Math.max(0, ratio / RATIO_CAP)) // 0 (fresh) .. 1 (due/stale)
  const saturation = 42 - t * 34 // 42% → 8%
  const lightness = 44 + t * 14 // 44% → 58%
  return `hsl(146 ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`
}
