import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { exchangeGoogleCode, fetchGoogleUserinfo } from '@/lib/oauth/google'
import { syncYouTubeSubscriptions } from '@/lib/google/subscriptions'
import { OAUTH_STATE_COOKIE } from '@/lib/oauth/state'

export const runtime = 'nodejs'
export const maxDuration = 60

function errorRedirect(request: NextRequest, message: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = '/accounts'
  url.search = `?error=${encodeURIComponent(message)}`
  const res = NextResponse.redirect(url)
  res.cookies.delete(OAUTH_STATE_COOKIE)
  return res
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const code = params.get('code')
  const state = params.get('state')
  const error = params.get('error')

  if (error) return errorRedirect(request, `Google returned: ${error}`)
  if (!code || !state) return errorRedirect(request, 'Missing code or state')

  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value
  if (!cookieState || cookieState !== state) {
    return errorRedirect(request, 'OAuth state mismatch')
  }

  try {
    const tokens = await exchangeGoogleCode(code)
    const info = await fetchGoogleUserinfo(tokens.access_token)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    await prisma.account.upsert({
      where: { platform: 'google' },
      update: {
        username: info.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        scope: tokens.scope,
      },
      create: {
        platform: 'google',
        username: info.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        scope: tokens.scope,
      },
    })

    await syncYouTubeSubscriptions(tokens.access_token)

    const url = request.nextUrl.clone()
    url.pathname = '/accounts'
    url.search = ''
    const res = NextResponse.redirect(url)
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  } catch (err) {
    return errorRedirect(request, err instanceof Error ? err.message : String(err))
  }
}
