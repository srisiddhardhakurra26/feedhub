export const SOURCE_TYPES = [
  'reddit',
  'youtube',
  'rss',
  'hackernews',
  'github',
  'mastodon',
  'substack',
  'huggingface',
  'bluesky',
] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

export interface NormalizedItem {
  externalId: string
  title: string
  url: string
  author?: string
  body?: string
  thumbnail?: string
  publishedAt: Date
  raw?: unknown
}

export interface SourceFetchInput {
  identifier: string
  config?: string | null
}

export interface SourceFetchResult {
  items: NormalizedItem[]
  configUpdate?: Record<string, unknown>
}

export interface SourceAdapter {
  type: SourceType
  fetch(input: SourceFetchInput): Promise<SourceFetchResult>
}

export function isSourceType(value: string): value is SourceType {
  return (SOURCE_TYPES as readonly string[]).includes(value)
}
