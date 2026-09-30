import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET /api/layouts/[id] — fetch one saved layout (with full data). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const row = await db.savedLayout.findUnique({ where: { id } })
    if (!row) return NextResponse.json({ error: 'Layout not found' }, { status: 404 })
    return NextResponse.json({
      layout: {
        id: row.id,
        name: row.name,
        brandColor: row.brandColor,
        thumb: row.thumb,
        data: JSON.parse(row.data),
        updatedAt: row.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    console.error('GET /api/layouts/[id] failed', err)
    return NextResponse.json({ error: 'Could not load layout' }, { status: 500 })
  }
}

/** DELETE /api/layouts/[id] — remove a saved layout. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await db.savedLayout.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/layouts/[id] failed', err)
    return NextResponse.json({ error: 'Could not delete layout' }, { status: 500 })
  }
}
