import { fetchRssFeed } from './rss'
import type { SourceAdapter, SourceFetchInput, SourceFetchResult } from './types'

const HN_BUILTIN_FEEDS = new Set([
  'front',
  'frontpage',
  'best',
  'newest',
  'ask',
  'show',
  'jobs',
  'pool',
  'invited',
  'launches',
  'classic',
  'bestcomments',
  'newcomments',
])

function buildFeedUrl(identifier: string): string {
  const trimmed = identifier.trim()
  if (!trimmed) return 'https://hnrss.org/frontpage'

  if (trimmed.startsWith('http')) {
    if (/hnrss\.org/i.test(trimmed)) return trimmed
    if (/news\.ycombinator\.com\/rss\b/i.test(trimmed)) return trimmed
    throw new Error(
      'Use a feed name (front, best, newest, ask, show, jobs) instead of the HN website URL.',
    )
  }

  const lower = trimmed.toLowerCase()
  if (lower === 'front') return 'https://hnrss.org/frontpage'
  if (HN_BUILTIN_FEEDS.has(lower)) return `https://hnrss.org/${lower}`

  if (lower.startsWith('user:')) {
    return `https://hnrss.org/submitted?id=${encodeURIComponent(trimmed.slice(5))}`
  }
  if (lower.startsWith('threads:')) {
    return `https://hnrss.org/threads?id=${encodeURIComponent(trimmed.slice(8))}`
  }
  if (lower.startsWith('points:')) {
    return `https://hnrss.org/newest?points=${encodeURIComponent(trimmed.slice(7))}`
  }
  if (lower.startsWith('q:')) {
    return `https://hnrss.org/newest?q=${encodeURIComponent(trimmed.slice(2))}`
  }
  throw new Error(
    `Unrecognized HN feed "${trimmed}". Try: front, best, newest, ask, show, jobs, or user:<name>.`,
  )
}

export const hackernewsAdapter: SourceAdapter = {
  type: 'hackernews',
  async fetch({ identifier }: SourceFetchInput): Promise<SourceFetchResult> {
    const items = await fetchRssFeed(buildFeedUrl(identifier))
    return { items }
  },
}
