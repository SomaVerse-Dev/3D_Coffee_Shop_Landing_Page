'use client'

import { Box, Calculator, CircleHelp, DoorOpen, FileDown, Keyboard, LayoutGrid, LayoutTemplate, Link2, Map, PenLine, Redo2, Ruler, SwatchBook, TriangleAlert, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { usePlanner } from '@/lib/planner/store'
import { TEMPLATES, TEMPLATE_ORDER } from '@/lib/planner/templates'
import { budgetStatusOf, computeCategorySpend, computeCost } from '@/lib/planner/capacity'
import { BRAND_PRESETS, computedBrandName } from '@/lib/planner/brandNames'
import { buildShareUrl } from '@/lib/planner/share'
import { ZONE_EDITOR_EVENT } from '@/lib/planner/events'
import { cn } from '@/lib/utils'
import LayoutsMenu from './LayoutsMenu'
import SessionHistory from './SessionHistory'
import ZoneEditor from './ZoneEditor'
import { SHORTCUTS_EVENT } from './ShortcutsDialog'
import { startTour } from './CoachTour'

function compactMoney(n: number): string {
  if (n >= 1000) return `$${(Math.round(n / 100) / 10).toFixed(1)}k`
  return `$${n}`
}

export default function Toolbar({ onExport, onOpenCatalog }: { onExport: () => void; onOpenCatalog?: () => void }) {
  const templateId = usePlanner((s) => s.templateId)
  const loadTemplate = usePlanner((s) => s.loadTemplate)
  const room = usePlanner((s) => s.room)
  const setRoom = usePlanner((s) => s.setRoom)
  const viewMode = usePlanner((s) => s.viewMode)
  const setViewMode = usePlanner((s) => s.setViewMode)
  const showFire = usePlanner((s) => s.showFire)
  const toggleFire = usePlanner((s) => s.toggleFire)
  const showZones = usePlanner((s) => s.showZones)
  const toggleZones = usePlanner((s) => s.toggleZones)
  const zonesCount = usePlanner((s) => s.zones.length)
  const [zoneEditorOpen, setZoneEditorOpen] = useState(false)
  const measureMode = usePlanner((s) => s.measureMode)
  const measureA = usePlanner((s) => s.measureA)
  const measureB = usePlanner((s) => s.measureB)
  const setMeasureMode = usePlanner((s) => s.setMeasureMode)
  const brandColor = usePlanner((s) => s.brandColor)
  const setBrandColor = usePlanner((s) => s.setBrandColor)
  const items = usePlanner((s) => s.items)
  const setCostOpen = usePlanner((s) => s.setCostOpen)
  const undoDepth = usePlanner((s) => s.undoDepth)
  const redoDepth = usePlanner((s) => s.redoDepth)
  const undo = usePlanner((s) => s.undo)
  const redo = usePlanner((s) => s.redo)
  const getSnapshot = usePlanner((s) => s.getSnapshot)
  const budget = usePlanner((s) => s.budget)
  const categoryBudgets = usePlanner((s) => s.categoryBudgets)
  const { toast } = useToast()

  const cost = computeCost(items)
  const budgetState = budget !== null ? budgetStatusOf(cost.total, budget) : null
  // category-cap overspends also tint the pill (only when the total budget isn't already red)
  const catSpend = computeCategorySpend(items)
  const overCapLabels = Object.entries(categoryBudgets)
    .filter(([c, cap]) => (catSpend[c as keyof typeof catSpend] ?? 0) > cap)
    .map(([c]) => c)
  const capAlert = budgetState?.status !== 'over' && overCapLabels.length > 0

  // any component can request the zone editor via the window event
  useEffect(() => {
    const openEditor = () => setZoneEditorOpen(true)
    window.addEventListener(ZONE_EDITOR_EVENT, openEditor)
    return () => window.removeEventListener(ZONE_EDITOR_EVENT, openEditor)
  }, [])

  function handleShare() {
    const url = buildShareUrl(getSnapshot())
    void navigator.clipboard
      .writeText(url)
      .then(() => toast({ title: 'Share link copied', description: 'Chat apps show a live preview card; anyone opening it lands in this exact layout.' }))
      .catch(() => toast({ title: url, description: 'Copy this link to share the layout.' }))
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200/80 bg-warmwhite/70 px-3 py-2.5 shadow-[inset_0_-1px_0_0_rgba(226,218,202,0.6)] sm:gap-2 sm:px-4">
        {/* brand */}
        <div className="mr-1 flex items-center gap-2.5 pl-0.5">
          <span
            className="h-8 w-8 rounded-[9px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_1px_3px_rgba(46,43,38,0.3)] ring-1 ring-charcoal/20"
            style={{ backgroundColor: brandColor }}
            aria-hidden
          />
          <div className="leading-none">
            <div className="font-display text-sm font-bold tracking-tight text-charcoal">FORMA</div>
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-stone-400">space planner</div>
          </div>
        </div>

        <Separator orientation="vertical" className="hidden h-8 sm:block" />

        {/* template */}
        <Select value={templateId === 'custom' ? 'custom' : templateId}
          onValueChange={(v) => { if (v !== 'custom') loadTemplate(v as 'cafe') }}>
          <SelectTrigger
            className="h-9 w-[150px] bg-white text-xs font-medium shadow-xs transition-colors hover:border-stone-400/70 data-[size=default]:h-9"
            aria-label="Load template"
          >
            <LayoutTemplate className="h-3.5 w-3.5 text-stone-400" />
            <SelectValue placeholder="Template" />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_ORDER.map((id) => (
              <SelectItem key={id} value={id} className="text-xs">
                {TEMPLATES[id].name}
              </SelectItem>
            ))}
            <SelectItem value="custom" disabled className="text-xs text-stone-400">
              Custom layout
            </SelectItem>
          </SelectContent>
        </Select>

        {/* room size */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 bg-white text-xs font-medium shadow-xs transition-colors hover:border-stone-400/70 hover:bg-white"
              title="Room size"
            >
              <Ruler className="mr-1.5 h-3.5 w-3.5 text-stone-400" />
              <span className="tabular-nums">{room.w}×{room.d} m</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-4">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Room size</p>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs text-stone-600">Width</Label>
                  <span className="text-xs font-semibold text-charcoal">{room.w.toFixed(1)} m</span>
                </div>
                <Slider value={[room.w]} min={6} max={16} step={0.5}
                  onValueChange={([v]) => setRoom(v, room.d)} aria-label="Room width" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs text-stone-600">Depth</Label>
                  <span className="text-xs font-semibold text-charcoal">{room.d.toFixed(1)} m</span>
                </div>
                <Slider value={[room.d]} min={6} max={12} step={0.5}
                  onValueChange={([v]) => setRoom(room.w, v)} aria-label="Room depth" />
              </div>
              <div className="rounded-md bg-stone-50 px-3 py-2 text-[11px] text-stone-500">
                Floor area <span className="font-semibold text-charcoal">{(room.w * room.d).toFixed(1)} m²</span> · furniture auto-clamped inside walls
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="hidden h-8 sm:block" />

        {/* view toggle */}
        <div
          className="flex gap-0.5 rounded-[10px] border border-stone-300/80 bg-white p-0.5 shadow-xs"
          role="group"
          aria-label="View mode"
          data-tour="view-toggle"
        >
          {([['plan', Map, 'Plan'], ['3d', Box, '3D']] as const).map(([mode, Icon, label]) => (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  className={cn(
                    'flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all duration-150',
                    viewMode === mode
                      ? 'bg-charcoal text-warmwhite shadow-sm'
                      : 'text-stone-500 hover:bg-stone-100 hover:text-charcoal',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden 2xl:inline">{label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {mode === 'plan' ? 'Swing to top-down plan' : 'Swing to 3D perspective'}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* fire safety */}
        <label
          className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-stone-300/80 bg-white px-3 shadow-xs transition-colors hover:border-stone-400/70"
          data-tour="fire"
        >
          <DoorOpen className={cn('h-4 w-4 transition-colors', showFire ? 'text-emerald-600' : 'text-stone-400')} />
          <span className="hidden text-xs font-medium text-stone-600 2xl:inline">Fire safety</span>
          <Switch checked={showFire} onCheckedChange={toggleFire} aria-label="Show fire safety egress" />
        </label>

        {/* measure tool */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setMeasureMode(!measureMode)}
              aria-pressed={measureMode}
              aria-label={measureMode ? 'Exit measure tool' : 'Measure distances on the floor'}
              title={measureMode ? 'Exit measure tool (Esc)' : 'Measure distances (M)'}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-lg border px-2.5 shadow-xs transition-all duration-150',
                measureMode
                  ? 'border-charcoal/30 bg-charcoal/[0.06] text-charcoal'
                  : 'border-stone-300/80 bg-white text-stone-400 hover:border-stone-400/70 hover:text-charcoal',
              )}
            >
              <Ruler className={cn('h-4 w-4 transition-colors', measureMode && 'text-charcoal')} />
              {measureMode && measureA && measureB && (
                <span className="hidden text-[10px] font-bold tabular-nums text-charcoal 2xl:inline">
                  {Math.hypot(measureB.x - measureA.x, measureB.z - measureA.z).toFixed(2)}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {measureMode
              ? measureA && measureB
                ? 'Measured — click again to re-measure, Esc to exit'
                : 'Click two points on the floor'
              : 'Measure distances on the floor (M)'}
          </TooltipContent>
        </Tooltip>

        {/* functional zones */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleZones}
              aria-pressed={showZones}
              aria-label={showZones ? 'Hide zone areas' : 'Show zone areas'}
              title={showZones ? 'Hide zone areas' : 'Show zone areas'}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-l-lg border px-2.5 shadow-xs transition-all duration-150',
                showZones
                  ? 'border-charcoal/30 bg-charcoal/[0.06] text-charcoal'
                  : 'border-stone-300/80 bg-white text-stone-400 hover:border-stone-400/70 hover:text-charcoal',
              )}
            >
              <LayoutGrid className={cn('h-4 w-4 transition-colors', showZones && 'text-charcoal')} />
              {zonesCount > 0 && (
                <span
                  className={cn(
                    'min-w-4 rounded-full px-1 text-[9.5px] font-bold tabular-nums leading-4',
                    showZones ? 'bg-charcoal text-warmwhite' : 'bg-stone-200 text-stone-500',
                  )}
                >
                  {zonesCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {showZones ? 'Zone areas on — click to hide the washes' : 'Zone areas off — show service / seating washes'}
          </TooltipContent>
        </Tooltip>

        {/* zone editor */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setZoneEditorOpen(true)}
              aria-label="Edit zones"
              title="Edit zones — draw, move, rename"
              className="-ml-2 flex h-9 items-center rounded-r-lg border border-l-0 border-stone-300/80 bg-white px-2 text-stone-400 shadow-xs transition-all duration-150 hover:border-stone-400/70 hover:text-charcoal"
            >
              <PenLine className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Edit zones — draw, move, rename, resize
          </TooltipContent>
        </Tooltip>

        {/* brand color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 bg-white text-xs font-medium shadow-xs transition-colors hover:border-stone-400/70 hover:bg-white"
              title="Brand color"
              data-tour="brand"
            >
              <SwatchBook className="mr-1.5 h-3.5 w-3.5 text-stone-400" />
              <span className="hidden 2xl:inline">{computedBrandName(brandColor)}</span>
              <span className="h-4 w-4 rounded-full border border-stone-300" style={{ backgroundColor: brandColor }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-4">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Brand color</p>
            <p className="mt-1 text-[11px] text-stone-500">Recolors seats, counters, signage &amp; decor instantly.</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {BRAND_PRESETS.map((p) => (
                <button
                  key={p.hex}
                  title={p.name}
                  aria-label={`Brand color ${p.name}`}
                  aria-pressed={brandColor.toLowerCase() === p.hex.toLowerCase()}
                  onClick={() => setBrandColor(p.hex)}
                  className={cn(
                    'h-9 rounded-lg border-2 shadow-xs transition-all duration-150 hover:scale-105 hover:shadow-sm',
                    brandColor.toLowerCase() === p.hex.toLowerCase() ? 'border-charcoal' : 'border-transparent',
                  )}
                  style={{ backgroundColor: p.hex }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-9 w-12 cursor-pointer p-1"
                aria-label="Custom brand color"
              />
              <Input
                value={brandColor}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) setBrandColor(v)
                }}
                className="h-9 flex-1 font-mono text-xs uppercase"
                aria-label="Brand hex value"
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* history: undo / redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={undo}
              disabled={undoDepth === 0}
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
              className="h-9 w-9 rounded-l-lg rounded-r-none border-r-0 bg-white shadow-xs disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={redo}
              disabled={redoDepth === 0}
              aria-label="Redo"
              title="Redo (Ctrl+Shift+Z)"
              className="-ml-2 h-9 w-9 rounded-l-none rounded-r-lg bg-white shadow-xs disabled:opacity-40"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

        {/* saved layouts */}
        <LayoutsMenu />

        {/* session checkpoints */}
        <SessionHistory />

        {/* share link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              aria-label="Copy share link"
              title="Copy share link"
              className="h-9 w-9 bg-white shadow-xs"
            >
              <Link2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Copy a link that opens this exact layout</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="hidden h-8 sm:block" />

        <div className="ml-auto flex items-center gap-2">
          {/* help menu: tour + shortcuts */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Help and tour"
                title="Help & tour"
                className="h-9 w-9 bg-white shadow-xs"
              >
                <CircleHelp className="h-4 w-4 text-stone-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1.5">
              <button
                onClick={() => startTour()}
                className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-stone-100/80"
              >
                <Box className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                <span>
                  <span className="block text-xs font-semibold text-charcoal">Take the studio tour</span>
                  <span className="mt-0.5 block text-[10.5px] leading-snug text-stone-400">7 quick stops around the workspace.</span>
                </span>
              </button>
              <button
                onClick={() => window.dispatchEvent(new Event(SHORTCUTS_EVENT))}
                className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-stone-100/80"
              >
                <Keyboard className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                <span>
                  <span className="block text-xs font-semibold text-charcoal">Keyboard shortcuts</span>
                  <span className="mt-0.5 block text-[10.5px] leading-snug text-stone-400">Press ? anytime for the cheat sheet.</span>
                </span>
              </button>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            onClick={() => setCostOpen(true)}
            aria-label={budgetState?.status === 'over' ? `Open cost estimate — ${compactMoney(cost.total)}, over budget` : capAlert ? `Open cost estimate — a category cap is exceeded` : 'Open cost estimate'}
            title={
              budgetState?.status === 'over'
                ? 'Budget exceeded — open the estimate'
                : capAlert
                  ? `Over cap: ${overCapLabels.join(', ')} — open the estimate`
                  : budgetState
                    ? `Budget: ${budgetState.status === 'close' ? 'close to' : 'under'} budget — open the estimate`
                    : 'Open cost estimate'
            }
            data-tour="cost"
            className={cn(
              'h-9 gap-1.5 rounded-full border bg-white pl-3 pr-3.5 text-xs font-medium shadow-xs transition-colors hover:bg-white',
              budgetState?.status === 'over'
                ? 'border-red-300 bg-red-50/70 hover:border-red-400'
                : budgetState?.status === 'close' || capAlert
                  ? 'border-amber-300 bg-amber-50/70 hover:border-amber-400'
                  : 'border-stone-300/80 hover:border-stone-400/70',
            )}
          >
            {budgetState?.status === 'over' ? (
              <TriangleAlert className="h-3.5 w-3.5 text-red-500" />
            ) : capAlert ? (
              <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Calculator className="h-3.5 w-3.5 text-stone-400" />
            )}
            <span className="hidden md:inline">Cost</span>
            <span className={cn(
              'font-display text-[13px] font-bold tabular-nums tracking-tight',
              budgetState?.status === 'over' ? 'text-red-700' : 'text-charcoal',
            )}>
              {compactMoney(cost.total)}
            </span>
            {budget !== null && (
              <span className="hidden border-l border-stone-200 pl-1.5 text-[10px] font-medium tabular-nums text-stone-400 2xl:inline">
                / {compactMoney(budget)}
              </span>
            )}
          </Button>
          <Button
            onClick={onExport}
            data-tour="export"
            className="h-9 bg-charcoal px-3.5 text-xs font-semibold text-warmwhite shadow-xs transition-all hover:bg-charcoal/90 hover:shadow-md active:scale-[0.98]"
          >
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            Export PDF
          </Button>
          {onOpenCatalog && (
            <Button variant="outline" className="h-9 bg-white text-xs font-medium shadow-xs lg:hidden" onClick={onOpenCatalog}>
              Add items
            </Button>
          )}
        </div>
      </div>

      <ZoneEditor open={zoneEditorOpen} onOpenChange={setZoneEditorOpen} />
    </TooltipProvider>
  )
}
