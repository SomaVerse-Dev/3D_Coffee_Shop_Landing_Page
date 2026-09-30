'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, CheckCircle2, CircleDashed, Gauge, Ruler, ShieldCheck,
  Target, TrendingUp, TriangleAlert, XCircle, Users, Footprints,
} from 'lucide-react'
import { usePlanner } from '@/lib/planner/store'
import {
  budgetStatusOf, computeCapacity, computeCost, computeInsights, fmtMoney, VENUES, EXIT_CAPACITY,
} from '@/lib/planner/capacity'
import { dischargeBlockages, DISCHARGE_DEPTH_M } from '@/lib/planner/egress'
import type { TemplateId } from '@/lib/planner/types'
import { cn } from '@/lib/utils'

// ─── animated number ticker ────────────────────────────────────────────────

function useCountUp(target: number, duration = 550): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    // sub-cent drift: nothing worth animating, keep the last rendered value
    if (Math.abs(from - target) < 0.005) {
      fromRef.current = target
      return
    }
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = from + (target - from) * eased
      setValue(v)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

/** Money figure that ticks up/down when the underlying value changes. */
function TickerMoney({ value, className }: { value: number; className?: string }) {
  const v = useCountUp(value)
  return <span className={cn('tabular-nums', className)}>{fmtMoney(Math.round(v))}</span>
}

// ─── Layout insights ───────────────────────────────────────────────────────

const DONUT_R = 21
const DONUT_C = 2 * Math.PI * DONUT_R

export function InsightsCard() {
  const items = usePlanner((s) => s.items)
  const room = usePlanner((s) => s.room)
  const brand = usePlanner((s) => s.brandColor)

  const ins = useMemo(() => computeInsights(items, room), [items, room])
  const pct = Math.min(1, ins.occupancy)
  const seats = ins.seatMix.reduce((a, r) => a + r.seats, 0)
  const maxMix = ins.seatMix[0]?.seats ?? 1

  return (
    <section aria-label="Layout insights" className="rounded-xl border border-stone-200/80 bg-white/80 p-3.5 shadow-xs">
      <p className="font-display flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        <TrendingUp className="h-3.5 w-3.5" style={{ color: brand }} />
        Layout insights
      </p>

      <div className="mt-3 flex items-center gap-3.5">
        {/* occupancy donut */}
        <div className="relative h-[58px] w-[58px] shrink-0" role="img" aria-label={`Floor occupancy ${Math.round(ins.occupancy * 100)} percent`}>
          <svg viewBox="0 0 52 52" className="h-full w-full -rotate-90">
            <circle cx="26" cy="26" r={DONUT_R} fill="none" stroke="#EDE7DA" strokeWidth="5.5" />
            <circle
              cx="26" cy="26" r={DONUT_R} fill="none"
              stroke={brand}
              strokeWidth="5.5" strokeLinecap="round"
              strokeDasharray={DONUT_C}
              strokeDashoffset={DONUT_C * (1 - pct)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-[11px] font-bold tabular-nums text-charcoal">
            {Math.round(ins.occupancy * 100)}%
          </span>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-1.5">
          <div>
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">
              <Users className="h-3 w-3" aria-hidden /> Cost / seat
            </p>
            <p className="font-display text-[15px] font-bold leading-tight text-charcoal">
              {ins.costPerSeat !== null ? <TickerMoney value={ins.costPerSeat} /> : <span className="text-stone-300">—</span>}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">
              <Gauge className="h-3 w-3" aria-hidden /> Spend / m²
            </p>
            <p className="font-display text-[15px] font-bold leading-tight text-charcoal">
              {items.length > 0 ? <TickerMoney value={ins.costPerM2} /> : <span className="text-stone-300">—</span>}
            </p>
          </div>
          <div className="col-span-2">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">
              <Footprints className="h-3 w-3" aria-hidden /> Furniture footprint
            </p>
            <p className="text-[11px] font-medium text-stone-600">
              <span className="font-semibold tabular-nums text-charcoal">{ins.footprintM2.toFixed(1)} m²</span>
              {' '}of {room.w * room.d > 0 ? (room.w * room.d).toFixed(0) : '0'} m² floor · {seats} {seats === 1 ? 'seat' : 'seats'}
            </p>
          </div>
        </div>
      </div>

      {/* seat mix */}
      {ins.seatMix.length > 0 && (
        <div className="mt-3 border-t border-stone-200/70 pt-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">Where the seats sit</p>
          <ul className="mt-1.5 space-y-1">
            {ins.seatMix.map((row) => (
              <li key={row.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-24 min-w-0 shrink-0 truncate font-medium text-stone-600">{row.name}</span>
                <span className="h-1.5 min-w-1 flex-1 overflow-hidden rounded-full bg-stone-100 shadow-[inset_0_1px_1px_rgba(46,43,38,0.06)]">
                  <span
                    className="block h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${(row.seats / maxMix) * 100}%`, backgroundColor: brand, opacity: 0.75 }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-charcoal">{row.seats}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// ─── Readiness checks ──────────────────────────────────────────────────────

type CheckState = 'pass' | 'warn' | 'fail' | 'muted'

const CHECK_META: Record<CheckState, { icon: React.ReactNode; ring: string; chip: string }> = {
  pass: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    ring: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  warn: {
    icon: <TriangleAlert className="h-3.5 w-3.5" />,
    ring: 'bg-amber-50 text-amber-600 border-amber-200',
    chip: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  fail: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    ring: 'bg-red-50 text-red-500 border-red-200',
    chip: 'bg-red-100 text-red-700 border-red-200',
  },
  muted: {
    icon: <CircleDashed className="h-3.5 w-3.5" />,
    ring: 'bg-stone-50 text-stone-400 border-stone-200',
    chip: 'bg-stone-100 text-stone-500 border-stone-200',
  },
}

function CheckRow({
  state, label, value, hint, children,
}: {
  state: CheckState
  label: string
  value: string
  hint?: string
  children?: React.ReactNode
}) {
  const meta = CHECK_META[state]
  return (
    <li className="rounded-lg px-1 py-1.5 transition-colors hover:bg-white/70">
      <div className="flex items-center gap-2.5">
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border', meta.ring)} aria-hidden>
          {meta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-semibold leading-tight text-charcoal">{label}</p>
          <p className="truncate text-[10.5px] leading-tight text-stone-400">{hint ?? value}</p>
        </div>
        <span className={cn('shrink-0 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide', meta.chip)}>
          {value}
        </span>
      </div>
      {children}
    </li>
  )
}

export function ReadinessCard() {
  const items = usePlanner((s) => s.items)
  const room = usePlanner((s) => s.room)
  const templateId = usePlanner((s) => s.templateId)
  const brand = usePlanner((s) => s.brandColor)
  const budget = usePlanner((s) => s.budget)
  const select = usePlanner((s) => s.select)
  const setCostOpen = usePlanner((s) => s.setCostOpen)

  const venue: TemplateId = templateId === 'custom' ? 'cafe' : templateId
  const cap = useMemo(() => computeCapacity(items, room, venue), [items, room, venue])
  const blockers = useMemo(() => dischargeBlockages(items, room), [items, room])
  const costTotal = useMemo(() => computeCost(items).total, [items])

  const egressState: CheckState = cap.egressStatus === 'over' ? 'fail' : 'pass'
  const meta = VENUES[venue]
  let densityState: CheckState = 'muted'
  if (meta.minM2PerSeat && cap.seats > 0 && cap.m2PerSeat !== null) {
    densityState =
      cap.m2PerSeat < meta.minM2PerSeat ? 'fail'
        : cap.m2PerSeat < meta.minM2PerSeat * 1.25 ? 'warn'
          : 'pass'
  }
  const clearanceState: CheckState = blockers.length === 0 ? 'pass' : 'fail'

  const budgetState = budget !== null ? budgetStatusOf(costTotal, budget) : null
  const budgetCheck: CheckState = budget === null || !budgetState ? 'muted' : budgetState.status === 'over' ? 'fail' : budgetState.status === 'close' ? 'warn' : 'pass'

  const rows: Array<{ key: string; state: CheckState }> = [
    { key: 'egress', state: egressState },
    { key: 'density', state: densityState },
    { key: 'clearance', state: clearanceState },
    { key: 'budget', state: budgetCheck },
  ]
  const passed = rows.filter((r) => r.state === 'pass').length
  const overall: 'ok' | 'warn' | 'fail' = rows.some((r) => r.state === 'fail') ? 'fail' : rows.some((r) => r.state === 'warn') ? 'warn' : 'ok'

  function locate(uid: string) {
    select(uid)
    setCostOpen(false)
  }

  return (
    <section aria-label="Readiness checks" className="rounded-xl border border-stone-200/80 bg-white/80 p-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: brand }} />
          Readiness checks
        </p>
        <span className="text-[10px] font-semibold tabular-nums text-stone-400">
          {passed}/{rows.length} passed
        </span>
      </div>

      <ul className="mt-2 space-y-0.5">
        <CheckRow
          state={egressState}
          label="Exit capacity"
          value={egressState === 'pass' ? 'OK' : 'Over'}
          hint={`Occupant load ${cap.occupantLoad} of ${EXIT_CAPACITY} via 2 exits`}
        />
        <CheckRow
          state={densityState}
          label="Seat density"
          value={densityState === 'muted' ? 'N/A' : densityState === 'pass' ? 'OK' : densityState === 'warn' ? 'Tight' : 'Dense'}
          hint={
            cap.m2PerSeat !== null
              ? `${cap.m2PerSeat.toFixed(1)} m² per seat · ${meta.minM2PerSeat ? `guide ≥ ${meta.minM2PerSeat}` : 'no guide'}`
              : 'Place seats to measure density'
          }
        />
        <CheckRow
          state={clearanceState}
          label="Exit access"
          value={clearanceState === 'pass' ? 'Clear' : `${blockers.length} blocking`}
          hint={
            blockers.length === 0
              ? `Both exit landings keep the code-style ${Math.round(DISCHARGE_DEPTH_M * 100)} cm clear zone`
              : 'Clear the landing in front of the exit doors'
          }
        >
          {blockers.length > 0 && (
            <ul className="mb-1 ml-[38px] mt-1 space-y-0.5">
              {blockers.slice(0, 3).map((b) => (
                <li key={b.uid}>
                  <button
                    onClick={() => locate(b.uid)}
                    className="group flex w-full items-center gap-1.5 rounded-md border border-red-200/70 bg-red-50/80 px-2 py-1 text-left text-[10.5px] font-medium text-red-900 transition-colors hover:border-red-300 hover:bg-red-100/80"
                    title="Click to locate in the room"
                  >
                    <Ruler className="h-3 w-3 shrink-0 text-red-500" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{b.name}</span>
                    <span className="shrink-0 tabular-nums text-red-700">{b.door} exit</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-red-400 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CheckRow>
        <CheckRow
          state={budgetCheck}
          label="Budget guardrail"
          value={budget === null ? 'Not set' : budgetCheck === 'pass' ? 'Under' : budgetCheck === 'warn' ? 'Close' : 'Over'}
          hint={
            budget === null
              ? 'Set one in the budget card above'
              : budgetState!.status === 'over'
                ? 'Estimate exceeds the budget'
                : 'Estimate within the budget'
          }
        />
      </ul>

      {(overall === 'fail' || overall === 'warn') && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-stone-100/80 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-stone-500">
          <Target className="mt-px h-3 w-3 shrink-0 text-stone-400" aria-hidden />
          {overall === 'fail'
            ? 'Fix the flagged checks before presenting this plan — codes officials look at exit access first.'
            : 'Layout works, but a couple of numbers are close to their limits.'}
        </p>
      )}
    </section>
  )
}
