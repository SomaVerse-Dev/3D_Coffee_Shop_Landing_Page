'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Scene from './Scene'
import Toolbar from './Toolbar'
import CatalogSidebar from './CatalogSidebar'
import CostPanel from './CostPanel'
import ExportModal from './ExportModal'
import { CapacityMeter } from './CapacityMeter'
import { HintChip, PlanMinimap, SelectionControls } from './ViewportHud'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlanner } from '@/lib/planner/store'
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
  const rotateItem = usePlanner((s) => s.rotateItem)
  const removeItem = usePlanner((s) => s.removeItem)

  // rehydrate persisted state after mount (skipHydration is set in the store)
  useEffect(() => {
    void usePlanner.persist.rehydrate()
  }, [])

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.key === 'Escape') {
        arm(null)
        select(null)
      } else if ((e.key === 'r' || e.key === 'R') && selectedUid) {
        rotateItem(selectedUid)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedUid) {
        removeItem(selectedUid)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedUid, rotateItem, removeItem, arm, select])

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-300/60 bg-card shadow-[0_24px_60px_-24px_rgba(46,43,38,0.35)]">
      <Toolbar onExport={() => setExportOpen(true)} onOpenCatalog={() => setCatalogSheet(true)} />

      <div className="flex">
        {/* desktop catalog */}
        <aside className="hidden w-[292px] shrink-0 border-r border-stone-200/70 lg:block" aria-label="Furniture library">
          {mounted ? (
            <div className="h-[560px]">
              <CatalogSidebar />
            </div>
          ) : (
            <SidebarSkeleton />
          )}
        </aside>

        {/* viewport */}
        <div className="blueprint-grid relative min-h-[440px] flex-1 lg:h-[560px]">
          {!mounted ? (
            <ViewportSkeleton />
          ) : (
            <>
              <Scene />

              {/* HUD */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
                <div className="flex items-start justify-between gap-3">
                  <HintChip />
                  <PlanMinimap />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <CapacityMeter />
                  <AnimatePresence mode="wait">
                    {selectedUid && (
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
