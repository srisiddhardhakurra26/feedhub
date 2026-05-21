import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { AgentTool, ToolItem } from './types'

const inputSchema = z.object({
  filter: z.enum(['all', 'unread', 'saved']).default('unread'),
  sourceType: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  sinceHours: z.number().int().min(1).max(24 * 30).optional(),
})

export type ListItemsInput = z.infer<typeof inputSchema>

async function run(input: ListItemsInput): Promise<{ items: ToolItem[]; total: number }> {
  const where: {
    isRead?: boolean
    isSaved?: boolean
    category?: string
    publishedAt?: { gte: Date }
    source?: { type: string }
  } = {}
  if (input.filter === 'unread') where.isRead = false
  if (input.filter === 'saved') where.isSaved = true
  if (input.category) where.category = input.category
  if (input.sourceType) where.source = { type: input.sourceType }
  if (input.sinceHours) {
    where.publishedAt = { gte: new Date(Date.now() - input.sinceHours * 3600 * 1000) }
  }

  const rows = await prisma.item.findMany({
    where,
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: input.limit,
    include: { source: { select: { type: true, identifier: true, label: true } } },
  })

  const items: ToolItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    author: r.author,
    publishedAt: r.publishedAt.toISOString(),
    isRead: r.isRead,
    isSaved: r.isSaved,
    category: r.category,
    source: r.source,
  }))

  return { items, total: items.length }
}

export const listItemsTool: AgentTool<ListItemsInput, { items: ToolItem[]; total: number }> = {
  name: 'list_items',
  description:
    'List recent items from the feed, newest first. Use filter="unread" to see what the user has not read yet, "saved" for bookmarks, "all" for everything. Filter by sourceType (e.g. "hackernews", "huggingface", "github") or category (e.g. "AI & ML", "Software"). sinceHours limits to recent items.',
  inputSchema,
  run,
}
