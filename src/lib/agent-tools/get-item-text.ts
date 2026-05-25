import { z } from 'zod'
import { prisma } from '@/lib/db'
import { preprocessText, splitIntoSentences } from '@/lib/reader/engine'
import type { AgentTool } from './types'

const inputSchema = z.object({
  id: z.string().min(1),
  include_sentences: z.boolean().optional().default(false),
})

export type GetItemTextInput = z.infer<typeof inputSchema>

export interface GetItemTextOutput {
  id: string
  title: string
  text: string
  sentences?: string[]
  wordCount: number
  estimatedSeconds: number
}

async function run(input: GetItemTextInput): Promise<GetItemTextOutput | { item: null }> {
  const item = await prisma.item.findUnique({
    where: { id: input.id },
    select: { id: true, title: true, body: true },
  })
  if (!item) return { item: null }

  const raw = item.body ? `${item.title}. ${item.body}` : item.title
  const text = preprocessText(raw)
  const sentences = splitIntoSentences(text)
  const wordCount = text.split(/\s+/).filter(Boolean).length
  // Rough estimate: ~155 spoken words per minute.
  const estimatedSeconds = Math.round((wordCount / 155) * 60)

  return {
    id: item.id,
    title: item.title,
    text,
    sentences: input.include_sentences ? sentences : undefined,
    wordCount,
    estimatedSeconds,
  }
}

export const getItemTextTool: AgentTool<GetItemTextInput, GetItemTextOutput | { item: null }> = {
  name: 'get_item_text',
  description:
    'Return the reader-friendly text of an item, preprocessed for natural speech (URLs collapsed to "link", @mentions and #hashtags spoken naturally). Also returns word count and estimated listening duration in seconds. Pass include_sentences=true to also receive the text pre-split into sentences for sentence-by-sentence playback.',
  inputSchema,
  run,
}
