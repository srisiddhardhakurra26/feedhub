import { prisma } from '@/lib/db'
import { deleteSource } from '@/app/actions'
import { RedditConnectCard } from '@/components/RedditConnectCard'
import { GoogleConnectCard } from '@/components/GoogleConnectCard'
import { HackerNewsCard } from '@/components/HackerNewsCard'
import { GithubCard } from '@/components/GithubCard'
import { MastodonCard } from '@/components/MastodonCard'
import { SubstackCard } from '@/components/SubstackCard'
import { AddSourceForm } from '@/components/AddSourceForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ error?: string }>
}

const TYPE_LABEL: Record<string, string> = {
  reddit: 'Reddit',
  youtube: 'YouTube',
  rss: 'RSS',
  hackernews: 'Hacker News',
  github: 'GitHub',
  mastodon: 'Mastodon',
  substack: 'Substack',
}

const PLATFORM_CARD_TYPES = new Set(['hackernews', 'github', 'mastodon', 'substack'])

function extractRedditUsername(identifier: string): string | null {
  try {
    return new URL(identifier).searchParams.get('user')
  } catch {
    return null
  }
}

function isSubscriptionManaged(config: string | null): boolean {
  if (!config) return false
  try {
    const parsed = JSON.parse(config) as { fromSubscription?: boolean }
    return Boolean(parsed.fromSubscription)
  } catch {
    return false
  }
}

function isRedditHome(type: string, identifier: string): boolean {
  return type === 'rss' && identifier.includes('reddit.com/.rss')
}

export default async function AccountsPage({ searchParams }: PageProps) {
  const { error } = await searchParams

  const [allSources, googleAccount] = await Promise.all([
    prisma.source.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    }),
    prisma.account.findUnique({ where: { platform: 'google' } }),
  ])

  const redditHome = allSources.find((s) => isRedditHome(s.type, s.identifier))
  const redditUsername = redditHome ? extractRedditUsername(redditHome.identifier) : null
  const subscriptionCount = allSources.filter((s) => isSubscriptionManaged(s.config)).length

  const platformSources = (type: string) =>
    allSources
      .filter((s) => s.type === type)
      .map((s) => ({
        id: s.id,
        identifier: s.identifier,
        label: s.label,
        itemCount: s._count.items,
        lastError: s.lastError,
      }))

  const hnSources = platformSources('hackernews')
  const githubSources = platformSources('github')
  const mastodonSources = platformSources('mastodon')
  const substackSources = platformSources('substack')

  const visibleSources = allSources.filter(
    (s) =>
      !isSubscriptionManaged(s.config) &&
      !isRedditHome(s.type, s.identifier) &&
      !PLATFORM_CARD_TYPES.has(s.type),
  )

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-medium text-sm text-zinc-600 dark:text-zinc-400">
          Connected accounts
        </h2>
        <RedditConnectCard connectedUsername={redditUsername} />
        <GoogleConnectCard connectedEmail={googleAccount?.username ?? null} />
        {subscriptionCount > 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 pl-1">
            {subscriptionCount} YouTube channels synced from your Google account (managed automatically — disconnect to remove).
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-sm text-zinc-600 dark:text-zinc-400">Platforms</h2>
        <HackerNewsCard sources={hnSources} />
        <GithubCard sources={githubSources} />
        <MastodonCard sources={mastodonSources} />
        <SubstackCard sources={substackSources} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-sm text-zinc-600 dark:text-zinc-400">
          Add anything else (RSS, Reddit subreddit, or specific YouTube channel)
        </h2>
        <AddSourceForm />
      </section>

      {visibleSources.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium text-sm text-zinc-600 dark:text-zinc-400">
            Other sources ({visibleSources.length})
          </h2>
          <ul className="space-y-2">
            {visibleSources.map((s) => {
              const del = deleteSource.bind(null, s.id)
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.label ?? s.identifier}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {TYPE_LABEL[s.type] ?? s.type} · {s.identifier} · {s._count.items} items
                    </div>
                    {s.lastError && (
                      <div
                        className="text-xs text-red-600 dark:text-red-400 mt-1 truncate"
                        title={s.lastError}
                      >
                        Error: {s.lastError}
                      </div>
                    )}
                  </div>
                  <form action={del}>
                    <button
                      type="submit"
                      className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-950 dark:hover:border-red-800 dark:hover:text-red-400"
                    >
                      Delete
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
