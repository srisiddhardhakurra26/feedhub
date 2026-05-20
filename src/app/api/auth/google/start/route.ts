import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { buildGoogleAuthUrl } from '@/lib/oauth/google'
import { OAUTH_STATE_COOKIE, OAUTH_STATE_TTL_SECONDS, newOAuthState } from '@/lib/oauth/state'

export const runtime = 'nodejs'

export async function GET() {
  const env = getEnv()
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local' },
      { status: 500 },
    )
  }
  const stateValue = `google:${newOAuthState()}`
  const url = buildGoogleAuthUrl(stateValue)
  const res = NextResponse.redirect(url)
  res.cookies.set(OAUTH_STATE_COOKIE, stateValue, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_STATE_TTL_SECONDS,
  })
  return res
}
