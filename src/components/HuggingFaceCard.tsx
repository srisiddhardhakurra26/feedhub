'use client'

import { addHuggingFaceFeed, deleteSource } from '@/app/actions'

const HF_FEEDS = [
  { id: 'models', label: 'Trending models' },
  { id: 'datasets', label: 'Trending datasets' },
  { id: 'spaces', label: 'Trending spaces' },
]

interface HFSource {
  id: string
  identifier: string
  itemCount: number
  lastError: string | null
}

interface Props {
  sources: HFSource[]
}

export function HuggingFaceCard({ sources }: Props) {
  const byId = new Map(sources.map((s) => [s.identifier, s]))

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div>
        <div className="font-medium">Hugging Face</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Click any feed to add. Click again to remove. Public — no login needed.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {HF_FEEDS.map((f) => {
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
          const add = addHuggingFaceFeed.bind(null, f.id)
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
    </div>
  )
}
