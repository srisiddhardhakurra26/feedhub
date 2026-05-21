import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { AgentTool, ToolItemDetailed } from './types'

const inputSchema = z.object({
  id: z.string().min(1),
})

export type GetItemInput = z.infer<typeof inputSchema>

async function run(input: GetItemInput): Promise<{ item: ToolItemDetailed | null }> {
  const r = await prisma.item.findUnique({
    where: { id: input.id },
    include: { source: { select: { type: true, identifier: true, label: true } } },
  })
  if (!r) return { item: null }

  return {
    item: {
      id: r.id,
      title: r.title,
      url: r.url,
      author: r.author,
      body: r.body,
      publishedAt: r.publishedAt.toISOString(),
      isRead: r.isRead,
      isSaved: r.isSaved,
      category: r.category,
      source: r.source,
    },
  }
}

export const getItemTool: AgentTool<GetItemInput, { item: ToolItemDetailed | null }> = {
  name: 'get_item',
  description:
    'Fetch the full content of a single item by id (including body text). Use after list_items or search_items when the agent needs the full article body, not just the title.',
  inputSchema,
  run,
}
