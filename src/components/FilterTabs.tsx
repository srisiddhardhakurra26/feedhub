'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface FilterTabsProps {
  current: 'all' | 'unread' | 'saved'
}

export function FilterTabs({ current }: FilterTabsProps) {
  const params = useSearchParams()
  const pathname = usePathname() || '/'
  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'saved', label: 'Saved' },
  ] as const

  function href(key: 'all' | 'unread' | 'saved'): string {
    const sp = new URLSearchParams(params.toString())
    if (key === 'all') sp.delete('filter')
    else sp.set('filter', key)
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="flex gap-1 text-sm">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={href(t.key)}
          className={`px-3 py-1 rounded-md ${
            current === t.key
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
