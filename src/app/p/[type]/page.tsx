import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { loadMoreItems } from '@/app/actions'
import { FilterTabs } from '@/components/FilterTabs'
import { RefreshButton } from '@/components/RefreshButton'
import { SearchInput } from '@/components/SearchInput'
import { CategoryFilter } from '@/components/CategoryFilter'
import { FeedList } from '@/components/FeedList'
import { PlatformIcon } from '@/components/PlatformIcon'
import { SOURCE_TYPES, isSourceType, type SourceType } from '@/lib/sources/types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

const PLATFORM_LABEL: Record<SourceType, string> = {
  reddit:       'Reddit',
  youtube:      'YouTube',
  rss:          'RSS',
  hackernews:   'Hacker News',
  github:       'GitHub',
  mastodon:     'Mastodon',
  substack:     'Substack',
  huggingface:  'Hugging Face',
  bluesky:      'Bluesky',
}

const PLATFORM_ACCENT: Record<SourceType, string> = {
  reddit:       'text-[#ff4500]',
  youtube:      'text-[#ff0000]',
  rss:          'text-[#f26522]',
  hackernews:   'text-[#ff6600]',
  github:       'text-zinc-800 dark:text-zinc-200',
  mastodon:     'text-[#563ACC] dark:text-[#6364ff]',
  substack:     'text-orange-600',
  huggingface:  'text-[#ff9d00]',
  bluesky:      'text-[#0085ff]',
}

interface PageProps {
  params: Promise<{ type: string }>
  searchParams: Promise<{ filter?: string; q?: string; category?: string }>
}

export default async function PlatformPage({ params, searchParams }: PageProps) {
  const { type } = await params
  if (!isSourceType(type)) notFound()

  const { filter, q, category } = await searchParams
  const mode: 'all' | 'unread' | 'saved' =
    filter === 'unread' || filter === 'saved' ? filter : 'all'
  const query = (q ?? '').trim()
  const cat = (category ?? '').trim() || null

  const sourceWhere =
    type === 'reddit'
      ? {
          OR: [
            { type: 'reddit' },
            { type: 'rss', identifier: { contains: 'reddit.com' } },
          ],
        }
      : { type }

  const sourceIds = (
    await prisma.source.findMany({ where: sourceWhere, select: { id: true } })
  ).map((s) => s.id)

  if (sourceIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <PlatformIcon type={type} className={`w-6 h-6 ${PLATFORM_ACCENT[type]}`} />
          {PLATFORM_LABEL[type]}
        </h1>
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-500 dark:text-zinc-400">
          No {PLATFORM_LABEL[type]} sources yet. <a href="/accounts" className="underline">Add one</a>.
        </div>
      </div>
    )
  }

  const baseWhere: {
    isRead?: boolean
    isSaved?: boolean
    sourceId?: { in: string[] }
    OR?: Array<Record<string, { contains: string }>>
  } = { sourceId: { in: sourceIds } }
  if (mode === 'unread') baseWhere.isRead = false
  if (mode === 'saved') baseWhere.isSaved = true
  if (query) {
    baseWhere.OR = [
      { title: { contains: query } },
      { body: { contains: query } },
      { author: { contains: query } },
    ]
  }

  const filterOpts = {
    filter: mode,
    sourceIds,
    q: query || undefined,
    category: cat ?? undefined,
  }

  const [firstPage, categoryRows] = await Promise.all([
    loadMoreItems({ ...filterOpts, cursor: null, take: PAGE_SIZE }),
    prisma.item.groupBy({
      by: ['category'],
      where: baseWhere,
      _count: { _all: true },
    }),
  ])

  const counts = categoryRows
    .map((r) => ({ category: r.category, count: r._count._all }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <PlatformIcon type={type} className={`w-5 h-5 ${PLATFORM_ACCENT[type]}`} />
            {PLATFORM_LABEL[type]}
            <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
              · {sourceIds.length} {sourceIds.length === 1 ? 'source' : 'sources'}
            </span>
          </h1>
          <FilterTabs current={mode} />
          <SearchInput />
        </div>
        <RefreshButton />
      </div>

      <CategoryFilter
        counts={counts}
        current={cat}
        filter={filter}
        q={query || undefined}
        basePath={`/p/${type}`}
      />

      {firstPage.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {query ? <>No items match &ldquo;{query}&rdquo;.</> : <>No items yet.</>}
        </div>
      ) : (
        <FeedList
          key={`platform:${type}|${mode}|${query}|${cat ?? ''}`}
          initialItems={firstPage.items}
          initialCursor={firstPage.nextCursor}
          filterOpts={filterOpts}
        />
      )}
    </div>
  )
}

export async function generateStaticParams() {
  return SOURCE_TYPES.map((t) => ({ type: t }))
}
