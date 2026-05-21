import type {
  NormalizedItem,
  SourceAdapter,
  SourceFetchInput,
  SourceFetchResult,
} from './types'

type HFKind = 'models' | 'datasets' | 'spaces'

const HF_KINDS: ReadonlySet<HFKind> = new Set(['models', 'datasets', 'spaces'])

const TRENDING_LIMIT = 30

interface HFListItem {
  id: string
  lastModified?: string
  createdAt?: string
  likes?: number
  downloads?: number
  trendingScore?: number
  tags?: string[]
  pipeline_tag?: string
  sdk?: string
  description?: string
  private?: boolean
  gated?: boolean | string
}

function isHFKind(value: string): value is HFKind {
  return HF_KINDS.has(value as HFKind)
}

function urlFor(kind: HFKind, id: string): string {
  if (kind === 'models') return `https://huggingface.co/${id}`
  if (kind === 'datasets') return `https://huggingface.co/datasets/${id}`
  return `https://huggingface.co/spaces/${id}`
}

function authorFor(id: string): string | undefined {
  const slash = id.indexOf('/')
  if (slash <= 0) return undefined
  return id.slice(0, slash)
}

function summarize(kind: HFKind, item: HFListItem): string {
  const stats: string[] = []
  if (typeof item.likes === 'number') stats.push(`${item.likes.toLocaleString()} likes`)
  if (kind === 'models' && typeof item.downloads === 'number') {
    stats.push(`${item.downloads.toLocaleString()} downloads`)
  }
  if (kind === 'spaces' && item.sdk) stats.push(`sdk: ${item.sdk}`)
  if (item.pipeline_tag) stats.push(item.pipeline_tag)
  const tagLine = (item.tags ?? [])
    .filter((t) => !t.includes(':'))
    .slice(0, 6)
    .join(', ')
  if (tagLine) stats.push(tagLine)

  const statLine = stats.join(' · ')
  const desc = (item.description ?? '').trim().split('\n').find((l) => l.trim()) ?? ''
  const shortDesc = desc.length > 280 ? desc.slice(0, 280).trimEnd() + '…' : desc
  return [statLine, shortDesc].filter(Boolean).join('\n\n')
}

export const huggingfaceAdapter: SourceAdapter = {
  type: 'huggingface',
  async fetch({ identifier }: SourceFetchInput): Promise<SourceFetchResult> {
    const kind = identifier.trim().toLowerCase()
    if (!isHFKind(kind)) {
      throw new Error(
        `Unknown Hugging Face feed "${identifier}". Expected one of: models, datasets, spaces.`,
      )
    }

    const url = `https://huggingface.co/api/${kind}?sort=trendingScore&direction=-1&limit=${TRENDING_LIMIT}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`Hugging Face API returned ${res.status} ${res.statusText}`)
    }

    const body = (await res.json()) as HFListItem[]
    if (!Array.isArray(body)) {
      throw new Error('Unexpected Hugging Face API response shape (expected array).')
    }

    const now = Date.now()
    const items: NormalizedItem[] = body
      .filter((entry) => entry && typeof entry.id === 'string' && !entry.private)
      .map((entry, idx) => {
        const stamp = entry.lastModified ?? entry.createdAt
        const parsed = stamp ? new Date(stamp) : null
        const publishedAt =
          parsed && !Number.isNaN(parsed.getTime())
            ? parsed
            : new Date(now - idx * 1000)
        return {
          externalId: `${kind}:${entry.id}`,
          title: entry.id,
          url: urlFor(kind, entry.id),
          author: authorFor(entry.id),
          body: summarize(kind, entry),
          publishedAt,
          raw: entry,
        }
      })

    return { items }
  },
}
