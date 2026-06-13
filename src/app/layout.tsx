import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { CommandPalette } from '@/components/CommandPalette'
import { PlatformNav } from '@/components/PlatformNav'
import { ReaderPanel } from '@/components/ReaderPanel'
import { ScrollProgress } from '@/components/ScrollProgress'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ReaderProvider } from '@/lib/reader/ReaderContext'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'feedhub',
  description: 'Personal multi-platform feed aggregator',
}

// Runs before paint: applies the saved theme (or OS preference) so there is
// no light-mode flash. Must stay in sync with ThemeToggle's storage key.
const themeInit = `(function(){try{var t=localStorage.getItem('feedhub-theme');var d=t? t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-transparent text-zinc-900 dark:text-zinc-100 relative selection:bg-violet-200 dark:selection:bg-violet-500/40">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <ReaderProvider>
        <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute inset-0 bg-[#fafafa] dark:bg-[#070709]" />
          <div className="aurora-blob absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full blur-3xl bg-gradient-to-br from-violet-300/50 via-sky-300/35 to-transparent dark:from-violet-700/25 dark:via-sky-700/15 dark:to-transparent" />
          <div className="aurora-blob [animation-delay:-9s] absolute top-1/3 -right-44 h-[30rem] w-[30rem] rounded-full blur-3xl bg-gradient-to-bl from-amber-200/50 via-rose-200/35 to-transparent dark:from-amber-600/15 dark:via-rose-600/12 dark:to-transparent" />
          <div className="aurora-blob [animation-delay:-18s] absolute -bottom-52 left-1/4 h-[36rem] w-[36rem] rounded-full blur-3xl bg-gradient-to-tr from-emerald-200/45 via-cyan-200/30 to-transparent dark:from-emerald-700/15 dark:via-cyan-700/12 dark:to-transparent" />
        </div>
        <ScrollProgress />
        <header className="border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md sticky top-0 z-50">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
            <Link href="/" className="font-bold tracking-tight text-lg flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet-500 via-sky-500 to-emerald-500" />
              <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
                feedhub
              </span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/" className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                Feed
              </Link>
              <Link href="/stories" className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                Stories
              </Link>
              <Link href="/discover" className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                Discover
              </Link>
              <Link href="/accounts" className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                Accounts
              </Link>
            </div>
            <div className="hidden md:flex items-center mx-2">
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
            </div>
            <PlatformNav />
            <div className="ml-auto flex items-center gap-2">
              <CommandPalette />
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
        <ReaderPanel />
        </ReaderProvider>
      </body>
    </html>
  )
}
