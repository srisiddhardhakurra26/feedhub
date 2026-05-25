'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { TtsReader, type ReaderState, type WordBoundary } from './engine'

interface ReaderTrack {
  id: string
  title: string
  text: string
}

interface ReaderContextValue {
  state: ReaderState
  track: ReaderTrack | null
  sentences: string[]
  currentIndex: number
  word: WordBoundary | null
  rate: number
  voiceURI: string | null
  voices: SpeechSynthesisVoice[]
  isReady: boolean

  play: (track: ReaderTrack) => void
  toggle: () => void
  stop: () => void
  close: () => void
  skipForward: () => void
  skipBackward: () => void
  setRate: (rate: number) => void
  setVoice: (uri: string | null) => void
}

const ReaderContext = createContext<ReaderContextValue | null>(null)

const STORAGE_KEY = 'feedhub.reader.settings'

interface StoredSettings {
  rate?: number
  voiceURI?: string | null
}

function loadSettings(): StoredSettings {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSettings) : {}
  } catch {
    return {}
  }
}

function saveSettings(patch: StoredSettings): void {
  if (typeof window === 'undefined') return
  try {
    const current = loadSettings()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    // ignore
  }
}

export function ReaderProvider({ children }: { children: React.ReactNode }) {
  const readerRef = useRef<TtsReader | null>(null)
  const [state, setState] = useState<ReaderState>('idle')
  const [track, setTrack] = useState<ReaderTrack | null>(null)
  const [sentences, setSentences] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [word, setWord] = useState<WordBoundary | null>(null)
  const [rate, setRateState] = useState<number>(() => loadSettings().rate ?? 1.0)
  const [voiceURI, setVoiceURIState] = useState<string | null>(() => loadSettings().voiceURI ?? null)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const reader = new TtsReader({ rate, voiceURI })
    readerRef.current = reader

    reader.on('state', (s) => setState(s))
    reader.on('sentence', (i) => {
      setCurrentIndex(i)
      setWord(null)
    })
    reader.on('word', (b) => setWord(b))
    reader.on('loaded', (s) => {
      setSentences(s)
      setCurrentIndex(0)
      setWord(null)
    })

    TtsReader.loadVoices().then((vs) => {
      const sorted = [...vs].sort((a, b) => {
        const aEn = a.lang.startsWith('en') ? 0 : 1
        const bEn = b.lang.startsWith('en') ? 0 : 1
        if (aEn !== bEn) return aEn - bEn
        return a.name.localeCompare(b.name)
      })
      setVoices(sorted)
    })

    // Signal mounted-on-client; safe initial-render set since this only
    // flips false → true once after hydration completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReady(true)

    return () => {
      reader.stop()
      readerRef.current = null
    }
    // Intentionally run once on mount — rate/voiceURI seed the engine
    // construction, after which the engine is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const play = useCallback((next: ReaderTrack) => {
    const reader = readerRef.current
    if (!reader) return
    setTrack(next)
    reader.load(next.text)
    reader.play()
  }, [])

  const toggle = useCallback(() => readerRef.current?.togglePlayPause(), [])
  const stop = useCallback(() => readerRef.current?.stop(), [])
  const close = useCallback(() => {
    readerRef.current?.stop()
    setTrack(null)
    setSentences([])
    setCurrentIndex(0)
    setWord(null)
  }, [])
  const skipForward = useCallback(() => readerRef.current?.skipForward(), [])
  const skipBackward = useCallback(() => readerRef.current?.skipBackward(), [])

  const setRate = useCallback((value: number) => {
    setRateState(value)
    readerRef.current?.setRate(value)
    saveSettings({ rate: value })
  }, [])

  const setVoice = useCallback((uri: string | null) => {
    setVoiceURIState(uri)
    readerRef.current?.setVoice(uri)
    saveSettings({ voiceURI: uri })
  }, [])

  const value = useMemo<ReaderContextValue>(
    () => ({
      state,
      track,
      sentences,
      currentIndex,
      word,
      rate,
      voiceURI,
      voices,
      isReady,
      play,
      toggle,
      stop,
      close,
      skipForward,
      skipBackward,
      setRate,
      setVoice,
    }),
    [state, track, sentences, currentIndex, word, rate, voiceURI, voices, isReady, play, toggle, stop, close, skipForward, skipBackward, setRate, setVoice],
  )

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>
}

export function useReader(): ReaderContextValue {
  const ctx = useContext(ReaderContext)
  if (!ctx) throw new Error('useReader must be called within a ReaderProvider')
  return ctx
}
