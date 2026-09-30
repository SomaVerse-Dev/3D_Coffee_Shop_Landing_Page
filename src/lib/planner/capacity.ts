import type { Category, PlacedItem, RoomSpec, TemplateId } from './types'
import { getItem } from './catalog'

export type CapacityStatus = 'ok' | 'tight' | 'over'

export interface VenueMeta {
  label: string
  /** gross m² of floor area per person used for occupant load (IBC-style rule of thumb) */
  factor: number
  /** recommended minimum m² per seat, null = no seating guidance (retail) */
  minM2PerSeat: number | null
}

export const VENUES: Record<TemplateId, VenueMeta> = {
  cafe: { label: 'Café / quick service', factor: 1.4, minM2PerSeat: 1.4 },
  restaurant: { label: 'Full-service restaurant', factor: 1.4, minM2PerSeat: 1.8 },
  coworking: { label: 'Co-working / office', factor: 9.3, minM2PerSeat: 4.6 },
  boutique: { label: 'Boutique retail', factor: 0.6, minM2PerSeat: null },
}

export interface CapacityReport {
  seats: number
  area: number
  m2PerSeat: number | null
  maxSeats: number | null
  occupantLoad: number
  exitCapacity: number
  egressStatus: CapacityStatus
  densityStatus: CapacityStatus
  overall: CapacityStatus
}

/** Two exits by code-of-thumb: 1.2 m main door (240 persons) + 0.9 m rear door (180 persons). */
export const EXIT_CAPACITY = 240 + 180

export function computeCapacity(
  items: PlacedItem[],
  room: RoomSpec,
  venue: TemplateId,
): CapacityReport {
  const meta = VENUES[venue]
  const seats = items.reduce((sum, it) => sum + (getItem(it.id)?.seats ?? 0), 0)
  const area = room.w * room.d
  const m2PerSeat = seats > 0 ? area / seats : null
  const maxSeats = meta.minM2PerSeat ? Math.floor(area / meta.minM2PerSeat) : null
  const occupantLoad = Math.ceil(area / meta.factor)

  let densityStatus: CapacityStatus = 'ok'
  if (m2PerSeat !== null && meta.minM2PerSeat) {
    if (m2PerSeat < meta.minM2PerSeat) densityStatus = 'over'
    else if (m2PerSeat < meta.minM2PerSeat * 1.25) densityStatus = 'tight'
  }
  const egressStatus: CapacityStatus = occupantLoad > EXIT_CAPACITY ? 'over' : 'ok'

  const overall: CapacityStatus =
    densityStatus === 'over' || egressStatus === 'over'
      ? 'over'
      : densityStatus === 'tight'
        ? 'tight'
        : 'ok'

  return {
    seats, area, m2PerSeat, maxSeats, occupantLoad,
    exitCapacity: EXIT_CAPACITY, egressStatus, densityStatus, overall,
  }
}

// ─── Cost estimator ────────────────────────────────────────────────────────

export interface CostLine {
  id: string
  name: string
  qty: number
  unit: number
  total: number
}

export interface CostReport {
  lines: CostLine[]
  subtotal: number
  install: number
  contingency: number
  total: number
}

const INSTALL_RATE = 0.12
const CONTINGENCY_RATE = 0.08

export function computeCost(items: PlacedItem[]): CostReport {
  const map = new Map<string, CostLine & { custom?: boolean }>()
  for (const it of items) {
    const cat = getItem(it.id)
    if (!cat) continue
    const custom = it.price !== undefined && it.price !== cat.price
    const unit = it.price ?? cat.price
    // group by id + unit price so catalog-price and custom-price units stay separate lines
    const key = custom ? `${it.id}::${unit}` : it.id
    const line =
      map.get(key) ?? { id: key, name: cat.name, qty: 0, unit, total: 0, custom }
    line.qty += 1
    line.total = line.qty * line.unit
    map.set(key, line)
  }
  const lines = [...map.values()].sort((a, b) => b.total - a.total)
  const subtotal = lines.reduce((s, l) => s + l.total, 0)
  const install = Math.round(subtotal * INSTALL_RATE)
  const contingency = Math.round(subtotal * CONTINGENCY_RATE)
  return {
    lines, subtotal, install, contingency,
    total: subtotal + install + contingency,
  }
}

export function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

// ─── Category breakdown (cost panel bars) ──────────────────────────────────

export const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  seating: { label: 'Seating', color: '#8C6A4F' },
  tables: { label: 'Tables & desks', color: '#B0946F' },
  counters: { label: 'Counters & service', color: '#5F6B5C' },
  fixtures: { label: 'Fixtures', color: '#A8552F' },
  decor: { label: 'Decor & lighting', color: '#C9A227' },
}

const CATEGORY_ORDER: Category[] = ['seating', 'tables', 'counters', 'fixtures', 'decor']

export interface CategorySlice {
  category: Category
  label: string
  color: string
  total: number
  /** share of subtotal 0..1 */
  pct: number
}

/** Spend grouped by furniture category, biggest first (0-value categories dropped). */
export function computeCategoryBreakdown(items: PlacedItem[]): CategorySlice[] {
  const sub = computeCost(items).subtotal
  if (sub <= 0) return []
  const totals = new Map<Category, number>()
  for (const it of items) {
    const cat = getItem(it.id)
    if (!cat) continue
    const unit = it.price ?? cat.price
    totals.set(cat.category, (totals.get(cat.category) ?? 0) + unit)
  }
  return CATEGORY_ORDER.filter((c) => (totals.get(c) ?? 0) > 0).map((c) => ({
    category: c,
    label: CATEGORY_META[c].label,
    color: CATEGORY_META[c].color,
    total: totals.get(c) ?? 0,
    pct: (totals.get(c) ?? 0) / sub,
  })).sort((a, b) => b.total - a.total)
}

/** Where the spend sits relative to the user's budget. */
export type BudgetStatus = 'under' | 'close' | 'over'

export function budgetStatusOf(total: number, budget: number): { status: BudgetStatus; pct: number } {
  const pct = budget > 0 ? total / budget : 0
  const status: BudgetStatus = pct > 1 ? 'over' : pct >= 0.9 ? 'close' : 'under'
  return { status, pct }
}

export const STATUS_META: Record<CapacityStatus, { label: string; className: string; dot: string }> = {
  ok: { label: 'Comfortable', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  tight: { label: 'Getting tight', className: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  over: { label: 'Over capacity', className: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
}
