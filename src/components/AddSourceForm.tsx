'use client'

import { useActionState, useState } from 'react'
import { addSource } from '@/app/actions'

type State = { ok?: true; error?: string } | null

async function action(_prev: State, formData: FormData): Promise<State> {
  return addSource(formData)
}

const TYPE_OPTIONS: Array<{ value: string; label: string; placeholder: string; hint: string }> = [
  {
    value: 'rss',
    label: 'RSS',
    placeholder: 'https://example.com/feed.xml',
    hint: 'Any RSS or Atom feed URL — blogs, Substacks, news sites.',
  },
  {
    value: 'reddit',
    label: 'Reddit (subreddit)',
    placeholder: 'r/programming',
    hint: 'Subreddit (e.g. r/programming) or u/username. For your personalized home, use Accounts → Connect Reddit.',
  },
  {
    value: 'youtube',
    label: 'YouTube channel',
    placeholder: 'https://www.youtube.com/@channel',
    hint: 'Channel URL, @handle, or channel ID. For your subscriptions, use Accounts → Connect Google.',
  },
]

export function AddSourceForm() {
  const [state, formAction, isPending] = useActionState(action, null)
  const [type, setType] = useState('rss')

  const selected = TYPE_OPTIONS.find((t) => t.value === type) ?? TYPE_OPTIONS[0]

  return (
    <form
      action={formAction}
      className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3"
    >
      <h2 className="font-medium">Add source</h2>
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr_1fr_auto] gap-2">
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          name="identifier"
          required
          placeholder={selected.placeholder}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm font-mono"
        />
        <input
          name="label"
          placeholder="Label (optional)"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? 'Adding…' : 'Add'}
        </button>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{selected.hint}</p>
    </form>
  )
}
