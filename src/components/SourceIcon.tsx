'use client'

import { useState } from 'react'
import { faviconUrl } from '@/lib/favicon'
import { PlatformIcon } from './PlatformIcon'

// Platforms with their own recognizable logo keep it. Everything else (RSS /
// news / user-added sites) shows the outlet's favicon derived from its domain,
// which is far more intuitive than a generic feed glyph — and falls back to
// that glyph if the favicon can't load.
const BRANDED = new Set([
  'reddit', 'youtube', 'github', 'hackernews', 'hn',
  'mastodon', 'substack', 'huggingface', 'hf', 'bluesky',
])

interface Props {
  type: string
  identifier?: string | null
  className?: string
}

export function SourceIcon({ type, identifier, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const isBranded = BRANDED.has(type.toLowerCase())
  const fav = !isBranded && identifier ? faviconUrl(identifier) : null

  if (fav && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fav}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} rounded-[3px] object-contain`}
      />
    )
  }

  return <PlatformIcon type={type} className={className} />
}
