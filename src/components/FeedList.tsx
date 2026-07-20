'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { loadMoreItems, type FeedCursor, type LoadedItem, type LoadMoreOptions } from '@/app/actions'
import { FeedItemCard } from './FeedItemCard'
import { FeedKeyboard } from './FeedKeyboard'

interface Props {
  initialItems: LoadedItem[]
  initialCursor: FeedCursor | null
  filterOpts: Omit<LoadMoreOptions, 'cursor' | 'take'>
}

export function FeedList({ initialItems, initialCursor, filterOpts }: Props) {
  const [items, setItems] = useState<LoadedItem[]>(initialItems)
  const [cursor, setCursor] = useState<typeof initialCursor>(initialCursor)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const itemIds = useMemo(() => items.map((i) => i.id), [items])
  const leadItem = items[0] ?? null
  const sideItems = items.slice(1, 3)
  const remainingItems = items.slice(leadItem ? 1 + sideItems.length : 0)

  const feedMix = useMemo(() => {
    const sourceCounts = new Map<string, { id: string; label: string; count: number }>()
    const categoryCounts = new Map<string, number>()
    let saved = 0

    for (const item of items) {
      const label = item.source.label ?? item.source.identifier
      const source = sourceCounts.get(item.source.id)
      sourceCounts.set(item.source.id, {
        id: item.source.id,
        label,
        count: (source?.count ?? 0) + 1,
      })
      if (item.category) categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1)
      if (item.isSaved) saved += 1
    }

    return {
      sourceCount: sourceCounts.size,
      saved,
      topSources: Array.from(sourceCounts.values())
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        .slice(0, 4),
      topCategories: Array.from(categoryCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3),
    }
  }, [items])

  const loadMore = useCallback(() => {
    if (!cursor || isPending) return
    startTransition(async () => {
      try {
        const res = await loadMoreItems({ ...filterOpts, cursor, take: 24 })
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p.id))
          const fresh = res.items.filter((i) => !seen.has(i.id))
          return [...prev, ...fresh]
        })
        setCursor(res.nextCursor)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })
  }, [cursor, isPending, filterOpts])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !cursor) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, cursor])

  return (
    <>
      <FeedKeyboard itemIds={itemIds} />
      <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/50 dark:bg-zinc-900/50 backdrop-blur px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-3 flex-wrap">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {items.length.toLocaleString()} loaded
        </span>
        <span>{feedMix.sourceCount} sources</span>
        {feedMix.saved > 0 && <span>{feedMix.saved} saved here</span>}
        {feedMix.topSources.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {feedMix.topSources.map((s) => (
              <span
                key={s.id}
                className="max-w-40 truncate rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-950/40 px-2 py-0.5"
                title={s.label}
              >
                {s.label} · {s.count}
              </span>
            ))}
          </div>
        )}
        {feedMix.topCategories.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            {feedMix.topCategories.map(([category, count]) => (
              <span
                key={category}
                className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-500 dark:text-zinc-400"
              >
                {category} · {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {leadItem && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className="lg:col-span-2 animate-card-in [content-visibility:auto] [contain-intrinsic-size:520px]"
            data-feed-item-id={leadItem.id}
          >
            <FeedItemCard item={leadItem} variant="featured" />
          </div>
          {sideItems.length > 0 && (
            <div className="grid gap-6">
              {sideItems.map((item, i) => (
                <div
                  key={item.id}
                  className="animate-card-in [content-visibility:auto] [contain-intrinsic-size:300px]"
                  style={{ animationDelay: `${(i + 1) * 45}ms` }}
                  data-feed-item-id={item.id}
                >
                  <FeedItemCard item={item} variant="compact" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {remainingItems.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {remainingItems.map((item, i) => (
            <div
              key={item.id}
              className="break-inside-avoid animate-card-in [content-visibility:auto] [contain-intrinsic-size:380px]"
              style={{ animationDelay: `${(i % 24) * 35}ms` }}
              data-feed-item-id={item.id}
            >
              <FeedItemCard item={item} />
            </div>
          ))}
        </div>
      )}
      {cursor && (
        <div ref={sentinelRef} className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {isPending ? 'Loading…' : (
            <button
              type="button"
              onClick={loadMore}
              className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Load more
            </button>
          )}
        </div>
      )}
      {!cursor && items.length > 0 && (
        <div className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
          End of feed · {items.length} items
        </div>
      )}
      {error && (
        <div className="py-4 text-center text-sm text-red-600 dark:text-red-400">
          Failed to load more: {error}
        </div>
      )}
    </>
  )
}
