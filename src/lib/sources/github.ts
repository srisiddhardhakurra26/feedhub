import { fetchRssFeed } from './rss'
import type { SourceAdapter, SourceFetchInput, SourceFetchResult } from './types'

function buildFeedUrl(identifier: string): string {
  let id = identifier.trim()
  if (!id) throw new Error('GitHub identifier required (username or owner/repo).')

  if (id.startsWith('http')) {
    if (id.endsWith('.atom')) return id
    let pathname: string
    try {
      const u = new URL(id)
      if (!/(^|\.)github\.com$/i.test(u.hostname)) {
        throw new Error('That URL is not on github.com.')
      }
      pathname = u.pathname.replace(/^\/+|\/+$/g, '')
    } catch {
      throw new Error('Could not parse that URL.')
    }
    if (!pathname) {
      throw new Error(
        'Paste a specific GitHub URL like https://github.com/torvalds or https://github.com/vercel/next.js — the homepage has no feed.',
      )
    }
    id = pathname
  }

  if (id.startsWith('@')) id = id.slice(1)
  id = id.replace(/^\/+|\/+$/g, '')

  // owner/repo or owner/repo/{releases|commits|tags}
  const repoMatch = id.match(/^([\w.-]+)\/([\w.-]+)(?:\/(releases|commits|tags))?$/)
  if (repoMatch) {
    const [, owner, repo, kind = 'releases'] = repoMatch
    return `https://github.com/${owner}/${repo}/${kind}.atom`
  }

  // Bare username → public activity feed
  if (/^[\w.-]+$/.test(id)) {
    return `https://github.com/${id}.atom`
  }

  throw new Error(`Unrecognized GitHub identifier "${identifier.trim()}".`)
}

export const githubAdapter: SourceAdapter = {
  type: 'github',
  async fetch({ identifier }: SourceFetchInput): Promise<SourceFetchResult> {
    const items = await fetchRssFeed(buildFeedUrl(identifier))
    return { items }
  },
}
