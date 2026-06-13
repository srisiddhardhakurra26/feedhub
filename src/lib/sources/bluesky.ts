import type { NormalizedItem, SourceAdapter, SourceFetchInput } from './types'

// Bluesky's public AppView API — no auth, no API key, generous limits.
const API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed'

interface BskyImage {
  thumb?: string
}

interface BskyEmbedView {
  $type?: string
  images?: BskyImage[]
  external?: { uri?: string; title?: string; thumb?: string }
  media?: { images?: BskyImage[]; external?: { thumb?: string } }
}

interface BskyFeedEntry {
  post: {
    uri: string
    author: { handle: string; displayName?: string }
    record: { text?: string; createdAt?: string }
    embed?: BskyEmbedView
  }
  reason?: { $type?: string }
}

/** Accepts "handle.bsky.social", "@handle", or a bsky.app profile URL. */
export function normalizeBlueskyActor(identifier: string): string {
  let actor = identifier.trim()
  const profileMatch = actor.match(/bsky\.app\/profile\/([^/?#]+)/)
  if (profileMatch) actor = profileMatch[1]
  return actor.replace(/^@/, '')
}

function deriveTitle(text: string, externalTitle?: string): string | null {
  const firstLine = text.split('\n').find((l) => l.trim()) ?? ''
  const title = firstLine.trim() || externalTitle?.trim() || ''
  if (!title) return null
  return title.length > 140 ? title.slice(0, 137) + '…' : title
}

function extractThumbnail(embed?: BskyEmbedView): string | undefined {
  return (
    embed?.images?.[0]?.thumb ??
    embed?.media?.images?.[0]?.thumb ??
    embed?.external?.thumb ??
    embed?.media?.external?.thumb
  )
}

export const blueskyAdapter: SourceAdapter = {
  type: 'bluesky',
  async fetch({ identifier }: SourceFetchInput) {
    const actor = normalizeBlueskyActor(identifier)
    const params = new URLSearchParams({
      actor,
      limit: '30',
      filter: 'posts_no_replies',
    })
    const res = await fetch(`${API}?${params}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`Bluesky fetch failed: ${res.status} ${res.statusText} for ${actor}`)
    }
    const data = (await res.json()) as { feed?: BskyFeedEntry[] }

    const items = (data.feed ?? [])
      // Skip reposts: this feed is the account's own voice.
      .filter((e) => !e.reason)
      .map((e): NormalizedItem | null => {
        const { post } = e
        const text = post.record.text ?? ''
        const title = deriveTitle(text, post.embed?.external?.title)
        if (!title) return null

        const rkey = post.uri.split('/').pop()
        if (!rkey) return null

        const publishedAt = post.record.createdAt ? new Date(post.record.createdAt) : new Date()

        return {
          externalId: post.uri,
          title,
          url: `https://bsky.app/profile/${post.author.handle}/post/${rkey}`,
          author: post.author.displayName ?? post.author.handle,
          body: text.length > title.length ? text : undefined,
          thumbnail: extractThumbnail(post.embed),
          publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
        }
      })
      .filter((x): x is NormalizedItem => x !== null)

    return { items }
  },
}
