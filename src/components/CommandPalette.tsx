'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlatformIcon } from './PlatformIcon'

interface Action {
  id: string
  group: string
  label: string
  hint?: string
  icon?: string // platform slug for PlatformIcon
  run: (router: ReturnType<typeof useRouter>) => void
}

const PLATFORMS: Array<{ slug: string; label: string }> = [
  { slug: 'hackernews', label: 'Hacker News' },
  { slug: 'reddit', label: 'Reddit' },
  { slug: 'youtube', label: 'YouTube' },
  { slug: 'mastodon', label: 'Mastodon' },
  { slug: 'github', label: 'GitHub' },
  { slug: 'substack', label: 'Substack' },
  { slug: 'huggingface', label: 'Hugging Face' },
  { slug: 'bluesky', label: 'Bluesky' },
  { slug: 'rss', label: 'RSS' },
]

const STATIC_ACTIONS: Action[] = [
  { id: 'feed', group: 'Pages', label: 'Feed', hint: 'Home', run: (r) => r.push('/') },
  { id: 'stories', group: 'Pages', label: 'Stories', hint: 'Cross-source coverage', run: (r) => r.push('/stories') },
  { id: 'discover', group: 'Pages', label: 'Discover sources', hint: 'Add free sources', run: (r) => r.push('/discover') },
  { id: 'accounts', group: 'Pages', label: 'Accounts & sources', run: (r) => r.push('/accounts') },
  { id: 'saved', group: 'Filters', label: 'Saved items', run: (r) => r.push('/?filter=saved') },
  ...PLATFORMS.map((p): Action => ({
    id: `p-${p.slug}`,
    group: 'Platforms',
    label: p.label,
    icon: p.slug,
    run: (r) => r.push(`/p/${p.slug}`),
  })),
  {
    id: 'theme',
    group: 'Appearance',
    label: 'Toggle dark / light theme',
    run: () => {
      const next = !document.documentElement.classList.contains('dark')
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('feedhub-theme', next ? 'dark' : 'light')
    },
  },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const actions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = q
      ? STATIC_ACTIONS.filter((a) => `${a.group} ${a.label}`.toLowerCase().includes(q))
      : STATIC_ACTIONS
    if (!q) return matched
    // Free-text falls through to semantic feed search.
    const search: Action = {
      id: 'search',
      group: 'Search',
      label: `Search feed for “${query.trim()}”`,
      hint: 'Semantic',
      run: (r) => r.push(`/?q=${encodeURIComponent(query.trim())}`),
    }
    return [search, ...matched]
  }, [query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setIndex(0)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => {
          if (v) return false
          return true
        })
        setQuery('')
        setIndex(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-action-index="${index}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [index])

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(actions.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const action = actions[index]
      if (action) {
        action.run(router)
        close()
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        Jump to…
        <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center pt-[18vh] px-4 bg-black/40 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="animate-palette-in w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 border-b border-zinc-200/70 dark:border-zinc-800/70">
              <svg className="text-zinc-400 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setIndex(0)
                }}
                onKeyDown={onInputKey}
                placeholder="Jump to a page, platform, or search your feed…"
                className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-zinc-400"
              />
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                esc
              </kbd>
            </div>
            <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
              {actions.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-zinc-500">No matches.</div>
              ) : (
                actions.map((a, i) => {
                  const prev = actions[i - 1]
                  const showGroup = !prev || prev.group !== a.group
                  return (
                    <div key={a.id}>
                      {showGroup && (
                        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                          {a.group}
                        </div>
                      )}
                      <button
                        type="button"
                        data-action-index={i}
                        onClick={() => {
                          a.run(router)
                          close()
                        }}
                        onMouseMove={() => setIndex(i)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                          i === index
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {a.icon ? (
                          <PlatformIcon type={a.icon} className="w-4 h-4 shrink-0" />
                        ) : (
                          <span className="w-4 h-4 shrink-0 rounded-full bg-gradient-to-br from-violet-400 to-sky-400 opacity-70" />
                        )}
                        <span className="flex-1 truncate">{a.label}</span>
                        {a.hint && <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{a.hint}</span>}
                        {i === index && (
                          <kbd className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">↵</kbd>
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
