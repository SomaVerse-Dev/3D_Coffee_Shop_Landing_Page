'use client'

import { Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { usePlanner } from '@/lib/planner/store'

/**
 * Camera control cluster pinned to the viewport's left edge:
 * zoom in / zoom out / re-frame the room (fit).
 */
export default function ViewControls() {
  const requestZoom = usePlanner((s) => s.requestZoom)

  return (
    <div
      className="card-glass pointer-events-auto absolute left-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-0.5 rounded-xl p-1"
      role="group"
      aria-label="Camera controls"
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => requestZoom('in')}
              aria-label="Zoom in"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-all hover:bg-white/70 hover:text-charcoal active:scale-95"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Zoom in <span className="ml-1 font-mono text-[10px] text-stone-400">+</span>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => requestZoom('out')}
              aria-label="Zoom out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-all hover:bg-white/70 hover:text-charcoal active:scale-95"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Zoom out <span className="ml-1 font-mono text-[10px] text-stone-400">−</span>
          </TooltipContent>
        </Tooltip>
        <span aria-hidden className="mx-1.5 h-px bg-stone-200/90" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => requestZoom('fit')}
              aria-label="Re-frame room"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-all hover:bg-white/70 hover:text-charcoal active:scale-95"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Re-frame room <span className="ml-1 font-mono text-[10px] text-stone-400">F</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
