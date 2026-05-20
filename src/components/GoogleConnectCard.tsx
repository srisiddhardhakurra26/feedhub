'use client'

import { useActionState } from 'react'
import { disconnectGoogle, syncYouTube } from '@/app/actions'

type SyncState =
  | {
      ok?: true
      added?: number
      updated?: number
      removed?: number
      total?: number
      error?: string
    }
  | null

async function syncAction(): Promise<SyncState> {
  return syncYouTube()
}

interface Props {
  connectedEmail: string | null
}

export function GoogleConnectCard({ connectedEmail }: Props) {
  const [syncResult, syncFormAction, isSyncing] = useActionState<SyncState, FormData>(
    syncAction,
    null,
  )

  if (!connectedEmail) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium">Google / YouTube</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Sign in to pull your YouTube subscriptions feed.
          </div>
        </div>
        <a
          href="/api/auth/google/start"
          className="text-xs px-3 py-1.5 rounded-md font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
        >
          Connect
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium">Google / YouTube</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Connected as <span className="font-medium">{connectedEmail}</span>
          </div>
        </div>
        <form action={disconnectGoogle}>
          <button
            type="submit"
            className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-950 dark:hover:border-red-800 dark:hover:text-red-400"
          >
            Disconnect
          </button>
        </form>
      </div>
      <form action={syncFormAction} className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={isSyncing}
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          {isSyncing ? 'Syncing…' : 'Sync subscriptions'}
        </button>
        {syncResult?.ok && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {syncResult.total} total · +{syncResult.added} added · {syncResult.updated} updated · {syncResult.removed} removed
          </span>
        )}
        {syncResult?.error && (
          <span className="text-xs text-red-600 dark:text-red-400">{syncResult.error}</span>
        )}
      </form>
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">
        Each subscription becomes an auto-managed YouTube source. Click Refresh on the feed page to pull videos.
      </p>
    </div>
  )
}
