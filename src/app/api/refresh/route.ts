import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { runFetch } from '@/lib/fetchers/run'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const sourceIds = Array.isArray(body?.sourceIds)
    ? body.sourceIds.filter((id: unknown): id is string => typeof id === 'string')
    : undefined
  const results = await runFetch(sourceIds)
  revalidatePath('/')
  revalidatePath('/accounts')
  revalidatePath('/stories')
  return NextResponse.json({ results })
}
