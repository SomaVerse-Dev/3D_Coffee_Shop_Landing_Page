import type { LayoutSnapshot } from './store'
import { getItem } from './catalog'
import { computeCost } from './capacity'

/**
 * Snapshot diff — powers the checkpoint compare panel.
 * Items are matched by uid (stable across undo / checkpoints), zones by id.
 */

export interface DiffLine {
  /** catalog id */
  id: string
  name: string
  /** how many more (positive) or fewer (negative) exist in B than A */
  delta: number
  /** unit price of the piece (catalog or custom) */
  unit: number
}

export type ZoneChangeKind = 'added' | 'removed' | 'renamed' | 'moved' | 'resized'

export interface ZoneChange {
  label: string
  kind: ZoneChangeKind
  /** human summary, e.g. "moved 1.2 m" or "4.0×2.0 → 3.0×1.5" */
  detail: string
}

export interface SnapshotDiff {
  /** pieces present in B but not A, grouped by catalog id (B minus A) */
  added: DiffLine[]
  /** pieces present in A but not B */
  removed: DiffLine[]
  /** pieces that exist in both but changed position (> 5 cm) */
  movedCount: number
  /** largest single move distance in meters */
  maxMove: number
  itemCountDelta: number
  seatDelta: number
  /** estimated-total delta (B minus A), includes install + contingency */
  costDelta: number
  roomChanged: boolean
  /** floor-area delta in m² (B minus A) */
  areaDelta: number
  zoneChanges: ZoneChange[]
}

const MOVE_EPS = 0.051 // just above the 5 cm snap

function groupDelta(
  aItems: LayoutSnapshot['items'],
  bItems: LayoutSnapshot['items'],
): { added: DiffLine[]; removed: DiffLine[]; movedCount: number; maxMove: number } {
  const aMap = new Map(aItems.map((i) => [i.uid, i]))
  const bMap = new Map(bItems.map((i) => [i.uid, i]))

  const addedMap = new Map<string, DiffLine>()
  const removedMap = new Map<string, DiffLine>()
  let movedCount = 0
  let maxMove = 0

  for (const it of bItems) {
    if (aMap.has(it.uid)) continue
    const cat = getItem(it.id)
    if (!cat) continue
    const unit = it.price ?? cat.price
    const line = addedMap.get(it.id) ?? { id: it.id, name: cat.name, delta: 0, unit }
    line.delta += 1
    addedMap.set(it.id, line)
  }
  for (const it of aItems) {
    const b = bMap.get(it.uid)
    if (!b) {
      const cat = getItem(it.id)
      if (!cat) continue
      const unit = it.price ?? cat.price
      const line = removedMap.get(it.id) ?? { id: it.id, name: cat.name, delta: 0, unit }
      line.delta -= 1
      removedMap.set(it.id, line)
      continue
    }
    const dist = Math.hypot(b.x - it.x, b.z - it.z)
    if (dist > MOVE_EPS) {
      movedCount += 1
      maxMove = Math.max(maxMove, dist)
    }
  }

  const sortLines = (m: Map<string, DiffLine>) =>
    [...m.values()].sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta) || x.name.localeCompare(y.name))

  return { added: sortLines(addedMap), removed: sortLines(removedMap), movedCount, maxMove }
}

function zoneChanges(aZones: LayoutSnapshot['zones'] | undefined, bZones: LayoutSnapshot['zones'] | undefined): ZoneChange[] {
  const a = aZones ?? []
  const b = bZones ?? []
  const aMap = new Map(a.map((z) => [z.id, z]))
  const out: ZoneChange[] = []

  for (const zb of b) {
    if (!aMap.has(zb.id)) {
      out.push({ label: zb.label, kind: 'added', detail: `${zb.w.toFixed(1)}×${zb.d.toFixed(1)} m` })
      continue
    }
    const za = aMap.get(zb.id)!
    if (za.label !== zb.label) {
      out.push({ label: zb.label, kind: 'renamed', detail: `was “${za.label}”` })
      continue
    }
    const moved = Math.hypot(zb.x - za.x, zb.z - za.z)
    const resized = Math.abs(zb.w - za.w) > 0.051 || Math.abs(zb.d - za.d) > 0.051
    if (moved > MOVE_EPS && resized) {
      out.push({ label: zb.label, kind: 'resized', detail: `${za.w.toFixed(1)}×${za.d.toFixed(1)} → ${zb.w.toFixed(1)}×${zb.d.toFixed(1)}` })
    } else if (resized) {
      out.push({ label: zb.label, kind: 'resized', detail: `${za.w.toFixed(1)}×${za.d.toFixed(1)} → ${zb.w.toFixed(1)}×${zb.d.toFixed(1)}` })
    } else if (moved > MOVE_EPS) {
      out.push({ label: zb.label, kind: 'moved', detail: `moved ${moved.toFixed(1)} m` })
    }
  }
  const bMap = new Map(b.map((z) => [z.id, z]))
  for (const za of a) {
    if (!bMap.has(za.id)) {
      out.push({ label: za.label, kind: 'removed', detail: `${za.w.toFixed(1)}×${za.d.toFixed(1)} m` })
    }
  }
  return out
}

/** Compare two layout snapshots: B is the "new" state, A the baseline. */
export function diffSnapshots(a: LayoutSnapshot, b: LayoutSnapshot): SnapshotDiff {
  const { added, removed, movedCount, maxMove } = groupDelta(a.items, b.items)

  const seatsOf = (items: LayoutSnapshot['items']) =>
    items.reduce((s, it) => s + (getItem(it.id)?.seats ?? 0), 0)

  const roomChanged = a.room.w !== b.room.w || a.room.d !== b.room.d

  return {
    added,
    removed,
    movedCount,
    maxMove,
    itemCountDelta: b.items.length - a.items.length,
    seatDelta: seatsOf(b.items) - seatsOf(a.items),
    costDelta: computeCost(b.items).total - computeCost(a.items).total,
    roomChanged,
    areaDelta: b.room.w * b.room.d - a.room.w * a.room.d,
    zoneChanges: zoneChanges(a.zones, b.zones),
  }
}
