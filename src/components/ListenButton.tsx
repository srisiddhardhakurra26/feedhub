'use client'

import { useReader } from '@/lib/reader/ReaderContext'

interface ListenButtonProps {
  itemId: string
  title: string
  body: string | null
}

export function ListenButton({ itemId, title, body }: ListenButtonProps) {
  const reader = useReader()
  if (!reader.isReady) return null

  const isCurrent = reader.track?.id === itemId
  const isPlaying = isCurrent && reader.state === 'playing'

  const handleClick = () => {
    if (isCurrent) {
      reader.toggle()
      return
    }
    const text = body ? `${title}. ${body}` : title
    reader.play({ id: itemId, title, text })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-feed-action="listen"
      aria-label={isPlaying ? 'Pause' : 'Listen'}
      title={isPlaying ? 'Pause' : 'Listen to this post'}
      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
        isCurrent
          ? 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/50 dark:text-sky-400'
          : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      {isPlaying ? '❚❚ Pause' : isCurrent ? '▶ Resume' : '🎧 Listen'}
    </button>
  )
}
