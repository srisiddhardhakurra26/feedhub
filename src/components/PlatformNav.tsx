import Link from 'next/link'
import { PlatformIcon } from './PlatformIcon'

const PLATFORMS: Array<{ slug: string; label: string; color: string }> = [
  { slug: 'hackernews', label: 'HN',       color: 'text-[#ff6600]' },
  { slug: 'reddit',     label: 'Reddit',   color: 'text-[#ff4500]' },
  { slug: 'youtube',    label: 'YouTube',  color: 'text-[#ff0000]' },
  { slug: 'mastodon',   label: 'Mastodon', color: 'text-[#563ACC] dark:text-[#6364ff]' },
  { slug: 'github',     label: 'GitHub',   color: 'text-zinc-800 dark:text-zinc-200' },
  { slug: 'substack',   label: 'Substack', color: 'text-orange-600' },
  { slug: 'rss',        label: 'RSS',      color: 'text-[#f26522]' },
]

export function PlatformNav() {
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {PLATFORMS.map((p) => (
        <Link
          key={p.slug}
          href={`/p/${p.slug}`}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
        >
          <PlatformIcon type={p.slug} className={`w-3.5 h-3.5 ${p.color}`} />
          {p.label}
        </Link>
      ))}
    </div>
  )
}
