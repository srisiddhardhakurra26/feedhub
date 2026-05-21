import { z } from 'zod'

export interface AgentTool<TInput, TOutput> {
  name: string
  description: string
  inputSchema: z.ZodType<TInput>
  run(input: TInput): Promise<TOutput>
}

export interface ToolItem {
  id: string
  title: string
  url: string
  author: string | null
  publishedAt: string
  isRead: boolean
  isSaved: boolean
  category: string | null
  source: {
    type: string
    identifier: string
    label: string | null
  }
}

export interface ToolItemDetailed extends ToolItem {
  body: string | null
}

export interface ToolSource {
  id: string
  type: string
  identifier: string
  label: string | null
  itemCount: number
  enabled: boolean
}
