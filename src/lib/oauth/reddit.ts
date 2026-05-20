import { getEnv } from '@/lib/env'

const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/authorize'
const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token'
const REDDIT_ME_URL = 'https://oauth.reddit.com/api/v1/me'

export const REDDIT_SCOPES = ['identity', 'read', 'mysubreddits']

export function redditRedirectUri(): string {
  const env = getEnv()
  return `${env.APP_URL.replace(/\/$/, '')}/api/auth/reddit/callback`
}

export function buildRedditAuthUrl(state: string): string {
  const env = getEnv()
  if (!env.REDDIT_CLIENT_ID) {
    throw new Error('REDDIT_CLIENT_ID is not set')
  }
  const params = new URLSearchParams({
    client_id: env.REDDIT_CLIENT_ID,
    response_type: 'code',
    state,
    redirect_uri: redditRedirectUri(),
    duration: 'permanent',
    scope: REDDIT_SCOPES.join(' '),
  })
  return `${REDDIT_AUTH_URL}?${params.toString()}`
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
}

function basicAuthHeader(): string {
  const env = getEnv()
  const creds = Buffer.from(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`).toString('base64')
  return `Basic ${creds}`
}

export async function exchangeRedditCode(code: string): Promise<TokenResponse> {
  const env = getEnv()
  const res = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': env.REDDIT_USER_AGENT ?? 'feedhub:local:0.1',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redditRedirectUri(),
    }).toString(),
  })
  if (!res.ok) {
    throw new Error(`Reddit token exchange failed: ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as TokenResponse
}

export async function refreshRedditToken(refreshToken: string): Promise<TokenResponse> {
  const env = getEnv()
  const res = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': env.REDDIT_USER_AGENT ?? 'feedhub:local:0.1',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  })
  if (!res.ok) {
    throw new Error(`Reddit token refresh failed: ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as TokenResponse
}

export async function fetchRedditMe(accessToken: string): Promise<{ name: string }> {
  const env = getEnv()
  const res = await fetch(REDDIT_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': env.REDDIT_USER_AGENT ?? 'feedhub:local:0.1',
    },
  })
  if (!res.ok) {
    throw new Error(`Reddit /me failed: ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as { name: string }
}
