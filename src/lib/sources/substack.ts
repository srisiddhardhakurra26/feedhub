import { fetchRssFeed } from './rss'
import type { SourceAdapter, SourceFetchInput, SourceFetchResult } from './types'

function buildFeedUrl(identifier: string): string {
  const trimmed = identifier.trim()
  if (!trimmed) throw new Error('Substack URL or slug required.')

  if (trimmed.startsWith('http')) {
    try {
      const u = new URL(trimmed)
      const path = u.pathname.replace(/\/+$/, '')
      if (path.endsWith('/feed')) return `${u.origin}${path}`
      return `${u.origin}/feed`
    } catch {
      throw new Error('Could not parse URL.')
    }
  }

  const slug = trimmed.replace(/^@/, '').toLowerCase()
  if (!/^[\w-]+$/.test(slug)) {
    throw new Error('Substack slug must contain only letters, digits, and dashes.')
  }
  return `https://${slug}.substack.com/feed`
}

export const substackAdapter: SourceAdapter = {
  type: 'substack',
  async fetch({ identifier }: SourceFetchInput): Promise<SourceFetchResult> {
    const items = await fetchRssFeed(buildFeedUrl(identifier))
    return { items }
  },
}
