'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowRight, Diff, Grid2x2, History, Layers, Minus, Move, Plus, Ruler,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { usePlanner, type LayoutSnapshot } from '@/lib/planner/store'
import { diffSnapshots } from '@/lib/planner/diff'
import { computeCost, fmtMoney } from '@/lib/planner/capacity'
import { getItem } from '@/lib/planner/catalog'
import PlanSVG from './PlanSVG'
import { cn } from '@/lib/utils'

const NOW = '__now__'

/** tiny stat chip used in the caption of each plan frame */
function PlanChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-full bg-stone-100/90 px-2 py-0.5 text-[9.5px] font-semibold tabular-nums text-stone-500">
      {label}
      <span className="text-[10.5px] text-charcoal">{value}</span>
    </span>
  )
}

function DeltaChip({ value, unit, invert = false }: { value: number; unit: string; invert?: boolean }) {
  const flat = value === 0
  // invert: for costs a NEGATIVE delta is "good" (green) — default treats positive as green
  const good = invert ? value < 0 : value > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10.5px] font-semibold tabular-nums',
        flat
          ? 'border-stone-200 bg-stone-50 text-stone-400'
          : good
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700',
      )}
    >
      {value > 0 ? <Plus className="h-3 w-3" aria-hidden /> : value < 0 ? <Minus className="h-3 w-3" aria-hidden /> : null}
      {flat ? '±0' : `${value > 0 ? '+' : '−'}${Math.abs(value)}`}
      &nbsp;{unit}
    </span>
  )
}

/** one framed plan render (checkpoint or current) with a caption header */
function PlanFrame({
  snap, title, subtitle, isNow,
}: {
  snap: LayoutSnapshot
  title: string
  subtitle: string
  isNow?: boolean
}) {
  const seats = snap.items.reduce((s, it) => s + (getItem(it.id)?.seats ?? 0), 0)
  const cost = computeCost(snap.items).total
  return (
    <figure className="min-w-0 flex-1">
      <figcaption className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full', isNow ? 'bg-emerald-500' : 'bg-stone-400')}
            aria-hidden
          />
          <span className="truncate text-[11px] font-bold text-charcoal">{title}</span>
        </span>
        <span className="shrink-0 text-[9.5px] tabular-nums text-stone-400">{subtitle}</span>
      </figcaption>
      <div className="mt-1.5 overflow-hidden rounded-lg border border-stone-300/70 bg-white shadow-xs">
        <PlanSVG
          room={snap.room}
          items={snap.items}
          brand={snap.brandColor}
          zones={snap.zones}
          showZones
          className="block h-auto w-full"
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <PlanChip label="pieces" value={String(snap.items.length)} />
        <PlanChip label="seats" value={String(seats)} />
        <PlanChip label="floor" value={`${(snap.room.w * snap.room.d).toFixed(0)} m²`} />
        <PlanChip label="est." value={fmtMoney(cost)} />
      </div>
    </figure>
  )
}

/**
 * Compare two checkpoints (or the live layout) side by side: plan renders,
 * per-stat deltas and a grouped list of added / removed / moved pieces.
 */
export default function HistoryDiffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const checkpoints = usePlanner((s) => s.checkpoints)
  const items = usePlanner((s) => s.items)
  const room = usePlanner((s) => s.room)
  const brandColor = usePlanner((s) => s.brandColor)
  const projectName = usePlanner((s) => s.projectName)
  const templateId = usePlanner((s) => s.templateId)
  const zones = usePlanner((s) => s.zones)

  const [pickedBase, setPickedBase] = useState<string | null>(null)
  const [pickedTarget, setPickedTarget] = useState<string | null>(null)

  // effective selections: default to newest checkpoint vs now, falling back
  // when a picked checkpoint has been deleted
  const baseId = pickedBase && (pickedBase === NOW || checkpoints.some((c) => c.id === pickedBase))
    ? pickedBase
    : checkpoints[0]?.id ?? NOW
  const targetId = pickedTarget && (pickedTarget === NOW || checkpoints.some((c) => c.id === pickedTarget))
    ? pickedTarget
    : NOW

  const liveSnap: LayoutSnapshot = useMemo(
    () => ({
      room: { ...room },
      items: items.map((i) => ({ ...i })),
      brandColor,
      projectName,
      templateId,
      zones: zones.map((z) => ({ ...z })),
    }),
    [room, items, brandColor, projectName, templateId, zones],
  )

  const snapOf = (id: string): LayoutSnapshot | null => {
    if (id === NOW) return liveSnap
    return checkpoints.find((c) => c.id === id)?.snap ?? null
  }

  const snapA = snapOf(baseId)
  const snapB = snapOf(targetId)
  const diff = useMemo(
    () => (snapA && snapB ? diffSnapshots(snapA, snapB) : null),
    [snapA, snapB],
  )

  const titleOf = (id: string) => {
    if (id === NOW) return projectName || 'Current layout'
    return checkpoints.find((c) => c.id === id)?.label ?? 'Checkpoint'
  }
  const timeOf = (id: string) => {
    if (id === NOW) return 'now'
    const cp = checkpoints.find((c) => c.id === id)
    return cp ? formatDistanceToNow(new Date(cp.ts), { addSuffix: true }) : ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-stone-200/80 bg-warmwhite/80 px-5 py-4">
          <DialogTitle className="font-display flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-charcoal">
            <Diff className="h-4 w-4 text-stone-400" />
            Compare layouts
          </DialogTitle>
          <DialogDescription className="mt-1 text-[11.5px] leading-snug text-stone-500">
            Pick two points in time — pieces are matched by identity, so moves and renames are tracked, not double-counted.
          </DialogDescription>

          {/* pickers */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={baseId} onValueChange={setPickedBase}>
              <SelectTrigger className="h-8 w-[220px] bg-white text-[11px] shadow-xs" aria-label="Baseline layout">
                <History className="h-3.5 w-3.5 text-stone-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOW} className="text-[11px]">Current layout (now)</SelectItem>
                {checkpoints.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-[11px]">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ArrowRight className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
            <Select value={targetId} onValueChange={setPickedTarget}>
              <SelectTrigger className="h-8 w-[220px] bg-white text-[11px] shadow-xs" aria-label="Compare against">
                <Layers className="h-3.5 w-3.5 text-stone-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOW} className="text-[11px]">Current layout (now)</SelectItem>
                {checkpoints.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-[11px]">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {!snapA || !snapB || !diff ? (
          <div className="px-5 py-10 text-center">
            <History className="mx-auto h-6 w-6 text-stone-300" />
            <p className="mt-2 text-xs font-medium text-stone-500">Nothing to compare yet</p>
            <p className="mt-0.5 text-[11px] text-stone-400">
              Pin a checkpoint in the History popover, then come back to diff it against the live layout.
            </p>
          </div>
        ) : (
          <div className="thin-scroll max-h-[62vh] overflow-y-auto px-5 py-4">
            {/* side-by-side plans */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <PlanFrame
                snap={snapA}
                title={titleOf(baseId)}
                subtitle={timeOf(baseId)}
                isNow={baseId === NOW}
              />
              <div className="hidden items-center justify-center sm:flex" aria-hidden>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 bg-white shadow-xs">
                  <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
                </span>
              </div>
              <PlanFrame
                snap={snapB}
                title={titleOf(targetId)}
                subtitle={timeOf(targetId)}
                isNow={targetId === NOW}
              />
            </div>

            {/* stat deltas */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Summary of changes">
              <DeltaChip value={diff.itemCountDelta} unit="pieces" />
              <DeltaChip value={diff.seatDelta} unit="seats" />
              <DeltaChip value={Math.round(diff.costDelta)} unit="est. cost" invert />
              {diff.roomChanged && <DeltaChip value={Math.round(diff.areaDelta)} unit="m² floor" />}
              {diff.movedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-[10.5px] font-semibold tabular-nums text-stone-600">
                  <Move className="h-3 w-3" aria-hidden />
                  {diff.movedCount} moved{diff.maxMove > 0 ? ` · up to ${diff.maxMove.toFixed(1)} m` : ''}
                </span>
              )}
            </div>

            {/* grouped add / remove lists */}
            {(diff.added.length > 0 || diff.removed.length > 0) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {diff.added.length > 0 && (
                  <section aria-label="Pieces added" className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3">
                    <p className="font-display flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                      <Plus className="h-3 w-3" />
                      Added in the newer layout
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      {diff.added.map((l) => (
                        <li key={l.id} className="flex items-baseline justify-between gap-2 text-[11px]">
                          <span className="min-w-0 flex-1 truncate font-medium text-charcoal">
                            <span className="mr-1.5 font-bold tabular-nums text-emerald-700">+{l.delta}</span>
                            {l.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-stone-400">{fmtMoney(l.unit)} ea.</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {diff.removed.length > 0 && (
                  <section aria-label="Pieces removed" className="rounded-xl border border-red-200/70 bg-red-50/40 p-3">
                    <p className="font-display flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-800">
                      <Minus className="h-3 w-3" />
                      Gone from the newer layout
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      {diff.removed.map((l) => (
                        <li key={l.id} className="flex items-baseline justify-between gap-2 text-[11px]">
                          <span className="min-w-0 flex-1 truncate font-medium text-charcoal">
                            <span className="mr-1.5 font-bold tabular-nums text-red-600">{l.delta}</span>
                            {l.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-stone-400">{fmtMoney(l.unit)} ea.</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {/* zone changes */}
            {diff.zoneChanges.length > 0 && (
              <section aria-label="Zone changes" className="mt-3 rounded-xl border border-stone-200/80 bg-white/70 p-3">
                <p className="font-display flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  <Grid2x2 className="h-3 w-3 text-stone-400" />
                  Zones
                </p>
                <ul className="mt-1.5 space-y-1">
                  {diff.zoneChanges.map((zc, i) => (
                    <li key={`${zc.label}-${i}`} className="flex items-center gap-2 text-[11px]">
                      <span
                        className={cn(
                          'inline-flex w-[64px] shrink-0 justify-center rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide',
                          zc.kind === 'added' ? 'bg-emerald-100 text-emerald-700'
                            : zc.kind === 'removed' ? 'bg-red-100 text-red-700'
                              : 'bg-stone-100 text-stone-500',
                        )}
                      >
                        {zc.kind}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-charcoal">{zc.label}</span>
                      <span className="shrink-0 tabular-nums text-stone-400">{zc.detail}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* no-change state */}
            {diff.added.length === 0 && diff.removed.length === 0 && diff.movedCount === 0 && diff.zoneChanges.length === 0 && !diff.roomChanged && (
              <p className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-xs text-stone-400">
                These two layouts are identical — every piece sits in the same spot.
              </p>
            )}

            <p className="mt-3 flex items-center gap-1.5 text-[10px] leading-snug text-stone-400">
              <Ruler className="h-3 w-3 shrink-0" />
              Cost deltas include delivery and contingency. Restoring a checkpoint is one click in the History popover.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
