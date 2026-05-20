import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { exchangeRedditCode, fetchRedditMe } from '@/lib/oauth/reddit'
import { OAUTH_STATE_COOKIE } from '@/lib/oauth/state'

export const runtime = 'nodejs'

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

  if (error) return errorRedirect(request, `Reddit returned: ${error}`)
  if (!code || !state) return errorRedirect(request, 'Missing code or state')

  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value
  if (!cookieState || cookieState !== state) {
    return errorRedirect(request, 'OAuth state mismatch')
  }

  try {
    const tokens = await exchangeRedditCode(code)
    const me = await fetchRedditMe(tokens.access_token)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    await prisma.account.upsert({
      where: { platform: 'reddit' },
      update: {
        username: me.name,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        scope: tokens.scope,
      },
      create: {
        platform: 'reddit',
        username: me.name,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        scope: tokens.scope,
      },
    })

    await prisma.source.upsert({
      where: { type_identifier: { type: 'reddit', identifier: '__home__' } },
      update: { label: `Reddit home (${me.name})`, enabled: true },
      create: {
        type: 'reddit',
        identifier: '__home__',
        label: `Reddit home (${me.name})`,
      },
    })

    const url = request.nextUrl.clone()
    url.pathname = '/accounts'
    url.search = ''
    const res = NextResponse.redirect(url)
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return errorRedirect(request, message)
  }
}
