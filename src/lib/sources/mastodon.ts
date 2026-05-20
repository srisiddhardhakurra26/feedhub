import { fetchRssFeed } from './rss'
import type { SourceAdapter, SourceFetchInput, SourceFetchResult } from './types'

function buildFeedUrl(identifier: string): string {
  const trimmed = identifier.trim()
  if (!trimmed) {
    throw new Error('Mastodon identifier required (@user@instance or profile URL).')
  }

  if (trimmed.startsWith('http')) {
    if (trimmed.endsWith('.rss') || trimmed.endsWith('.atom')) return trimmed
    let u: URL
    try {
      u = new URL(trimmed)
    } catch {
      throw new Error('Could not parse that URL.')
    }
    const profile = u.pathname.match(/^\/(@[\w.-]+)\/?$/)
    if (profile) {
      return `${u.origin}/${profile[1]}.rss`
    }
    throw new Error(
      'Paste a Mastodon profile URL like https://mastodon.social/@user — instance pages (/explore, /public) don\'t expose a feed.',
    )
  }

  const handle = trimmed.replace(/^@/, '')
  const parts = handle.split('@')
  if (parts.length === 2 && parts[0] && parts[1]) {
    return `https://${parts[1]}/@${parts[0]}.rss`
  }

  throw new Error('Use format @user@instance.tld or paste the profile URL.')
}

export const mastodonAdapter: SourceAdapter = {
  type: 'mastodon',
  async fetch({ identifier }: SourceFetchInput): Promise<SourceFetchResult> {
    const items = await fetchRssFeed(buildFeedUrl(identifier))
    return { items }
  },
}
