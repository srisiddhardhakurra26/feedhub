'use client'

import { addHackerNewsFeed, deleteSource } from '@/app/actions'

const HN_FEEDS = [
  { id: 'front', label: 'Front page' },
  { id: 'best', label: 'Best' },
  { id: 'newest', label: 'Newest' },
  { id: 'ask', label: 'Ask HN' },
  { id: 'show', label: 'Show HN' },
  { id: 'jobs', label: 'Jobs' },
]

interface HNSource {
  id: string
  identifier: string
  itemCount: number
  lastError: string | null
}

interface Props {
  sources: HNSource[]
}

export function HackerNewsCard({ sources }: Props) {
  const byId = new Map(sources.map((s) => [s.identifier, s]))
  const knownIds = new Set(HN_FEEDS.map((f) => f.id))
  const custom = sources.filter((s) => !knownIds.has(s.identifier))

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div>
        <div className="font-medium">Hacker News</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Click any feed to add. Click again to remove.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {HN_FEEDS.map((f) => {
          const existing = byId.get(f.id)
          if (existing) {
            const remove = deleteSource.bind(null, existing.id)
            return (
              <form key={f.id} action={remove}>
                <button
                  type="submit"
                  title={existing.lastError ?? `${existing.itemCount} items`}
                  className={`text-xs px-2.5 py-1 rounded-md border ${
                    existing.lastError
                      ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300'
                      : 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  }`}
                >
                  ✓ {f.label}
                </button>
              </form>
            )
          }
          const add = addHackerNewsFeed.bind(null, f.id)
          return (
            <form key={f.id} action={add}>
              <button
                type="submit"
                className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                + {f.label}
              </button>
            </form>
          )
        })}
      </div>

      {custom.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Custom / legacy:</div>
          {custom.map((s) => {
            const remove = deleteSource.bind(null, s.id)
            return (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <span className="font-mono truncate flex-1">{s.identifier}</span>
                {s.lastError && (
                  <span className="text-red-600 dark:text-red-400 truncate" title={s.lastError}>
                    error
                  </span>
                )}
                <form action={remove}>
                  <button
                    type="submit"
                    className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
