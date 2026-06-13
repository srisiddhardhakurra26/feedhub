import Link from 'next/link'
import { prisma } from '@/lib/db'
import { DIRECTORY, DIRECTORY_CATEGORIES } from '@/lib/directory'
import { DirectoryAddButton } from '@/components/DirectoryAddButton'
import { PlatformIcon } from '@/components/PlatformIcon'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage() {
  const existing = await prisma.source.findMany({
    select: { type: true, identifier: true },
  })
  const existingKeys = new Set(existing.map((s) => `${s.type}:${s.identifier}`))

  const grouped = DIRECTORY_CATEGORIES.map((category) => ({
    category,
    entries: DIRECTORY.filter((d) => d.category === category),
  })).filter((g) => g.entries.length > 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-violet-600 via-sky-600 to-emerald-600 dark:from-violet-400 dark:via-sky-400 dark:to-emerald-400 bg-clip-text text-transparent">
            Discover sources
          </span>
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-2xl">
          Hand-picked free sources — one click to add, fetched instantly. Want something
          specific? Paste any website URL on the{' '}
          <Link href="/accounts" className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100">
            Accounts
          </Link>{' '}
          page and feedhub will find its feed automatically.
        </p>
      </div>

      {grouped.map(({ category, entries }) => (
        <section key={category} className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {entries.map((entry) => (
              <div
                key={`${entry.type}:${entry.identifier}`}
                className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <PlatformIcon
                    type={entry.type}
                    className={`w-4 h-4 mt-0.5 ${entry.type === 'bluesky' ? 'text-[#0085ff]' : 'text-[#f26522]'}`}
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-sm leading-snug">{entry.label}</div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      {entry.description}
                    </p>
                  </div>
                </div>
                <DirectoryAddButton
                  type={entry.type}
                  identifier={entry.identifier}
                  alreadyAdded={existingKeys.has(`${entry.type}:${entry.identifier}`)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center pb-4">
        Added sources are fetched immediately · categorization and story clustering run on
        the next Refresh.
      </p>
    </div>
  )
}
