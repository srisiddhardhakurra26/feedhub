import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const item = await prisma.item.findUnique({ where: { id }, select: { isRead: true } })
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const updated = await prisma.item.update({
    where: { id },
    data: { isRead: !item.isRead },
    select: { id: true, isRead: true },
  })
  return NextResponse.json({ item: updated })
}
