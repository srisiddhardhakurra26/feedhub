import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

const PAGE_SIZE = 30

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const filter = params.get('filter') ?? 'all'
  const sourceId = params.get('source') ?? undefined
  const cursor = params.get('cursor') ?? undefined

  const where: {
    isSaved?: boolean
    sourceId?: string
  } = {}
  if (filter === 'saved') where.isSaved = true
  if (sourceId) where.sourceId = sourceId

  const items = await prisma.item.findMany({
    where,
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      source: { select: { id: true, type: true, identifier: true, label: true } },
    },
  })

  const hasMore = items.length > PAGE_SIZE
  const trimmed = hasMore ? items.slice(0, PAGE_SIZE) : items
  const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id : null

  return NextResponse.json({ items: trimmed, nextCursor })
}
