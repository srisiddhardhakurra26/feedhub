import { githubAdapter } from './github'
import { hackernewsAdapter } from './hackernews'
import { mastodonAdapter } from './mastodon'
import { redditAdapter } from './reddit'
import { rssAdapter } from './rss'
import { substackAdapter } from './substack'
import { youtubeAdapter } from './youtube'
import type { SourceAdapter, SourceType } from './types'

const adapters: Record<SourceType, SourceAdapter> = {
  reddit: redditAdapter,
  rss: rssAdapter,
  youtube: youtubeAdapter,
  hackernews: hackernewsAdapter,
  github: githubAdapter,
  mastodon: mastodonAdapter,
  substack: substackAdapter,
}

export function getAdapter(type: SourceType): SourceAdapter {
  return adapters[type]
}
