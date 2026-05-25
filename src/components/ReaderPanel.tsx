'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useReader } from '@/lib/reader/ReaderContext'

export function ReaderPanel() {
  const r = useReader()
  const activeRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!r.track) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          r.toggle()
          break
        case 'ArrowRight':
          e.preventDefault()
          r.skipForward()
          break
        case 'ArrowLeft':
          e.preventDefault()
          r.skipBackward()
          break
        case 'Escape':
          e.preventDefault()
          r.close()
          break
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [r])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [r.currentIndex])

  const renderedSentences = useMemo(() => r.sentences, [r.sentences])

  if (!r.track) return null

  const progress = r.sentences.length ? Math.round((r.currentIndex / r.sentences.length) * 100) : 0
  const isPlaying = r.state === 'playing'

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-[400px] max-w-[90vw] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg shadow-2xl text-zinc-900 dark:text-zinc-100"
      role="dialog"
      aria-label="Reader"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800/70">
        <div className="flex items-center gap-2 min-w-0">
          <span aria-hidden>🎧</span>
          <span className="text-sm font-semibold truncate" title={r.track.title}>
            {r.track.title}
          </span>
        </div>
        <button
          type="button"
          onClick={r.close}
          aria-label="Close reader"
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full w-7 h-7 flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="h-1 bg-zinc-200/60 dark:bg-zinc-800/60 overflow-hidden">
        <div
          className="h-full bg-sky-500 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="px-4 py-3 max-h-[180px] overflow-y-auto text-sm leading-relaxed">
        {renderedSentences.length === 0 ? (
          <span className="text-zinc-500">Loading…</span>
        ) : (
          renderedSentences.map((sentence, i) => {
            const isActive = i === r.currentIndex
            const ref = isActive ? activeRef : undefined
            return (
              <span
                key={i}
                ref={ref}
                className={
                  isActive
                    ? 'rounded px-0.5 bg-sky-100 dark:bg-sky-500/20 text-zinc-900 dark:text-zinc-50 font-medium'
                    : 'text-zinc-500 dark:text-zinc-500'
                }
              >
                {isActive && r.word ? renderWithWord(sentence, r.word.charIndex, r.word.charLength) : sentence}
                {i < renderedSentences.length - 1 ? ' ' : ''}
              </span>
            )
          })
        )}
      </div>

      <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-zinc-200/70 dark:border-zinc-800/70">
        <ControlButton onClick={r.skipBackward} title="Previous sentence (←)">⏮</ControlButton>
        <button
          type="button"
          onClick={r.toggle}
          className="w-12 h-12 rounded-full bg-sky-500 text-white text-base hover:bg-sky-600 active:scale-95 transition-all flex items-center justify-center"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title="Play / Pause (Space)"
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <ControlButton onClick={r.skipForward} title="Next sentence (→)">⏭</ControlButton>
        <ControlButton onClick={r.stop} title="Stop">⏹</ControlButton>
      </div>

      <div className="px-4 pb-3 pt-1 border-t border-zinc-200/70 dark:border-zinc-800/70 space-y-2 text-xs">
        <label className="flex items-center gap-3">
          <span className="w-12 text-zinc-500">Speed</span>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={r.rate}
            onChange={(e) => r.setRate(parseFloat(e.target.value))}
            className="flex-1 accent-sky-500"
            aria-label="Reading speed"
          />
          <span className="w-8 text-sky-600 dark:text-sky-400 font-semibold tabular-nums text-right">
            {r.rate.toFixed(1)}x
          </span>
        </label>
        <label className="flex items-center gap-3">
          <span className="w-12 text-zinc-500">Voice</span>
          <select
            value={r.voiceURI ?? ''}
            onChange={(e) => r.setVoice(e.target.value || null)}
            className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs"
            aria-label="Voice"
          >
            <option value="">System default</option>
            {r.voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

function ControlButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-9 h-9 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all flex items-center justify-center text-sm"
    >
      {children}
    </button>
  )
}

function renderWithWord(sentence: string, charIndex: number, charLength: number): React.ReactNode {
  if (!charLength || charIndex < 0 || charIndex >= sentence.length) return sentence
  const before = sentence.slice(0, charIndex)
  const word = sentence.slice(charIndex, charIndex + charLength)
  const after = sentence.slice(charIndex + charLength)
  return (
    <>
      {before}
      <mark className="bg-sky-300/60 dark:bg-sky-400/40 text-inherit rounded">{word}</mark>
      {after}
    </>
  )
}
