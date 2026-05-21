import { z } from 'zod'
import { prisma } from '@/lib/db'
import { bytesToFloat32, cosineSim, embed } from '@/lib/categorize'
import type { AgentTool, ToolItem } from './types'

const inputSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(50).default(10),
  sourceType: z.string().optional(),
})

export type SearchItemsInput = z.infer<typeof inputSchema>

interface ScoredItem extends ToolItem {
  score: number
}

async function run(input: SearchItemsInput): Promise<{ items: ScoredItem[] }> {
  const where: { embedding: { not: null }; source?: { type: string } } = {
    embedding: { not: null },
  }
  if (input.sourceType) where.source = { type: input.sourceType }

  const rows = await prisma.item.findMany({
    where,
    select: {
      id: true,
      title: true,
      url: true,
      author: true,
      publishedAt: true,
      isRead: true,
      isSaved: true,
      category: true,
      embedding: true,
      source: { select: { type: true, identifier: true, label: true } },
    },
  })

  const queryVec = await embed(input.query)
  const scored = rows
    .map((r) => {
      const vec = r.embedding ? bytesToFloat32(r.embedding) : null
      const score = vec ? cosineSim(queryVec, vec) : 0
      return { row: r, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit)

  const items: ScoredItem[] = scored.map(({ row, score }) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    author: row.author,
    publishedAt: row.publishedAt.toISOString(),
    isRead: row.isRead,
    isSaved: row.isSaved,
    category: row.category,
    source: row.source,
    score: Number(score.toFixed(4)),
  }))

  return { items }
}

export const searchItemsTool: AgentTool<SearchItemsInput, { items: ScoredItem[] }> = {
  name: 'search_items',
  description:
    'Semantic search across the user\'s feed history using vector embeddings. Returns items ranked by relevance to the query. Use this for "find me articles about X" or "what have I read on topic Y" — better than keyword matching. Optionally filter by sourceType.',
  inputSchema,
  run,
}
