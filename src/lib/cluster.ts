import { prisma } from './db'
import { bytesToFloat32, cosineSim } from './categorize'

const SIMILARITY_THRESHOLD = 0.72
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

function maxSim(
  vec: Float32Array,
  pool: CandidateItem[],
): { item: CandidateItem; score: number } | null {
  let best: { item: CandidateItem; score: number } | null = null
  for (const p of pool) {
    const s = cosineSim(vec, p.vec)
    if (!best || s > best.score) best = { item: p, score: s }
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

  // Pass 1: attach each unassigned item to its nearest existing story if close enough.
  const stillUnassigned: CandidateItem[] = []
  for (const item of unassigned) {
    const best = maxSim(item.vec, assigned)
    if (best && best.score >= SIMILARITY_THRESHOLD && best.item.storyId) {
      await prisma.item.update({
        where: { id: item.id },
        data: { storyId: best.item.storyId },
      })
      item.storyId = best.item.storyId
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
      if (cosineSim(seed.vec, other.vec) >= SIMILARITY_THRESHOLD) {
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
