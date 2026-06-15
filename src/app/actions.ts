'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { runFetch } from '@/lib/fetchers/run'
import { isSourceType, SOURCE_TYPES } from '@/lib/sources/types'
import { withFast } from '@/lib/sources/fast'
import { categorize, float32ToBytes } from '@/lib/categorize'
import { runClustering } from '@/lib/cluster'
import { DIRECTORY } from '@/lib/directory'
import { diversifyBySource } from '@/lib/feed-order'
import { searchRankedItems } from '@/lib/search'
import { discoverFeed } from '@/lib/sources/discover'

export async function addSource(formData: FormData) {
  const type = String(formData.get('type') ?? '')
  let identifier = String(formData.get('identifier') ?? '').trim()
  let label = String(formData.get('label') ?? '').trim() || null
  const fast = formData.get('fast') != null

  if (!isSourceType(type)) {
    return { error: `Invalid source type. Must be one of: ${SOURCE_TYPES.join(', ')}` }
  }
  if (!identifier) {
    return { error: 'Identifier is required' }
  }

  // RSS accepts a site URL or bare domain: resolve it to the actual feed and
  // pick up the feed's own title as the default label.
  if (type === 'rss') {
    const found = await discoverFeed(identifier)
    if (!found) {
      return {
        error: `Couldn't find a feed at "${identifier}". Try the exact feed URL.`,
      }
    }
    identifier = found.url
    label = label ?? found.title ?? null
  }

  let source
  try {
    source = await prisma.source.create({
      data: { type, identifier, label, config: withFast(null, fast) },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('Unique constraint')) {
      return { error: 'Source already exists' }
    }
    return { error: message }
  }

  // Fetch and categorize the new source immediately so its items show up —
  // tagged and semantically searchable — without waiting for a Refresh.
  const [result] = await runFetch([source.id])
  const categorized = await categorizeUncategorized([source.id])

  revalidatePath('/sources')
  revalidatePath('/')
  revalidatePath('/accounts')
  return {
    ok: true as const,
    newItems: result?.newItems ?? 0,
    categorized,
    warning: result && !result.ok ? result.error : undefined,
  }
}

export async function deleteSource(id: string) {
  await prisma.source.delete({ where: { id } })
  revalidatePath('/sources')
  revalidatePath('/')
}

// Toggle whether a source is on the fast-refresh tier. Reads the current
// config so we preserve any adapter-stored keys (cursors, subscription flags).
export async function setSourceFast(id: string, fast: boolean) {
  const source = await prisma.source.findUnique({ where: { id }, select: { config: true } })
  if (!source) return
  await prisma.source.update({
    where: { id },
    data: { config: withFast(source.config, fast) },
  })
  revalidatePath('/accounts')
  revalidatePath('/sources')
}

// One-click add from the curated /discover directory. Only entries that exist
// in DIRECTORY are accepted, and the source is fetched and categorized
// immediately so the feed has tagged, searchable content the moment the user
// returns to it.
export async function addDirectorySource(input: { type: string; identifier: string }) {
  const entry = DIRECTORY.find(
    (d) => d.type === input.type && d.identifier === input.identifier,
  )
  if (!entry) {
    return { ok: false as const, error: 'Unknown directory source' }
  }

  const source = await prisma.source.upsert({
    where: { type_identifier: { type: entry.type, identifier: entry.identifier } },
    update: { enabled: true },
    create: { type: entry.type, identifier: entry.identifier, label: entry.label },
  })

  const [result] = await runFetch([source.id])
  const categorized = await categorizeUncategorized([source.id])
  revalidatePath('/')
  revalidatePath('/discover')
  revalidatePath('/accounts')

  return {
    ok: true as const,
    newItems: result?.newItems ?? 0,
    categorized,
    warning: result && !result.ok ? result.error : undefined,
  }
}

// Date cursor for the chronological feed; offset cursor for ranked search
// results (relevance order has no stable date to resume from).
export type FeedCursor = { publishedAt: string; id: string } | { offset: number }

export interface LoadMoreOptions {
  filter?: 'all' | 'saved'
  source?: string
  sourceIds?: string[]
  q?: string
  category?: string
  cursor: FeedCursor | null
  take?: number
}

export interface LoadedItem {
  id: string
  title: string
  url: string
  author: string | null
  body: string | null
  thumbnail: string | null
  publishedAt: string
  isSaved: boolean
  category: string | null
  source: {
    id: string
    type: string
    identifier: string
    label: string | null
  }
}

export async function loadMoreItems(
  opts: LoadMoreOptions,
): Promise<{ items: LoadedItem[]; nextCursor: FeedCursor | null }> {
  const take = Math.min(Math.max(opts.take ?? 24, 1), 60)

  const query = (opts.q ?? '').trim()
  if (query) {
    return searchRankedItems({
      filter: opts.filter,
      source: opts.source,
      sourceIds: opts.sourceIds,
      category: opts.category,
      q: query,
      offset: opts.cursor && 'offset' in opts.cursor ? opts.cursor.offset : 0,
      take,
    })
  }

  const where: {
    isSaved?: boolean
    sourceId?: string | { in: string[] }
    category?: string
    AND?: Array<Record<string, unknown>>
  } = {}
  if (opts.filter === 'saved') where.isSaved = true
  if (opts.source) where.sourceId = opts.source
  else if (opts.sourceIds && opts.sourceIds.length > 0) {
    where.sourceId = { in: opts.sourceIds }
  }
  if (opts.category) where.category = opts.category
  if (opts.cursor && 'publishedAt' in opts.cursor) {
    const cursorDate = new Date(opts.cursor.publishedAt)
    where.AND = [
      {
        OR: [
          { publishedAt: { lt: cursorDate } },
          { AND: [{ publishedAt: cursorDate }, { id: { lt: opts.cursor.id } }] },
        ],
      },
    ]
  }

  const rows = await prisma.item.findMany({
    where,
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take,
    include: { source: { select: { id: true, type: true, identifier: true, label: true } } },
  })

  const mapped: LoadedItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    author: r.author,
    body: r.body,
    thumbnail: r.thumbnail,
    publishedAt: r.publishedAt.toISOString(),
    isSaved: r.isSaved,
    category: r.category,
    source: r.source,
  }))

  // Cursor tracks the chronological boundary (oldest item on the page) and is
  // computed before reordering, so pagination stays correct.
  const oldest = mapped.at(-1)
  const nextCursor = mapped.length === take && oldest
    ? { publishedAt: oldest.publishedAt, id: oldest.id }
    : null

  // Pinned to a single source? Nothing to diversify. Otherwise spread sources
  // so the opening screen isn't a wall of whichever feed refreshed last.
  const items = opts.source ? mapped : diversifyBySource(mapped, (i) => i.source.id)

  return { items, nextCursor }
}

export async function refreshAll() {
  const results = await runFetch()
  const categorized = await categorizeUncategorized()
  const stories = await runClustering()
  revalidatePath('/')
  revalidatePath('/sources')
  revalidatePath('/stories')
  return { results, categorized, stories }
}

async function categorizeUncategorized(sourceIds?: string[]): Promise<number> {
  const items = await prisma.item.findMany({
    where: {
      OR: [{ category: null }, { embedding: null }],
      ...(sourceIds && sourceIds.length > 0 ? { sourceId: { in: sourceIds } } : {}),
    },
    select: { id: true, title: true, body: true },
    take: 500,
    orderBy: { publishedAt: 'desc' },
  })
  let n = 0
  for (const item of items) {
    try {
      const { category, score, embedding } = await categorize(item)
      await prisma.item.update({
        where: { id: item.id },
        data: {
          category,
          categoryScore: score,
          embedding: float32ToBytes(embedding),
        },
      })
      n += 1
    } catch (err) {
      console.error('[categorize]', item.id, err)
    }
  }
  return n
}

export async function categorizeAll() {
  const n = await categorizeUncategorized()
  revalidatePath('/')
  return { categorized: n }
}

export async function toggleSaved(id: string) {
  const item = await prisma.item.findUnique({ where: { id }, select: { isSaved: true } })
  if (!item) return
  await prisma.item.update({ where: { id }, data: { isSaved: !item.isSaved } })
  revalidatePath('/')
}

export async function disconnectAccount(platform: string) {
  await prisma.account.deleteMany({ where: { platform } })
  if (platform === 'reddit') {
    await prisma.source.deleteMany({ where: { type: 'reddit', identifier: '__home__' } })
  }
  revalidatePath('/accounts')
  revalidatePath('/sources')
  revalidatePath('/')
}

const REDDIT_PRIVATE_RSS_RE =
  /^https?:\/\/(?:[\w-]+\.)?reddit\.com\/\.rss\?[^\s]*feed=[a-f0-9]+[^\s]*$/i

export async function connectRedditRss(
  _prev: { ok?: true; error?: string; username?: string } | null,
  formData: FormData,
): Promise<{ ok?: true; error?: string; username?: string }> {
  const url = String(formData.get('url') ?? '').trim()
  if (!url) return { error: 'Paste your private Reddit RSS URL.' }
  if (!REDDIT_PRIVATE_RSS_RE.test(url)) {
    return {
      error:
        "That doesn't look like the private Reddit RSS URL. It should start with https://www.reddit.com/.rss?feed=... and include &user=YOUR_USERNAME.",
    }
  }
  let username = 'unknown'
  try {
    const parsed = new URL(url)
    username = parsed.searchParams.get('user') ?? 'unknown'
  } catch {
    return { error: 'Could not parse the URL.' }
  }

  await prisma.source.deleteMany({
    where: { type: 'rss', identifier: { contains: 'reddit.com/.rss' } },
  })
  await prisma.source.create({
    data: {
      type: 'rss',
      identifier: url,
      label: `Reddit home (@${username})`,
    },
  })

  revalidatePath('/accounts')
  revalidatePath('/sources')
  revalidatePath('/')
  return { ok: true, username }
}

export async function disconnectReddit() {
  await prisma.source.deleteMany({
    where: { type: 'rss', identifier: { contains: 'reddit.com/.rss' } },
  })
  revalidatePath('/accounts')
  revalidatePath('/sources')
  revalidatePath('/')
}

export async function disconnectGoogle() {
  await prisma.account.deleteMany({ where: { platform: 'google' } })
  const subscriptionSources = await prisma.source.findMany({
    where: { type: 'youtube' },
    select: { id: true, config: true },
  })
  const toDelete = subscriptionSources
    .filter((s) => {
      if (!s.config) return false
      try {
        const parsed = JSON.parse(s.config) as { fromSubscription?: boolean }
        return Boolean(parsed.fromSubscription)
      } catch {
        return false
      }
    })
    .map((s) => s.id)
  if (toDelete.length > 0) {
    await prisma.source.deleteMany({ where: { id: { in: toDelete } } })
  }
  revalidatePath('/accounts')
  revalidatePath('/sources')
  revalidatePath('/')
}

const HN_FEED_LABELS: Record<string, string> = {
  front: 'HN front page',
  best: 'HN best',
  newest: 'HN newest',
  ask: 'Ask HN',
  show: 'Show HN',
  jobs: 'HN jobs',
}

export async function addHackerNewsFeed(feedName: string) {
  const id = feedName.trim().toLowerCase()
  if (!HN_FEED_LABELS[id]) return
  await prisma.source.upsert({
    where: { type_identifier: { type: 'hackernews', identifier: id } },
    update: { enabled: true },
    create: {
      type: 'hackernews',
      identifier: id,
      label: HN_FEED_LABELS[id],
    },
  })
  revalidatePath('/accounts')
  revalidatePath('/')
}

const HF_FEED_LABELS: Record<string, string> = {
  models: 'HF trending models',
  datasets: 'HF trending datasets',
  spaces: 'HF trending spaces',
}

export async function addHuggingFaceFeed(feedName: string) {
  const id = feedName.trim().toLowerCase()
  if (!HF_FEED_LABELS[id]) return
  await prisma.source.upsert({
    where: { type_identifier: { type: 'huggingface', identifier: id } },
    update: { enabled: true },
    create: {
      type: 'huggingface',
      identifier: id,
      label: HF_FEED_LABELS[id],
    },
  })
  revalidatePath('/accounts')
  revalidatePath('/')
}

export async function addGithubUser(
  _prev: { ok?: true; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: true; error?: string }> {
  const raw = String(formData.get('user') ?? '').trim()
  if (!raw) return { error: 'Enter a GitHub username or owner/repo.' }
  let identifier = raw.replace(/^@/, '')
  if (identifier.startsWith('http')) {
    try {
      const u = new URL(identifier)
      if (!/(^|\.)github\.com$/i.test(u.hostname)) {
        return { error: 'URL must be on github.com.' }
      }
      identifier = u.pathname.replace(/^\/+|\/+$/g, '')
    } catch {
      return { error: 'Could not parse URL.' }
    }
  }
  if (!identifier) return { error: 'Empty identifier.' }
  const label = identifier.includes('/') ? identifier : `@${identifier}`
  try {
    await prisma.source.create({
      data: { type: 'github', identifier, label },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('Unique constraint')) return { error: 'Already added.' }
    return { error: msg }
  }
  revalidatePath('/accounts')
  revalidatePath('/')
  return { ok: true }
}

export async function addMastodonUser(
  _prev: { ok?: true; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: true; error?: string }> {
  const raw = String(formData.get('handle') ?? '').trim()
  if (!raw) return { error: 'Enter a Mastodon handle.' }
  let identifier = raw
  if (raw.startsWith('http')) {
    try {
      const u = new URL(raw)
      const m = u.pathname.match(/^\/@([\w.-]+)\/?$/)
      if (!m) return { error: 'Paste a profile URL like https://mastodon.social/@user.' }
      identifier = `@${m[1]}@${u.hostname}`
    } catch {
      return { error: 'Could not parse URL.' }
    }
  }
  const handle = identifier.replace(/^@/, '')
  const parts = handle.split('@')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { error: 'Use format @user@instance.tld' }
  }
  const canonical = `@${parts[0]}@${parts[1]}`
  try {
    await prisma.source.create({
      data: { type: 'mastodon', identifier: canonical, label: canonical },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('Unique constraint')) return { error: 'Already added.' }
    return { error: msg }
  }
  revalidatePath('/accounts')
  revalidatePath('/')
  return { ok: true }
}

export async function addSubstackPub(
  _prev: { ok?: true; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: true; error?: string }> {
  const raw = String(formData.get('substack') ?? '').trim()
  if (!raw) return { error: 'Enter a Substack URL or slug.' }

  let identifier = raw
  let label = raw

  if (raw.startsWith('http')) {
    try {
      const u = new URL(raw)
      identifier = u.origin
      label = u.hostname.replace(/^www\./, '')
    } catch {
      return { error: 'Could not parse URL.' }
    }
  } else {
    const slug = raw.replace(/^@/, '').toLowerCase()
    if (!/^[\w-]+$/.test(slug)) {
      return { error: 'Slug must contain only letters, digits, and dashes.' }
    }
    identifier = slug
    label = `${slug}.substack.com`
  }

  try {
    await prisma.source.create({
      data: { type: 'substack', identifier, label },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('Unique constraint')) return { error: 'Already added.' }
    return { error: msg }
  }
  revalidatePath('/accounts')
  revalidatePath('/')
  return { ok: true }
}

export async function syncYouTube(): Promise<{
  ok?: true
  added?: number
  updated?: number
  removed?: number
  total?: number
  error?: string
}> {
  const { getGoogleAccessToken, syncYouTubeSubscriptions } = await import(
    '@/lib/google/subscriptions'
  )
  const token = await getGoogleAccessToken()
  if (!token) return { error: 'Google account not connected' }
  try {
    const result = await syncYouTubeSubscriptions(token)
    revalidatePath('/accounts')
    revalidatePath('/sources')
    revalidatePath('/')
    return { ok: true, ...result }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

