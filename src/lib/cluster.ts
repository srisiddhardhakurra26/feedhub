import { prisma } from './db'
import { bytesToFloat32, cosineSim } from './categorize'

// Near-duplicate text (a cross-posted link, the same title on two feeds).
// Holds for any pair regardless of source or timing.
const STRICT_THRESHOLD = 0.72
// Same event told in different words by different outlets. Headlines are
// paraphrased outlet-to-outlet, so same-event title+body embeddings measure
// ~0.58–0.78 while merely-related stories stay below ~0.45 — but a lower bar
// only earns its keep with guards, so the news path additionally requires the
// pair be from *different* sources within NEWS_WINDOW_HOURS of each other.
const NEWS_THRESHOLD = 0.58
const NEWS_WINDOW_HOURS = 72
const NEWS_WINDOW_MS = NEWS_WINDOW_HOURS * 60 * 60 * 1000
const WINDOW_DAYS = 7

interface CandidateItem {
  id: string
  title: string
  sourceId: string
  publishedAt: Date
  storyId: string | null
  vec: Float32Array
}

export interface ClusterResult {
  newStories: number
  itemsAssigned: number
  storiesUpdated: number
}

// Whether two items belong in the same story. Returns the cosine similarity
// when they may cluster, or -1 when they may not — so callers can both gate
// and rank on one number.
function clusterScore(a: CandidateItem, b: CandidateItem): number {
  const sim = cosineSim(a.vec, b.vec)
  if (sim >= STRICT_THRESHOLD) return sim
  if (
    sim >= NEWS_THRESHOLD &&
    a.sourceId !== b.sourceId &&
    Math.abs(a.publishedAt.getTime() - b.publishedAt.getTime()) <= NEWS_WINDOW_MS
  ) {
    return sim
  }
  return -1
}

// Best item in the pool this item may cluster with (highest qualifying score),
// or null when none qualify.
function bestMatch(item: CandidateItem, pool: CandidateItem[]): CandidateItem | null {
  let best: CandidateItem | null = null
  let bestScore = -1
  for (const p of pool) {
    const s = clusterScore(item, p)
    if (s > bestScore) {
      bestScore = s
      best = p
    }
  }
  return best
}

export async function runClustering(): Promise<ClusterResult> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const rows = await prisma.item.findMany({
    where: { embedding: { not: null }, publishedAt: { gte: since } },
    select: {
      id: true,
      title: true,
      sourceId: true,
      publishedAt: true,
      storyId: true,
      embedding: true,
    },
  })

  const candidates: CandidateItem[] = rows
    .filter((r) => r.embedding && r.embedding.byteLength === 384 * 4)
    .map((r) => ({
      id: r.id,
      title: r.title,
      sourceId: r.sourceId,
      publishedAt: r.publishedAt,
      storyId: r.storyId,
      vec: bytesToFloat32(r.embedding!),
    }))

  const assigned = candidates.filter((c) => c.storyId)
  const unassigned = candidates.filter((c) => !c.storyId)

  let itemsAssigned = 0
  let newStories = 0

  // Pass 1: attach each unassigned item to a matching existing story.
  const stillUnassigned: CandidateItem[] = []
  for (const item of unassigned) {
    const match = bestMatch(item, assigned)
    if (match && match.storyId) {
      await prisma.item.update({
        where: { id: item.id },
        data: { storyId: match.storyId },
      })
      item.storyId = match.storyId
      assigned.push(item)
      itemsAssigned += 1
    } else {
      stillUnassigned.push(item)
    }
  }

  // Pass 2: form new stories among items that remain unassigned (greedy clustering).
  const used = new Set<string>()
  for (let i = 0; i < stillUnassigned.length; i++) {
    const seed = stillUnassigned[i]
    if (used.has(seed.id)) continue

    const members: CandidateItem[] = [seed]
    for (let j = i + 1; j < stillUnassigned.length; j++) {
      const other = stillUnassigned[j]
      if (used.has(other.id)) continue
      if (clusterScore(seed, other) > -1) {
        members.push(other)
      }
    }
    // Need ≥ 2 sources for a story (cross-source signal is the point).
    const sourceCount = new Set(members.map((m) => m.sourceId)).size
    if (members.length < 2 || sourceCount < 2) continue

    const headline = members.reduce((a, b) =>
      a.publishedAt > b.publishedAt ? a : b,
    )
    const firstSeen = members.reduce((a, b) =>
      a.publishedAt < b.publishedAt ? a : b,
    ).publishedAt
    const lastSeen = headline.publishedAt

    const story = await prisma.story.create({
      data: {
        title: headline.title.slice(0, 220),
        headlineItemId: headline.id,
        itemCount: members.length,
        sourceCount,
        firstSeenAt: firstSeen,
        lastSeenAt: lastSeen,
      },
    })

    await prisma.item.updateMany({
      where: { id: { in: members.map((m) => m.id) } },
      data: { storyId: story.id },
    })

    members.forEach((m) => {
      used.add(m.id)
      m.storyId = story.id
    })
    itemsAssigned += members.length
    newStories += 1
  }

  // Pass 3: refresh metadata for any story that gained items this run.
  const touchedStoryIds = new Set<string>()
  for (const c of candidates) {
    if (c.storyId) touchedStoryIds.add(c.storyId)
  }

  let storiesUpdated = 0
  for (const storyId of touchedStoryIds) {
    const items = await prisma.item.findMany({
      where: { storyId },
      select: { id: true, sourceId: true, title: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    })
    if (items.length === 0) continue
    const sourceCount = new Set(items.map((i) => i.sourceId)).size
    await prisma.story.update({
      where: { id: storyId },
      data: {
        itemCount: items.length,
        sourceCount,
        headlineItemId: items[0].id,
        title: items[0].title.slice(0, 220),
        lastSeenAt: items[0].publishedAt,
      },
    })
    storiesUpdated += 1
  }

  return { newStories, itemsAssigned, storiesUpdated }
}
