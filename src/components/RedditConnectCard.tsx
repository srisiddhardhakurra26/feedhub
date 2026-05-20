'use client'

import { useActionState } from 'react'
import { connectRedditRss, disconnectReddit } from '@/app/actions'

type State = { ok?: true; error?: string; username?: string } | null

interface Props {
  connectedUsername: string | null
}

export function RedditConnectCard({ connectedUsername }: Props) {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    connectRedditRss,
    null,
  )

  if (connectedUsername) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium">Reddit</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Connected as <span className="font-medium">@{connectedUsername}</span>
          </div>
        </div>
        <form action={disconnectReddit}>
          <button
            type="submit"
            className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-950 dark:hover:border-red-800 dark:hover:text-red-400"
          >
            Disconnect
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div>
        <div className="font-medium">Reddit</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Connect your account to pull your personalized front page.
        </div>
      </div>

      <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-decimal list-inside">
        <li>
          <a
            href="https://www.reddit.com/prefs/feeds/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Open Reddit&apos;s RSS feeds page ↗
          </a>{' '}
          (make sure you&apos;re logged in to the account you want).
        </li>
        <li>
          Right-click the orange <span className="font-mono">RSS</span> button next to{' '}
          <span className="font-medium">your front page</span> and choose{' '}
          <span className="font-medium">Copy Link Address</span>.
        </li>
        <li>Paste the URL below and click Connect.</li>
      </ol>

      <form action={formAction} className="flex gap-2 items-start">
        <input
          name="url"
          type="text"
          required
          placeholder="https://www.reddit.com/.rss?feed=…&user=…"
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm font-mono"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? 'Connecting…' : 'Connect'}
        </button>
      </form>

      {state?.error && (
        <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">
        Heads up: that URL is a private token tied to your account. Don&apos;t share it. If
        you ever change your Reddit password it will stop working and you&apos;ll need to
        repeat these steps.
      </p>
    </div>
  )
}
