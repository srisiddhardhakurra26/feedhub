'use client'

import { useState, useTransition } from 'react'
import { refreshAll } from '@/app/actions'

interface RefreshResult {
  label: string
  ok: boolean
  newItems: number
  error?: string
}

export function RefreshButton() {
  const [isPending, startTransition] = useTransition()
  const [results, setResults] = useState<RefreshResult[] | null>(null)
  const [categorized, setCategorized] = useState<number>(0)
  const [showDetails, setShowDetails] = useState(false)

  function onClick() {
    startTransition(async () => {
      const res = await refreshAll()
      setResults(res.results)
      setCategorized(res.categorized ?? 0)
      setShowDetails(false)
    })
  }

  const summary = results
    ? {
        total: results.length,
        ok: results.filter((r) => r.ok).length,
        newItems: results.reduce((sum, r) => sum + r.newItems, 0),
        errors: results.filter((r) => !r.ok),
        categorized,
      }
    : null

  return (
    <div className="flex items-center gap-3 flex-wrap min-w-0">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-1.5 text-sm font-medium shadow-sm transition-all hover:shadow-md hover:-translate-y-px active:scale-95 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        <svg
          className={isPending ? 'animate-spin' : ''}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        {isPending ? 'Refreshing…' : 'Refresh'}
      </button>

      {summary && (
        <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
          <span>
            {summary.ok}/{summary.total} sources · +{summary.newItems} new
            {summary.categorized > 0 && <> · {summary.categorized} categorized</>}
            {summary.errors.length > 0 && (
              <span className="text-red-600 dark:text-red-400">
                {' '}
                · {summary.errors.length} failed
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>
      )}

      {showDetails && results && (
        <div className="basis-full max-h-40 overflow-y-auto text-xs text-zinc-600 dark:text-zinc-400 leading-snug border border-zinc-200 dark:border-zinc-800 rounded p-2 bg-white dark:bg-zinc-900">
          {results
            .slice()
            .sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1))
            .map((r) => (
              <div
                key={r.label}
                className={r.ok ? '' : 'text-red-600 dark:text-red-400'}
              >
                {r.label}: {r.ok ? `+${r.newItems} new` : `error — ${r.error}`}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
