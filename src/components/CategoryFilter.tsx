import Link from 'next/link'

interface CategoryCount {
  category: string | null
  count: number
}

interface Props {
  counts: CategoryCount[]
  current: string | null
  filter: string | undefined
  q: string | undefined
  basePath?: string
}

const CATEGORY_DOT: Record<string, string> = {
  'AI & ML':          'bg-violet-500',
  'Software':         'bg-blue-500',
  'Hardware & Tech':  'bg-cyan-500',
  'Business':         'bg-amber-500',
  'Finance & Crypto': 'bg-yellow-500',
  'Politics':         'bg-rose-500',
  'Science & Health': 'bg-teal-500',
  'Lifestyle':        'bg-pink-500',
  'Entertainment':    'bg-fuchsia-500',
  'Career':           'bg-emerald-500',
  'Other':            'bg-zinc-400',
}

function buildHref(
  base: string,
  params: { filter?: string; q?: string; category?: string },
): string {
  const sp = new URLSearchParams()
  if (params.filter) sp.set('filter', params.filter)
  if (params.q) sp.set('q', params.q)
  if (params.category) sp.set('category', params.category)
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

export function CategoryFilter({ counts, current, filter, q, basePath = '/' }: Props) {
  if (counts.length === 0) return null
  const total = counts.reduce((acc, c) => acc + c.count, 0)
  const totalCategorized = counts.filter((c) => c.category).reduce((acc, c) => acc + c.count, 0)
  if (totalCategorized === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <Link
        href={buildHref(basePath, { filter, q })}
        className={`px-2.5 py-1 rounded-full border transition-colors ${
          !current
            ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
            : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
        }`}
      >
        All ({total})
      </Link>
      {counts
        .filter((c) => c.category)
        .map((c) => {
          const isActive = current === c.category
          const dot = CATEGORY_DOT[c.category!] ?? 'bg-zinc-400'
          return (
            <Link
              key={c.category}
              href={buildHref(basePath, { filter, q, category: c.category! })}
              className={`px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {c.category} ({c.count})
            </Link>
          )
        })}
    </div>
  )
}
