import type { PlacedItem, RoomSpec, ZoneDef, ZoneKind } from './types'
import { getItem } from './catalog'

/** zone wash palette — warm, muted tints that read as blueprint annotations */
export const ZONE_META: Record<ZoneKind, { color: string }> = {
  service: { color: '#5F6B5C' }, // sage — counters, checkout, pass
  seating: { color: '#B07D2B' }, // amber — loose chairs & lounge
  dining:  { color: '#8C5A3B' }, // coffee — table service
  entry:   { color: '#A8552F' }, // rust — arrival / host
  work:    { color: '#7A6C58' }, // warm slate — desks
  meeting: { color: '#4E6E58' }, // deep sage — meeting spots
  retail:  { color: '#99622E' }, // tan — merch display
  support: { color: '#8A8375' }, // warm gray — fitting, booths
}

/** all zone kinds in picker display order */
export const ZONE_KINDS: ZoneKind[] = ['service', 'seating', 'dining', 'entry', 'work', 'meeting', 'retail', 'support']

export interface ClippedZone {
  zone: ZoneDef
  x1: number
  z1: number
  x2: number
  z2: number
}

/** intersect a zone rect with the room bounds; returns null when fully outside */
export function clipZone(zn: ZoneDef, room: RoomSpec): ClippedZone | null {
  const x1 = Math.max(-room.w / 2, zn.x - zn.w / 2)
  const x2 = Math.min(room.w / 2, zn.x + zn.w / 2)
  const z1 = Math.max(-room.d / 2, zn.z - zn.d / 2)
  const z2 = Math.min(room.d / 2, zn.z + zn.d / 2)
  if (x2 - x1 < 0.15 || z2 - z1 < 0.15) return null
  return { zone: zn, x1, z1, x2, z2 }
}

/** zones clipped to the current room, ready to draw */
export function drawableZones(zones: ZoneDef[] | undefined, room: RoomSpec): ClippedZone[] {
  if (!zones || zones.length === 0) return []
  return zones
    .map((zn) => clipZone(zn, room))
    .filter((c): c is ClippedZone => c !== null)
}

// ─── Zone statistics (cost panel breakdown) ───────────────────────────────

export interface ZoneStat {
  zone: ZoneDef
  /** visible (clipped) area in m² */
  area: number
  /** furniture pieces whose center falls inside the zone */
  pieces: number
  /** seats contributed by those pieces */
  seats: number
  /** catalog (or overridden) value of those pieces, USD */
  spend: number
  /** share of the total floor area, 0..1 */
  pctOfFloor: number
}

/**
 * Per-zone area / seats / spend. An item counts toward a zone when its
 * center point falls inside the zone rect; zones may overlap, in which
 * case an item counts toward every zone that contains it.
 */
export function computeZoneStats(
  zones: ZoneDef[] | undefined,
  items: PlacedItem[],
  room: RoomSpec,
): ZoneStat[] {
  if (!zones || zones.length === 0) return []
  const roomArea = room.w * room.d
  return zones.map((zn) => {
    const clipped = clipZone(zn, room)
    let area = 0
    let pieces = 0
    let seats = 0
    let spend = 0
    if (clipped) {
      area = (clipped.x2 - clipped.x1) * (clipped.z2 - clipped.z1)
      for (const it of items) {
        if (it.x < clipped.x1 || it.x > clipped.x2 || it.z < clipped.z1 || it.z > clipped.z2) continue
        const cat = getItem(it.id)
        if (!cat) continue
        pieces += 1
        seats += cat.seats
        spend += it.price ?? cat.price
      }
    }
    return { zone: zn, area, pieces, seats, spend, pctOfFloor: roomArea > 0 ? area / roomArea : 0 }
  })
}

/**
 * The placed items whose center falls inside the zone's clipped rect —
 * used by the per-zone BOM export (same membership rule as the stats card).
 */
export function itemsInZone(
  zone: ZoneDef,
  items: PlacedItem[],
  room: RoomSpec,
): PlacedItem[] {
  const c = clipZone(zone, room)
  if (!c) return []
  return items.filter((it) => it.x >= c.x1 && it.x <= c.x2 && it.z >= c.z1 && it.z <= c.z2)
}
