import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { SOURCE_TYPES } from '@/lib/sources/types'

export const runtime = 'nodejs'

const createSchema = z.object({
  type: z.enum(SOURCE_TYPES),
  identifier: z.string().min(1).trim(),
  label: z.string().trim().optional(),
})

export async function GET() {
  const sources = await prisma.source.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  })
  return NextResponse.json({ sources })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const source = await prisma.source.create({
      data: {
        type: parsed.data.type,
        identifier: parsed.data.identifier,
        label: parsed.data.label ?? null,
      },
    })
    return NextResponse.json({ source }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Source already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
