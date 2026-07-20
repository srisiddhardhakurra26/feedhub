'use client'

// The greeting + date must reflect the VIEWER's local time, not the server's.
// DailyPulse is an async server component rendered on the VM (UTC), which is why
// it showed "Good evening" in the afternoon. Computing here, after mount, fixes
// it to the browser's actual local hour.

import { useSyncExternalStore } from 'react'

function greetingFor(hour: number): string {
  if (hour < 5) return 'Up late'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

interface LocalTimeSnapshot {
  key: string
  greeting: string
  date: string
}

let cachedSnapshot: LocalTimeSnapshot | null = null

function getLocalTimeSnapshot(): LocalTimeSnapshot {
  const now = new Date()
  const key = [
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
  ].join(':')

  if (cachedSnapshot?.key === key) return cachedSnapshot

  cachedSnapshot = {
    key,
    greeting: greetingFor(now.getHours()),
    date: now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
  }
  return cachedSnapshot
}

function subscribeToMinuteTicks(onStoreChange: () => void): () => void {
  const delay = 60_000 - (Date.now() % 60_000)
  let interval: number | undefined
  const timeout = window.setTimeout(() => {
    onStoreChange()
    interval = window.setInterval(onStoreChange, 60_000)
  }, delay)

  return () => {
    window.clearTimeout(timeout)
    if (interval) window.clearInterval(interval)
  }
}

export function Greeting() {
  const localTime = useSyncExternalStore(
    subscribeToMinuteTicks,
    getLocalTimeSnapshot,
    () => null,
  )
  const greeting = localTime?.greeting ?? 'Hello'
  const date = localTime?.date ?? ''

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        <span className="bg-gradient-to-r from-violet-600 via-sky-600 to-emerald-600 dark:from-violet-400 dark:via-sky-400 dark:to-emerald-400 bg-clip-text text-transparent">
          {greeting}.
        </span>
      </h1>
      {/* nbsp keeps the line height stable before the date resolves */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1" suppressHydrationWarning>
        {date || ' '}
      </p>
    </div>
  )
}
