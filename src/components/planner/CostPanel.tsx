'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Calculator, Download, ImageDown, Info, Landmark, PenLine, SlidersHorizontal, Target, TriangleAlert, Wallet,
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { usePlanner } from '@/lib/planner/store'
import { getItem } from '@/lib/planner/catalog'
import {
  ALL_CATEGORIES, budgetStatusOf, computeCategoryBreakdown, computeCategorySpend, computeCapacity, computeCost,
  fmtMoney, VENUES, EXIT_CAPACITY, CATEGORY_META,
} from '@/lib/planner/capacity'
import type { Category } from '@/lib/planner/types'
import { TEMPLATES } from '@/lib/planner/templates'
import { InsightsCard, ReadinessCard } from './InsightsCards'
import PlanSVG from './PlanSVG'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const BUDGET_PRESETS = [15_000, 25_000, 40_000, 60_000]

const BUDGET_META = {
  under: { label: 'Under budget', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'bg-emerald-500' },
  close: { label: 'Close to budget', cls: 'bg-amber-100 text-amber-800 border-amber-200', bar: 'bg-amber-500' },
  over: { label: 'Over budget', cls: 'bg-red-100 text-red-700 border-red-200', bar: 'bg-red-500' },
} as const

const CAP_META = {
  under: { chip: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'bg-emerald-500/80', icon: '✓' },
  close: { chip: 'bg-amber-100 text-amber-800 border-amber-200', bar: 'bg-amber-500', icon: '!' },
  over: { chip: 'bg-red-100 text-red-700 border-red-200', bar: 'bg-red-500', icon: '▲' },
} as const

/** Build and download a bill-of-materials CSV for the current layout. */
function downloadBomCsv(
  projectName: string, templateId: string, areaM2: number, seats: number,
  lines: Array<{ name: string; qty: number; unit: number; total: number; custom?: boolean }>,
  subtotal: number, install: number, contingency: number, total: number, budget: number | null,
  caps: Array<{ label: string; cap: number; spend: number; status: 'under' | 'close' | 'over' }>,
) {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows: string[] = []
  rows.push('FORMA — Bill of materials')
  rows.push(`Project,${esc(projectName || 'Untitled layout')}`)
  rows.push(`Template,${esc(templateId === 'custom' ? 'Custom layout' : TEMPLATES[templateId as 'cafe']?.name ?? templateId)}`)
  rows.push(`Floor area,${areaM2.toFixed(1)} m2`)
  rows.push(`Seats,${seats}`)
  rows.push(`Exported,${new Date().toISOString().slice(0, 10)}`)
  rows.push('')
  rows.push('Item,Qty,Unit price (USD),Line total (USD),Pricing')
  for (const l of lines) {
    rows.push([esc(l.name), l.qty, l.unit, l.total, l.custom ? 'custom' : 'catalog'].join(','))
  }
  rows.push('')
  rows.push(`Subtotal,,,${subtotal},`)
  rows.push(`Delivery & install (12%),,,${install},`)
  rows.push(`Contingency (8%),,,${contingency},`)
  rows.push(`Estimated total,,,${total},`)
  if (budget !== null) rows.push(`Budget,,,${budget},`)
  if (caps.length > 0) {
    rows.push('')
    rows.push('Category caps')
    rows.push('Category,Cap (USD),Spend (USD),Status')
    for (const c of caps) {
      rows.push([esc(c.label), c.cap, c.spend, c.status.toUpperCase()].join(','))
    }
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = (projectName || 'layout').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'layout'
  a.href = url
  a.download = `forma-bom-${slug}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export default function CostPanel() {
  const costOpen = usePlanner((s) => s.costOpen)
  const setCostOpen = usePlanner((s) => s.setCostOpen)
  const items = usePlanner((s) => s.items)
  const room = usePlanner((s) => s.room)
  const brand = usePlanner((s) => s.brandColor)
  const showFire = usePlanner((s) => s.showFire)
  const zones = usePlanner((s) => s.zones)
  const showZones = usePlanner((s) => s.showZones)
  const templateId = usePlanner((s) => s.templateId)
  const projectName = usePlanner((s) => s.projectName)
  const budget = usePlanner((s) => s.budget)
  const setBudget = usePlanner((s) => s.setBudget)
  const categoryBudgets = usePlanner((s) => s.categoryBudgets)
  const setCategoryBudget = usePlanner((s) => s.setCategoryBudget)
  const planPalette = usePlanner((s) => s.planPalette)
  const { toast } = useToast()

  const [budgetDraft, setBudgetDraft] = useState('')
  const [capDrafts, setCapDrafts] = useState<Partial<Record<Category, string>>>({})
  const [pngBusy, setPngBusy] = useState(false)
  const cost = computeCost(items)
  const hasCustom = cost.lines.some((l) => (l as { custom?: boolean }).custom)
  const slices = useMemo(() => computeCategoryBreakdown(items), [items])
  const catSpend = useMemo(() => computeCategorySpend(items), [items])
  const pngSvgRef = useRef<SVGSVGElement | null>(null)

  /** Render the hidden plan SVG into a 2× canvas and download it as a PNG sheet. */
  async function downloadPlanPng() {
    if (!pngSvgRef.current || pngBusy) return
    setPngBusy(true)
    try {
      const svg = pngSvgRef.current
      const xml = new XMLSerializer().serializeToString(svg)
      const img = new Image()
      const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('SVG render failed'))
        img.src = svgUrl
      })
      const scale = 2
      const W = img.width * scale
      const H = img.height * scale + 96
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#FDFAF3'
      ctx.fillRect(0, 0, W, H)
      // header strip
      ctx.fillStyle = brand
      ctx.fillRect(28, 24, 22, 22)
      ctx.fillStyle = '#2E2B26'
      ctx.font = '700 26px system-ui, sans-serif'
      ctx.fillText('FORMA', 62, 43)
      ctx.font = '500 13px system-ui, sans-serif'
      ctx.fillStyle = '#8A8375'
      ctx.textAlign = 'right'
      ctx.fillText(`${projectName || 'Untitled project'} · ${(room.w * room.d).toFixed(0)} m² · ${seatCount} seats · ${fmtMoney(cost.total)}`, W - 28, 42)
      ctx.textAlign = 'left'
      ctx.drawImage(img, 0, 72, img.width * scale, img.height * scale)

      const slug = (projectName || 'layout').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'layout'
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `forma-plan-${slug}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast({ title: 'Plan image saved', description: 'A high-resolution PNG of your floor plan was downloaded.' })
    } catch {
      toast({ title: 'Export failed', description: 'Could not render the plan image. Please try again.', variant: 'destructive' })
    } finally {
      setPngBusy(false)
    }
  }

  // seat count via catalog
  const seatCount = useMemo(() => {
    let n = 0
    for (const it of items) {
      const cat = getItem(it.id)
      if (cat) n += cat.seats
    }
    return n
  }, [items])

  const venue: 'cafe' | 'coworking' | 'boutique' | 'restaurant' = templateId === 'custom' ? 'cafe' : templateId
  const cap = useMemo(() => computeCapacity(items, room, venue), [items, room, venue])

  const budgetState = budget !== null ? budgetStatusOf(cost.total, budget) : null
  const overBudget = budgetState?.status === 'over'

  function commitBudget(raw: string) {
    const n = Number(raw.replace(/[^0-9]/g, ''))
    setBudget(raw.trim() === '' || Number.isNaN(n) || n <= 0 ? null : n)
  }

  function commitCap(cat: Category, raw: string) {
    const n = Number(raw.replace(/[^0-9]/g, ''))
    setCategoryBudget(cat, raw.trim() === '' || Number.isNaN(n) || n <= 0 ? null : n)
    setCapDrafts((d) => {
      const next = { ...d }
      delete next[cat]
      return next
    })
  }

  // caps summary: how many categories have caps and how they are doing
  const cappedCats = ALL_CATEGORIES.filter((c) => categoryBudgets[c] !== undefined)
  const overCaps = cappedCats.filter((c) => budgetStatusOf(catSpend[c], categoryBudgets[c]!).status === 'over')
  const closeCaps = cappedCats.filter((c) => budgetStatusOf(catSpend[c], categoryBudgets[c]!).status === 'close')

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
          {/* grid track with minmax(0,1fr): keeps nowrap "truncate" rows from
              inflating the scroll-area's table layout beyond the panel width */}
          <div className="grid grid-cols-[minmax(0,1fr)] px-5 py-4">
            {/* ── budget guardrail ─────────────────────────────────── */}
            <section
              aria-label="Budget guardrail"
              className={cn(
                'rounded-xl border bg-white/80 p-3.5 shadow-xs transition-colors',
                overBudget ? 'border-red-300/80' : 'border-stone-200/80',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-display flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  <Target className="h-3.5 w-3.5" style={{ color: brand }} />
                  Budget guardrail
                </p>
                {budget !== null && (
                  <button
                    onClick={() => { setBudgetDraft(''); setBudget(null) }}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400">$</span>
                  <input
                    inputMode="numeric"
                    value={budgetDraft || (budget !== null ? String(budget) : '')}
                    onChange={(e) => setBudgetDraft(e.target.value)}
                    onBlur={(e) => commitBudget(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { commitBudget((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur() }
                    }}
                    placeholder="Set a budget…"
                    aria-label="Budget in US dollars"
                    className={cn(
                      'h-8 w-full rounded-lg border bg-white pl-6 pr-2 text-xs font-semibold tabular-nums text-charcoal shadow-xs outline-none transition-colors placeholder:font-normal placeholder:text-stone-300',
                      overBudget ? 'border-red-300 focus:border-red-400' : 'border-stone-200 focus:border-stone-400',
                    )}
                  />
                </div>
                {BUDGET_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setBudgetDraft(''); setBudget(p) }}
                    aria-label={`Set budget ${p / 1000}k`}
                    className={cn(
                      'hidden h-8 shrink-0 rounded-lg border px-2 text-[10px] font-semibold tabular-nums transition-colors sm:block',
                      budget === p
                        ? 'border-charcoal bg-charcoal text-warmwhite'
                        : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-charcoal',
                    )}
                  >
                    {p / 1000}k
                  </button>
                ))}
              </div>

              {budget !== null && budgetState && (
                <div className="mt-3">
                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(Math.min(100, budgetState.pct * 100))}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Budget used"
                    className="h-2 w-full overflow-hidden rounded-full bg-stone-100 shadow-[inset_0_1px_2px_rgba(46,43,38,0.08)]"
                  >
                    <div
                      className={cn('h-full rounded-full transition-[width] duration-500 ease-out', BUDGET_META[budgetState.status].bar)}
                      style={{ width: `${Math.min(100, budgetState.pct * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', BUDGET_META[budgetState.status].cls)}>
                      {overBudget && <TriangleAlert className="h-3 w-3" aria-hidden />}
                      {BUDGET_META[budgetState.status].label}
                    </span>
                    <span className="tabular-nums text-stone-500">
                      <span className="font-semibold text-charcoal">{fmtMoney(cost.total)}</span>
                      {' / '}
                      {fmtMoney(budget)}
                      {overBudget && (
                        <span className="ml-1 font-semibold text-red-600">({fmtMoney(cost.total - budget)} over)</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </section>

            {/* ── category caps ─────────────────────────────────────── */}
            <section
              aria-label="Category caps"
              className={cn(
                'mt-4 rounded-xl border bg-white/80 p-3.5 shadow-xs transition-colors',
                overCaps.length > 0 ? 'border-red-300/80' : 'border-stone-200/80',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-display flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  <SlidersHorizontal className="h-3.5 w-3.5" style={{ color: brand }} />
                  Category caps
                </p>
                {cappedCats.length > 0 && (
                  overCaps.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                      <TriangleAlert className="h-3 w-3" aria-hidden />
                      {overCaps.length} over
                    </span>
                  ) : closeCaps.length > 0 ? (
                    <span className="rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      {closeCaps.length} close
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      on track
                    </span>
                  )
                )}
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {ALL_CATEGORIES.map((c) => {
                  const cap = categoryBudgets[c]
                  const spend = catSpend[c]
                  const st = cap !== undefined ? budgetStatusOf(spend, cap) : null
                  const meta = CATEGORY_META[c]
                  return (
                    <li key={c}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-stone-600">{meta.label}</span>
                        <span className="w-14 shrink-0 text-right text-[11px] font-semibold tabular-nums text-charcoal">
                          {spend >= 1000 ? `$${(Math.round(spend / 100) / 10).toFixed(1)}k` : fmtMoney(spend)}
                        </span>
                        <div className="relative w-[72px] shrink-0">
                          <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-stone-300">$</span>
                          <input
                            inputMode="numeric"
                            value={capDrafts[c] ?? (cap !== undefined ? String(cap) : '')}
                            onChange={(e) => setCapDrafts((d) => ({ ...d, [c]: e.target.value }))}
                            onBlur={(e) => commitCap(c, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                commitCap(c, (e.target as HTMLInputElement).value)
                                ;(e.target as HTMLInputElement).blur()
                              }
                            }}
                            placeholder="cap"
                            aria-label={`${meta.label} spending cap in dollars`}
                            className={cn(
                              'h-7 w-full rounded-md border bg-white pl-4 pr-1.5 text-[10.5px] font-semibold tabular-nums text-charcoal shadow-xs outline-none transition-colors placeholder:font-normal placeholder:text-stone-300',
                              st?.status === 'over'
                                ? 'border-red-300 focus:border-red-400'
                                : cap !== undefined
                                  ? 'border-stone-300/90 focus:border-stone-400'
                                  : 'border-stone-200 focus:border-stone-400',
                            )}
                          />
                        </div>
                      </div>
                      {st && cap !== undefined && (
                        <div className="mt-1 flex items-center gap-1.5 pl-4">
                          <div
                            role="progressbar"
                            aria-valuenow={Math.round(Math.min(100, st.pct * 100))}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${meta.label} cap usage`}
                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100 shadow-[inset_0_1px_2px_rgba(46,43,38,0.08)]"
                          >
                            <div
                              className={cn('h-full rounded-full transition-[width] duration-500 ease-out', CAP_META[st.status].bar)}
                              style={{ width: `${Math.min(100, st.pct * 100)}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              'w-11 shrink-0 text-right text-[9.5px] font-semibold tabular-nums',
                              st.status === 'over' ? 'text-red-600' : st.status === 'close' ? 'text-amber-700' : 'text-emerald-700',
                            )}
                          >
                            {Math.round(st.pct * 100)}%
                          </span>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-[10px] leading-snug text-stone-400">
                Caps stay on this device — they flag overspends per category while you place items.
              </p>
            </section>

            {/* ── readiness checks (compliance) ────────────────────── */}
            <div className="mt-4">
              <ReadinessCard />
            </div>

            {/* ── layout insights ──────────────────────────────────── */}
            <div className="mt-4">
              <InsightsCard />
            </div>

            {/* ── category breakdown ───────────────────────────────── */}
            {slices.length > 0 && (
              <section aria-label="Spend by category" className="mt-4">
                <p className="font-display flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  <Wallet className="h-3.5 w-3.5 text-stone-400" />
                  Spend by category
                </p>
                {/* stacked ribbon */}
                <div className="mt-2.5 flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-stone-100 shadow-[inset_0_1px_2px_rgba(46,43,38,0.08)]" aria-hidden>
                  {slices.map((s) => (
                    <div
                      key={s.category}
                      className="h-full transition-[width] duration-500 ease-out"
                      style={{ width: `${s.pct * 100}%`, backgroundColor: s.color }}
                    />
                  ))}
                </div>
                <ul className="mt-2.5 space-y-1">
                  {slices.map((s) => (
                    <li key={s.category} className="flex items-center gap-2 rounded-md px-1 py-0.5 text-[11px] transition-colors hover:bg-white/70">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-medium text-stone-600">{s.label}</span>
                      <span className="shrink-0 tabular-nums text-stone-400">{Math.round(s.pct * 100)}%</span>
                      <span className="w-16 shrink-0 text-right font-semibold tabular-nums text-charcoal">{fmtMoney(s.total)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── line items ───────────────────────────────────────── */}
            <section aria-label="Line items" className="mt-4">
              <p className="font-display flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                <Landmark className="h-3.5 w-3.5 text-stone-400" />
                Bill of materials
                <span className="ml-auto font-sans text-[10px] font-medium normal-case tracking-normal text-stone-400">
                  {cost.lines.length} {cost.lines.length === 1 ? 'line' : 'lines'}
                </span>
              </p>
              {cost.lines.length === 0 ? (
                <p className="py-8 text-center text-xs text-stone-400">
                  Place furniture to build your estimate.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
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
            </section>
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
            <span className="font-display text-xl font-bold tabular-nums" style={{ color: overBudget ? '#B91C1C' : brand }}>
              {fmtMoney(cost.total)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button2
              disabled={cost.lines.length === 0}
              onClick={() =>
                downloadBomCsv(
                  projectName, templateId, room.w * room.d, seatCount,
                  cost.lines, cost.subtotal, cost.install, cost.contingency, cost.total, budget,
                  cappedCats.map((c) => ({
                    label: CATEGORY_META[c].label,
                    cap: categoryBudgets[c]!,
                    spend: catSpend[c],
                    status: budgetStatusOf(catSpend[c], categoryBudgets[c]!).status,
                  })),
                )
              }
            >
              <Download className="h-3.5 w-3.5" />
              BOM · CSV
            </Button2>
            <Button2 onClick={downloadPlanPng} disabled={pngBusy || items.length === 0}>
              <ImageDown className="h-3.5 w-3.5" />
              {pngBusy ? 'Rendering…' : 'Plan · PNG'}
            </Button2>
            <p className="flex-1 text-[10px] leading-snug text-stone-400">
              Venue: {VENUES[venue].label.toLowerCase()} · {seatCount} {seatCount === 1 ? 'seat' : 'seats'} · load {cap.occupantLoad}/{EXIT_CAPACITY}
            </p>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-stone-400">
            <Info className="mt-px h-3 w-3 shrink-0" />
            Ballpark figures for early planning only. Get trade quotes before committing a budget.
          </p>
        </div>
      </SheetContent>

      {/* hidden full-fidelity plan for PNG rendering (offscreen) */}
      <div className="pointer-events-none fixed -left-[9999px] top-0" aria-hidden>
        <PlanSVG
          refCb={(el) => { pngSvgRef.current = el }}
          room={room}
          items={items}
          brand={brand}
          showFire={showFire}
          detailed
          palette={planPalette}
          zones={zones}
          showZones={showZones}
        />
      </div>
    </Sheet>
  )
}

/** tiny local button so the sheet stays dependency-light */
function Button2({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-300/80 bg-white px-2.5 text-[11px] font-semibold text-charcoal shadow-xs transition-colors hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}
