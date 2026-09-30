'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CATALOG, CATEGORY_META, getItem } from '@/lib/planner/catalog'
import type { Category } from '@/lib/planner/types'
import { usePlanner } from '@/lib/planner/store'
import { CATEGORY_COLORS, fmtMoney } from '@/lib/planner/capacity'
import { cn } from '@/lib/utils'

/** tiny plan-symbol glyph per item, drawn from its footprint */
function Glyph({ id, active }: { id: string; active: boolean }) {
  const cat = getItem(id)
  if (!cat) return null
  const s = 22
  const stroke = active ? '#FDFAF3' : '#57534A'
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
      {cat.shape === 'circle' ? (
        <circle cx="12" cy="12" r="8" fill={active ? 'currentColor' : 'none'} stroke={stroke} strokeWidth="1.6" />
      ) : (
        <rect
          x={cat.shape === 'counter' ? 4 : 5.5}
          y={cat.shape === 'counter' ? 8 : 6}
          width={cat.shape === 'counter' ? 16 : 13}
          height={cat.shape === 'counter' ? 8 : 12}
          rx="1.5"
          fill={active ? 'currentColor' : 'none'}
          stroke={stroke}
          strokeWidth="1.6"
        />
      )}
    </svg>
  )
}

export default function CatalogSidebar({ onPlaced }: { onPlaced?: () => void }) {
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [query, setQuery] = useState('')
  const armedId = usePlanner((s) => s.armedId)
  const arm = usePlanner((s) => s.arm)
  const brand = usePlanner((s) => s.brandColor)

  const list = useMemo(
    () =>
      CATALOG.filter((c) => (cat === 'all' || c.category === cat) &&
        c.name.toLowerCase().includes(query.toLowerCase())),
    [cat, query],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone-200/70 p-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold tracking-tight text-charcoal">Furniture library</h3>
          <span className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-stone-400">
            {CATALOG.length} pieces
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-stone-500">Click an item, then click the floor.</p>
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items…"
            className="h-8 bg-stone-50 pl-8 text-xs"
            aria-label="Search furniture"
          />
          {query && (
            <button
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="thin-scroll -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(Object.keys(CATEGORY_META) as Array<Category | 'all'>).map((k) => (
            <button
              key={k}
              onClick={() => setCat(k)}
              aria-pressed={cat === k}
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
                cat === k
                  ? 'border-charcoal bg-charcoal text-warmwhite shadow-sm'
                  : 'border-stone-200 bg-white text-stone-600 shadow-xs hover:border-stone-300 hover:bg-stone-50 hover:text-charcoal',
              )}
            >
              {k !== 'all' && (
                <span
                  className={cn(
                    'mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle',
                    cat === k && 'ring-1 ring-warmwhite/50',
                  )}
                  style={{ backgroundColor: CATEGORY_COLORS[k] }}
                  aria-hidden
                />
              )}
              {CATEGORY_META[k].label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid grid-cols-1 gap-2 p-3">
          {list.map((c) => {
            const active = armedId === c.id
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (active) {
                    arm(null)
                  } else {
                    arm(c.id)
                    onPlaced?.()
                  }
                }}
                aria-pressed={active}
                title={c.blurb}
                className={cn(
                  'group flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all duration-150',
                  active
                    ? 'border-transparent bg-charcoal text-warmwhite shadow-[0_10px_24px_-10px_rgba(43,41,37,0.55)]'
                    : 'border-stone-200/80 bg-white hover:-translate-y-px hover:border-stone-300 hover:shadow-[0_8px_18px_-10px_rgba(46,43,38,0.4)]',
                )}
              >
                <span className={cn('mt-0.5 shrink-0', active ? 'text-warmwhite' : 'text-stone-500')}>
                  <Glyph id={c.id} active={active} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-1">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      {active && (
                        <span className="relative mt-px inline-flex h-1.5 w-1.5 shrink-0" aria-hidden>
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warmwhite/70" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warmwhite" />
                        </span>
                      )}
                      <span className="truncate text-xs font-semibold tracking-[-0.01em]">{c.name}</span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-[10.5px] font-medium tabular-nums',
                        active ? 'text-stone-300' : 'text-stone-400',
                      )}
                    >
                      {fmtMoney(c.price)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 flex items-center gap-1.5 text-[10px] tabular-nums',
                      active ? 'text-stone-300' : 'text-stone-400',
                    )}
                  >
                    <span>{c.w.toFixed(1)}×{c.d.toFixed(1)} m</span>
                    {c.seats > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-px font-semibold',
                          active ? 'bg-white/20' : 'bg-stone-100',
                        )}
                      >
                        {c.seats} {c.category === 'seating' || c.id === 'desk-cluster' || c.id === 'phone-booth' ? 'seat' : ''}s
                      </span>
                    )}
                    {c.brandable && (
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full border shadow-xs',
                          active ? 'border-warmwhite/60' : 'border-stone-300',
                        )}
                        style={{ backgroundColor: brand }}
                      />
                    )}
                  </span>
                </span>
              </button>
            )
          })}
          {list.length === 0 && (
            <p className="rounded-lg border border-dashed border-stone-300 bg-white/60 py-8 text-center text-xs text-stone-400">
              Nothing matches “{query}”. Try a different word or category.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
