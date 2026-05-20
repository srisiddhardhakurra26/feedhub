'use client'

import { useActionState } from 'react'
import { addGithubUser, deleteSource } from '@/app/actions'

type State = { ok?: true; error?: string } | null

interface GitHubSource {
  id: string
  identifier: string
  label: string | null
  itemCount: number
  lastError: string | null
}

interface Props {
  sources: GitHubSource[]
}

export function GithubCard({ sources }: Props) {
  const [state, formAction, isPending] = useActionState<State, FormData>(addGithubUser, null)

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div>
        <div className="font-medium">GitHub</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Follow a user&apos;s public activity, or a repo&apos;s releases.
        </div>
      </div>

      <form action={formAction} className="flex gap-2 items-center">
        <input
          name="user"
          type="text"
          required
          placeholder="username  or  owner/repo"
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm font-mono"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? 'Adding…' : 'Add'}
        </button>
      </form>
      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}

      {sources.length > 0 && (
        <ul className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {sources.map((s) => {
            const remove = deleteSource.bind(null, s.id)
            return (
              <li key={s.id} className="flex items-center gap-2 text-xs">
                <span className="font-mono truncate flex-1">{s.label ?? s.identifier}</span>
                <span className="text-zinc-400 dark:text-zinc-500">{s.itemCount} items</span>
                {s.lastError && (
                  <span className="text-red-600 dark:text-red-400" title={s.lastError}>
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
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
