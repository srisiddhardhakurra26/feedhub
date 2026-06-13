'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
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
      <FeedKeyboard itemIds={items.map((i) => i.id)} />
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="break-inside-avoid animate-card-in"
            style={{ animationDelay: `${(i % 24) * 35}ms` }}
            data-feed-item-id={item.id}
          >
            <FeedItemCard item={item} />
          </div>
        ))}
      </div>
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
