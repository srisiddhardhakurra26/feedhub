import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getEnv } from '@/lib/env'
import { SESSION_COOKIE, makeSessionToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function loginAction(formData: FormData) {
  'use server'
  const env = getEnv()
  const password = String(formData.get('password') ?? '')
  if (password !== env.APP_PASSWORD) {
    redirect('/login?error=1')
  }
  const token = makeSessionToken(env.APP_PASSWORD, env.SESSION_SECRET)
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  redirect('/')
}

interface PageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { error } = await searchParams

  return (
    <div className="max-w-sm mx-auto mt-20">
      <form
        action={loginAction}
        className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4"
      >
        <h1 className="font-semibold text-lg">Log in to feedhub</h1>
        <input
          name="password"
          type="password"
          autoFocus
          required
          placeholder="Password"
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">Wrong password.</p>
        )}
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-2 font-medium"
        >
          Log in
        </button>
      </form>
    </div>
  )
}
