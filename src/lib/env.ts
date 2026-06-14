import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_PASSWORD: z.string().min(1, 'APP_PASSWORD is required to log in'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 chars'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  REDDIT_USER_AGENT: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Powers the "Ask AI" box. Optional — the box degrades gracefully when unset.
  GROQ_API_KEY: z.string().optional(),
  FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
})

export type Env = z.infer<typeof schema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  cached = parsed.data
  return cached
}

export function hasRedditCreds(): boolean {
  const env = getEnv()
  return Boolean(env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET && env.REDDIT_USER_AGENT)
}
