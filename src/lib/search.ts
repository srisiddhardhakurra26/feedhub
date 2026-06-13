import { prisma } from './db'
import { bytesToFloat32, cosineSim, embed } from './categorize'
import type { LoadedItem } from '@/app/actions'

const EMBEDDING_BYTES = 384 * 4

// Cosine floor for items kept on embedding similarity alone (no substring
// hit). Recall-oriented: measured on the real corpus, good loose matches
// ("home cooking recipes" → "How To Make One Pot Lasagna") sit at 0.42–0.50,
// the same band nonsense queries can reach — so a stricter floor or a
// token-overlap guard would drop exactly the semantic matches this feature
// exists for. A junk query surfacing a few items is the accepted cost.
const SEMANTIC_FLOOR = 0.35

// A literal substring hit outranks a same-score semantic match; a title hit
// outranks a body/author hit.
const TITLE_BOOST = 0.3
const TEXT_BOOST = 0.15

// Ranked search scans candidate embeddings in memory (~1.5KB each), so bound
// the scan to the most recent items.
const CANDIDATE_LIMIT = 5000

export interface RankedSearchOptions {
  filter?: 'all' | 'unread' | 'saved'
  source?: string
  sourceIds?: string[]
  category?: string
  q: string
  offset: number
  take: number
}

export interface RankedSearchResult {
  items: LoadedItem[]
  nextCursor: { offset: number } | null
}

/**
 * Search ranked by blended relevance: cosine similarity between the query
 * embedding and each item's stored embedding, plus a boost for literal
 * substring matches. Items with no embedding yet are still found via
 * substring. Results are ordered by score, so pagination is by offset —
 * the scan is deterministic between pages.
 */
export async function searchRankedItems(opts: RankedSearchOptions): Promise<RankedSearchResult> {
  const where: {
    isRead?: boolean
    isSaved?: boolean
    sourceId?: string | { in: string[] }
    category?: string
  } = {}
  if (opts.filter === 'unread') where.isRead = false
  if (opts.filter === 'saved') where.isSaved = true
  if (opts.source) where.sourceId = opts.source
  else if (opts.sourceIds && opts.sourceIds.length > 0) {
    where.sourceId = { in: opts.sourceIds }
  }
  if (opts.category) where.category = opts.category

  const rows = await prisma.item.findMany({
    where,
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: CANDIDATE_LIMIT,
    select: {
      id: true,
      title: true,
      url: true,
      author: true,
      body: true,
      thumbnail: true,
      publishedAt: true,
      isRead: true,
      isSaved: true,
      category: true,
      embedding: true,
      source: { select: { id: true, type: true, identifier: true, label: true } },
    },
  })

  const queryVec = await embed(opts.q)
  const needle = opts.q.toLowerCase()

  const scored: Array<{ row: (typeof rows)[number]; score: number }> = []
  for (const row of rows) {
    const inTitle = row.title.toLowerCase().includes(needle)
    const inText =
      (row.author?.toLowerCase().includes(needle) ?? false) ||
      (row.body?.toLowerCase().includes(needle) ?? false)
    const boost = inTitle ? TITLE_BOOST : inText ? TEXT_BOOST : 0

    let similarity = 0
    if (row.embedding && row.embedding.byteLength === EMBEDDING_BYTES) {
      similarity = cosineSim(queryVec, bytesToFloat32(row.embedding))
    }

    if (boost === 0 && similarity < SEMANTIC_FLOOR) continue
    scored.push({ row, score: Math.max(similarity, 0) + boost })
  }

  scored.sort(
    (a, b) => b.score - a.score || b.row.publishedAt.getTime() - a.row.publishedAt.getTime(),
  )

  const page = scored.slice(opts.offset, opts.offset + opts.take)
  const items: LoadedItem[] = page.map(({ row }) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    author: row.author,
    body: row.body,
    thumbnail: row.thumbnail,
    publishedAt: row.publishedAt.toISOString(),
    isRead: row.isRead,
    isSaved: row.isSaved,
    category: row.category,
    source: row.source,
  }))

  const nextOffset = opts.offset + opts.take
  return {
    items,
    nextCursor: nextOffset < scored.length ? { offset: nextOffset } : null,
  }
}
