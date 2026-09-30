'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { BookmarkPlus, Clock, History, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { usePlanner } from '@/lib/planner/store'
import { computeCost, fmtMoney } from '@/lib/planner/capacity'
import { cn } from '@/lib/utils'

function delta(n: number, unit: string): { text: string; cls: string } {
  if (n === 0) return { text: `±0 ${unit}`, cls: 'text-stone-300' }
  if (n > 0) return { text: `+${n} ${unit}`, cls: 'text-emerald-600' }
  return { text: `${n} ${unit}`, cls: 'text-red-500' }
}

// Note on the cost delta: a checkpoint costing MORE than the current layout means
// restoring it will add spend — shown green; costing less shows red (you'd drop spend).

/** Toolbar popover: named, device-local checkpoints of the session with live diff vs the current layout. */
export default function SessionHistory() {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const checkpoints = usePlanner((s) => s.checkpoints)
  const saveCheckpoint = usePlanner((s) => s.saveCheckpoint)
  const deleteCheckpoint = usePlanner((s) => s.deleteCheckpoint)
  const applySnapshot = usePlanner((s) => s.applySnapshot)
  const items = usePlanner((s) => s.items)
  const { toast } = useToast()
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const curCost = useMemo(() => computeCost(items).total, [items])
  const curCount = items.length

  useEffect(() => {
    if (!open) {
      setConfirmingId(null)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [open])

  function handleSave() {
    setSaving(true)
    try {
      const cp = saveCheckpoint(label)
      setLabel('')
      toast({ title: 'Checkpoint saved', description: `“${cp.label}” — ${cp.itemCount} items · ${fmtMoney(cp.cost)}.` })
    } finally {
      setSaving(false)
    }
  }

  function handleRestore(id: string) {
    const cp = checkpoints.find((c) => c.id === id)
    if (!cp) return
    setRestoringId(id)
    // brief beat so the spinner is visible, then swap the whole layout
    setTimeout(() => {
      applySnapshot(cp.snap)
      setRestoringId(null)
      setOpen(false)
      toast({
        title: 'Checkpoint restored',
        description: `Back to “${cp.label}” (${cp.itemCount} items) — Ctrl+Z undoes this.`,
      })
    }, 220)
  }

  function handleDelete(id: string) {
    if (confirmingId !== id) {
      setConfirmingId(id)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmingId(null), 2600)
      return
    }
    setConfirmingId(null)
    deleteCheckpoint(id)
    toast({ title: 'Checkpoint deleted' })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 bg-white text-xs font-medium shadow-xs transition-colors hover:border-stone-400/70 hover:bg-white"
          title="Session checkpoints"
          aria-label="Session checkpoints"
        >
          <History className="mr-1.5 h-3.5 w-3.5 text-stone-400" />
          <span className="hidden md:inline">History</span>
          {checkpoints.length > 0 && (
            <span className="ml-1 rounded-full bg-stone-100 px-1.5 py-px text-[10px] font-semibold tabular-nums text-stone-500">
              {checkpoints.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[352px] p-0">
        {/* save current */}
        <div className="border-b border-stone-200/70 p-4">
          <p className="font-display flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            <Clock className="h-3.5 w-3.5 text-stone-400" />
            Session checkpoints
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
            Snapshots live on this device — restore any point without losing the undo stack.
          </p>
          <div className="mt-2.5 flex gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
              placeholder="Label (optional)"
              className="h-9 flex-1 bg-white text-xs"
              maxLength={80}
              aria-label="Checkpoint label"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-9 bg-charcoal px-3 text-xs font-semibold text-warmwhite hover:bg-charcoal/90"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookmarkPlus className="mr-1 h-3.5 w-3.5" />}
              Pin
            </Button>
          </div>
        </div>

        {/* checkpoint list */}
        <div className="p-2">
          <div className="thin-scroll max-h-[320px] overflow-y-auto">
            {checkpoints.length === 0 && (
              <div className="m-1 rounded-lg border border-dashed border-stone-300 px-4 py-7 text-center">
                <History className="mx-auto h-5 w-5 text-stone-300" />
                <p className="mt-2 text-xs font-medium text-stone-500">No checkpoints yet</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-400">
                  Pin one before a big rearrangement — you can always jump back.
                </p>
              </div>
            )}
            {checkpoints.length > 0 && (
              <ul className="space-y-0.5">
                {checkpoints.map((c) => {
                  const dItems = delta(c.itemCount - curCount, 'items')
                  const dc = Math.round(c.cost) - Math.round(curCost)
                  const dCost = dc === 0
                    ? { text: '±$0 cost', cls: 'text-stone-300' }
                    : {
                        text: `${dc > 0 ? '+' : '−'}${fmtMoney(Math.abs(dc))} cost`,
                        cls: dc > 0 ? 'text-emerald-600' : 'text-red-500',
                      }
                  const isCurrent = c.itemCount === curCount && dc === 0
                  return (
                    <li
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Restore checkpoint ${c.label}`}
                      onClick={() => handleRestore(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRestore(c.id)
                        }
                      }}
                      className="group flex cursor-pointer items-center gap-2.5 rounded-lg p-2 pr-2 transition-colors hover:bg-stone-100/80"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 shadow-xs"
                        aria-hidden
                      >
                        {restoringId === c.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-stone-500" />
                        ) : (
                          <RotateCcw className="h-4 w-4 text-stone-400 transition-colors group-hover:text-charcoal" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-charcoal">{c.label}</span>
                          {isCurrent && (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                              matches now
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] tabular-nums text-stone-400">
                          <span>{c.itemCount} items</span>
                          <span aria-hidden>·</span>
                          <span>{c.seats} seats</span>
                          <span aria-hidden>·</span>
                          <span>{fmtMoney(c.cost)}</span>
                          <span aria-hidden>·</span>
                          <span>{formatDistanceToNow(new Date(c.ts), { addSuffix: true })}</span>
                        </span>
                        {!isCurrent && (
                          <span className="mt-1 flex items-center gap-2 text-[10px] font-semibold tabular-nums">
                            <span className={dItems.cls}>{dItems.text}</span>
                            <span className={dCost.cls}>{dCost.text}</span>
                          </span>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7 shrink-0',
                          confirmingId === c.id
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                            : 'text-stone-300 opacity-0 hover:text-red-600 group-hover:opacity-100',
                        )}
                        title={confirmingId === c.id ? 'Click again to confirm' : 'Delete checkpoint'}
                        aria-label={confirmingId === c.id ? `Confirm delete ${c.label}` : `Delete ${c.label}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(c.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {checkpoints.length > 0 && (
            <p className="border-t border-stone-100 px-2 pb-0.5 pt-2 text-[10px] text-stone-400">
              Newest first · oldest checkpoints drop off after 12 · click a row to restore.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
