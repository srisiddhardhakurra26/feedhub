import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params
  await prisma.account.deleteMany({ where: { platform } })

  if (platform === 'reddit') {
    await prisma.source.deleteMany({ where: { type: 'reddit', identifier: '__home__' } })
  }

  revalidatePath('/')
  revalidatePath('/accounts')
  revalidatePath('/sources')
  return NextResponse.json({ ok: true })
}
