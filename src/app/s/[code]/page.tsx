import type { Metadata } from 'next'
import Link from 'next/link'
import { decodeLayout } from '@/lib/planner/share'
import { VENUES } from '@/lib/planner/capacity'

interface PageProps {
  params: Promise<{ code: string }>
}

/** 1200×630 card rendered by the sibling opengraph-image.tsx. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params
  const snap = decodeLayout(code)
  if (!snap) {
    return {
      title: 'Shared layout — FORMA',
      description: 'A 3D commercial space plan shared with FORMA.',
    }
  }
  const area = (snap.room.w * snap.room.d).toFixed(0)
  const venue = snap.templateId === 'custom' ? 'Custom layout' : VENUES[snap.templateId].label
  const title = `${snap.projectName} — FORMA space plan`
  const description = `${venue} · ${snap.room.w}×${snap.room.d} m (${area} m²) · ${snap.items.length} pieces placed. Open the interactive 3D planner.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

/**
 * Landing for /s/<code> share links: meta tags for chat/crawler preview cards,
 * then an instant client redirect into the planner (?plan=<code>).
 */
export default async function ShareLanding({ params }: PageProps) {
  const { code } = await params
  const snap = decodeLayout(code)
  const target = `/?plan=${encodeURIComponent(code)}`

  return (
    <main className="blueprint-grid flex min-h-screen items-center justify-center bg-warmwhite px-6">
      {/* instant redirect for humans — crawlers stay and read the meta tags above */}
      <script
        dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(target)})` }}
      />
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white/85 p-7 text-center shadow-[0_24px_60px_-24px_rgba(46,43,38,0.35)] backdrop-blur">
        <div className="mx-auto flex items-center justify-center gap-2.5">
          <span className="h-7 w-7 rounded-lg bg-[#C05B2E] shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]" aria-hidden />
          <span className="font-display text-lg font-bold tracking-tight text-charcoal">FORMA</span>
        </div>
        {snap ? (
          <>
            <h1 className="font-display mt-5 text-xl font-bold tracking-tight text-charcoal">
              {snap.projectName}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              {snap.room.w}×{snap.room.d} m · {snap.items.length} pieces — opening the interactive studio…
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display mt-5 text-xl font-bold tracking-tight text-charcoal">
              This share link looks broken
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              The layout code could not be decoded. Ask for a fresh link, or start a new plan.
            </p>
          </>
        )}
        <div className="mt-5 flex items-center justify-center gap-2" aria-hidden>
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#C05B2E]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#C05B2E] [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#C05B2E] [animation-delay:300ms]" />
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex h-9 items-center rounded-lg bg-charcoal px-4 text-xs font-semibold text-warmwhite transition-colors hover:bg-charcoal/90"
        >
          Open the studio
        </Link>
      </div>
    </main>
  )
}
