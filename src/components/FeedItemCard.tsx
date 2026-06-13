'use client'

import Image from 'next/image'
import { toggleRead, toggleSaved } from '@/app/actions'
import { PlatformIcon } from './PlatformIcon'
import { ListenButton } from './ListenButton'

interface FeedItemProps {
  item: {
    id: string
    title: string
    url: string
    author: string | null
    body: string | null
    thumbnail: string | null
    publishedAt: Date | string
    isRead: boolean
    isSaved: boolean
    category: string | null
    source: {
      id: string
      type: string
      identifier: string
      label: string | null
    }
  }
}

const CATEGORY_STYLES: Record<string, string> = {
  'AI & ML':          'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30',
  'Software':         'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
  'Hardware & Tech':  'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30',
  'Business':         'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  'Finance & Crypto': 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/30',
  'Politics':         'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
  'Science & Health': 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30',
  'Lifestyle':        'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/30',
  'Entertainment':    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:border-fuchsia-500/30',
  'Career':           'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  'Other':            'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/30',
}

function categoryClass(c: string | null): string {
  if (!c) return CATEGORY_STYLES.Other
  return CATEGORY_STYLES[c] ?? CATEGORY_STYLES.Other
}

function formatTime(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input
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

function getPlatformStyles(type: string) {
  switch (type.toLowerCase()) {
    case 'reddit':
      return {
        glow: 'hover:shadow-[0_8px_30px_rgb(255,69,0,0.15)] dark:hover:shadow-[0_8px_30px_rgb(255,69,0,0.3)]',
        border: 'border-t-2 border-t-[#ff4500] border-zinc-200/50 dark:border-zinc-800/50',
        text: 'text-[#ff4500]',
      }
    case 'hackernews':
    case 'hn':
      return {
        glow: 'hover:shadow-[0_8px_30px_rgb(255,102,0,0.15)] dark:hover:shadow-[0_8px_30px_rgb(255,102,0,0.3)]',
        border: 'border-t-2 border-t-[#ff6600] border-zinc-200/50 dark:border-zinc-800/50',
        text: 'text-[#ff6600]',
      }
    case 'mastodon':
      return {
        glow: 'hover:shadow-[0_8px_30px_rgb(99,100,255,0.15)] dark:hover:shadow-[0_8px_30px_rgb(99,100,255,0.3)]',
        border: 'border-t-2 border-t-[#563ACC] dark:border-t-[#6364ff] border-zinc-200/50 dark:border-zinc-800/50',
        text: 'text-[#563ACC] dark:text-[#6364ff]',
      }
    case 'github':
      return {
        glow: 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)]',
        border: 'border-t-2 border-t-zinc-800 dark:border-t-zinc-200 border-zinc-200/50 dark:border-zinc-800/50',
        text: 'text-zinc-800 dark:text-zinc-200',
      }
    case 'youtube':
      return {
        glow: 'hover:shadow-[0_8px_30px_rgb(255,0,0,0.15)] dark:hover:shadow-[0_8px_30px_rgb(255,0,0,0.3)]',
        border: 'border-t-2 border-t-[#ff0000] border-zinc-200/50 dark:border-zinc-800/50',
        text: 'text-[#ff0000]',
      }
    case 'bluesky':
      return {
        glow: 'hover:shadow-[0_8px_30px_rgb(0,133,255,0.15)] dark:hover:shadow-[0_8px_30px_rgb(0,133,255,0.3)]',
        border: 'border-t-2 border-t-[#0085ff] border-zinc-200/50 dark:border-zinc-800/50',
        text: 'text-[#0085ff]',
      }
    case 'rss':
    default:
      return {
        glow: 'hover:shadow-[0_8px_30px_rgb(242,101,34,0.15)] dark:hover:shadow-[0_8px_30px_rgb(242,101,34,0.3)]',
        border: 'border-t-2 border-t-[#f26522] border-zinc-200/50 dark:border-zinc-800/50',
        text: 'text-[#f26522]',
      }
  }
}

export function FeedItemCard({ item }: FeedItemProps) {
  const sourceLabel = item.source.label ?? `${item.source.type}/${item.source.identifier}`
  const toggleReadAction = toggleRead.bind(null, item.id)
  const toggleSavedAction = toggleSaved.bind(null, item.id)
  const platformStyles = getPlatformStyles(item.source.type)

  return (
    <article
      className={`group flex flex-col rounded-2xl border bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${
        item.isRead ? 'opacity-60 grayscale-[0.3]' : ''
      } ${platformStyles.border} ${platformStyles.glow}`}
    >
      {item.thumbnail && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="block w-full overflow-hidden rounded-t-2xl -mt-[2px] -ml-[1px] -mr-[1px] w-[calc(100%+2px)] shrink-0">
          <Image
            src={item.thumbnail}
            alt=""
            width={600}
            height={300}
            unoptimized
            className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </a>
      )}
      <div className="flex-1 flex flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-3 flex-wrap">
          {!item.isRead && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.8)] shrink-0"
              title="Unread"
            />
          )}
          <PlatformIcon type={item.source.type} className={`w-4 h-4 ${platformStyles.text}`} />
          <span className={`font-semibold tracking-widest uppercase text-[10px] ${platformStyles.text}`}>{sourceLabel}</span>
          {item.author && <span>· {item.author}</span>}
          <span>· {formatTime(new Date(item.publishedAt))}</span>
          {item.category && (
            <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border ${categoryClass(item.category)}`}>
              {item.category}
            </span>
          )}
        </div>
        <h2 className="font-semibold text-lg leading-snug mb-2 transition-colors group-hover:text-zinc-800 dark:group-hover:text-zinc-200">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline decoration-2 underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700">
            {item.title}
          </a>
        </h2>
        {item.body && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">{item.body}</p>
        )}
        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 mt-auto">
          <form action={toggleReadAction}>
            <button
              type="submit"
              data-feed-action="toggle-read"
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all active:scale-90 ${
                item.isRead
                  ? 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  : 'border-sky-200 dark:border-sky-500/40 bg-sky-50/60 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/20'
              }`}
            >
              {item.isRead ? '↺ Unread' : '✓ Read'}
            </button>
          </form>
          <form action={toggleSavedAction}>
            <button
              type="submit"
              data-feed-action="toggle-saved"
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all active:scale-90 ${
                item.isSaved
                  ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/50 dark:text-amber-400'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-amber-300 dark:hover:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400'
              }`}
            >
              {item.isSaved ? '★ Saved' : '☆ Save'}
            </button>
          </form>
          <ListenButton itemId={item.id} title={item.title} body={item.body} />
        </div>
      </div>
    </article>
  )
}
