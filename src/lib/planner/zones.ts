import type { RoomSpec, ZoneDef, ZoneKind } from './types'

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
