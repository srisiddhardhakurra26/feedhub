'use client'

// The greeting + date must reflect the VIEWER's local time, not the server's.
// DailyPulse is an async server component rendered on the VM (UTC), which is why
// it showed "Good evening" in the afternoon. Computing here, after mount, fixes
// it to the browser's actual local hour.

import { useEffect, useState } from 'react'

function greetingFor(hour: number): string {
  if (hour < 5) return 'Up late'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

export function Greeting() {
  // Start null so the server-rendered HTML and the first client render match
  // (no hydration mismatch); fill in real local values once mounted.
  const [greeting, setGreeting] = useState<string | null>(null)
  const [date, setDate] = useState('')

  useEffect(() => {
    const now = new Date()
    setGreeting(greetingFor(now.getHours()))
    setDate(
      now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    )
  }, [])

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        <span className="bg-gradient-to-r from-violet-600 via-sky-600 to-emerald-600 dark:from-violet-400 dark:via-sky-400 dark:to-emerald-400 bg-clip-text text-transparent">
          {greeting ?? 'Hello'}.
        </span>
      </h1>
      {/* nbsp keeps the line height stable before the date resolves */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1" suppressHydrationWarning>
        {date || ' '}
      </p>
    </div>
  )
}
