'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Users, Ruler, DoorOpen, TriangleAlert } from 'lucide-react'
import { usePlanner } from '@/lib/planner/store'
import { computeCapacity, VENUES, STATUS_META, type CapacityStatus } from '@/lib/planner/capacity'
import { dischargeBlockages } from '@/lib/planner/egress'
import { cn } from '@/lib/utils'

function StatusPill({ status }: { status: CapacityStatus }) {
  const m = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-xs backdrop-blur-sm',
        m.className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

export function CapacityMeter() {
  const items = usePlanner((s) => s.items)
  const room = usePlanner((s) => s.room)
  const templateId = usePlanner((s) => s.templateId)
  const setCostOpen = usePlanner((s) => s.setCostOpen)
  const venue = templateId === 'custom' ? 'cafe' : templateId
  const cap = computeCapacity(items, room, venue)
  const blocked = dischargeBlockages(items, room)
  const meta = VENUES[venue]
  const pct = cap.maxSeats ? Math.min(100, Math.round((cap.seats / cap.maxSeats) * 100)) : 0
  const barColor = cap.overall === 'over' ? 'bg-red-500' : cap.overall === 'tight' ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="card-glass pointer-events-auto w-[236px] rounded-xl p-3.5">
      <div className="flex items-center justify-between">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Capacity
        </span>
        <StatusPill status={cap.overall} />
      </div>

      <div className="mt-2 flex items-end gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={cap.seats}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="font-display text-3xl font-bold leading-none tabular-nums tracking-tight text-charcoal"
          >
            {cap.seats}
          </motion.span>
        </AnimatePresence>
        <span className="pb-0.5 text-xs text-stone-500">
          {cap.seats === 1 ? 'seat' : 'seats'} · {meta.label}
        </span>
      </div>

      {cap.maxSeats !== null && (
        <div className="mt-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/90 shadow-[inset_0_1px_1.5px_rgba(46,43,38,0.1)]">
            <motion.div
              className={cn('h-full rounded-full', barColor)}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10.5px] font-medium tabular-nums text-stone-500">
            <span>{cap.m2PerSeat ? `${cap.m2PerSeat.toFixed(1)} m²/seat` : '—'}</span>
            <span>max {cap.maxSeats} seats</span>
          </div>
        </div>
      )}
      {cap.maxSeats === null && (
        <div className="mt-2.5 text-[10.5px] tabular-nums text-stone-500">
          Retail layout — occupancy driven by {meta.factor} m²/person
        </div>
      )}

      <AnimatePresence initial={false}>
        {blocked.length > 0 && (
          <motion.button
            key="exit-blocked"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={() => setCostOpen(true)}
            title="Open the cost panel for details"
            className="mt-2 flex w-full items-center gap-1.5 overflow-hidden rounded-lg border border-red-300/80 bg-red-100/90 px-2 py-1 text-left text-[10.5px] font-semibold text-red-800 shadow-xs backdrop-blur-sm transition-colors hover:bg-red-100"
          >
            <TriangleAlert className="h-3 w-3 shrink-0 text-red-600" aria-hidden />
            Exit access blocked — {blocked.length} {blocked.length === 1 ? 'item' : 'items'} in the landing
          </motion.button>
        )}
      </AnimatePresence>

      <div className="mt-2.5 flex items-center gap-3 border-t border-stone-200/80 pt-2.5 text-[10.5px] font-medium tabular-nums text-stone-500">
        <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3 text-stone-400" />{cap.area.toFixed(0)} m²</span>
        <span className="inline-flex items-center gap-1">
          <DoorOpen className="h-3 w-3 text-stone-400" />egress {cap.exitCapacity}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3 text-stone-400" />load {cap.occupantLoad}
        </span>
      </div>
    </div>
  )
}
