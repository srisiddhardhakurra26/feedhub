import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'

export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD
  const secret = process.env.SESSION_SECRET
  if (!password || !secret) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (verifySessionToken(token, password, secret)) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
}
