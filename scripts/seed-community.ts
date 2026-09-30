/**
 * Seed the community gallery with a handful of curated layouts.
 * Run: bun run scripts/seed-community.ts
 *
 * Builds snapshots from the shipped templates (plus light variations),
 * renders tiny SVG plan thumbnails, and inserts them via Prisma.
 */
import { PrismaClient } from '@prisma/client'
import { TEMPLATES } from '../src/lib/planner/templates'
import { getItem } from '../src/lib/planner/catalog'
import type { LayoutSnapshot } from '../src/lib/planner/store'

const db = new PrismaClient()

const R = (q: number) => (q * Math.PI) / 2

// ─── Tiny SVG plan thumbnails (top-down, same language as PlanSVG) ─────────

function planThumbSvg(snap: LayoutSnapshot, size = 460): string {
  const pad = 26
  const w = snap.room.w
  const d = snap.room.d
  const scale = (size - pad * 2) / Math.max(w, d)
  const W = w * scale
  const H = d * scale
  const ox = (size - W) / 2
  const oy = (size - H) / 2
  const px = (x: number) => ox + (x + w / 2) * scale
  const pz = (z: number) => oy + (z + d / 2) * scale

  const parts: string[] = []
  parts.push(`<rect x="0" y="0" width="${size}" height="${size}" fill="#F7F3EA"/>`)
  // blueprint grid
  const gridStep = Math.max(12, 1 * scale)
  for (let gx = 0; gx <= W + 0.01; gx += gridStep) {
    parts.push(`<line x1="${(ox + gx).toFixed(1)}" y1="${oy.toFixed(1)}" x2="${(ox + gx).toFixed(1)}" y2="${(oy + H).toFixed(1)}" stroke="#37527A" stroke-width="0.6" opacity="0.16"/>`)
  }
  for (let gy = 0; gy <= H + 0.01; gy += gridStep) {
    parts.push(`<line x1="${ox.toFixed(1)}" y1="${(oy + gy).toFixed(1)}" x2="${(ox + W).toFixed(1)}" y2="${(oy + gy).toFixed(1)}" stroke="#37527A" stroke-width="0.6" opacity="0.16"/>`)
  }

  // items (glyphs)
  for (const it of snap.items) {
    const cat = getItem(it.id)
    if (!cat) continue
    const rot = it.rot ?? 0
    const quarter = Math.round(rot / (Math.PI / 2)) % 4
    const swapped = quarter === 1 || quarter === 3
    const hw = ((swapped ? cat.d : cat.w) / 2) * scale
    const hh = ((swapped ? cat.w : cat.d) / 2) * scale
    const cx = px(it.x)
    const cy = pz(it.z)
    const brand = snap.brandColor
    if (cat.shape === 'circle') {
      const r = Math.max(hw, hh)
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${cat.brandable ? brand : '#D8CDBA'}" stroke="#2B2721" stroke-width="1" opacity="0.92"/>`)
    } else {
      const rx = cx - hw
      const ry = cy - hh
      const rw = hw * 2
      const rh = hh * 2
      const fill = cat.category === 'counters' ? '#2B2721' : cat.brandable ? brand : '#E4DAC6'
      parts.push(`<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" rx="${Math.min(3, rw / 4).toFixed(1)}" fill="${fill}" stroke="#2B2721" stroke-width="1" opacity="0.94"/>`)
    }
  }

  // room walls (south entrance + north rear-exit gaps like the 3D room)
  const stroke = '#211D17'
  const sw = 4.5
  const door = 1.4 * scale
  const rear = 0.95 * scale
  const sx = px(-door / 2)
  parts.push(`<line x1="${ox - sw / 2}" y1="${oy + H}" x2="${sx.toFixed(1)}" y2="${oy + H}" stroke="${stroke}" stroke-width="${sw}"/>`)
  parts.push(`<line x1="${(sx + door).toFixed(1)}" y1="${oy + H}" x2="${ox + W + sw / 2}" y2="${oy + H}" stroke="${stroke}" stroke-width="${sw}"/>`)
  const rxDoor = px(w / 2 - 1.6)
  parts.push(`<line x1="${ox - sw / 2}" y1="${oy}" x2="${rxDoor.toFixed(1)}" y2="${oy}" stroke="${stroke}" stroke-width="${sw}"/>`)
  parts.push(`<line x1="${(rxDoor + rear).toFixed(1)}" y1="${oy}" x2="${ox + W + sw / 2}" y2="${oy}" stroke="${stroke}" stroke-width="${sw}"/>`)
  parts.push(`<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + H}" stroke="${stroke}" stroke-width="${sw}"/>`)
  parts.push(`<line x1="${ox + W}" y1="${oy}" x2="${ox + W}" y2="${oy + H}" stroke="${stroke}" stroke-width="${sw}"/>`)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${parts.join('')}</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// ─── Layout variations ──────────────────────────────────────────────────────

function uid(): string {
  return `seed-${Math.random().toString(36).slice(2, 10)}`
}

function snapshotOf(
  id: 'cafe' | 'coworking' | 'boutique' | 'restaurant',
  mutate?: (items: Array<{ id: string; x: number; z: number; rot?: number }>) => void,
): LayoutSnapshot {
  const t = TEMPLATES[id]
  const items = t.items.map((it) => ({ ...it }))
  mutate?.(items)
  return {
    room: { w: t.roomW, d: t.roomD },
    items: items.map((it) => ({ uid: uid(), id: it.id, x: it.x, z: it.z, rot: it.rot ?? 0 })),
    brandColor: t.brandColor,
    projectName: t.projectName,
    templateId: id,
  }
}

const SEEDS: Array<{ name: string; snap: LayoutSnapshot; brand?: string }> = [
  {
    name: 'Corner Café — espresso & window bar',
    snap: snapshotOf('cafe'),
  },
  {
    name: 'Roastery — bean bar with lounge corner',
    brand: '#5F6B5C',
    snap: snapshotOf('cafe', (items) => {
      // drop the two right-most round tables, add a sofa lounge corner
      const kept = items.filter((it) => !(it.id === 'round-table' && it.x > 3))
      kept.push({ id: 'sofa', x: 3.9, z: -2.9, rot: R(2) })
      kept.push({ id: 'lounge-chair', x: 2.7, z: -2.4, rot: R(1) })
      kept.push({ id: 'area-rug', x: 3.6, z: -2.6, rot: 0 })
      items.length = 0
      items.push(...kept)
    }),
  },
  {
    name: 'Studio Works — creative office floor',
    snap: snapshotOf('coworking', (items) => {
      items.push({ id: 'desk-cluster', x: 0.2, z: 2.6, rot: 0 })
      items.push({ id: 'phone-booth', x: 5.3, z: 3.8, rot: 0 })
    }),
  },
  {
    name: 'Atelier Retail — autumn capsule drop',
    snap: snapshotOf('boutique'),
  },
  {
    name: 'Bistro Verde — full-service dining room',
    snap: snapshotOf('restaurant', (items) => {
      items.push({ id: 'booth', x: -4.0, z: 2.4, rot: R(1) })
      items.push({ id: 'booth', x: -4.0, z: -0.4, rot: R(1) })
    }),
  },
  {
    name: 'Harbor Bakery — counter-first morning rush',
    brand: '#B8860B',
    snap: snapshotOf('cafe', (items) => {
      items.push({ id: 'pastry-case', x: -0.35, z: -2.8, rot: R(2) })
      items.push({ id: 'checkout-counter', x: 1.2, z: -2.9, rot: R(2) })
    }),
  },
]

async function main() {
  const existing = await db.savedLayout.count()
  if (existing > 0) {
    console.log(`savedLayout already has ${existing} rows — seeding skipped`)
    return
  }
  for (const s of SEEDS) {
    const snap = { ...s.snap }
    if (s.brand) snap.brandColor = s.brand
    const thumb = planThumbSvg(snap)
    await db.savedLayout.create({
      data: {
        name: s.name,
        data: JSON.stringify(snap),
        thumb,
        brandColor: snap.brandColor,
      },
    })
    console.log(`seeded: ${s.name} (${snap.items.length} items)`)
  }
  console.log('done')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => void db.$disconnect())
