import Link from 'next/link'
import { prisma } from '@/lib/db'
import { PlatformIcon } from '@/components/PlatformIcon'

export const dynamic = 'force-dynamic'

function formatTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

export default async function StoriesPage() {
  const stories = await prisma.story.findMany({
    orderBy: [{ sourceCount: 'desc' }, { lastSeenAt: 'desc' }],
    take: 50,
    include: {
      items: {
        orderBy: { publishedAt: 'desc' },
        include: {
          source: { select: { type: true, label: true, identifier: true } },
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight">Stories</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The same thing, seen across multiple sources. {stories.length} active.
        </p>
      </div>

      {stories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-500 dark:text-zinc-400">
          No cross-source stories yet. Stories appear when ≥2 sources cover the same thing.
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => {
            const headline = story.items[0]
            if (!headline) return null
            const sources = Array.from(
              new Map(
                story.items.map((i) => [
                  i.source.type + ':' + i.source.identifier,
                  i.source,
                ]),
              ).values(),
            )
            const sourceTypes = Array.from(new Set(story.items.map((i) => i.source.type)))
            return (
              <article
                key={story.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5"
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                      <span className="font-semibold uppercase tracking-widest text-[10px] text-orange-600 dark:text-orange-400">
                        🔥 {story.sourceCount} sources
                      </span>
                      <span>·</span>
                      <span>{story.itemCount} items</span>
                      <span>·</span>
                      <span>{formatTime(story.lastSeenAt)}</span>
                      <span>·</span>
                      <div className="flex gap-1.5">
                        {sourceTypes.map((t) => (
                          <PlatformIcon
                            key={t}
                            type={t}
                            className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400"
                          />
                        ))}
                      </div>
                    </div>
                    <h2 className="font-semibold text-lg leading-snug mb-3">
                      <a
                        href={headline.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline decoration-2 underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700"
                      >
                        {story.title}
                      </a>
                    </h2>
                    {headline.body && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                        {headline.body}
                      </p>
                    )}
                    <details className="text-sm">
                      <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 select-none">
                        All coverage ({story.itemCount})
                      </summary>
                      <ul className="mt-3 space-y-2 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800">
                        {story.items.map((item) => (
                          <li key={item.id} className="text-sm">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-zinc-700 dark:text-zinc-300"
                            >
                              {item.title}
                            </a>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
                              {item.source.label ?? item.source.type} · {formatTime(item.publishedAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                </div>
                {sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 text-xs text-zinc-500 dark:text-zinc-400">
                    Sources:{' '}
                    {sources.slice(0, 6).map((s, i) => (
                      <span key={i}>
                        {i > 0 && ' · '}
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {s.label ?? `${s.type}/${s.identifier}`}
                        </span>
                      </span>
                    ))}
                    {sources.length > 6 && ` + ${sources.length - 6} more`}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <div className="pt-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
        <Link href="/" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
          ← Back to feed
        </Link>
      </div>
    </div>
  )
}
