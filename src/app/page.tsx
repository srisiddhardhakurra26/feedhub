import { prisma } from '@/lib/db'
import { loadMoreItems } from '@/app/actions'
import { FilterTabs } from '@/components/FilterTabs'
import { RefreshButton } from '@/components/RefreshButton'
import { SearchInput } from '@/components/SearchInput'
import { CategoryFilter } from '@/components/CategoryFilter'
import { DailyPulse } from '@/components/DailyPulse'
import { FeedList } from '@/components/FeedList'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

interface PageProps {
  searchParams: Promise<{
    filter?: string
    source?: string
    q?: string
    category?: string
  }>
}

export default async function HomePage({ searchParams }: PageProps) {
  const { filter, source, q, category } = await searchParams
  const mode: 'all' | 'unread' | 'saved' =
    filter === 'unread' || filter === 'saved' ? filter : 'all'
  const query = (q ?? '').trim()
  const cat = (category ?? '').trim() || null

  const baseWhere: {
    isRead?: boolean
    isSaved?: boolean
    sourceId?: string
    OR?: Array<Record<string, { contains: string }>>
  } = {}
  if (mode === 'unread') baseWhere.isRead = false
  if (mode === 'saved') baseWhere.isSaved = true
  if (source) baseWhere.sourceId = source
  if (query) {
    baseWhere.OR = [
      { title: { contains: query } },
      { body: { contains: query } },
      { author: { contains: query } },
    ]
  }

  const filterOpts = {
    filter: mode,
    source: source ?? undefined,
    q: query || undefined,
    category: cat ?? undefined,
  }

  const [firstPage, totalSources, categoryRows] = await Promise.all([
    loadMoreItems({ ...filterOpts, cursor: null, take: PAGE_SIZE }),
    prisma.source.count(),
    prisma.item.groupBy({
      by: ['category'],
      where: baseWhere,
      _count: { _all: true },
    }),
  ])

  const counts = categoryRows
    .map((r) => ({ category: r.category, count: r._count._all }))
    .sort((a, b) => b.count - a.count)

  const showPulse = mode === 'all' && !source && !query && !cat

  return (
    <div className="space-y-4">
      {showPulse && <DailyPulse />}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <FilterTabs current={mode} />
          <SearchInput />
        </div>
        <RefreshButton />
      </div>

      <CategoryFilter counts={counts} current={cat} filter={filter} q={query || undefined} />

      {totalSources === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-500 dark:text-zinc-400">
          No sources yet. <a href="/sources" className="underline">Add one</a> to get started.
        </div>
      ) : firstPage.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {query ? (
            <>No items match &ldquo;{query}&rdquo;.</>
          ) : cat ? (
            <>No items in &ldquo;{cat}&rdquo;.</>
          ) : (
            <>No items yet. Click Refresh to fetch your sources.</>
          )}
        </div>
      ) : (
        <FeedList
          key={`${mode}|${source ?? ''}|${query}|${cat ?? ''}`}
          initialItems={firstPage.items}
          initialCursor={firstPage.nextCursor}
          filterOpts={filterOpts}
        />
      )}
    </div>
  )
}
