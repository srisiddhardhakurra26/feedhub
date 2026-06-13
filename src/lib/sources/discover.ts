import Parser from 'rss-parser'

// Feed auto-discovery: turn "theverge.com" into its actual feed URL so adding
// an RSS source never requires hunting for the feed link by hand.

const FETCH_TIMEOUT_MS = 8000
const UA = 'feedhub/0.1 (+https://localhost)'

const COMMON_PATHS = [
  '/feed',
  '/rss',
  '/feed.xml',
  '/rss.xml',
  '/atom.xml',
  '/index.xml',
  '/feeds/posts/default',
]

const parser = new Parser()

export interface DiscoveredFeed {
  url: string
  title?: string
}

async function fetchText(url: string, accept: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: accept },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

/** Returns the feed (with its self-reported title) iff the URL parses as RSS/Atom. */
async function tryAsFeed(url: string): Promise<DiscoveredFeed | null> {
  const text = await fetchText(
    url,
    'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
  )
  if (!text) return null
  try {
    const feed = await parser.parseString(text)
    return { url, title: feed.title?.trim() || undefined }
  } catch {
    return null
  }
}

/** Extract <link rel="alternate" type="...rss/atom..."> hrefs from an HTML page. */
function feedLinksFromHtml(html: string, baseUrl: string): string[] {
  const head = html.slice(0, 100_000)
  const out: string[] = []
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/rel=["']?alternate["']?/i.test(tag)) continue
    if (!/type=["']?application\/(rss|atom)\+xml/i.test(tag)) continue
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1]
    if (!href) continue
    try {
      out.push(new URL(href, baseUrl).toString())
    } catch {
      // unparsable href — skip
    }
  }
  return out
}

/**
 * Resolve user input (a feed URL, a site URL, or a bare domain) to a working
 * feed. Order: input as-is → <link rel=alternate> on the page → common paths.
 */
export async function discoverFeed(input: string): Promise<DiscoveredFeed | null> {
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`)
  } catch {
    return null
  }

  const direct = await tryAsFeed(url.toString())
  if (direct) return direct

  const html = await fetchText(url.toString(), 'text/html, */*;q=0.8')
  if (html) {
    for (const candidate of feedLinksFromHtml(html, url.toString()).slice(0, 3)) {
      const found = await tryAsFeed(candidate)
      if (found) return found
    }
  }

  for (const path of COMMON_PATHS) {
    const found = await tryAsFeed(new URL(path, url.origin).toString())
    if (found) return found
  }

  return null
}
