'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Calculator, DoorOpen, Flame, LayoutGrid,
  RefreshCw, Ruler, Sparkles, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { usePlanner, type LayoutSnapshot } from '@/lib/planner/store'
import { TEMPLATES, TEMPLATE_ORDER } from '@/lib/planner/templates'
import { computeCapacity, computeCost, fmtMoney, VENUES, EXIT_CAPACITY } from '@/lib/planner/capacity'
import { BRAND_PRESETS, } from '@/lib/planner/brandNames'
import { GALLERY_IMAGES } from './galleryImages'
import { cn } from '@/lib/utils'

// ─── Templates gallery ─────────────────────────────────────────────────────

export function TemplateGallery() {
  const loadTemplate = usePlanner((s) => s.loadTemplate)

  function handleLoad(id: 'cafe' | 'coworking' | 'boutique' | 'restaurant') {
    loadTemplate(id)
    document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section id="templates" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">Templates</p>
          <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Start from a real floor
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500">
            Four documentary-proven layouts, sized like the shops and studios we measured.
            Load one, then drag it until it&apos;s yours.
          </p>
        </div>
        <Button
          variant="ghost"
          className="text-xs font-semibold text-stone-500 hover:text-charcoal"
          onClick={() => document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Back to the studio <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {TEMPLATE_ORDER.map((id, idx) => {
          const t = TEMPLATES[id]
          const img = GALLERY_IMAGES[id]
          const items = t.items.map((it, i) => ({ uid: `t${i}`, id: it.id, x: it.x, z: it.z, rot: it.rot ?? 0 }))
          const cap = computeCapacity(items, { w: t.roomW, d: t.roomD }, id)
          const cost = computeCost(items)
          return (
            <motion.article
              key={id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="group overflow-hidden rounded-xl border border-stone-200/80 bg-card shadow-sm transition-[box-shadow,border-color] duration-300 hover:border-stone-300 hover:shadow-xl hover:shadow-stone-300/50"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-200">
                {img ? (
                  <img
                    src={img.url}
                    alt={img.alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full" style={{ backgroundColor: t.brandColor }} />
                )}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1F1B15]/60 via-[#1F1B15]/8 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                />
                <span
                  className="absolute left-3 top-3 h-6 w-6 rounded-md border-2 border-white/70 shadow-md"
                  style={{ backgroundColor: t.brandColor }}
                  aria-label={`Brand color ${t.brandColor}`}
                />
                <span className="absolute bottom-3 right-3 rounded-full bg-charcoal/90 px-2.5 py-1 text-[10.5px] font-semibold tabular-nums text-warmwhite shadow-md ring-1 ring-warmwhite/20 backdrop-blur-sm">
                  {fmtMoney(cost.total)} · {t.roomW}×{t.roomD} m
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-display text-base font-bold tracking-tight text-charcoal">{t.name}</h3>
                <p className="mt-1 min-h-[36px] text-xs leading-relaxed text-stone-500">{t.tagline}</p>
                <div className="mt-3 flex items-center gap-3 text-[11px] font-medium tabular-nums text-stone-500">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{cap.seats} seats</span>
                  <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3" />{cap.area.toFixed(0)} m²</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-stone-400">
                    {fmtMoney(cost.total)} installed
                  </span>
                </div>
                <Button
                  onClick={() => handleLoad(id)}
                  className="mt-4 h-9 w-full bg-charcoal text-xs font-semibold text-warmwhite shadow-xs transition-all hover:bg-charcoal/90 hover:shadow-md active:scale-[0.99]"
                >
                  Load this floor
                </Button>
              </div>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}

// ─── Capacity planner guide ────────────────────────────────────────────────

const GUIDE_ROWS = (Object.keys(VENUES) as Array<'cafe' | 'coworking' | 'boutique' | 'restaurant'>).map((k) => ({
  id: k,
  label: VENUES[k].label,
  factor: VENUES[k].factor,
  minSeat: VENUES[k].minM2PerSeat,
}))

export function CapacityGuide() {
  return (
    <section id="capacity" className="border-y border-stone-200/70 bg-oat/50">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">Capacity planner</p>
        <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Seats per square meter, egress in check
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
          The meter in the studio ticks as you place chairs and flags you before the room gets illegal.
          These are the rules of thumb it uses — simplified from assembly &amp; mercantile occupancy guidance.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-5">
          <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-card shadow-xs lg:col-span-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200/80 bg-white/70">
                  <th className="px-4 py-3 font-display text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">Venue</th>
                  <th className="px-4 py-3 font-display text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">m² / seat</th>
                  <th className="px-4 py-3 font-display text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">Occupant factor</th>
                  <th className="px-4 py-3 font-display text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">Feels like</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {GUIDE_ROWS.map((r) => (
                  <tr key={r.id} className="odd:bg-white/50 transition-colors duration-150 hover:bg-white/90">
                    <td className="px-4 py-3 font-semibold text-charcoal">{r.label}</td>
                    <td className="px-4 py-3 tabular-nums text-stone-600">{r.minSeat ? `≥ ${r.minSeat} m²` : '—'}</td>
                    <td className="px-4 py-3 tabular-nums text-stone-600">{r.factor} m²/person</td>
                    <td className="px-4 py-3 text-stone-400">
                      {r.id === 'cafe' && 'Tight neighbourhood café'}
                      {r.id === 'restaurant' && 'Full-service dining'}
                      {r.id === 'coworking' && 'Desks + lounge + calls'}
                      {r.id === 'boutique' && 'Browsing density, no seats'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:col-span-2">
            {[
              {
                icon: Users,
                title: 'Live seat counting',
                body: 'Every chair, stool and booth feeds the meter. Go over the recommended density and the pill turns amber, then red.',
              },
              {
                icon: DoorOpen,
                title: 'Two-exit egress math',
                body: `A 1.2 m main door plus a 0.9 m rear exit supports ${EXIT_CAPACITY} occupants at a code-of-thumb 5 mm per person. The meter compares your occupant load instantly.`,
              },
              {
                icon: Flame,
                title: 'Flowing egress arrows',
                body: 'Toggle fire safety and animated green arrows trace escape routes from every zone to the nearest exit — spot blocked aisles before an inspector does.',
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="flex gap-3.5 rounded-xl border border-stone-200/80 bg-card p-4 shadow-xs transition-[box-shadow,border-color] duration-200 hover:border-stone-300 hover:shadow-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-charcoal text-warmwhite shadow-xs">
                  <f.icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold text-charcoal">{f.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">{f.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Brand color strip ─────────────────────────────────────────────────────

export function BrandStrip() {
  const brandColor = usePlanner((s) => s.brandColor)
  const setBrandColor = usePlanner((s) => s.setBrandColor)

  return (
    <section id="brand" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">Brand color</p>
          <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            One pick, the whole room follows
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-500">
            Your signature color cascades across chairs, counter fronts, signage, rugs and pendant shades —
            live, in 3D, before you spend a dollar on paint. Tap a swatch and watch the studio above repaint itself.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {BRAND_PRESETS.map((p) => (
              <button
                key={p.hex}
                onClick={() => setBrandColor(p.hex)}
                aria-label={`Apply ${p.name}`}
                aria-pressed={brandColor.toLowerCase() === p.hex.toLowerCase()}
                title={p.name}
                className={cn(
                  'group relative h-12 w-12 rounded-xl border-2 shadow-xs ring-1 ring-charcoal/10 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md',
                  brandColor.toLowerCase() === p.hex.toLowerCase() ? 'border-charcoal shadow-md' : 'border-transparent',
                )}
                style={{ backgroundColor: p.hex }}
              >
                {brandColor.toLowerCase() === p.hex.toLowerCase() && (
                  <BadgeCheck className="absolute inset-0 m-auto h-5 w-5 text-white/90 drop-shadow" />
                )}
              </button>
            ))}
          </div>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-medium text-stone-500">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: brandColor }} />
            Currently painting with <span className="font-semibold text-charcoal">{brandColor.toUpperCase()}</span>
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-oat/60 p-6 sm:p-8">
          <div className="blueprint-grid absolute inset-0 opacity-60" aria-hidden />
          <div className="relative">
            <div className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">What gets repainted</div>
            <ul className="mt-4 grid grid-cols-2 gap-2.5 text-xs font-medium text-stone-600">
              {['Café chair pads', 'Counter face panels', 'Pendant shades', 'Booth cushions', 'Sign boards', 'Rug weave', 'Garment rails', 'Booth fascia'].map((t) => (
                <li key={t} className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-sm transition-colors duration-150 hover:bg-white">
                  <Calculator className="h-3.5 w-3.5 shrink-0" style={{ color: brandColor }} />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-charcoal p-4 text-warmwhite shadow-lg ring-1 ring-white/10">
              <span className="h-10 w-10 shrink-0 rounded-lg shadow-inner ring-1 ring-white/20" style={{ backgroundColor: brandColor }} />
              <div>
                <div className="font-display text-sm font-bold">Signature color</div>
                <div className="text-[11px] text-stone-300">Applied across every branded element in the scene — instantly.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Community gallery (saved layouts, API-backed) ──────────────────────────

interface GalleryRow {
  id: string
  name: string
  brandColor: string
  thumb: string | null
  updatedAt: string
  itemCount: number
  seats: number
  areaM2: number
  templateId: string
}

const LAYOUTS_CHANGED_EVENT = 'forma:layouts-changed'

export function CommunityGallery() {
  const [rows, setRows] = useState<GalleryRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const applySnapshot = usePlanner((s) => s.applySnapshot)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/layouts', { cache: 'no-store' })
      const json = (await res.json()) as { layouts?: GalleryRow[] }
      setRows(json.layouts ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const onChange = () => void load()
    window.addEventListener(LAYOUTS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(LAYOUTS_CHANGED_EVENT, onChange)
  }, [load])

  async function handleOpen(row: GalleryRow) {
    setLoadingId(row.id)
    try {
      const res = await fetch(`/api/layouts/${row.id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('load failed')
      const json = (await res.json()) as { layout?: { data?: LayoutSnapshot } }
      if (!json.layout?.data) throw new Error('no data')
      applySnapshot(json.layout.data)
      toast({ title: 'Opened in the studio', description: `“${row.name}” is ready to edit above.` })
      document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {
      toast({ title: 'Could not open that layout', variant: 'destructive' })
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <section id="community" className="relative mx-auto w-full max-w-7xl scroll-mt-16 px-4 py-16 sm:px-6 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">Community floorplans</p>
          <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Fresh from the studio floor
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-500">
            Real layouts saved by planners using FORMA. Open one in the studio above —
            every wall, seat and brand color comes with it, ready to make yours.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          className="h-8 gap-1.5 rounded-full border-stone-300/80 bg-white text-xs font-medium shadow-xs hover:bg-white"
          aria-label="Refresh community layouts"
        >
          <RefreshCw className={cn('h-3 w-3 text-stone-400', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading && !rows && (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-xs">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-7 w-full" />
              </div>
            </div>
          ))
        )}

        {rows && rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center">
            <LayoutGrid className="mx-auto h-6 w-6 text-stone-300" />
            <p className="mt-3 font-display text-sm font-semibold text-charcoal">No community layouts yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-stone-400">
              Be the first — build a floor in the studio, then hit <span className="font-semibold text-stone-500">Layouts → Save</span> in the toolbar. Saved plans land here.
            </p>
          </div>
        )}

        {rows && rows.length > 0 && rows.map((row, i) => {
          const venue = VENUES[row.templateId as 'cafe']
          return (
            <motion.article
              key={row.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: Math.min(i, 3) * 0.07, ease: 'easeOut' }}
              className="group flex flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg"
            >
              {/* thumbnail */}
              <div className="blueprint-grid relative aspect-[4/3] overflow-hidden border-b border-stone-100">
                {row.thumb ? (
                  <img
                    src={row.thumb}
                    alt={`Floor plan preview of ${row.name}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${row.brandColor}14` }}>
                    <LayoutGrid className="h-8 w-8" style={{ color: row.brandColor }} />
                  </div>
                )}
                <span
                  className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-charcoal shadow-sm ring-1 ring-charcoal/10"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.brandColor }} aria-hidden />
                  {venue ? venue.label.split(' / ')[0] : 'Custom'}
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-charcoal/90 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-warmwhite">
                  {row.areaM2 > 0 ? `${row.areaM2.toFixed(0)} m²` : '—'}
                </span>
              </div>

              {/* body */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display truncate text-sm font-bold tracking-tight text-charcoal" title={row.name}>
                  {row.name}
                </h3>
                <p className="mt-1 flex items-center gap-2 text-[11px] text-stone-400">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" aria-hidden />{row.seats} {row.seats === 1 ? 'seat' : 'seats'}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">{row.itemCount} items</span>
                </p>
                <p className="mt-0.5 text-[10.5px] text-stone-400">
                  saved {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })}
                </p>
                <div className="mt-auto pt-3">
                  <Button
                    size="sm"
                    disabled={loadingId === row.id}
                    onClick={() => void handleOpen(row)}
                    className="h-8 w-full gap-1.5 bg-charcoal text-[11px] font-semibold text-warmwhite shadow-xs transition-all hover:bg-charcoal/90 active:scale-[0.98]"
                    aria-label={`Open ${row.name} in the studio`}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Open in the studio
                  </Button>
                </div>
              </div>
            </motion.article>
          )
        })}
      </div>

      {/* footnote */}
      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-stone-400">
        <Sparkles className="h-3 w-3" aria-hidden />
        Save your own from the toolbar’s <span className="font-semibold text-stone-500">Layouts</span> menu — it joins this wall instantly.
      </p>
    </section>
  )
}
