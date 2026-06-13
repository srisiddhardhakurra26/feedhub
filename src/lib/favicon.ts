// Derive an outlet favicon URL from a source's feed/site identifier.
//
// Feed URLs often live on an aggregator subdomain (feeds.bbci.co.uk,
// feeds.npr.org) whose favicon 404s — the real icon is on the apex domain —
// so we strip leading feed/rss/www labels first. Google's favicon service
// returns a crisp PNG for known domains and 404s for unknown ones, which lets
// the <img> consumer fall back to a generic glyph on error.
export function faviconUrl(identifier: string, size = 64): string | null {
  let host: string
  try {
    const raw = identifier.trim()
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    host = url.hostname
  } catch {
    return null
  }
  if (!host) return null
  const domain = host.replace(/^(feeds?|rss|www)\./i, '')
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`
}
