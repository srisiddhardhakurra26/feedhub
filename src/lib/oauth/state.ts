import { randomBytes } from 'node:crypto'

export const OAUTH_STATE_COOKIE = 'feedhub_oauth_state'
export const OAUTH_STATE_TTL_SECONDS = 600

export function newOAuthState(): string {
  return randomBytes(24).toString('hex')
}
