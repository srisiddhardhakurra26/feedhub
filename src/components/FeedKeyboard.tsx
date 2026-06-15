'use client'

import { useCallback, useEffect, useState } from 'react'

const FOCUS_CLASSES = ['ring-2', 'ring-blue-500', 'dark:ring-blue-400', 'ring-offset-2', 'ring-offset-transparent']

function applyFocus(id: string | null, previousId: string | null) {
  if (previousId && previousId !== id) {
    const prev = document.querySelector<HTMLElement>(`[data-feed-item-id="${previousId}"]`)
    if (prev) FOCUS_CLASSES.forEach((c) => prev.classList.remove(c))
  }
  if (id) {
    const el = document.querySelector<HTMLElement>(`[data-feed-item-id="${id}"]`)
    if (el) {
      FOCUS_CLASSES.forEach((c) => el.classList.add(c))
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return true
  if (t.isContentEditable) return true
  return false
}

interface Props {
  itemIds: string[]
}

export function FeedKeyboard({ itemIds }: Props) {
  const [index, setIndex] = useState<number>(-1)
  const [showHelp, setShowHelp] = useState(false)

  const click = useCallback((id: string, action: string) => {
    const card = document.querySelector<HTMLElement>(`[data-feed-item-id="${id}"]`)
    if (!card) return
    const btn = card.querySelector<HTMLElement>(`[data-feed-action="${action}"]`)
    btn?.click()
  }, [])

  const openLink = useCallback((id: string) => {
    const card = document.querySelector<HTMLElement>(`[data-feed-item-id="${id}"]`)
    if (!card) return
    const link = card.querySelector<HTMLAnchorElement>('a[href][target="_blank"]')
    if (link?.href) window.open(link.href, '_blank', 'noopener,noreferrer')
  }, [])

  useEffect(() => {
    let lastG = 0
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key
      const currentId = index >= 0 ? itemIds[index] : null

      if (key === '?') {
        e.preventDefault()
        setShowHelp((v) => !v)
        return
      }
      if (key === 'Escape') {
        if (showHelp) {
          setShowHelp(false)
          return
        }
        if (index >= 0) {
          setIndex((prev) => {
            applyFocus(null, itemIds[prev] ?? null)
            return -1
          })
        }
        return
      }
      if (key === 'j' || key === 'ArrowDown') {
        e.preventDefault()
        setIndex((prev) => {
          const next = Math.min(itemIds.length - 1, prev + 1)
          applyFocus(itemIds[next], prev >= 0 ? itemIds[prev] : null)
          return next
        })
        return
      }
      if (key === 'k' || key === 'ArrowUp') {
        e.preventDefault()
        setIndex((prev) => {
          const next = Math.max(0, prev - 1)
          applyFocus(itemIds[next], prev >= 0 ? itemIds[prev] : null)
          return next
        })
        return
      }
      if (key === 'g') {
        const now = Date.now()
        if (now - lastG < 400) {
          e.preventDefault()
          setIndex((prev) => {
            applyFocus(itemIds[0], prev >= 0 ? itemIds[prev] : null)
            return 0
          })
          lastG = 0
        } else {
          lastG = now
        }
        return
      }
      if (key === 'G') {
        e.preventDefault()
        setIndex((prev) => {
          const last = itemIds.length - 1
          applyFocus(itemIds[last], prev >= 0 ? itemIds[prev] : null)
          return last
        })
        return
      }
      if (!currentId) return
      if (key === 's') {
        e.preventDefault()
        click(currentId, 'toggle-saved')
      } else if (key === 'o' || key === 'Enter') {
        e.preventDefault()
        openLink(currentId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, itemIds, click, openLink, showHelp])

  useEffect(() => {
    return () => {
      const focused = document.querySelector<HTMLElement>('[data-feed-item-id].ring-2')
      if (focused) FOCUS_CLASSES.forEach((c) => focused.classList.remove(c))
    }
  }, [])

  if (!showHelp) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Keyboard shortcuts</h3>
          <button
            type="button"
            onClick={() => setShowHelp(false)}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ✕
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          {[
            ['j / ↓', 'Next item'],
            ['k / ↑', 'Previous item'],
            ['g g', 'Jump to top'],
            ['G', 'Jump to bottom'],
            ['o / Enter', 'Open in new tab'],
            ['s', 'Toggle save'],
            ['/', 'Focus search'],
            ['?', 'Show this help'],
            ['Esc', 'Clear focus / close'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <kbd className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                {key}
              </kbd>
              <dd className="text-zinc-600 dark:text-zinc-400">{desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
