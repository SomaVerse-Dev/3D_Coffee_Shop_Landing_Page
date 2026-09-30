'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PlanSVG from './PlanSVG'
import { usePlanner } from '@/lib/planner/store'
import { computeCapacity, computeCost, fmtMoney, VENUES, EXIT_CAPACITY } from '@/lib/planner/capacity'
import { TEMPLATES } from '@/lib/planner/templates'
import { useToast } from '@/hooks/use-toast'

const STAGE_MS = 430
const STAGE_LABELS = [
  'Preparing sheet…',
  'Drafting blueprint grid…',
  'Drawing walls & doors…',
  'Placing furniture…',
  'Plotting egress arrows…',
  'Stamping title block…',
]

export default function ExportModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const room = usePlanner((s) => s.room)
  const items = usePlanner((s) => s.items)
  const brand = usePlanner((s) => s.brandColor)
  const showFire = usePlanner((s) => s.showFire)
  const zones = usePlanner((s) => s.zones)
  const showZones = usePlanner((s) => s.showZones)
  const templateId = usePlanner((s) => s.templateId)
  const projectName = usePlanner((s) => s.projectName)
  const setProjectName = usePlanner((s) => s.setProjectName)
  const { toast } = useToast()

  const [stage, setStage] = useState(0)
  const [busy, setBusy] = useState(false)
  const exportSvgRef = useRef<SVGSVGElement | null>(null)

  const venue = templateId === 'custom' ? 'cafe' : templateId
  const cap = useMemo(() => computeCapacity(items, room, venue), [items, room, venue])
  const cost = useMemo(() => computeCost(items), [items])
  const templateName = templateId === 'custom' ? 'Custom layout' : TEMPLATES[templateId].name

  useEffect(() => {
    if (!open) return
    setStage(0)
    const t = setInterval(() => {
      setStage((s) => {
        if (s >= 5) {
          clearInterval(t)
          return s
        }
        return s + 1
      })
    }, STAGE_MS)
    return () => clearInterval(t)
  }, [open])

  const ready = stage >= 5

  async function downloadPdf() {
    if (!exportSvgRef.current) return
    setBusy(true)
    try {
      const svg = exportSvgRef.current
      const xml = new XMLSerializer().serializeToString(svg)
      const img = new Image()
      const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('SVG render failed'))
        img.src = svgUrl
      })

      const W = 1240
      const H = 1754 // A4 @150dpi
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#FDFAF3'
      ctx.fillRect(0, 0, W, H)

      // header
      ctx.fillStyle = brand
      ctx.fillRect(60, 64, 46, 46)
      ctx.fillStyle = '#2E2B26'
      ctx.font = '700 44px system-ui, sans-serif'
      ctx.fillText('FORMA', 122, 100)
      ctx.font = '500 17px system-ui, sans-serif'
      ctx.fillStyle = '#8A8375'
      ctx.fillText('COMMERCIAL SPACE PLANNER — LAYOUT SHEET', 122, 124)

      // plan image
      const planW = Math.min(W - 120, 1000)
      const planH = (img.height / img.width) * planW
      ctx.drawImage(img, (W - planW) / 2, 170, planW, planH)

      // title block
      const ty = Math.min(H - 240, 170 + planH + 44)
      ctx.strokeStyle = '#D8D0BC'
      ctx.lineWidth = 2
      ctx.strokeRect(60, ty, W - 120, H - ty - 60)
      ctx.fillStyle = brand
      ctx.fillRect(60, ty, 10, H - ty - 60)

      ctx.fillStyle = '#2E2B26'
      ctx.font = '700 34px system-ui, sans-serif'
      ctx.fillText(projectName || 'Untitled project', 100, ty + 58)
      ctx.font = '500 19px system-ui, sans-serif'
      ctx.fillStyle = '#8A8375'
      ctx.fillText(`${templateName} · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 100, ty + 88)

      const stats: Array<[string, string]> = [
        ['Floor area', `${cap.area.toFixed(1)} m²`],
        ['Seats', `${cap.seats}`],
        ['Area per seat', cap.m2PerSeat ? `${cap.m2PerSeat.toFixed(2)} m²` : '—'],
        ['Occupant load', `${cap.occupantLoad} / egress ${EXIT_CAPACITY}`],
        ['Items placed', `${items.length}`],
        ['Estimated cost', fmtMoney(cost.total)],
      ]
      stats.forEach(([k, v], i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        const x = 100 + col * 300
        const y = ty + 140 + row * 64
        ctx.fillStyle = '#8A8375'
        ctx.font = '600 14px system-ui, sans-serif'
        ctx.fillText(k.toUpperCase(), x, y)
        ctx.fillStyle = '#2E2B26'
        ctx.font = '700 26px system-ui, sans-serif'
        ctx.fillText(v, x, y + 32)
      })

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297)
      doc.save(`${(projectName || 'forma-layout').replace(/\s+/g, '-').toLowerCase()}.pdf`)

      toast({ title: 'Layout sheet exported', description: 'Your PDF plan has been downloaded.' })
    } catch {
      toast({ title: 'Export failed', description: 'Could not render the plan sheet. Please try again.', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-6 overflow-hidden bg-warmwhite p-6 sm:max-w-3xl lg:flex lg:flex-row">
        <DialogHeader className="sr-only">
          <DialogTitle>Export layout sheet</DialogTitle>
          <DialogDescription>Preview and download your layout as a PDF sheet.</DialogDescription>
        </DialogHeader>

        {/* animated sheet */}
        <div className="mx-auto w-full max-w-[330px] shrink-0">
          <motion.div
            initial={{ y: 26, opacity: 0, rotate: -1.5 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            className="relative aspect-[210/297] w-full overflow-hidden rounded-sm border border-stone-300 bg-[#FDFAF3] shadow-xl"
          >
            {/* grid stage */}
            <motion.div
              className="blueprint-grid absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: stage >= 1 ? 0.5 : 0 }}
              transition={{ duration: 0.4 }}
            />
            {/* walls stage */}
            <motion.div
              className="absolute inset-0 flex items-start justify-center pt-5"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: stage >= 2 ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
              transition={{ duration: 0.55, ease: 'easeInOut' }}
            >
              <PlanSVG room={room} items={[]} brand={brand} className="h-auto w-[86%]" />
            </motion.div>
            {/* items stage */}
            <motion.div
              className="absolute inset-0 flex items-start justify-center pt-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: stage >= 3 ? 1 : 0, y: stage >= 3 ? 0 : 8 }}
              transition={{ duration: 0.4 }}
            >
              <PlanSVG room={room} items={items} brand={brand} transparentPaper className="h-auto w-[86%]" />
            </motion.div>
            {/* egress stage */}
            {showFire && (
              <motion.div
                className="absolute inset-0 flex items-start justify-center pt-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: stage >= 4 ? 1 : 0 }}
                transition={{ duration: 0.45 }}
              >
                <PlanSVG room={room} items={[]} brand={brand} showFire transparentPaper className="h-auto w-[86%]" />
              </motion.div>
            )}
            {/* title block stamp */}
            <motion.div
              className="absolute inset-x-4 bottom-4 rounded-sm border-2 p-2.5"
              style={{ borderColor: brand }}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={stage >= 5 ? { scale: 1, opacity: 1 } : { scale: 1.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display truncate text-sm font-bold text-charcoal">{projectName || 'Untitled'}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{templateName}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-stone-500">
                <span>{cap.area.toFixed(0)} m² · {cap.seats} seats · load {cap.occupantLoad}</span>
                <span className="font-bold" style={{ color: brand }}>{fmtMoney(cost.total)}</span>
              </div>
            </motion.div>
          </motion.div>
          <p className="mt-3 h-4 text-center text-[11px] font-medium text-stone-400">
            {ready ? 'Sheet ready.' : STAGE_LABELS[stage]}
          </p>
        </div>

        {/* right column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="font-display text-lg font-bold tracking-tight text-charcoal">Export layout sheet</h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            A print-ready A4 sheet with your plan, key stats and cost estimate — perfect for landlords, lenders or your contractor.
          </p>

          <div className="mt-4">
            <Label htmlFor="project-name" className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              Project name
            </Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="mt-1.5 h-9 bg-white text-sm"
              placeholder="Corner Café"
            />
          </div>

          <dl className="mt-4 divide-y divide-stone-200/70 rounded-lg border border-stone-200/70 bg-white/60 px-4 text-xs">
            {[
              ['Template', templateName],
              ['Floor area', `${cap.area.toFixed(1)} m²`],
              ['Seats / occupant load', `${cap.seats} · ${cap.occupantLoad}/${EXIT_CAPACITY}`],
              ['Items placed', `${items.length}`],
              ['Estimated cost', fmtMoney(cost.total)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2">
                <dt className="text-stone-500">{k}</dt>
                <dd className="font-semibold text-charcoal">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-auto pt-5">
            <Button
              onClick={downloadPdf}
              disabled={!ready || busy}
              className="h-10 w-full bg-charcoal text-xs font-semibold text-warmwhite hover:bg-charcoal/90"
            >
              {busy ? 'Rendering PDF…' : ready ? 'Download PDF' : 'Building sheet…'}
            </Button>
            <p className="mt-2 text-center text-[10.5px] text-stone-400">
              Rule-of-thumb guidance only — verify egress with your local code official.
            </p>
          </div>
        </div>

        {/* hidden full-fidelity SVG for serialization */}
        <div className="pointer-events-none absolute -left-[9999px] top-0" aria-hidden>
          <PlanSVG
            refCb={(el) => { exportSvgRef.current = el }}
            room={room}
            items={items}
            brand={brand}
            showFire={showFire}
            detailed
            zones={zones}
            showZones={showZones}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
