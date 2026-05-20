import { prisma } from '@/lib/db'
import { refreshGoogleToken } from '@/lib/oauth/google'

const SUBSCRIPTIONS_URL = 'https://www.googleapis.com/youtube/v3/subscriptions'

export interface YouTubeSubscription {
  channelId: string
  title: string
}

interface SubscriptionsListResponse {
  items: Array<{
    snippet: {
      title: string
      resourceId: { channelId: string }
    }
  }>
  nextPageToken?: string
}

export async function fetchYouTubeSubscriptions(accessToken: string): Promise<YouTubeSubscription[]> {
  const subs: YouTubeSubscription[] = []
  let pageToken: string | undefined = undefined
  for (let page = 0; page < 50; page++) {
    const params = new URLSearchParams({
      part: 'snippet',
      mine: 'true',
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    })
    const res = await fetch(`${SUBSCRIPTIONS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      throw new Error(`subscriptions.list failed: ${res.status} ${await res.text()}`)
    }
    const data = (await res.json()) as SubscriptionsListResponse
    for (const item of data.items) {
      subs.push({
        channelId: item.snippet.resourceId.channelId,
        title: item.snippet.title,
      })
    }
    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }
  return subs
}

const tokenCache = globalThis as unknown as {
  __googleTokenInflight?: Promise<string | null>
}

export async function getGoogleAccessToken(): Promise<string | null> {
  if (tokenCache.__googleTokenInflight) return tokenCache.__googleTokenInflight
  const promise = (async () => {
    const account = await prisma.account.findUnique({ where: { platform: 'google' } })
    if (!account) return null

    const notExpired = account.expiresAt && account.expiresAt.getTime() > Date.now() + 60_000
    if (notExpired) return account.accessToken

    if (!account.refreshToken) return account.accessToken
    const refreshed = await refreshGoogleToken(account.refreshToken)
    await prisma.account.update({
      where: { platform: 'google' },
      data: {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? account.refreshToken,
        expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        scope: refreshed.scope,
      },
    })
    return refreshed.access_token
  })()
  tokenCache.__googleTokenInflight = promise
  try {
    return await promise
  } finally {
    tokenCache.__googleTokenInflight = undefined
  }
}

export interface SubscriptionSyncResult {
  added: number
  updated: number
  removed: number
  total: number
}

export async function syncYouTubeSubscriptions(accessToken: string): Promise<SubscriptionSyncResult> {
  const subs = await fetchYouTubeSubscriptions(accessToken)
  const incomingIds = new Set(subs.map((s) => s.channelId))

  const existing = await prisma.source.findMany({
    where: { type: 'youtube' },
    select: { id: true, identifier: true, config: true },
  })
  const existingByChannel = new Map<string, typeof existing[number]>()
  for (const row of existing) {
    let channelId = row.identifier
    if (row.config) {
      try {
        const parsed = JSON.parse(row.config) as { channelId?: string; fromSubscription?: boolean }
        if (parsed.channelId) channelId = parsed.channelId
      } catch {}
    }
    existingByChannel.set(channelId, row)
  }

  let added = 0
  let updated = 0
  for (const sub of subs) {
    const existingRow = existingByChannel.get(sub.channelId)
    if (existingRow) {
      await prisma.source.update({
        where: { id: existingRow.id },
        data: {
          label: sub.title,
          config: JSON.stringify({ channelId: sub.channelId, fromSubscription: true }),
          enabled: true,
        },
      })
      updated++
    } else {
      await prisma.source.create({
        data: {
          type: 'youtube',
          identifier: sub.channelId,
          label: sub.title,
          config: JSON.stringify({ channelId: sub.channelId, fromSubscription: true }),
        },
      })
      added++
    }
  }

  const toRemove = existing.filter((row) => {
    if (!row.config) return false
    try {
      const parsed = JSON.parse(row.config) as { channelId?: string; fromSubscription?: boolean }
      if (!parsed.fromSubscription) return false
      const channelId = parsed.channelId ?? row.identifier
      return !incomingIds.has(channelId)
    } catch {
      return false
    }
  })
  if (toRemove.length > 0) {
    await prisma.source.deleteMany({ where: { id: { in: toRemove.map((r) => r.id) } } })
  }

  return { added, updated, removed: toRemove.length, total: subs.length }
}
