import Parser from 'rss-parser'
import { getEnv } from '@/lib/env'
import type { NormalizedItem, SourceAdapter, SourceFetchInput } from './types'

const GENERIC_UA = 'feedhub/0.1 (+https://localhost)'

function uaFor(url: string): string {
  if (/(^|\.)reddit\.com/.test(url)) {
    const env = getEnv()
    return env.REDDIT_USER_AGENT ?? GENERIC_UA
  }
  return GENERIC_UA
}

type RssItem = {
  guid?: string
  id?: string
  link?: string
  title?: string
  creator?: string
  author?: string
  content?: string
  contentSnippet?: string
  isoDate?: string
  pubDate?: string
  enclosure?: { url?: string }
  ['media:thumbnail']?: { $?: { url?: string } } | { url?: string }
  ['media:content']?: { $?: { url?: string } }
}

const parser = new Parser<Record<string, unknown>, RssItem>({
  customFields: {
    item: [
      ['media:thumbnail', 'media:thumbnail'],
      ['media:content', 'media:content'],
    ],
  },
})

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function deriveTitle(item: RssItem): string | null {
  if (item.title && item.title.trim()) return item.title.trim()
  const text = stripHtml(item.contentSnippet ?? item.content ?? '')
  if (!text) return null
  return text.length > 140 ? text.slice(0, 137) + '…' : text
}

function extractThumbnail(item: RssItem): string | undefined {
  if (item.enclosure?.url) return item.enclosure.url

  const mt = item['media:thumbnail']
  if (mt) {
    if ('$' in mt && mt.$?.url) return mt.$.url
    if ('url' in mt && mt.url) return mt.url
  }

  const mc = item['media:content']
  if (mc && '$' in mc && mc.$?.url) return mc.$.url

  return undefined
}

export async function fetchRssFeed(url: string): Promise<NormalizedItem[]> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': uaFor(url),
      Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
    },
  })
  if (!res.ok) {
    throw new Error(`Feed fetch failed: ${res.status} ${res.statusText} for ${url}`)
  }
  const xml = await res.text()
  const feed = await parser.parseString(xml)
  const items = feed.items ?? []

  return items
    .map((item): NormalizedItem | null => {
      const link = item.link
      const title = deriveTitle(item)
      if (!link || !title) return null

      const externalId = item.guid ?? item.id ?? link
      const dateString = item.isoDate ?? item.pubDate
      const publishedAt = dateString ? new Date(dateString) : new Date()

      return {
        externalId,
        title,
        url: link,
        author: item.creator ?? item.author,
        body: item.contentSnippet ?? item.content,
        thumbnail: extractThumbnail(item),
        publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
      }
    })
    .filter((x): x is NormalizedItem => x !== null)
}

export const rssAdapter: SourceAdapter = {
  type: 'rss',
  async fetch({ identifier }: SourceFetchInput) {
    const items = await fetchRssFeed(identifier)
    return { items }
  },
}
