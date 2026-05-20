import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { buildRedditAuthUrl } from '@/lib/oauth/reddit'
import { OAUTH_STATE_COOKIE, OAUTH_STATE_TTL_SECONDS, newOAuthState } from '@/lib/oauth/state'

export const runtime = 'nodejs'

export async function GET() {
  const env = getEnv()
  if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in .env.local' },
      { status: 500 },
    )
  }

  const state = newOAuthState()
  const url = buildRedditAuthUrl(`reddit:${state}`)
  const res = NextResponse.redirect(url)
  res.cookies.set(OAUTH_STATE_COOKIE, `reddit:${state}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_STATE_TTL_SECONDS,
  })
  return res
}
