import { NextResponse, type NextRequest } from 'next/server'
import { runFetch } from '@/lib/fetchers/run'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const sourceIds = Array.isArray(body?.sourceIds) ? (body.sourceIds as string[]) : undefined
  const results = await runFetch(sourceIds)
  return NextResponse.json({ results })
}
