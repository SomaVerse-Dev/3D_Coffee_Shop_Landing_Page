import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const snapshotShape = z.object({
  room: z.object({ w: z.number().min(3).max(40), d: z.number().min(3).max(40) }),
  items: z
    .array(
      z.object({
        uid: z.string().max(80).optional(),
        id: z.string().max(60),
        x: z.number().finite(),
        z: z.number().finite(),
        rot: z.number().finite().optional(),
      }),
    )
    .max(400),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  projectName: z.string().max(80).optional(),
  templateId: z.string().max(30).optional(),
})

const createBody = z.object({
  name: z.string().trim().min(1).max(80),
  data: snapshotShape,
  thumb: z.string().max(400_000).optional(),
})

/** GET /api/layouts — list recent saved layouts (newest first). */
export async function GET() {
  try {
    const rows = await db.savedLayout.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 24,
      select: {
        id: true,
        name: true,
        brandColor: true,
        thumb: true,
        data: true,
        updatedAt: true,
      },
    })
    return NextResponse.json({
      layouts: rows.map((r) => ({
        id: r.id,
        name: r.name,
        brandColor: r.brandColor,
        thumb: r.thumb,
        updatedAt: r.updatedAt.toISOString(),
        itemCount: safeCount(r.data),
      })),
    })
  } catch (err) {
    console.error('GET /api/layouts failed', err)
    return NextResponse.json({ error: 'Could not load saved layouts' }, { status: 500 })
  }
}

/** POST /api/layouts — save the current layout. */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = createBody.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid layout payload' }, { status: 400 })
    }
    const { name, data, thumb } = parsed.data
    const row = await db.savedLayout.create({
      data: {
        name,
        data: JSON.stringify(data),
        thumb: thumb ?? null,
        brandColor: data.brandColor,
      },
      select: { id: true, name: true, updatedAt: true },
    })
    return NextResponse.json({ layout: { id: row.id, name: row.name, updatedAt: row.updatedAt.toISOString() } }, { status: 201 })
  } catch (err) {
    console.error('POST /api/layouts failed', err)
    return NextResponse.json({ error: 'Could not save layout' }, { status: 500 })
  }
}

function safeCount(dataJson: string): number {
  try {
    const parsed = JSON.parse(dataJson) as { items?: unknown[] }
    return Array.isArray(parsed.items) ? parsed.items.length : 0
  } catch {
    return 0
  }
}
