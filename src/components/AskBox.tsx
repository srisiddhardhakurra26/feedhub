'use client'

// Basic Groq-powered ask box. Posts to /api/ask (which calls Groq). The fetch
// runs in the logged-in browser, so the session cookie rides along and passes
// the password gate. RAG over the feed comes later — this is the starting point.

import { useState } from 'react'

export function AskBox() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return
    setLoading(true)
    setError(null)
    setAnswer(null)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setError(data.error || `Error ${res.status}`)
      else setAnswer(data.answer || '(no answer)')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Ask AI</span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded-full px-2 py-0.5">
          Groq · Llama
        </span>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything… (feed-aware answers coming soon)"
          className="flex-1 min-w-0 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm outline-none focus:border-sky-400 dark:focus:border-sky-500 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium transition-all hover:-translate-y-px active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {answer && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
          {answer}
        </p>
      )}
    </section>
  )
}
