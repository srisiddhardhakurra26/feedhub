// "Fast" sources are breaking-news feeds (sports results, wire headlines) that
// should be polled far more often than the hourly default. The flag lives in
// Source.config JSON as { "fast": true } so it needs no schema migration and
// survives adapter config merges (run.ts spreads existing config first).

export function isFast(config: string | null | undefined): boolean {
  if (!config) return false
  try {
    const parsed = JSON.parse(config) as { fast?: boolean }
    return Boolean(parsed?.fast)
  } catch {
    return false
  }
}

// Set/clear the fast flag while preserving any other keys an adapter stored.
// Returns null when the resulting config is empty, so we don't litter the DB
// with "{}" strings.
export function withFast(config: string | null | undefined, fast: boolean): string | null {
  let parsed: Record<string, unknown> = {}
  if (config) {
    try {
      const p = JSON.parse(config)
      if (p && typeof p === 'object') parsed = p as Record<string, unknown>
    } catch {
      /* malformed config — start fresh */
    }
  }
  if (fast) parsed.fast = true
  else delete parsed.fast
  return Object.keys(parsed).length > 0 ? JSON.stringify(parsed) : null
}
