import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'feedhub_session'

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex')
}

export function makeSessionToken(password: string, secret: string): string {
  return sign(`v1:${password}`, secret)
}

export function verifySessionToken(token: string | undefined, password: string, secret: string): boolean {
  if (!token) return false
  const expected = makeSessionToken(password, secret)
  const a = Buffer.from(token, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
