'use client'

import { useEffect, useRef, useState } from 'react'
import { Grid2x2Check, Hand, Move as MoveIcon, PenLine, Plus, SquareDashedMousePointer, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { usePlanner } from '@/lib/planner/store'
import type { ZoneDef, ZoneKind } from '@/lib/planner/types'
import { ZONE_KINDS, ZONE_META } from '@/lib/planner/zones'
import PlanSVG from './PlanSVG'
import { cn } from '@/lib/utils'

/** kind → readable label for the select */
function kindLabel(k: ZoneKind): string {
  return k.charAt(0).toUpperCase() + k.slice(1)
}

/** 10 cm snap used by all zone gestures */
const ZSNAP = 0.1
const ZONE_MIN = 0.6
/** corner handle size in meters (≈16 px on a 720 px-wide plan) */
const HANDLE_M = 0.26

type Corner = 'nw' | 'ne' | 'sw' | 'se'
type Gesture =
  | { type: 'move'; id: string; offX: number; offZ: number }
  | { type: 'resize'; id: string; corner: Corner; ax: number; az: number }
  | { type: 'draw'; x1: number; z1: number }

interface ZoneEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Full-featured zone editor: drag to move, corner handles to resize,
 * a rubber-band "draw" mode, plus label / kind / precise-coordinate
 * editing in the side list. Everything edits the live store, so the
 * plan, 3D washes, minimap and exports update while you work.
 */
export default function ZoneEditor({ open, onOpenChange }: ZoneEditorProps) {
  const room = usePlanner((s) => s.room)
  const zones = usePlanner((s) => s.zones)
  const items = usePlanner((s) => s.items)
  const brand = usePlanner((s) => s.brandColor)
  const showZones = usePlanner((s) => s.showZones)
  const toggleZones = usePlanner((s) => s.toggleZones)
  const addZone = usePlanner((s) => s.addZone)
  const updateZone = usePlanner((s) => s.updateZone)
  const removeZone = usePlanner((s) => s.removeZone)
  const clearZones = usePlanner((s) => s.clearZones)
  const beginZoneEdit = usePlanner((s) => s.beginZoneEdit)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawMode, setDrawMode] = useState(false)
  const [lastKind, setLastKind] = useState<ZoneKind>('seating')
  const [rubber, setRubber] = useState<{ x1: number; z1: number; x2: number; z2: number } | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const overlayRef = useRef<SVGSVGElement | null>(null)

  /** commit a renamed zone (trimmed, 40 chars max, no-op when unchanged) */
  const commitZoneLabel = (zn: ZoneDef, raw: string) => {
    const label = raw.trim().slice(0, 40)
    if (label && label !== zn.label) updateZone(zn.id, { label })
  }

  // opening the editor implies seeing the washes live
  useEffect(() => {
    if (open && !showZones) toggleZones()
  }, [open])

  // arrow keys nudge the selected zone (ignore when typing in an input)
  useEffect(() => {
    if (!open || !selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (!e.key.startsWith('Arrow')) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      const zn = zones.find((z) => z.id === selectedId)
      if (!zn) return
      e.preventDefault()
      const step = e.shiftKey ? 0.5 : 0.1
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dz = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      updateZone(selectedId, { x: Math.round((zn.x + dx) * 10) / 10, z: Math.round((zn.z + dz) * 10) / 10 })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, selectedId, zones, updateZone])

  const pad = 0.55
  const vb = `${-room.w / 2 - pad} ${-room.d / 2 - pad} ${room.w + pad * 2} ${room.d + pad * 2}`
  const snap10 = (v: number) => Math.round(v / ZSNAP) * ZSNAP

  /** client px → room meters (via the overlay's on-screen box) */
  const toMeters = (clientX: number, clientY: number): { x: number; z: number } => {
    const el = overlayRef.current
    if (!el) return { x: 0, z: 0 }
    const r = el.getBoundingClientRect()
    const scale = r.width / (room.w + pad * 2)
    return {
      x: (clientX - r.left) / scale - room.w / 2 - pad,
      z: (clientY - r.top) / scale - room.d / 2 - pad,
    }
  }

  /** build a resize patch anchored at the corner opposite `corner`, clamped to the room */
  const resizePatch = (corner: Corner, ax: number, az: number, px: number, pz: number) => {
    const hx = -room.w / 2
    const hz = -room.d / 2
    let x1 = Math.max(hx, Math.min(room.w / 2, snap10(Math.min(ax, px))))
    let x2 = Math.max(hx, Math.min(room.w / 2, snap10(Math.max(ax, px))))
    let z1 = Math.max(hz, Math.min(room.d / 2, snap10(Math.min(az, pz))))
    let z2 = Math.max(hz, Math.min(room.d / 2, snap10(Math.max(az, pz))))
    if (x2 - x1 < ZONE_MIN) {
      if (px < ax) x1 = Math.max(hx, x2 - ZONE_MIN)
      else x2 = Math.min(room.w / 2, x1 + ZONE_MIN)
    }
    if (z2 - z1 < ZONE_MIN) {
      if (pz < az) z1 = Math.max(hz, z2 - ZONE_MIN)
      else z2 = Math.min(room.d / 2, z1 + ZONE_MIN)
    }
    return { x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: x2 - x1, d: z2 - z1 }
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!open) return
    const pt = toMeters(e.clientX, e.clientY)
    const target = e.target as SVGElement
    const zoneEl = target.closest('[data-zone-id]') as SVGElement | null
    const handleEl = target.closest('[data-handle]') as SVGElement | null

    if (handleEl && zoneEl) {
      const id = zoneEl.getAttribute('data-zone-id')!
      const zn = zones.find((z) => z.id === id)
      if (!zn) return
      const corner = handleEl.getAttribute('data-handle') as Corner
      // anchor = the corner diagonally opposite the grabbed handle
      const ax = corner.includes('w') ? zn.x + zn.w / 2 : zn.x - zn.w / 2
      const az = corner.includes('n') ? zn.z + zn.d / 2 : zn.z - zn.d / 2
      beginZoneEdit()
      gesture.current = { type: 'resize', id, corner, ax, az }
      setSelectedId(id)
    } else if (zoneEl && !drawMode) {
      const id = zoneEl.getAttribute('data-zone-id')!
      const zn = zones.find((z) => z.id === id)
      if (!zn) return
      beginZoneEdit()
      gesture.current = { type: 'move', id, offX: pt.x - zn.x, offZ: pt.z - zn.z }
      setSelectedId(id)
    } else if (drawMode) {
      const sx = snap10(pt.x)
      const sz = snap10(pt.z)
      gesture.current = { type: 'draw', x1: sx, z1: sz }
      setRubber({ x1: sx, z1: sz, x2: sx, z2: sz })
    } else {
      setSelectedId(null)
      return
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // pointer already released (fast taps) or synthetic event — gestures still work
      // because move/up listeners live on the overlay itself
    }
    e.preventDefault()
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current
    if (!g) return
    const pt = toMeters(e.clientX, e.clientY)
    if (g.type === 'move') {
      updateZone(g.id, { x: snap10(pt.x - g.offX), z: snap10(pt.z - g.offZ) }, { silent: true })
    } else if (g.type === 'resize') {
      updateZone(g.id, resizePatch(g.corner, g.ax, g.az, pt.x, pt.z), { silent: true })
    } else {
      setRubber({ x1: g.x1, z1: g.z1, x2: pt.x, z2: pt.z })
    }
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current
    gesture.current = null
    if (g?.type === 'draw') {
      // final rect comes from the up-event position — never from lagging state
      const pt = toMeters(e.clientX, e.clientY)
      const x1 = Math.min(g.x1, snap10(pt.x))
      const x2 = Math.max(g.x1, snap10(pt.x))
      const z1 = Math.min(g.z1, snap10(pt.z))
      const z2 = Math.max(g.z1, snap10(pt.z))
      if (x2 - x1 >= ZONE_MIN && z2 - z1 >= ZONE_MIN) {
        addZone({
          x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: x2 - x1, d: z2 - z1,
          label: `Zone ${zones.length + 1}`, kind: lastKind,
        })
      }
      setRubber(null)
    }
  }

  const corners: Corner[] = ['nw', 'ne', 'sw', 'se']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-stone-200/80 bg-warmwhite/80 px-5 py-4">
          <DialogTitle className="font-display flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-charcoal">
            <Grid2x2Check className="h-4 w-4 text-stone-400" />
            Zone editor
            <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums tracking-normal text-stone-500">
              {zones.length} {zones.length === 1 ? 'zone' : 'zones'}
            </span>
          </DialogTitle>
          <DialogDescription className="mt-1 text-[11.5px] leading-snug text-stone-500">
            Drag zones to move them, pull a corner to resize, or draw new ones. Edits appear live in the plan,
            3D washes, minimap and every export. <kbd className="rounded bg-stone-100 px-1 font-sans text-[10px]">Ctrl+Z</kbd> undoes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[72vh] grid-cols-1 overflow-y-auto lg:max-h-none lg:grid-cols-[minmax(0,1fr)_288px] lg:overflow-hidden">
          {/* ── interactive plan ─────────────────────────────────── */}
          <div className="relative border-b border-stone-200/80 bg-white lg:border-b-0 lg:border-r">
            <div className={cn('blueprint-grid relative select-none', drawMode && 'cursor-crosshair')}>
              <PlanSVG
                room={room}
                items={items}
                brand={brand}
                zones={zones}
                showZones={showZones}
                className="block h-auto w-full"
              />
              {/* editing overlay — same viewBox, sits exactly over the plan */}
              <svg
                ref={overlayRef}
                viewBox={vb}
                className="absolute inset-0 h-full w-full"
                style={{ touchAction: 'none' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                aria-label="Zone editing canvas. Drag zones to move them, drag a corner handle to resize."
              >
                {/* zone hit areas + selection outlines + handles */}
                {zones.map((zn) => {
                  const color = ZONE_META[zn.kind].color
                  const isSel = zn.id === selectedId
                  return (
                    <g key={zn.id} data-zone-id={zn.id}>
                      <rect
                        x={zn.x - zn.w / 2} y={zn.z - zn.d / 2} width={zn.w} height={zn.d} rx={0.1}
                        fill={color} fillOpacity={isSel ? 0.1 : 0}
                        stroke={isSel ? color : 'transparent'}
                        strokeWidth={0.05}
                        strokeDasharray="0.26 0.18"
                        className="cursor-move"
                      />
                      {isSel && (
                        <rect
                          x={zn.x - zn.w / 2} y={zn.z - zn.d / 2} width={zn.w} height={zn.d} rx={0.1}
                          fill="none" stroke="#2E2B26" strokeWidth={0.035} strokeOpacity={0.7}
                          strokeDasharray="0.2 0.14" pointerEvents="none"
                        />
                      )}
                      {isSel && corners.map((c) => {
                        const hx = c.includes('w') ? zn.x - zn.w / 2 : zn.x + zn.w / 2
                        const hz = c.includes('n') ? zn.z - zn.d / 2 : zn.z + zn.d / 2
                        return (
                          <rect
                            key={c}
                            data-handle={c}
                            x={hx - HANDLE_M / 2} y={hz - HANDLE_M / 2} width={HANDLE_M} height={HANDLE_M} rx={0.05}
                            fill="#FDFAF3" stroke="#2E2B26" strokeWidth={0.045}
                            className={cn(
                              (c === 'nw' || c === 'se') ? 'cursor-nwse-resize' : 'cursor-nesw-resize',
                            )}
                          />
                        )
                      })}
                    </g>
                  )
                })}
                {/* rubber band while drawing */}
                {rubber && (
                  <g pointerEvents="none">
                    <rect
                      x={Math.min(rubber.x1, rubber.x2)} y={Math.min(rubber.z1, rubber.z2)}
                      width={Math.abs(rubber.x2 - rubber.x1)} height={Math.abs(rubber.z2 - rubber.z1)}
                      rx={0.1} fill={ZONE_META[lastKind].color} fillOpacity={0.14}
                      stroke={ZONE_META[lastKind].color} strokeWidth={0.05} strokeDasharray="0.3 0.2"
                    />
                    <text
                      x={Math.min(rubber.x1, rubber.x2) + Math.abs(rubber.x2 - rubber.x1) / 2}
                      y={Math.min(rubber.z1, rubber.z2) - 0.24}
                      textAnchor="middle" fontSize={0.32} fontWeight={700} fill={ZONE_META[lastKind].color}
                      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                    >
                      {Math.max(0, Math.abs(snap10(rubber.x2) - rubber.x1)).toFixed(1)} × {Math.max(0, Math.abs(snap10(rubber.z2) - rubber.z1)).toFixed(1)} m
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* draw-mode banner */}
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-charcoal/90 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-warmwhite shadow-md">
              <SquareDashedMousePointer className="h-3 w-3" />
              {drawMode ? 'Drag on the plan to draw a zone' : 'Click a zone to select it'}
            </div>
          </div>

          {/* ── zone list + controls ─────────────────────────────── */}
          <div className="flex min-h-0 flex-col bg-warmwhite/60">
            <div className="flex items-center gap-1.5 border-b border-stone-200/80 p-2.5">
              <Button
                size="sm"
                className={cn(
                  'h-8 flex-1 gap-1.5 text-[11px]',
                  drawMode
                    ? 'bg-charcoal text-warmwhite hover:bg-charcoal/90'
                    : 'border-stone-300/80 bg-white text-charcoal shadow-xs hover:bg-white hover:border-stone-400/70',
                )}
                variant={drawMode ? 'default' : 'outline'}
                onClick={() => { setDrawMode((d) => !d); setSelectedId(null) }}
                aria-pressed={drawMode}
              >
                <PenLine className="h-3.5 w-3.5" />
                {drawMode ? 'Drawing…' : 'Draw zone'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-stone-300/80 bg-white text-[11px] shadow-xs hover:bg-white hover:border-stone-400/70"
                onClick={() => {
                  const zn = addZone({ kind: lastKind, w: 3, d: 2 })
                  setSelectedId(zn.id)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5 lg:max-h-[440px]">
              {zones.length === 0 && (
                <p className="rounded-lg border border-dashed border-stone-300 px-3 py-6 text-center text-[11px] leading-relaxed text-stone-400">
                  No zones yet. Draw one on the plan or press Add to start with a 3×2 m rectangle.
                </p>
              )}
              {zones.map((zn) => {
                const color = ZONE_META[zn.kind].color
                const isSel = zn.id === selectedId
                return (
                  <div
                    key={zn.id}
                    className={cn(
                      'rounded-xl border bg-white p-2.5 shadow-xs transition-colors',
                      isSel ? 'border-charcoal/50 ring-1 ring-charcoal/20' : 'border-stone-200/90 hover:border-stone-300',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 rounded-full ring-2 transition-shadow',
                          isSel ? 'ring-charcoal/40' : 'ring-transparent',
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={`Focus ${zn.label}`}
                        onClick={() => setSelectedId(zn.id)}
                      />
                      <ZoneLabelInput
                        key={`${zn.id}:${zn.label}`}
                        zone={zn}
                        onFocus={() => setSelectedId(zn.id)}
                        onCommit={(label) => commitZoneLabel(zn, label)}
                      />
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 shrink-0 text-stone-300 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${zn.label}`}
                        onClick={() => { removeZone(zn.id); if (selectedId === zn.id) setSelectedId(null) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Select
                        value={zn.kind}
                        onValueChange={(k) => {
                          updateZone(zn.id, { kind: k as ZoneKind })
                          setLastKind(k as ZoneKind)
                        }}
                      >
                        <SelectTrigger
                          className="h-7 flex-1 gap-1.5 bg-white text-[11px] data-[size=default]:h-7"
                          aria-label={`${zn.label} zone type`}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ZONE_KINDS.map((k) => (
                            <SelectItem key={k} value={k} className="text-[11px]">
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ZONE_META[k].color }} aria-hidden />
                                {kindLabel(k)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-1 text-[9.5px] font-semibold tabular-nums text-stone-500">
                        {zn.w.toFixed(1)}×{zn.d.toFixed(1)}
                      </span>
                    </div>

                    {/* precise coordinates for the selected zone */}
                    {isSel && (
                      <div className="mt-2 grid grid-cols-4 gap-1.5 border-t border-stone-100 pt-2">
                        {(['x', 'z', 'w', 'd'] as const).map((key) => (
                          <div key={key}>
                            <Label className="text-[8.5px] font-bold uppercase tracking-wider text-stone-400">
                              {key === 'x' ? 'X (m)' : key === 'z' ? 'Z (m)' : key === 'w' ? 'W (m)' : 'D (m)'}
                            </Label>
                            <Input
                              type="number" step={0.1} min={key === 'w' || key === 'd' ? 0.6 : -50} max={50}
                              defaultValue={zn[key].toFixed(1)}
                              key={`${zn.id}-${key}-${zn[key].toFixed(1)}`}
                              onBlur={(e) => {
                                const n = Number.parseFloat(e.target.value)
                                if (!Number.isNaN(n)) updateZone(zn.id, { [key]: n })
                                else e.target.value = zn[key].toFixed(1)
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                              className="h-7 px-1.5 text-[10.5px] tabular-nums"
                              aria-label={`Zone ${key === 'x' ? 'center X' : key === 'z' ? 'center Z' : key === 'w' ? 'width' : 'depth'} in meters`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="border-t border-stone-200/80 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[9.5px] leading-tight text-stone-400">
                  <Hand className="h-3 w-3 shrink-0" />
                  10 cm snap · zones stay inside the walls
                </p>
                {zones.length > 0 && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 shrink-0 px-2 text-[10px] text-stone-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => { clearZones(); setSelectedId(null) }}
                  >
                    Clear all
                  </Button>
                )}
              </div>
              {selectedId && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[9.5px] text-stone-400">
                  <MoveIcon className="h-3 w-3 shrink-0" />
                  <span>
                    Arrow keys nudge the selected zone —
                    hold <kbd className="rounded border border-stone-300 bg-white px-1 font-mono text-[9px] text-charcoal">⇧</kbd> for 50 cm
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Self-contained name input for one zone row. Keyed by `zone.id:zone.label`
 * upstream, so external renames (undo, share open, template load) remount it
 * with a fresh draft — no sync effects needed.
 */
function ZoneLabelInput({
  zone, onFocus, onCommit,
}: {
  zone: ZoneDef
  onFocus: () => void
  onCommit: (label: string) => void
}) {
  const [draft, setDraft] = useState(zone.label)
  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={onFocus}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className="h-7 flex-1 border-transparent bg-transparent px-1.5 text-xs font-semibold text-charcoal shadow-none hover:border-stone-200 focus:border-stone-300 focus:bg-white"
      aria-label={`${zone.label} name`}
      maxLength={40}
    />
  )
}
