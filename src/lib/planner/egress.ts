import type { PlacedItem, RoomSpec } from './types'
import { getItem, halfExtents } from './catalog'

// ─── Egress route geometry (shared by the 3D scene and compliance checks) ──
//
// The room is centred on the origin: x ∈ [-w/2, w/2], z ∈ [-d/2, d/2].
// South edge (+z) holds the 1.4 m main entrance; north edge (−z) the 0.9 m
// rear exit. Routes flow from the far corners of the room to the nearest exit
// and are drawn as flowing chevrons in the 3D view + dashed lines in the plan.

export interface Vec2 {
  x: number
  z: number
}

/** Waypoints of one evacuation route, in room coordinates. */
export type EgressRoute = Vec2[]

/** The two exit doors, used for exit signage and capacity maths. */
export function exitDoors(room: RoomSpec): { main: Vec2; rear: Vec2 } {
  return {
    main: { x: 0, z: room.d / 2 - 0.32 },
    rear: { x: room.w / 4, z: -room.d / 2 + 0.4 },
  }
}

/** The three canonical evacuation routes for a given room size. */
export function egressRoutes(room: RoomSpec): EgressRoute[] {
  const { w, d } = room
  const S: Vec2 = { x: 0, z: d / 2 - 0.32 }
  const N: Vec2 = { x: w / 4, z: -d / 2 + 0.4 }
  return [
    // west quarter → curves along the west wall → main entrance
    [{ x: -w / 4, z: -d / 4 }, { x: -w / 4.6, z: d / 8 }, { x: -w / 16, z: d / 3 }, S],
    // centre-north → diagonals to the main entrance
    [{ x: w / 5, z: d / 10 }, { x: w / 8, z: d / 3 }, { x: w / 28, z: d / 2 - 0.9 }, S],
    // east side → rear exit
    [{ x: w / 2.6, z: d / 4 }, { x: w / 2.15, z: -d / 10 }, N],
  ]
}

// ─── Exit discharge zones ──────────────────────────────────────────────────
//
// Codes (IBC 1005 / 1030) keep the landing in front of every exit door clear.
// We model a 1.2 m deep discharge zone, centered on each door, slightly wider
// than the door leaf. Furniture that overlaps a zone blocks the check.

/** Depth of the clear landing measured from the wall plane, in metres. */
export const DISCHARGE_DEPTH_M = 1.2
/** Half-width of the discharge zone around the door centre, in metres. */
export const DISCHARGE_HALF_W_M = 0.55

export interface DischargeZone {
  door: 'main' | 'rear'
  x0: number
  x1: number
  z0: number
  z1: number
}

export function dischargeZones(room: RoomSpec): DischargeZone[] {
  const { w, d } = room
  const hw = DISCHARGE_HALF_W_M
  const depth = DISCHARGE_DEPTH_M
  return [
    // main entrance on the south wall, centred at x=0
    { door: 'main', x0: -hw, x1: hw, z0: d / 2 - depth, z1: d / 2 },
    // rear exit on the north wall at x = w/4
    { door: 'rear', x0: w / 4 - hw, x1: w / 4 + hw, z0: -d / 2, z1: -d / 2 + depth },
  ]
}

/**
 * Ceiling-hung / walkable items that never block a walking surface:
 * pendants hang above head height; rugs are flush floor coverings.
 */
const NON_BLOCKING_IDS = new Set(['pendant', 'rug'])

export interface EgressOffender {
  uid: string
  name: string
  door: 'main' | 'rear'
  /** how deep the item penetrates the discharge zone, in metres */
  depth: number
}

/** Items whose footprint overlaps an exit discharge zone, worst first. */
export function dischargeBlockages(items: PlacedItem[], room: RoomSpec): EgressOffender[] {
  const zones = dischargeZones(room)
  const offenders: EgressOffender[] = []
  for (const it of items) {
    if (NON_BLOCKING_IDS.has(it.id)) continue
    const cat = getItem(it.id)
    if (!cat) continue
    const { hx, hz } = halfExtents(it.id, it.rot)
    for (const z of zones) {
      // AABB overlap depth on both axes; penetration = the smaller one
      const ox = Math.min(it.x + hx - z.x0, z.x1 - (it.x - hx))
      const oz = Math.min(it.z + hz - z.z0, z.z1 - (it.z - hz))
      if (ox > 0.02 && oz > 0.02) {
        offenders.push({ uid: it.uid, name: cat.name, door: z.door, depth: Math.min(ox, oz) })
      }
    }
  }
  return offenders.sort((a, b) => b.depth - a.depth)
}

/** Kept for potential visual overlays: dense polyline sampling of a route. */
export function sampleRoute(route: EgressRoute, step = 0.25): Vec2[] {
  if (route.length < 2) return [...route]
  const pts: Vec2[] = []
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i]
    const b = route[i + 1]
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    const n = Math.max(1, Math.ceil(len / step))
    for (let k = 0; k < n; k++) {
      pts.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n })
    }
  }
  pts.push(route[route.length - 1])
  return pts
}
