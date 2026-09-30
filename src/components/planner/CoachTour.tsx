'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Compass, Keyboard, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SHORTCUTS_EVENT } from './ShortcutsDialog'

export const TOUR_EVENT = 'forma:start-tour'
const TOUR_DONE_KEY = 'forma-tour-done'

interface TourStep {
  id: string
  title: string
  body: string
}

const STEPS: TourStep[] = [
  {
    id: 'canvas',
    title: 'The studio floor',
    body: 'This is your room, live in 3D. Click any furniture piece in the library, then click the floor to place it. Drag pieces to move, right-click for quick actions.',
  },
  {
    id: 'catalog',
    title: 'Furniture library',
    body: '31 real pieces with footprints, seat counts and trade prices — searchable and filtered by category. Every placement feeds the numbers around the studio.',
  },
  {
    id: 'view-toggle',
    title: 'Plan ↔ 3D swing',
    body: 'One click swings the camera between a measured top-down plan and a walkthrough perspective. Keys 1 and 2 do the same without leaving the canvas.',
  },
  {
    id: 'fire',
    title: 'Fire egress, live',
    body: 'Toggle this and animated green arrows trace escape routes to both exits. The readiness checks in the estimate flag anything parked in an exit landing.',
  },
  {
    id: 'brand',
    title: 'Your signature color',
    body: 'Pick a brand color and every branded surface — chair pads, counter fronts, signage, rugs — repaints instantly across plan and 3D.',
  },
  {
    id: 'cost',
    title: 'The running estimate',
    body: 'Cost, seats, capacity and readiness checks update with every move. Set a budget guardrail and the pill turns amber, then red, as you approach it.',
  },
  {
    id: 'export',
    title: 'Prove it on paper',
    body: 'Export a client-ready PDF with a build-up animation, or grab the plan as PNG and the bill of materials as CSV. Ready for the bank, the landlord, the inspector.',
  },
]

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const CARD_W = 312
const CARD_GAP = 14

function measureTarget(id: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${id}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

/** First-visit guided tour: spotlight overlay anchored to real studio elements. */
export default function CoachTour() {
  const [step, setStep] = useState<number | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null)

  const open = step !== null

  const remeasure = useCallback((s: number) => {
    const target = STEPS[s]
    const r = measureTarget(target.id)
    setRect(r)
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (!r) {
      setCardPos({ top: Math.max(96, vh / 2 - 160), left: Math.max(16, vw / 2 - CARD_W / 2) })
      return
    }
    // prefer below the target, else above, clamped to the viewport
    const belowTop = r.top + r.height + CARD_GAP
    const aboveTop = r.top - CARD_GAP - 260
    let top: number
    if (belowTop + 260 < vh) top = belowTop
    else if (aboveTop > 12) top = aboveTop
    else top = Math.max(12, Math.min(vh - 272, belowTop))
    let left = r.left + r.width / 2 - CARD_W / 2
    left = Math.max(12, Math.min(vw - CARD_W - 12, left))
    setCardPos({ top, left })
  }, [])

  // auto-start once for first-time visitors on a desktop-sized window
  useEffect(() => {
    if (localStorage.getItem(TOUR_DONE_KEY) === '1') return
    if (window.innerWidth < 1024) return
    const t = setTimeout(() => {
      setStep(0)
      localStorage.setItem(TOUR_DONE_KEY, '1')
    }, 1400)
    return () => clearTimeout(t)
  }, [])

  useLayoutEffect(() => {
    if (step === null) return
    const raf = requestAnimationFrame(() => remeasure(step))
    const onReflow = () => remeasure(step)
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [step, remeasure])

  // manual start (toolbar Help menu) + keyboard navigation while the tour is open
  useEffect(() => {
    const onStart = () => setStep(0)
    window.addEventListener(TOUR_EVENT, onStart)
    return () => window.removeEventListener(TOUR_EVENT, onStart)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStep(null)
      else if (e.key === 'ArrowRight' || e.key === 'Enter') setStep((s) => (s === null ? null : Math.min(s + 1, STEPS.length - 1)))
      else if (e.key === 'ArrowLeft') setStep((s) => (s === null ? null : Math.max(s - 1, 0)))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const finish = () => setStep(null)

  const s = step !== null ? STEPS[step] : null

  return (
    <AnimatePresence>
      {open && s && (
        <motion.div
          key="tour"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[70]"
          role="dialog"
          aria-modal="true"
          aria-label="Studio tour"
        >
          {/* scrim with animated cutout */}
          <motion.div
            className="pointer-events-none absolute rounded-xl ring-2 ring-warmwhite/90"
            style={{ boxShadow: '0 0 0 9999px rgba(31,27,21,0.74)' }}
            animate={
              rect
                ? { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, opacity: 1 }
                : { opacity: 0 }
            }
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
          />

          {/* card */}
          {cardPos && (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="fixed w-[312px] rounded-2xl border border-stone-200/80 bg-warmwhite p-4 shadow-[0_28px_70px_-20px_rgba(20,17,12,0.55)]"
              style={{ top: cardPos.top, left: cardPos.left }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-display flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                  <Compass className="h-3.5 w-3.5" />
                  Tour · {step + 1} of {STEPS.length}
                </p>
                <button
                  onClick={finish}
                  aria-label="Skip the tour"
                  className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-charcoal"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* progress dots */}
              <div className="mt-3 flex gap-1.5" aria-hidden>
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={
                      'h-1 flex-1 rounded-full transition-colors duration-300 ' +
                      (i === step ? 'bg-charcoal' : i < (step ?? 0) ? 'bg-stone-300' : 'bg-stone-200/70')
                    }
                  />
                ))}
              </div>

              <h3 className="font-display mt-3 text-base font-bold tracking-tight text-charcoal">{s.title}</h3>
              <p className="mt-1.5 min-h-[72px] text-xs leading-relaxed text-stone-500">{s.body}</p>

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => {
                    window.dispatchEvent(new Event(SHORTCUTS_EVENT))
                    finish()
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-400 transition-colors hover:text-charcoal"
                >
                  <Keyboard className="h-3.5 w-3.5" />
                  Shortcuts
                </button>
                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-stone-500" onClick={() => setStep(step - 1)}>
                      Back
                    </Button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => setStep(step + 1)}
                      className="h-8 bg-charcoal px-3 text-xs font-semibold text-warmwhite hover:bg-charcoal/90"
                    >
                      Next
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={finish}
                      className="h-8 bg-charcoal px-3 text-xs font-semibold text-warmwhite hover:bg-charcoal/90"
                    >
                      Start planning
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Re-openable entry point (toolbar Help menu). */
export function startTour() {
  localStorage.setItem(TOUR_DONE_KEY, '1')
  window.dispatchEvent(new Event(TOUR_EVENT))
}
