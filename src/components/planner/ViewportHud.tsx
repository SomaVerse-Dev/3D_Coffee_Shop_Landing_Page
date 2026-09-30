'use client'

import { ChevronDown, ChevronUp, Copy, RotateCw, Trash2, MousePointerClick } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlanner } from '@/lib/planner/store'
import { getItem } from '@/lib/planner/catalog'
import { fmtMoney } from '@/lib/planner/capacity'
import PlanSVG from './PlanSVG'
import { cn } from '@/lib/utils'

export function HintChip() {
  const armedId = usePlanner((s) => s.armedId)
  const selectedUid = usePlanner((s) => s.selectedUid)
  let text = 'Pick furniture from the library, then click the floor to place it.'
  if (armedId) text = 'Click the floor to place · Esc to cancel'
  else if (selectedUid) text = 'Drag to move · R rotate · Del remove · Esc deselect'
  return (
    <div className="chip-glass pointer-events-none flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium text-stone-600">
      <MousePointerClick className="h-3.5 w-3.5 text-stone-400" />
      {text}
    </div>
  )
}

export function SelectionControls() {
  const selectedUid = usePlanner((s) => s.selectedUid)
  const items = usePlanner((s) => s.items)
  const rotateItem = usePlanner((s) => s.rotateItem)
  const removeItem = usePlanner((s) => s.removeItem)
  const duplicateItem = usePlanner((s) => s.duplicateItem)
  const item = items.find((i) => i.uid === selectedUid)
  if (!item) return null
  const cat = getItem(item.id)

  return (
    <div className="card-glass pointer-events-auto flex items-center gap-1 rounded-xl p-1.5 pl-3.5">
      <div className="mr-1 text-xs">
        <span className="font-semibold text-charcoal">{cat?.name}</span>
        <span className="ml-1.5 tabular-nums text-stone-400">{cat ? fmtMoney(cat.price) : ''}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Rotate 90° (R)" aria-label="Rotate 90 degrees" onClick={() => rotateItem(item.uid)}>
        <RotateCw className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicate" aria-label="Duplicate item" onClick={() => duplicateItem(item.uid)}>
        <Copy className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" title="Delete (Del)" aria-label="Delete item" onClick={() => removeItem(item.uid)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function PlanMinimap() {
  const room = usePlanner((s) => s.room)
  const items = usePlanner((s) => s.items)
  const brand = usePlanner((s) => s.brandColor)
  const showFire = usePlanner((s) => s.showFire)
  const selectedUid = usePlanner((s) => s.selectedUid)
  const planOpen = usePlanner((s) => s.planOpen)
  const setPlanOpen = usePlanner((s) => s.setPlanOpen)

  return (
    <div className="card-glass pointer-events-auto hidden w-60 overflow-hidden rounded-xl md:block">
      <button
        className="flex w-full items-center justify-between rounded-t-[inherit] px-3.5 py-2.5 text-left transition-colors hover:bg-white/60"
        onClick={() => setPlanOpen(!planOpen)}
        aria-expanded={planOpen}
        aria-label={planOpen ? 'Collapse floor plan' : 'Expand floor plan'}
      >
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Floor plan · <span className="tabular-nums">{room.w}×{room.d} m</span>
        </span>
        {planOpen ? <ChevronUp className="h-3.5 w-3.5 text-stone-400" /> : <ChevronDown className="h-3.5 w-3.5 text-stone-400" />}
      </button>
      <div className={cn('px-3 pb-3', planOpen ? 'block' : 'hidden')}>
        <div className="overflow-hidden rounded-lg border border-stone-200/90 shadow-xs">
          <PlanSVG
            room={room}
            items={items}
            brand={brand}
            showFire={showFire}
            selectedUid={selectedUid}
            className="block h-auto w-full"
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-medium tabular-nums text-stone-400">
          <span>{items.length} items placed</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-emerald-500" aria-hidden />
            live plan
          </span>
        </div>
      </div>
    </div>
  )
}
