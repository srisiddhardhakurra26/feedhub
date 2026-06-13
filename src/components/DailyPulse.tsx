import Link from 'next/link'
import { prisma } from '@/lib/db'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export async function DailyPulse() {
  const since = new Date()
  since.setHours(since.getHours() - 24)
  const [unread, newToday, saved, stories] = await Promise.all([
    prisma.item.count({ where: { isRead: false } }),
    prisma.item.count({ where: { fetchedAt: { gte: since } } }),
    prisma.item.count({ where: { isSaved: true } }),
    prisma.story.findMany({
      where: { sourceCount: { gte: 2 } },
      orderBy: { lastSeenAt: 'desc' },
      take: 5,
      select: { id: true, title: true, sourceCount: true },
    }),
  ])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-violet-600 via-sky-600 to-emerald-600 dark:from-violet-400 dark:via-sky-400 dark:to-emerald-400 bg-clip-text text-transparent">
              {greeting()}.
            </span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Link
            href="/?filter=unread"
            className="px-3 py-1.5 rounded-full border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
          >
            <strong className="font-semibold">{unread.toLocaleString()}</strong> unread
          </Link>
          <span className="px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <strong className="font-semibold">{newToday.toLocaleString()}</strong> new today
          </span>
          <Link
            href="/?filter=saved"
            className="px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
          >
            <strong className="font-semibold">{saved.toLocaleString()}</strong> saved
          </Link>
        </div>
      </div>

      {stories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 shrink-0">
            Trending
          </span>
          {stories.map((s) => (
            <Link
              key={s.id}
              href="/stories"
              className="shrink-0 max-w-72 truncate text-xs px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/70 text-zinc-600 dark:text-zinc-300 hover:border-orange-300 dark:hover:border-orange-500/50 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              title={s.title}
            >
              <span className="text-orange-500 font-semibold mr-1.5">{s.sourceCount}×</span>
              {s.title}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
