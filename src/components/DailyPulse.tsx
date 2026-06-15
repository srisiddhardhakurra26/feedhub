import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Greeting } from '@/components/Greeting'

export async function DailyPulse() {
  const since = new Date()
  since.setHours(since.getHours() - 24)
  const [newToday, saved, stories] = await Promise.all([
    prisma.item.count({ where: { fetchedAt: { gte: since } } }),
    prisma.item.count({ where: { isSaved: true } }),
    prisma.story.findMany({
      where: { sourceCount: { gte: 2 } },
      orderBy: { lastSeenAt: 'desc' },
      take: 5,
      select: { id: true, title: true, sourceCount: true },
    }),
  ])

  return (
    <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <Greeting />
        <div className="flex items-center gap-2 flex-wrap text-xs">
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
