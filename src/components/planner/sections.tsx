'use client'

import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, Calculator, DoorOpen, Flame, Ruler, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlanner } from '@/lib/planner/store'
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
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/45 via-charcoal/5 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100"
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
