import { ArrowDown, Compass, DraftingCompass, Flame, Users } from 'lucide-react'
import PlannerWorkspace from '@/components/planner/PlannerWorkspace'
import { BrandStrip, CapacityGuide, TemplateGallery } from '@/components/planner/sections'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ── top nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-warmwhite/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="#planner" className="flex items-center gap-2.5 rounded-md">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-charcoal text-warmwhite shadow-xs">
              <DraftingCompass className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-bold tracking-tight text-charcoal">FORMA</span>
            <span className="hidden rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400 shadow-xs sm:inline">
              space planner
            </span>
          </a>
          <nav aria-label="Main" className="hidden items-center gap-1 text-xs font-medium text-stone-500 md:flex">
            {[
              ['#planner', 'Studio'],
              ['#templates', 'Templates'],
              ['#capacity', 'Capacity'],
              ['#brand', 'Brand'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-md px-2.5 py-1.5 transition-colors hover:bg-stone-100/80 hover:text-charcoal"
              >
                {label}
              </a>
            ))}
          </nav>
          <Button
            asChild
            className="h-8 bg-charcoal px-3 text-xs font-semibold text-warmwhite shadow-xs transition-all hover:bg-charcoal/90 hover:shadow-md"
          >
            <a href="#planner">Open the studio</a>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* ── hero + workspace ──────────────────────────────────── */}
        <section id="planner" className="relative mx-auto w-full max-w-7xl scroll-mt-16 px-4 pb-14 pt-12 sm:px-6 sm:pt-16">
          {/* decorative blueprint band behind the hero copy */}
          <div
            aria-hidden
            className="blueprint-band pointer-events-none absolute inset-x-4 -top-6 -z-10 h-52 opacity-80 sm:inset-x-6"
          />
          <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="font-display inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 shadow-xs">
                <Compass className="h-3.5 w-3.5" style={{ color: 'var(--chart-1)' }} />
                For cafés · co-working · boutique retail
              </p>
              <h1 className="font-display mt-5 max-w-2xl text-balance text-3xl font-bold leading-[1.06] tracking-tight text-charcoal sm:text-5xl">
                Lay out your space.
                <br />
                <span className="text-stone-400">Watch it cost itself.</span>
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-sm leading-relaxed text-stone-500 sm:text-base">
                A working coffee shop below — drag counters, click in chairs, swing between plan and 3D.
                Seats, fire egress and a fit-out budget update as you go.
              </p>
            </div>
            <dl className="hidden items-stretch gap-8 border-l border-stone-200 pl-8 lg:flex">
              {[
                { icon: Users, k: '31', v: 'furniture pieces' },
                { icon: Flame, k: '2 exits', v: 'egress checked live' },
                { icon: ArrowDown, k: '1 PDF', v: 'layout sheet export' },
              ].map((s) => (
                <div key={s.v} className="flex flex-col justify-end">
                  <dd className="font-display order-1 text-2xl font-bold leading-none tabular-nums tracking-tight text-charcoal">
                    {s.k}
                  </dd>
                  <dt className="order-2 mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-stone-400">
                    <s.icon className="h-3 w-3 text-stone-400" />
                    {s.v}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-9">
            <PlannerWorkspace />
          </div>

          <p className="mx-auto mt-4 max-w-2xl text-center text-[11px] leading-relaxed text-stone-400">
            Tip: drag furniture to move it · press <kbd className="rounded border border-stone-300 bg-white px-1 font-mono text-[10px] shadow-xs">R</kbd> to rotate ·
            <kbd className="ml-1 rounded border border-stone-300 bg-white px-1 font-mono text-[10px] shadow-xs">Del</kbd> to remove ·
            switch Plan / 3D for the camera swing.
          </p>
        </section>

        <TemplateGallery />
        <CapacityGuide />
        <BrandStrip />
      </main>

      {/* ── sticky footer ──────────────────────────────────────── */}
      <footer className="mt-auto bg-charcoal text-stone-300">
        {/* subtle top highlight hairline */}
        <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-warmwhite/25 to-transparent" />
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-12 pt-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1.3fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-warmwhite text-charcoal shadow-xs">
                <DraftingCompass className="h-4 w-4" />
              </span>
              <span className="font-display text-base font-bold tracking-tight text-warmwhite">FORMA</span>
            </div>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-stone-400">
              A practical space planner for small commercial interiors — plan, price and prove a layout before signing a lease.
            </p>
          </div>
          <nav aria-label="Footer" className="text-xs">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Studio</p>
            <span aria-hidden className="mt-2.5 block h-px w-8 bg-stone-700" />
            <ul className="mt-4 space-y-2.5">
              {[
                ['#planner', 'Workspace'],
                ['#templates', 'Templates'],
                ['#capacity', 'Capacity planner'],
                ['#brand', 'Brand color'],
              ].map(([href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="group inline-flex items-center gap-1.5 text-stone-400 transition-all duration-150 hover:translate-x-0.5 hover:text-warmwhite"
                  >
                    <span aria-hidden className="h-px w-0 bg-stone-500 transition-all duration-200 group-hover:w-2.5" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="text-xs">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Good to know</p>
            <span aria-hidden className="mt-2.5 block h-px w-8 bg-stone-700" />
            <p className="mt-4 max-w-sm leading-relaxed text-stone-400">
              Capacity, egress and cost figures are rules of thumb for early planning.
              Always verify occupancy and fire safety with your local code official before opening day.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1.5 px-4 pt-5 pb-safe text-[11px] text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© 2025 FORMA Studio. Documentary-style photography generated for this demo.</p>
            <p className="inline-flex items-center gap-1.5">
              <DraftingCompass className="h-3 w-3" aria-hidden />
              Plan, price, prove — before the lease is signed.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
