import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getItem } from '@/lib/planner/catalog'

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

/** GET /api/layouts?limit=N — list recent saved layouts (newest first, with total count). */
export async function GET(req: Request) {
  try {
    const limitRaw = Number(new URL(req.url).searchParams.get('limit'))
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(96, Math.floor(limitRaw)) : 24
    const [rows, total] = await Promise.all([
      db.savedLayout.findMany({
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          brandColor: true,
          thumb: true,
          data: true,
          updatedAt: true,
        },
      }),
      db.savedLayout.count(),
    ])
    return NextResponse.json({
      total,
      layouts: rows.map((r) => {
        const parsed = safeParse(r.data)
        return {
          id: r.id,
          name: r.name,
          brandColor: r.brandColor,
          thumb: r.thumb,
          updatedAt: r.updatedAt.toISOString(),
          itemCount: parsed?.items.length ?? 0,
          seats: parsed?.seats ?? 0,
          areaM2: parsed?.areaM2 ?? 0,
          templateId: parsed?.templateId ?? 'custom',
        }
      }),
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

interface ParsedSnapshot {
  items: Array<{ id: string }>
  seats: number
  areaM2: number
  templateId: string
}

function safeParse(dataJson: string): ParsedSnapshot | null {
  try {
    const parsed = JSON.parse(dataJson) as {
      items?: Array<{ id: string }>
      room?: { w?: number; d?: number }
      templateId?: string
    }
    const items = Array.isArray(parsed.items) ? parsed.items : []
    const w = typeof parsed.room?.w === 'number' ? parsed.room.w : 0
    const d = typeof parsed.room?.d === 'number' ? parsed.room.d : 0
    // seat count via the shared catalog (server-safe, no DOM)
    let seats = 0
    for (const it of items) seats += getItem(it.id)?.seats ?? 0
    return { items, seats, areaM2: w * d, templateId: parsed.templateId ?? 'custom' }
  } catch {
    return null
  }
}
