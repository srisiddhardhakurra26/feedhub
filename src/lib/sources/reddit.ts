import { prisma } from '@/lib/db'
import { getEnv, hasRedditCreds } from '@/lib/env'
import { refreshRedditToken } from '@/lib/oauth/reddit'
import type { NormalizedItem, SourceAdapter, SourceFetchInput, SourceFetchResult } from './types'

type RedditChild = {
  kind: string
  data: {
    id: string
    name: string
    title: string
    permalink: string
    url: string
    author: string
    selftext?: string
    thumbnail?: string
    preview?: {
      images?: Array<{ source?: { url?: string } }>
    }
    created_utc: number
    is_self?: boolean
  }
}

type RedditListing = {
  data: { children: RedditChild[] }
}

let cachedAppToken: { value: string; expiresAt: number } | null = null

async function getAppToken(): Promise<string> {
  const env = getEnv()
  if (cachedAppToken && cachedAppToken.expiresAt > Date.now() + 60_000) {
    return cachedAppToken.value
  }
  const creds = Buffer.from(
    `${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`,
  ).toString('base64')
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': env.REDDIT_USER_AGENT ?? 'feedhub:local:0.1',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) {
    throw new Error(`Reddit app-token request failed: ${res.status} ${await res.text()}`)
  }
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cachedAppToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
  return cachedAppToken.value
}

async function getUserToken(): Promise<string | null> {
  const account = await prisma.account.findUnique({ where: { platform: 'reddit' } })
  if (!account) return null

  const notExpired = account.expiresAt && account.expiresAt.getTime() > Date.now() + 60_000
  if (notExpired) return account.accessToken

  if (!account.refreshToken) return account.accessToken
  const refreshed = await refreshRedditToken(account.refreshToken)
  await prisma.account.update({
    where: { platform: 'reddit' },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? account.refreshToken,
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      scope: refreshed.scope,
    },
  })
  return refreshed.access_token
}

function parseIdentifier(identifier: string): { kind: 'home' | 'sub' | 'user'; name: string } {
  if (identifier === '__home__') return { kind: 'home', name: '' }
  const trimmed = identifier.trim().replace(/^\//, '')
  if (trimmed.startsWith('r/')) return { kind: 'sub', name: trimmed.slice(2) }
  if (trimmed.startsWith('u/')) return { kind: 'user', name: trimmed.slice(2) }
  return { kind: 'sub', name: trimmed }
}

function pickThumbnail(child: RedditChild['data']): string | undefined {
  const previewUrl = child.preview?.images?.[0]?.source?.url
  if (previewUrl) return previewUrl.replace(/&amp;/g, '&')
  if (child.thumbnail && child.thumbnail.startsWith('http')) return child.thumbnail
  return undefined
}

export const redditAdapter: SourceAdapter = {
  type: 'reddit',
  async fetch({ identifier }: SourceFetchInput): Promise<SourceFetchResult> {
    const { kind, name } = parseIdentifier(identifier)

    const userToken = await getUserToken()
    if (kind === 'home' && !userToken) {
      throw new Error('Reddit home feed requires connecting your Reddit account at /accounts.')
    }

    let token = userToken
    if (!token) {
      if (!hasRedditCreds()) {
        throw new Error(
          'Reddit credentials missing. Set REDDIT_CLIENT_ID/SECRET/USER_AGENT or connect your account at /accounts.',
        )
      }
      token = await getAppToken()
    }

    const env = getEnv()
    const path =
      kind === 'home' ? '/best' : kind === 'sub' ? `/r/${name}/new` : `/user/${name}/submitted`

    const res = await fetch(`https://oauth.reddit.com${path}?limit=50`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': env.REDDIT_USER_AGENT ?? 'feedhub:local:0.1',
      },
    })

    if (!res.ok) {
      throw new Error(`Reddit fetch failed for ${identifier}: ${res.status} ${await res.text()}`)
    }

    const listing = (await res.json()) as RedditListing
    const items: NormalizedItem[] = listing.data.children.map(({ data }) => ({
      externalId: data.name,
      title: data.title,
      url: `https://www.reddit.com${data.permalink}`,
      author: data.author,
      body: data.is_self ? data.selftext : data.url,
      thumbnail: pickThumbnail(data),
      publishedAt: new Date(data.created_utc * 1000),
    }))
    return { items }
  },
}
