import { prisma } from '@/lib/db'
import { getAdapter } from '@/lib/sources/registry'
import { isSourceType } from '@/lib/sources/types'

export interface SourceRunResult {
  sourceId: string
  label: string
  ok: boolean
  newItems: number
  error?: string
}

export async function runFetch(sourceIds?: string[]): Promise<SourceRunResult[]> {
  const sources = await prisma.source.findMany({
    where: {
      enabled: true,
      ...(sourceIds && sourceIds.length > 0 ? { id: { in: sourceIds } } : {}),
    },
  })

  const results = await Promise.all(sources.map((source) => runOne(source)))
  return results
}

async function runOne(source: {
  id: string
  type: string
  identifier: string
  label: string | null
  config: string | null
}): Promise<SourceRunResult> {
  const label = source.label ?? `${source.type}:${source.identifier}`
  if (!isSourceType(source.type)) {
    return {
      sourceId: source.id,
      label,
      ok: false,
      newItems: 0,
      error: `Unknown source type: ${source.type}`,
    }
  }

  try {
    const adapter = getAdapter(source.type)
    const result = await adapter.fetch({
      identifier: source.identifier,
      config: source.config,
    })

    let newItems = 0
    for (const item of result.items) {
      const result = await prisma.item.upsert({
        where: {
          sourceId_externalId: {
            sourceId: source.id,
            externalId: item.externalId,
          },
        },
        update: {
          title: item.title,
          url: item.url,
          author: item.author ?? null,
          body: item.body ?? null,
          thumbnail: item.thumbnail ?? null,
          publishedAt: item.publishedAt,
        },
        create: {
          sourceId: source.id,
          externalId: item.externalId,
          title: item.title,
          url: item.url,
          author: item.author ?? null,
          body: item.body ?? null,
          thumbnail: item.thumbnail ?? null,
          publishedAt: item.publishedAt,
        },
        select: { fetchedAt: true, id: true },
      })
      if (Date.now() - result.fetchedAt.getTime() < 5000) {
        newItems += 1
      }
    }

    const mergedConfig = result.configUpdate
      ? JSON.stringify({
          ...(source.config ? safeParse(source.config) : {}),
          ...result.configUpdate,
        })
      : undefined

    await prisma.source.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: new Date(),
        lastError: null,
        ...(mergedConfig !== undefined ? { config: mergedConfig } : {}),
      },
    })

    return { sourceId: source.id, label, ok: true, newItems }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await prisma.source.update({
      where: { id: source.id },
      data: { lastError: message, lastFetchedAt: new Date() },
    })
    return { sourceId: source.id, label, ok: false, newItems: 0, error: message }
  }
}

function safeParse(json: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(json)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
