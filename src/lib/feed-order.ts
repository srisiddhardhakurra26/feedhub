// Feed display ordering.
//
// A purely chronological feed clumps: whichever source refreshed last bursts
// to the top, and a high-volume feed produces long same-source runs ("a wall
// of Hacker News"). This spreads sources out for display WITHOUT changing
// which items are on the page — so the caller's chronological cursor stays
// correct and pagination neither skips nor duplicates.

/**
 * Reorder a recency-sorted page so no single source repeats within `gap`
 * consecutive items, when avoidable. Recency is preserved as the tiebreaker:
 * at each step it takes the most-recent item whose source isn't in cooldown,
 * falling back to the most-recent remaining item if every source is.
 *
 * O(n²) in page size (n ≤ 60), so cost is negligible.
 */
export function diversifyBySource<T>(
  items: T[],
  sourceIdOf: (item: T) => string,
  // gap = N means a source can't reappear until N other items have been
  // placed. A page's per-source *count* is fixed (we only reorder, never
  // drop), so the goal is even spacing: gap=2 spaces a source of up to ~1/3
  // of the page perfectly (every 3rd slot). A larger gap front-loads variety
  // but forces a dominant source to clump at the tail once leaner sources run
  // out — worse, so 2 is the sweet spot.
  gap = 2,
): T[] {
  if (items.length <= 2) return items

  const pool = items.slice() // already recency-ordered
  const result: T[] = []
  const cooldown: string[] = [] // sources placed in the last `gap` slots

  while (pool.length > 0) {
    let idx = pool.findIndex((it) => !cooldown.includes(sourceIdOf(it)))
    if (idx === -1) idx = 0 // everything left is in cooldown → take most recent
    const [picked] = pool.splice(idx, 1)
    result.push(picked)
    cooldown.push(sourceIdOf(picked))
    if (cooldown.length > gap) cooldown.shift()
  }

  return result
}
