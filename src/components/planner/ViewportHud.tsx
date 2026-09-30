'use client'

import { useEffect, useRef, useState } from 'react'
import { BadgeDollarSign, ChevronDown, ChevronUp, Copy, Palette, RotateCw, Trash2, MousePointerClick } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  else if (selectedUid) text = 'Drag to move · arrows nudge · R rotate · D duplicate · right-click for actions'
  return (
    <div className="chip-glass pointer-events-none flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium text-stone-600">
      <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-stone-400" />
      <span className="truncate">{text}</span>
    </div>
  )
}

export function SelectionControls() {
  const selectedUid = usePlanner((s) => s.selectedUid)
  const items = usePlanner((s) => s.items)
  const rotateItem = usePlanner((s) => s.rotateItem)
  const removeItem = usePlanner((s) => s.removeItem)
  const duplicateItem = usePlanner((s) => s.duplicateItem)
  const setItemPrice = usePlanner((s) => s.setItemPrice)
  const item = items.find((i) => i.uid === selectedUid)
  const cat = item ? getItem(item.id) : null
  const [priceOpen, setPriceOpen] = useState(false)
  const [draft, setDraft] = useState('')

  // the item context menu can ask this panel to open the price editor
  useEffect(() => {
    const open = () => {
      if (item) {
        setDraft(String(item.price ?? cat?.price ?? ''))
        setPriceOpen(true)
      }
    }
    window.addEventListener('forma:edit-price', open)
    return () => window.removeEventListener('forma:edit-price', open)
  }, [item, cat])

  if (!item || !cat) return null
  const custom = item.price !== undefined && item.price !== cat.price

  function commitPrice() {
    const n = Number.parseFloat(draft)
    if (Number.isNaN(n)) {
      setDraft(String(item!.price ?? cat!.price))
    } else {
      setItemPrice(item!.uid, n)
    }
    setPriceOpen(false)
  }

  return (
    <div className="card-glass pointer-events-auto flex items-center gap-1 rounded-xl p-1.5 pl-3.5">
      <div className="mr-1 text-xs">
        <span className="font-semibold text-charcoal">{cat.name}</span>
        <span className={cn('ml-1.5 tabular-nums', custom ? 'font-semibold text-amber-600' : 'text-stone-400')}>
          {fmtMoney(item.price ?? cat.price)}
        </span>
      </div>

      {/* per-item price override */}
      <Popover open={priceOpen} onOpenChange={(o) => {
        if (o) setDraft(String(item.price ?? cat.price))
        setPriceOpen(o)
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('relative h-8 w-8', custom && 'text-amber-600')}
            title="Edit unit price"
            aria-label="Edit unit price"
          >
            <BadgeDollarSign className="h-4 w-4" />
            {custom && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" side="top" className="w-60 p-3.5">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Unit price override
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            List price is {fmtMoney(cat.price)}. Override for trade quotes or discounts — totals update live.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400">$</span>
              <Input
                type="number"
                min={0}
                step={10}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitPrice()
                  if (e.key === 'Escape') setPriceOpen(false)
                }}
                className="h-8 pl-6 text-xs tabular-nums"
                aria-label="Unit price in dollars"
              />
            </div>
            <Button size="sm" className="h-8 bg-charcoal px-2.5 text-xs text-warmwhite hover:bg-charcoal/90" onClick={commitPrice}>
              Apply
            </Button>
          </div>
          {custom && (
            <button
              type="button"
              onClick={() => {
                setItemPrice(item.uid, null)
                setDraft(String(cat.price))
              }}
              className="mt-2 text-[11px] font-medium text-stone-500 underline-offset-2 hover:text-charcoal hover:underline"
            >
              Reset to list price ({fmtMoney(cat.price)})
            </button>
          )}
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" className="h-8 w-8" title="Rotate 90° (R)" aria-label="Rotate 90 degrees" onClick={() => rotateItem(item.uid)}>
        <RotateCw className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicate (D)" aria-label="Duplicate item" onClick={() => duplicateItem(item.uid)}>
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
  const planPalette = usePlanner((s) => s.planPalette)
  const setPlanPalette = usePlanner((s) => s.setPlanPalette)

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
            palette={planPalette}
            className="block h-auto w-full"
          />
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-medium tabular-nums text-stone-400">
            <span>{items.length} items placed</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-emerald-500" aria-hidden />
              live plan
            </span>
          </div>
          {/* glyph palette: brand color vs one color per category */}
          <div
            role="group"
            aria-label="Plan glyph colors"
            className="flex items-center gap-0.5 rounded-lg border border-stone-200/90 bg-white/70 p-0.5"
          >
            <Palette className="mx-1.5 h-3 w-3 shrink-0 text-stone-400" aria-hidden />
            {([['brand', 'Brand colors'], ['category', 'By category']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setPlanPalette(mode)}
                aria-pressed={planPalette === mode}
                title={mode === 'brand' ? 'Color plan glyphs with the brand color' : 'Color plan glyphs by furniture category'}
                className={cn(
                  'flex-1 rounded-md px-1.5 py-1 text-[9.5px] font-semibold uppercase tracking-wide transition-colors',
                  planPalette === mode
                    ? 'bg-charcoal text-warmwhite shadow-xs'
                    : 'text-stone-400 hover:bg-stone-100 hover:text-charcoal',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
