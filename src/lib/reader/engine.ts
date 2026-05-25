// Browser TTS engine. No DOM coupling beyond speechSynthesis.
// Loadable in any "use client" file.

export type ReaderState = 'idle' | 'playing' | 'paused' | 'ended'

export interface WordBoundary {
  index: number
  charIndex: number
  charLength: number
}

interface ReaderEvents {
  state: (state: ReaderState) => void
  sentence: (index: number) => void
  word: (b: WordBoundary) => void
  loaded: (sentences: string[]) => void
}

type EventName = keyof ReaderEvents

export function preprocessText(raw: string): string {
  if (!raw) return ''
  let text = raw
  text = text.replace(/[​-‍﻿]/g, '')
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/https?:\/\/\S+/gi, 'link')
  text = text.replace(/(^|\s)@([A-Za-z0-9_]{1,30})/g, '$1at $2')
  text = text.replace(/(^|\s)#([A-Za-z0-9_]{1,50})/g, '$1hashtag $2')
  text = text.replace(/([A-Za-z])\1{2,}/g, '$1$1')
  return text.trim()
}

export function splitIntoSentences(text: string): string[] {
  if (!text) return []

  const placeholders: string[] = []
  let working = text

  working = working.replace(/\b([A-Za-z]{1,4}(?:\.[A-Za-z]{1,4}){1,3})\.?/g, (match) => {
    const idx = placeholders.length
    placeholders.push(match)
    return ` ${idx} `
  })
  working = working.replace(/\d+\.\d+/g, (match) => {
    const idx = placeholders.length
    placeholders.push(match)
    return ` ${idx} `
  })
  working = working.replace(/\.{3,}|…/g, (match) => {
    const idx = placeholders.length
    placeholders.push(match)
    return ` ${idx} `
  })

  const chunks = working.split(/(?<=[.!?])\s+|\n+/)

  const sentences = chunks
    .map((chunk) => chunk.replace(/ (\d+) /g, (_, i) => placeholders[Number(i)]))
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  if (sentences.length === 1 && sentences[0].length > 160) {
    return chunkLongText(sentences[0], 120)
  }
  return sentences.length > 0 ? sentences : [text.trim()]
}

function chunkLongText(text: string, targetLen: number): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let current = ''
  for (const word of words) {
    if (current.length + word.length + 1 > targetLen && current.length > 0) {
      chunks.push(current)
      current = word
    } else {
      current = current ? `${current} ${word}` : word
    }
  }
  if (current) chunks.push(current)
  return chunks
}

export interface ReaderOptions {
  rate?: number
  voiceURI?: string | null
}

export class TtsReader {
  private synth: SpeechSynthesis
  rate: number
  voiceURI: string | null
  utterance: SpeechSynthesisUtterance | null = null
  sentences: string[] = []
  currentIndex = 0
  state: ReaderState = 'idle'
  wordCharIndex = 0
  wordLength = 0

  // Storing listeners in a uniformly-typed map; the public API enforces shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Map<EventName, Array<(...args: any[]) => void>> = new Map()
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null

  constructor(options: ReaderOptions = {}) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      throw new Error('TtsReader requires a browser environment with speechSynthesis')
    }
    this.synth = window.speechSynthesis
    this.rate = options.rate ?? 1.0
    this.voiceURI = options.voiceURI ?? null
  }

  on<K extends EventName>(event: K, fn: ReaderEvents[K]): this {
    let arr = this.listeners.get(event)
    if (!arr) {
      arr = []
      this.listeners.set(event, arr)
    }
    arr.push(fn as (...args: unknown[]) => void)
    return this
  }

  off<K extends EventName>(event: K, fn: ReaderEvents[K]): void {
    const arr = this.listeners.get(event)
    if (!arr) return
    const idx = arr.indexOf(fn as (...args: unknown[]) => void)
    if (idx >= 0) arr.splice(idx, 1)
  }

  private emit<K extends EventName>(event: K, ...args: Parameters<ReaderEvents[K]>): void {
    const arr = this.listeners.get(event)
    if (!arr) return
    for (const fn of arr) {
      try {
        fn(...args)
      } catch (e) {
        console.error('[TtsReader] listener error', e)
      }
    }
  }

  private setState(state: ReaderState): void {
    if (this.state === state) return
    this.state = state
    this.emit('state', state)
  }

  load(text: string): void {
    this.stop()
    this.sentences = splitIntoSentences(preprocessText(text))
    this.currentIndex = 0
    this.emit('loaded', this.sentences)
    this.setState('idle')
  }

  play(): void {
    if (!this.sentences.length) return
    if (this.state === 'paused') {
      this.synth.resume()
      this.setState('playing')
      this.startKeepAlive()
      return
    }
    if (this.currentIndex >= this.sentences.length) this.currentIndex = 0
    this.speakCurrent()
  }

  private speakCurrent(): void {
    if (this.currentIndex >= this.sentences.length) {
      this.setState('ended')
      this.stopKeepAlive()
      return
    }

    const sentence = this.sentences[this.currentIndex]
    const utt = new SpeechSynthesisUtterance(sentence)
    utt.rate = this.rate

    const voice = this.resolveVoice()
    if (voice) utt.voice = voice

    utt.onstart = () => {
      this.setState('playing')
      this.emit('sentence', this.currentIndex)
      this.startKeepAlive()
    }

    utt.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'word' || event.charIndex !== undefined) {
        this.wordCharIndex = event.charIndex ?? 0
        this.wordLength = event.charLength ?? 0
        this.emit('word', { index: this.currentIndex, charIndex: this.wordCharIndex, charLength: this.wordLength })
      }
    }

    utt.onend = () => {
      if (this.utterance === utt) {
        this.currentIndex += 1
        if (this.currentIndex < this.sentences.length && this.state !== 'paused') {
          this.speakCurrent()
        } else if (this.currentIndex >= this.sentences.length) {
          this.setState('ended')
          this.stopKeepAlive()
        }
      }
    }

    utt.onerror = (event: SpeechSynthesisErrorEvent) => {
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.warn('[TtsReader] utterance error', event.error)
      }
    }

    this.utterance = utt
    this.synth.speak(utt)
  }

  private startKeepAlive(): void {
    this.stopKeepAlive()
    this.keepAliveTimer = setInterval(() => {
      if (this.synth.speaking && !this.synth.paused) {
        this.synth.pause()
        this.synth.resume()
      }
    }, 10000)
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
  }

  pause(): void {
    if (this.state !== 'playing') return
    this.synth.pause()
    this.setState('paused')
    this.stopKeepAlive()
  }

  togglePlayPause(): void {
    if (this.state === 'playing') this.pause()
    else this.play()
  }

  stop(): void {
    this.synth.cancel()
    this.utterance = null
    this.currentIndex = 0
    this.wordCharIndex = 0
    this.wordLength = 0
    this.stopKeepAlive()
    this.setState('idle')
  }

  skipForward(): void {
    if (!this.sentences.length) return
    const wasPlaying = this.state === 'playing' || this.state === 'paused'
    this.synth.cancel()
    this.utterance = null
    this.currentIndex = Math.min(this.currentIndex + 1, this.sentences.length)
    this.emit('sentence', Math.min(this.currentIndex, this.sentences.length - 1))
    if (wasPlaying && this.currentIndex < this.sentences.length) this.speakCurrent()
  }

  skipBackward(): void {
    if (!this.sentences.length) return
    const wasPlaying = this.state === 'playing' || this.state === 'paused'
    this.synth.cancel()
    this.utterance = null
    this.currentIndex = Math.max(this.currentIndex - 1, 0)
    this.emit('sentence', this.currentIndex)
    if (wasPlaying) this.speakCurrent()
  }

  setRate(rate: number): void {
    this.rate = rate
    if (this.utterance) this.utterance.rate = rate
  }

  setVoice(voiceURI: string | null): void {
    this.voiceURI = voiceURI
  }

  getProgress(): number {
    if (!this.sentences.length) return 0
    return Math.min(this.currentIndex / this.sentences.length, 1)
  }

  private resolveVoice(): SpeechSynthesisVoice | null {
    if (!this.voiceURI) return null
    const voices = this.synth.getVoices()
    return voices.find((v) => v.voiceURI === this.voiceURI) || null
  }

  static loadVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve([])
        return
      }
      const synth = window.speechSynthesis
      const existing = synth.getVoices()
      if (existing.length) {
        resolve(existing)
        return
      }
      synth.addEventListener('voiceschanged', () => resolve(synth.getVoices()), { once: true })
      setTimeout(() => resolve(synth.getVoices()), 500)
    })
  }
}
