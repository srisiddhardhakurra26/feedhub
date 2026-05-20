import { fetchRssFeed } from './rss'
import type {
  NormalizedItem,
  SourceAdapter,
  SourceFetchInput,
  SourceFetchResult,
} from './types'
import { getGoogleAccessToken } from '@/lib/google/subscriptions'

const CHANNEL_ID_RE = /^UC[0-9A-Za-z_-]{22}$/
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

function buildFeedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
}

function uploadsPlaylistId(channelId: string): string {
  return 'UU' + channelId.slice(2)
}

interface Thumbnails {
  maxres?: { url: string }
  standard?: { url: string }
  high?: { url: string }
  medium?: { url: string }
  default?: { url: string }
}

interface PlaylistItemsResponse {
  items?: Array<{
    snippet: {
      title: string
      description?: string
      publishedAt: string
      channelTitle?: string
      thumbnails?: Thumbnails
      resourceId: { videoId: string }
    }
  }>
}

function pickThumbnail(t: Thumbnails | undefined): string | undefined {
  if (!t) return undefined
  return t.maxres?.url ?? t.standard?.url ?? t.high?.url ?? t.medium?.url ?? t.default?.url
}

async function fetchViaApi(channelId: string, accessToken: string): Promise<NormalizedItem[]> {
  const playlistId = uploadsPlaylistId(channelId)
  const params = new URLSearchParams({
    playlistId,
    part: 'snippet',
    maxResults: '15',
  })
  const res = await fetch(
    `https://youtube.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (res.status === 404) {
    // Channel exists but has no public uploads (common for personal Google accounts).
    // Don't treat as an error — just return no items.
    return []
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`YouTube API ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = (await res.json()) as PlaylistItemsResponse
  if (!data.items) return []
  return data.items.map((it) => {
    const videoId = it.snippet.resourceId.videoId
    return {
      externalId: videoId,
      title: it.snippet.title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      author: it.snippet.channelTitle,
      body: it.snippet.description,
      thumbnail: pickThumbnail(it.snippet.thumbnails),
      publishedAt: new Date(it.snippet.publishedAt),
    }
  })
}

async function resolveChannelIdFromUrl(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } })
  if (!res.ok) throw new Error(`YouTube page returned ${res.status} for ${url}`)
  const html = await res.text()

  const canonical = html.match(
    /<link rel="canonical" href="https?:\/\/www\.youtube\.com\/channel\/(UC[0-9A-Za-z_-]{22})/,
  )
  if (canonical?.[1]) return canonical[1]

  const inJson = html.match(/"channelId":"(UC[0-9A-Za-z_-]{22})"/)
  if (inJson?.[1]) return inJson[1]

  const inMeta = html.match(/<meta itemprop="(?:channelId|identifier)" content="(UC[0-9A-Za-z_-]{22})"/)
  if (inMeta?.[1]) return inMeta[1]

  throw new Error(`Couldn't find a channel ID at ${url}`)
}

async function resolveChannelId(identifier: string): Promise<string> {
  const trimmed = identifier.trim()

  if (CHANNEL_ID_RE.test(trimmed)) return trimmed

  if (trimmed.startsWith('http')) {
    const direct = trimmed.match(/\/channel\/(UC[0-9A-Za-z_-]{22})/)
    if (direct?.[1]) return direct[1]

    if (/\/(@|user\/|c\/)/.test(trimmed)) {
      return resolveChannelIdFromUrl(trimmed)
    }

    throw new Error(
      'YouTube URL must point to a channel — use /@handle, /channel/UC..., /user/..., or /c/...',
    )
  }

  if (trimmed.startsWith('@')) {
    return resolveChannelIdFromUrl(`https://www.youtube.com/${trimmed}`)
  }

  throw new Error(
    'Use a channel ID (UC…), handle (@name), or channel URL (https://www.youtube.com/@name).',
  )
}

function readCachedChannelId(config: string | null | undefined): string | null {
  if (!config) return null
  try {
    const parsed = JSON.parse(config) as { channelId?: unknown }
    return typeof parsed.channelId === 'string' && CHANNEL_ID_RE.test(parsed.channelId)
      ? parsed.channelId
      : null
  } catch {
    return null
  }
}

export const youtubeAdapter: SourceAdapter = {
  type: 'youtube',
  async fetch({ identifier, config }: SourceFetchInput): Promise<SourceFetchResult> {
    const cached = readCachedChannelId(config)
    const channelId = cached ?? (await resolveChannelId(identifier))
    const configUpdate = cached ? undefined : { channelId }

    const token = await getGoogleAccessToken().catch(() => null)
    if (token) {
      try {
        const items = await fetchViaApi(channelId, token)
        return { items, ...(configUpdate ? { configUpdate } : {}) }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (!/401|403|invalid|unauth/i.test(msg)) {
          throw err
        }
        console.warn('[youtube] API auth failed, falling back to RSS:', msg)
      }
    }

    const items = await fetchRssFeed(buildFeedUrl(channelId))
    return { items, ...(configUpdate ? { configUpdate } : {}) }
  },
}
