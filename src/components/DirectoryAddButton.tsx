'use client'

import { useState, useTransition } from 'react'
import { addDirectorySource } from '@/app/actions'

interface Props {
  type: string
  identifier: string
  alreadyAdded: boolean
}

export function DirectoryAddButton({ type, identifier, alreadyAdded }: Props) {
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = useState(alreadyAdded)
  const [newItems, setNewItems] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onAdd() {
    startTransition(async () => {
      const res = await addDirectorySource({ type, identifier })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setAdded(true)
      setNewItems(res.newItems)
    })
  }

  if (added) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        ✓ Added{newItems !== null && newItems > 0 && <> · {newItems} items</>}
      </span>
    )
  }

  return (
    <span className="shrink-0 flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onAdd}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 transition-all hover:shadow-md hover:-translate-y-px active:scale-95 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {isPending ? (
          <>
            <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            </svg>
            Fetching…
          </>
        ) : (
          '+ Add'
        )}
      </button>
      {error && <span className="text-[10px] text-red-600 dark:text-red-400 max-w-40 text-right">{error}</span>}
    </span>
  )
}
