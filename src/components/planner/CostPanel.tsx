'use client'

import { Calculator, Info, PenLine } from 'lucide-react'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { usePlanner } from '@/lib/planner/store'
import { computeCost, fmtMoney } from '@/lib/planner/capacity'
import { cn } from '@/lib/utils'

export default function CostPanel() {
  const costOpen = usePlanner((s) => s.costOpen)
  const setCostOpen = usePlanner((s) => s.setCostOpen)
  const items = usePlanner((s) => s.items)
  const brand = usePlanner((s) => s.brandColor)
  const cost = computeCost(items)
  const hasCustom = cost.lines.some((l) => (l as { custom?: boolean }).custom)

  return (
    <Sheet open={costOpen} onOpenChange={setCostOpen}>
      <SheetContent side="right" className="flex w-[380px] max-w-[92vw] flex-col gap-0 border-stone-200 bg-warmwhite p-0 sm:max-w-[380px]">
        <SheetHeader className="border-b border-stone-200/80 bg-white/60 px-5 py-4">
          <SheetTitle className="font-display flex items-center gap-2 text-base font-bold text-charcoal">
            <Calculator className="h-4 w-4" style={{ color: brand }} />
            Cost estimate
          </SheetTitle>
          <SheetDescription className="text-xs text-stone-500">
            Rough fit-out totals — supply prices, updates live as you place items.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-5 py-4">
            {cost.lines.length === 0 ? (
              <p className="py-10 text-center text-xs text-stone-400">
                Place furniture to build your estimate.
              </p>
            ) : (
              <ul className="space-y-1">
                {cost.lines.map((l) => {
                  const custom = (l as { custom?: boolean }).custom
                  return (
                    <li key={l.id} className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-white/70">
                      <span className="min-w-0 flex-1 truncate font-medium text-stone-700">
                        {l.name}
                        {l.qty > 1 && <span className="ml-1.5 text-stone-400">×{l.qty}</span>}
                        {custom && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-amber-800">
                            <PenLine className="h-2.5 w-2.5" aria-hidden />
                            custom
                          </span>
                        )}
                      </span>
                      <span className={cn('shrink-0 tabular-nums', custom ? 'font-medium text-amber-700' : 'text-stone-400')}>
                        {fmtMoney(l.unit)}
                      </span>
                      <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-charcoal">
                        {fmtMoney(l.total)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-stone-200/80 bg-white/70 px-5 py-4">
          <div className="space-y-1.5 text-xs text-stone-500">
            <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{fmtMoney(cost.subtotal)}</span></div>
            <div className="flex justify-between"><span>Delivery &amp; install · 12%</span><span className="tabular-nums">{fmtMoney(cost.install)}</span></div>
            <div className="flex justify-between"><span>Contingency · 8%</span><span className="tabular-nums">{fmtMoney(cost.contingency)}</span></div>
          </div>
          <Separator className="my-3" />
          {hasCustom && (
            <p className="mb-2 rounded-md bg-amber-100/70 px-2.5 py-1.5 text-[10.5px] font-medium text-amber-800">
              Custom unit prices applied — select an item in the room to adjust.
            </p>
          )}
          <div className="flex items-baseline justify-between">
            <span className="font-display text-sm font-semibold text-charcoal">Estimated total</span>
            <span className="font-display text-xl font-bold tabular-nums" style={{ color: brand }}>
              {fmtMoney(cost.total)}
            </span>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-stone-400">
            <Info className="mt-px h-3 w-3 shrink-0" />
            Ballpark figures for early planning only. Get trade quotes before committing a budget.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
