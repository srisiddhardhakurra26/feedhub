import { z } from 'zod'
import { getItemTool } from './get-item'
import { listItemsTool } from './list-items'
import { listSourcesTool } from './list-sources'
import { searchItemsTool } from './search-items'
import type { AgentTool } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const agentTools: AgentTool<any, any>[] = [
  listItemsTool,
  searchItemsTool,
  getItemTool,
  listSourcesTool,
]

export const agentToolsByName = new Map(agentTools.map((t) => [t.name, t]))

export interface ToolDescriptor {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

// Convert each tool's Zod schema to a JSON Schema-ish object for MCP tools/list.
export function describeTools(): ToolDescriptor[] {
  return agentTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.inputSchema),
  }))
}

// Minimal Zod → JSON Schema converter. Handles the shapes we actually use:
// z.object({...}), z.string, z.number().int(), z.enum, z.optional, z.default.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function zodToJsonSchema(schema: z.ZodType<any>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._def
  const typeName = def?.typeName ?? def?.type

  if (typeName === 'ZodObject' || typeName === 'object') {
    const shape = typeof def.shape === 'function' ? def.shape() : def.shape
    const properties: Record<string, unknown> = {}
    const required: string[] = []
    for (const [key, value] of Object.entries(shape ?? {})) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const child = value as z.ZodType<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childDef = (child as any)._def
      properties[key] = zodToJsonSchema(child)
      const isOptional =
        childDef?.typeName === 'ZodOptional' ||
        childDef?.type === 'optional' ||
        childDef?.typeName === 'ZodDefault' ||
        childDef?.type === 'default'
      if (!isOptional) required.push(key)
    }
    const out: Record<string, unknown> = { type: 'object', properties }
    if (required.length > 0) out.required = required
    return out
  }

  if (typeName === 'ZodOptional' || typeName === 'optional') {
    return zodToJsonSchema(def.innerType)
  }
  if (typeName === 'ZodDefault' || typeName === 'default') {
    const inner = zodToJsonSchema(def.innerType)
    const dflt = typeof def.defaultValue === 'function' ? def.defaultValue() : def.defaultValue
    return { ...inner, default: dflt }
  }
  if (typeName === 'ZodEnum' || typeName === 'enum') {
    const values = def.values ?? def.entries ?? []
    const list = Array.isArray(values) ? values : Object.values(values)
    return { type: 'string', enum: list }
  }
  if (typeName === 'ZodString' || typeName === 'string') {
    return { type: 'string' }
  }
  if (typeName === 'ZodNumber' || typeName === 'number') {
    return { type: 'number' }
  }
  if (typeName === 'ZodBoolean' || typeName === 'boolean') {
    return { type: 'boolean' }
  }
  return {}
}
