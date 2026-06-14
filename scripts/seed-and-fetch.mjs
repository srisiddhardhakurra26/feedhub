// One-shot startup helper: makes a fresh deployment look like local dev.
//
// The server starts with an empty SQLite DB (the entrypoint only runs
// `prisma migrate deploy` — no seed), so the hosted feed is blank until
// sources are added. This script, launched in the background by
// docker-entrypoint.sh, waits for the Next server to come up and then:
//   1. seeds the curated source list (scripts/sources.seed.json) — but only
//      on a genuinely empty DB, so it never re-adds sources you delete later;
//   2. triggers one fetch so the feed populates immediately.
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
          body: JSON.stringify({ type: s.type, identifier: s.identifier, label: s.label ?? undefined }),
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

  // Populate the feed (fetch every enabled source). Safe to run each boot.
  console.log('[seed] triggering refresh to populate the feed…')
  try {
    const res = await fetch(`${BASE}/api/refresh`, { method: 'POST', headers: headers(cookie, true), body: '{}' })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      const results = Array.isArray(data.results) ? data.results : []
      const ok = results.filter((r) => r.ok).length
      const newItems = results.reduce((n, r) => n + (r.newItems ?? 0), 0)
      console.log(`[seed] refresh complete: ${ok}/${results.length} sources ok, +${newItems} new items`)
    } else {
      console.error(`[seed] refresh -> HTTP ${res.status}`)
    }
  } catch (err) {
    console.error(`[seed] refresh failed: ${err.message}`)
  }
}

main().catch((err) => console.error('[seed] unexpected error:', err))
