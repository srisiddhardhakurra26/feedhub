'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface FilterTabsProps {
  current: 'all' | 'saved'
}

export function FilterTabs({ current }: FilterTabsProps) {
  const params = useSearchParams()
  const pathname = usePathname() || '/'
  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'saved', label: 'Saved' },
  ] as const

  function href(key: 'all' | 'saved'): string {
    const sp = new URLSearchParams(params.toString())
    if (key === 'all') sp.delete('filter')
    else sp.set('filter', key)
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const activeIndex = tabs.findIndex((t) => t.key === current)

  return (
    <div className="relative grid grid-cols-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 backdrop-blur p-1 text-sm">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-full bg-zinc-900 dark:bg-zinc-100 transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={href(t.key)}
          className={`relative z-10 px-4 py-1 text-center rounded-full transition-colors duration-300 ${
            current === t.key
              ? 'text-white dark:text-zinc-900 font-medium'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
