import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { AgentTool, ToolSource } from './types'

const inputSchema = z.object({})
export type ListSourcesInput = z.infer<typeof inputSchema>

async function run(): Promise<{ sources: ToolSource[] }> {
  const rows = await prisma.source.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  })
  const sources: ToolSource[] = rows.map((s) => ({
    id: s.id,
    type: s.type,
    identifier: s.identifier,
    label: s.label,
    itemCount: s._count.items,
    enabled: s.enabled,
  }))
  return { sources }
}

export const listSourcesTool: AgentTool<ListSourcesInput, { sources: ToolSource[] }> = {
  name: 'list_sources',
  description:
    'List all feed sources the user has connected (Hacker News, Hugging Face, RSS feeds, etc.) along with their item counts. Useful for understanding what the user follows before answering questions.',
  inputSchema,
  run,
}
