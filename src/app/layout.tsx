import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { PlatformNav } from '@/components/PlatformNav'
import { ReaderPanel } from '@/components/ReaderPanel'
import { ReaderProvider } from '@/lib/reader/ReaderContext'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'feedhub',
  description: 'Personal multi-platform feed aggregator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-transparent text-zinc-900 dark:text-zinc-100 relative selection:bg-zinc-300 dark:selection:bg-zinc-700">
        <ReaderProvider>
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-200 via-zinc-50 to-zinc-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950"></div>
        <header className="border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md sticky top-0 z-50">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
            <Link href="/" className="font-bold tracking-tight text-lg">
              feedhub
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/" className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                Feed
              </Link>
              <Link href="/stories" className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                Stories
              </Link>
              <Link href="/accounts" className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                Accounts
              </Link>
            </div>
            <div className="hidden md:flex items-center mx-2">
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
            </div>
            <PlatformNav />
            <span className="ml-auto hidden lg:inline text-xs text-zinc-500 dark:text-zinc-500">
              Press <kbd className="font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">?</kbd> for shortcuts
            </span>
          </nav>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
        <ReaderPanel />
        </ReaderProvider>
      </body>
    </html>
  )
}
