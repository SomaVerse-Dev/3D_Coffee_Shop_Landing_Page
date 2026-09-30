'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Scene from './Scene'
import Toolbar from './Toolbar'
import CatalogSidebar from './CatalogSidebar'
import CostPanel from './CostPanel'
import ExportModal from './ExportModal'
import ItemContextMenu from './ItemContextMenu'
import ViewControls from './ViewControls'
import ShortcutsDialog from './ShortcutsDialog'
import CoachTour from './CoachTour'
import { CapacityMeter } from './CapacityMeter'
import { HintChip, PlanMinimap, SelectionControls, GroupSelectionControls } from './ViewportHud'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { usePlanner } from '@/lib/planner/store'
import { getItem } from '@/lib/planner/catalog'
import { decodeLayout } from '@/lib/planner/share'
import { TEMPLATES, TEMPLATE_ORDER } from '@/lib/planner/templates'

const emptySubscribe = () => () => {}

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}

export default function PlannerWorkspace() {
  const mounted = useMounted()
  const [exportOpen, setExportOpen] = useState(false)
  const [catalogSheet, setCatalogSheet] = useState(false)
  const arm = usePlanner((s) => s.arm)
  const select = usePlanner((s) => s.select)
  const selectedUid = usePlanner((s) => s.selectedUid)
  const selectedUids = usePlanner((s) => s.selectedUids)
  const rotateItem = usePlanner((s) => s.rotateItem)
  const removeItem = usePlanner((s) => s.removeItem)
  const undo = usePlanner((s) => s.undo)
  const redo = usePlanner((s) => s.redo)
  const applySnapshot = usePlanner((s) => s.applySnapshot)
  const duplicateItem = usePlanner((s) => s.duplicateItem)
  const requestZoom = usePlanner((s) => s.requestZoom)
  const setViewMode = usePlanner((s) => s.setViewMode)
  const moveItem = usePlanner((s) => s.moveItem)
  // group ops (multi-selection)
  const rotateItems = usePlanner((s) => s.rotateItems)
  const removeItems = usePlanner((s) => s.removeItems)
  const duplicateItems = usePlanner((s) => s.duplicateItems)
  const nudgeItems = usePlanner((s) => s.nudgeItems)
  const selectAll = usePlanner((s) => s.selectAll)
  const measureMode = usePlanner((s) => s.measureMode)
  const measureTarget = usePlanner((s) => s.measureTarget)
  const areaPts = usePlanner((s) => s.areaPts)
  const setMeasureMode = usePlanner((s) => s.setMeasureMode)
  const stopMeasure = usePlanner((s) => s.stopMeasure)
  const closeArea = usePlanner((s) => s.closeArea)
  const undoAreaPt = usePlanner((s) => s.undoAreaPt)
  const items = usePlanner((s) => s.items)
  const { toast } = useToast()
  const [announce, setAnnounce] = useState('')
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // rehydrate persisted state after mount (skipHydration is set in the store)
  useEffect(() => {
    void usePlanner.persist.rehydrate()
    // dev-only QA handle for browser automation
    if (process.env.NODE_ENV !== 'production') {
      ;(window as unknown as { __forma?: typeof usePlanner }).__forma = usePlanner
    }
  }, [])

  // open a shared layout from ?plan=<code>
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('plan')
    if (!code) return
    const snap = decodeLayout(code)
    if (snap) {
      applySnapshot(snap)
      toast({ title: 'Shared layout opened', description: `“${snap.projectName}” — ${snap.items.length} items.` })
    } else {
      toast({ title: 'That share link looks broken', variant: 'destructive' })
    }
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  // screen-reader announcements (selection + placement)
  useEffect(() => {
    if (!selectedUid) return
    const it = items.find((i) => i.uid === selectedUid)
    const cat = it ? getItem(it.id) : null
    if (!it || !cat) return
    if (announceTimer.current) clearTimeout(announceTimer.current)
    announceTimer.current = setTimeout(() => {
      setAnnounce(
        `${cat.name} selected at ${it.x.toFixed(1)} by ${it.z.toFixed(1)} meters. ` +
        'Arrow keys nudge, Shift plus arrows for bigger steps, R rotates, D duplicates, Delete removes.',
      )
    }, 250)
    return () => {
      if (announceTimer.current) clearTimeout(announceTimer.current)
    }
  }, [selectedUid, items])

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      // a modal dialog / sheet is open (zone editor, cost panel, export…):
      // item shortcuts must not double-fire underneath it — but undo/redo
      // (advertised inside the zone editor) and Escape still pass through
      const dialogOpen = !!document.querySelector('[role="dialog"]')
      if (dialogOpen && e.key !== 'Escape' && !(e.metaKey || e.ctrlKey)) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        redo()
        return
      }
      if (mod && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        selectAll()
        return
      }
      if (e.key === 'Escape') {
        stopMeasure()
        arm(null)
        select(null)
      } else if (e.key === 'Enter' && measureMode && measureTarget === 'area') {
        // commit the area polygon
        closeArea()
      } else if ((e.key === 'Backspace') && measureMode && measureTarget === 'area' && areaPts.length > 0) {
        // step back one vertex while drawing an area polygon
        e.preventDefault()
        undoAreaPt()
      } else if ((e.key === 'r' || e.key === 'R') && !mod && selectedUids.length > 1) {
        rotateItems(selectedUids)
      } else if ((e.key === 'r' || e.key === 'R') && !mod && selectedUid) {
        rotateItem(selectedUid)
      } else if ((e.key === 'd' || e.key === 'D') && !mod && selectedUids.length > 1) {
        e.preventDefault()
        duplicateItems(selectedUids)
      } else if ((e.key === 'd' || e.key === 'D') && !mod && selectedUid) {
        e.preventDefault()
        duplicateItem(selectedUid)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !mod && selectedUids.length > 1) {
        e.preventDefault()
        removeItems(selectedUids)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !mod && selectedUid) {
        e.preventDefault()
        removeItem(selectedUid)
      } else if (e.key.startsWith('Arrow') && !mod && selectedUids.length > 1) {
        // nudge the whole group: 5 cm per press, 25 cm with Shift (up = north)
        e.preventDefault()
        const step = e.shiftKey ? 0.25 : 0.05
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dz = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        nudgeItems(selectedUids, dx, dz)
      } else if (e.key.startsWith('Arrow') && !mod && selectedUid) {
        // nudge the selected piece: 5 cm per press, 25 cm with Shift (up = north)
        e.preventDefault()
        const it = items.find((i) => i.uid === selectedUid)
        if (!it) return
        const step = e.shiftKey ? 0.25 : 0.05
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dz = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        moveItem(selectedUid, it.x + dx, it.z + dz)
      } else if ((e.key === 'm' || e.key === 'M') && !mod) {
        e.preventDefault()
        setMeasureMode(!measureMode)
      } else if ((e.key === 'f' || e.key === 'F') && !mod) {
        requestZoom('fit')
      } else if ((e.key === '+' || e.key === '=') && !mod) {
        requestZoom('in')
      } else if ((e.key === '-' || e.key === '_') && !mod) {
        requestZoom('out')
      } else if (e.key === '1' && !mod) {
        setViewMode('plan')
      } else if (e.key === '2' && !mod) {
        setViewMode('3d')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedUid, selectedUids, items, rotateItem, removeItem, duplicateItem, moveItem, rotateItems, removeItems, duplicateItems, nudgeItems, selectAll, arm, select, undo, redo, requestZoom, setViewMode, measureMode, measureTarget, areaPts, setMeasureMode, stopMeasure, closeArea, undoAreaPt])

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-300/60 bg-card shadow-[0_24px_60px_-24px_rgba(46,43,38,0.35)]">
      <Toolbar onExport={() => setExportOpen(true)} onOpenCatalog={() => setCatalogSheet(true)} />

      <div className="flex">
        {/* desktop catalog */}
        <aside className="hidden w-[292px] shrink-0 border-r border-stone-200/70 lg:block" aria-label="Furniture library" data-tour="catalog">
          {mounted ? (
            <div className="h-[560px]">
              <CatalogSidebar />
            </div>
          ) : (
            <SidebarSkeleton />
          )}
        </aside>

        {/* viewport — focusable so keyboard users land straight on the floor */}
        <div
          className="blueprint-grid relative min-h-[440px] flex-1 outline-none focus-visible:ring-2 focus-visible:ring-stone-400/80 focus-visible:ring-inset lg:h-[560px]"
          data-tour="canvas"
          tabIndex={0}
          role="group"
          aria-label={`Plan editor viewport. ${items.length} pieces placed. Click a piece to select it, then use arrow keys to nudge.`}
        >
          {!mounted ? (
            <ViewportSkeleton />
          ) : (
            <>
              <Scene />
              <ViewControls />
              <ItemContextMenu />

              {/* HUD */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
                <div className="flex items-start justify-between gap-3">
                  <HintChip />
                  <PlanMinimap />
                </div>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <CapacityMeter />
                  <AnimatePresence mode="wait">
                    {selectedUids.length > 1 && (
                      <motion.div
                        key="group-sel"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="order-first flex w-full justify-center md:order-none md:block md:w-auto"
                      >
                        <GroupSelectionControls />
                      </motion.div>
                    )}
                    {selectedUids.length <= 1 && selectedUid && (
                      <motion.div
                        key="sel"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="mx-auto"
                      >
                        <SelectionControls />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="hidden w-[236px] md:block" aria-hidden />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* mobile catalog sheet */}
      <Sheet open={catalogSheet} onOpenChange={setCatalogSheet}>
        <SheetContent side="left" className="w-[300px] bg-warmwhite p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Furniture library</SheetTitle>
          </SheetHeader>
          {mounted && (
            <div className="h-full pt-8">
              <CatalogSidebar onPlaced={() => setCatalogSheet(false)} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CostPanel />
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
      <ShortcutsDialog />
      <CoachTour />

      {/* screen-reader live region for selection/placement feedback */}
      <div aria-live="polite" role="status" className="sr-only">
        {announce}
      </div>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-full" />
      <div className="grid grid-cols-2 gap-2 pt-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

function ViewportSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          {TEMPLATE_ORDER.map((id, i) => (
            <span
              key={id}
              className="h-2.5 w-2.5 animate-pulse rounded-full"
              style={{ backgroundColor: TEMPLATES[id].brandColor, animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>
        <p className="text-xs font-medium text-stone-400">Preparing the studio…</p>
      </div>
    </div>
  )
}
