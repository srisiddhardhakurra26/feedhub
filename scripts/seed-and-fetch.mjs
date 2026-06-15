// One-shot startup helper: makes a fresh deployment look like local dev.
//
// The server starts with an empty SQLite DB (the entrypoint only runs
// `prisma migrate deploy` — no seed), so the hosted feed is blank until
// sources are added. This script, launched in the background by
// docker-entrypoint.sh, waits for the Next server to come up and then:
//   1. seeds the curated source list (scripts/sources.seed.json) — but only
//      on a genuinely empty DB, so it never re-adds sources you delete later;
//   2. triggers a fetch so the feed populates immediately;
//   3. keeps refreshing on an interval (REFRESH_INTERVAL_MS, default 1h) so
//      the hosted feed stays fresh without anyone clicking Refresh. Set the
//      interval to 0 to disable the periodic loop (one-shot fetch only).
//
// Everything goes through the app's own HTTP API (proper Prisma + adapter
// handling), using only built-in Node — no extra deps, no API keys.
//
// The API sits behind the APP_PASSWORD gate (src/proxy.ts), so we mint the
// same session cookie the login form would: HMAC-SHA256("v1:" + password,
// SESSION_SECRET), matching makeSessionToken() in src/lib/auth.ts.

import { readFile } from 'node:fs/promises'
import { createHmac } from 'node:crypto'

const PORT = process.env.PORT ?? '3000'
const BASE = `http://127.0.0.1:${PORT}`
const SEED_FILE = new URL('./sources.seed.json', import.meta.url)

function sessionCookie() {
  const password = process.env.APP_PASSWORD
  const secret = process.env.SESSION_SECRET
  // When either is unset, src/proxy.ts disables the gate — no cookie needed.
  if (!password || !secret) return undefined
  const token = createHmac('sha256', secret).update(`v1:${password}`).digest('hex')
  return `feedhub_session=${token}`
}

function headers(cookie, json = false) {
  const h = {}
  if (cookie) h.Cookie = cookie
  if (json) h['Content-Type'] = 'application/json'
  return h
}

async function waitForServer(cookie, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      // /login is public; a 200 means Next is serving.
      const res = await fetch(`${BASE}/login`, { headers: headers(cookie), redirect: 'manual' })
      if (res.status >= 200 && res.status < 500) return true
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  return false
}

async function refreshOnce(cookie) {
  try {
    const res = await fetch(`${BASE}/api/refresh`, {
      method: 'POST',
      headers: headers(cookie, true),
      body: '{}',
    })
    if (!res.ok) {
      console.error(`[auto] refresh -> HTTP ${res.status}`)
      return
    }
    const data = await res.json().catch(() => ({}))
    const results = Array.isArray(data.results) ? data.results : []
    const ok = results.filter((r) => r.ok).length
    const newItems = results.reduce((n, r) => n + (r.newItems ?? 0), 0)
    console.log(`[auto] refresh: ${ok}/${results.length} sources ok, +${newItems} new items`)
  } catch (err) {
    console.error(`[auto] refresh failed: ${err.message}`)
  }
}

// IDs of sources tagged fast (config { "fast": true }). Re-read each tick so
// feeds you mark fast in the UI are picked up without restarting the script.
async function fastSourceIds(cookie) {
  try {
    const res = await fetch(`${BASE}/api/sources`, { headers: headers(cookie) })
    if (!res.ok) return []
    const data = await res.json().catch(() => ({}))
    const sources = Array.isArray(data.sources) ? data.sources : []
    return sources
      .filter((s) => {
        if (!s.config) return false
        try {
          return Boolean(JSON.parse(s.config)?.fast)
        } catch {
          return false
        }
      })
      .map((s) => s.id)
  } catch (err) {
    console.error(`[fast] could not list sources: ${err.message}`)
    return []
  }
}

async function refreshFast(cookie) {
  const ids = await fastSourceIds(cookie)
  if (ids.length === 0) {
    console.log('[fast] no fast sources — skipping')
    return
  }
  try {
    const res = await fetch(`${BASE}/api/refresh`, {
      method: 'POST',
      headers: headers(cookie, true),
      body: JSON.stringify({ sourceIds: ids }),
    })
    if (!res.ok) {
      console.error(`[fast] refresh -> HTTP ${res.status}`)
      return
    }
    const data = await res.json().catch(() => ({}))
    const results = Array.isArray(data.results) ? data.results : []
    const ok = results.filter((r) => r.ok).length
    const newItems = results.reduce((n, r) => n + (r.newItems ?? 0), 0)
    console.log(`[fast] refresh: ${ok}/${results.length} fast sources ok, +${newItems} new items`)
  } catch (err) {
    console.error(`[fast] refresh failed: ${err.message}`)
  }
}

// Self-scheduling loop: waits, runs fn, then schedules the next run only after
// fn settles — so a slow fetch never overlaps the next tick.
function loop(intervalMs, fn) {
  setTimeout(async () => {
    try {
      await fn()
    } catch (err) {
      console.error('[auto] loop iteration failed:', err.message)
    } finally {
      loop(intervalMs, fn)
    }
  }, intervalMs)
}

async function main() {
  const cookie = sessionCookie()

  if (!(await waitForServer(cookie))) {
    console.error('[seed] server did not come up in time — skipping seed')
    return
  }

  // Seed only when the DB is empty, so user deletions are never undone.
  let existingCount = null
  try {
    const res = await fetch(`${BASE}/api/sources`, { headers: headers(cookie) })
    if (res.ok) existingCount = (await res.json()).sources?.length ?? null
  } catch {
    /* fall through; treat as unknown */
  }

  if (existingCount === null) {
    console.error('[seed] could not read existing sources (auth?) — skipping seed, will still refresh')
  } else if (existingCount > 0) {
    console.log(`[seed] DB already has ${existingCount} sources — skipping seed`)
  } else {
    const sources = JSON.parse(await readFile(SEED_FILE, 'utf8'))
    console.log(`[seed] empty DB — adding ${sources.length} curated sources…`)
    let added = 0
    let skipped = 0
    for (const s of sources) {
      try {
        const res = await fetch(`${BASE}/api/sources`, {
          method: 'POST',
          headers: headers(cookie, true),
          body: JSON.stringify({
            type: s.type,
            identifier: s.identifier,
            label: s.label ?? undefined,
            fast: s.fast ?? undefined,
          }),
        })
        if (res.status === 201) added++
        else if (res.status === 409) skipped++
        else console.error(`[seed] ${s.type}:${s.identifier} -> HTTP ${res.status}`)
      } catch (err) {
        console.error(`[seed] ${s.type}:${s.identifier} failed: ${err.message}`)
      }
    }
    console.log(`[seed] done: +${added} added, ${skipped} already present`)
  }

  // The main seed above is empty-DB-only (so it never re-adds sources you
  // delete). The breaking-news feeds are different: they're the heart of the
  // fast tier and small in number, so we ensure they exist on EVERY boot —
  // that's how an already-populated DB picks them up. Trade-off: deleting a
  // fast seed will see it return on the next deploy; remove it from
  // sources.seed.json (or just toggle fast off) instead of deleting.
  if (existingCount !== null && existingCount > 0) {
    try {
      const seeds = JSON.parse(await readFile(SEED_FILE, 'utf8'))
      const fastSeeds = seeds.filter((s) => s.fast)
      let added = 0
      for (const s of fastSeeds) {
        const res = await fetch(`${BASE}/api/sources`, {
          method: 'POST',
          headers: headers(cookie, true),
          body: JSON.stringify({
            type: s.type,
            identifier: s.identifier,
            label: s.label ?? undefined,
            fast: true,
          }),
        })
        if (res.status === 201) added++
      }
      if (added > 0) console.log(`[seed] ensured fast feeds: +${added} breaking source(s) added`)
    } catch (err) {
      console.error(`[seed] could not ensure fast feeds: ${err.message}`)
    }
  }

  // Populate the feed immediately, then keep it fresh on two cadences: a slow
  // loop over ALL sources, and a fast loop over just the breaking ones.
  await refreshOnce(cookie)

  const slowMs = Number(process.env.REFRESH_INTERVAL_MS ?? 60 * 60 * 1000)
  const fastMs = Number(process.env.FAST_REFRESH_INTERVAL_MS ?? 5 * 60 * 1000)

  if (Number.isFinite(slowMs) && slowMs > 0) {
    console.log(`[auto] slow refresh (all sources) every ${Math.round(slowMs / 60000)} min`)
    loop(slowMs, () => refreshOnce(cookie))
  } else {
    console.log('[auto] slow refresh disabled (REFRESH_INTERVAL_MS <= 0)')
  }

  if (Number.isFinite(fastMs) && fastMs > 0) {
    console.log(`[fast] fast refresh (breaking sources) every ${Math.round(fastMs / 60000)} min`)
    loop(fastMs, () => refreshFast(cookie))
  } else {
    console.log('[fast] fast refresh disabled (FAST_REFRESH_INTERVAL_MS <= 0)')
  }
}

main().catch((err) => console.error('[seed] unexpected error:', err))
