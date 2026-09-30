'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Check, FolderOpen, Loader2, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { usePlanner, type LayoutSnapshot } from '@/lib/planner/store'
import { renderThumbnail } from '@/lib/planner/thumbnail'
import { cn } from '@/lib/utils'

const LAYOUTS_CHANGED_EVENT = 'forma:layouts-changed'

function notifyLayoutsChanged() {
  window.dispatchEvent(new Event(LAYOUTS_CHANGED_EVENT))
}

interface SavedLayoutRow {
  id: string
  name: string
  brandColor: string
  thumb: string | null
  updatedAt: string
  itemCount: number
}

export default function LayoutsMenu() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<SavedLayoutRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [justSavedId, setJustSavedId] = useState<string | null>(null)
  const projectName = usePlanner((s) => s.projectName)
  const applySnapshot = usePlanner((s) => s.applySnapshot)
  const getSnapshot = usePlanner((s) => s.getSnapshot)
  const { toast } = useToast()
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/layouts', { cache: 'no-store' })
      const json = await res.json()
      setRows(json.layouts ?? [])
    } catch {
      setRows([])
      toast({ title: 'Could not reach the layouts API', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  useEffect(() => {
    if (!open) {
      setConfirmingId(null)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [open])

  async function handleSave() {
    const name = (saveName.trim() || projectName).slice(0, 80)
    if (!name) return
    setSaving(true)
    try {
      const snap = getSnapshot()
      const thumb = renderThumbSafe(snap)
      const res = await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data: snap, thumb }),
      })
      if (!res.ok) throw new Error('save failed')
      const json = await res.json()
      setSaveName('')
      setJustSavedId(json.layout?.id ?? null)
      toast({ title: 'Layout saved', description: `“${name}” is in your library.` })
      notifyLayoutsChanged()
      await load()
    } catch {
      toast({ title: 'Save failed', description: 'Please try again in a moment.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleLoad(id: string) {
    try {
      const res = await fetch(`/api/layouts/${id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('load failed')
      const json = await res.json()
      const data = json.layout?.data as LayoutSnapshot | undefined
      if (!data) throw new Error('no data')
      applySnapshot(data)
      toast({ title: 'Layout loaded', description: json.layout.name })
      setOpen(false)
    } catch {
      toast({ title: 'Could not load that layout', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    if (confirmingId !== id) {
      setConfirmingId(id)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmingId(null), 2600)
      return
    }
    setConfirmingId(null)
    try {
      const res = await fetch(`/api/layouts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      setRows((r) => (r ? r.filter((x) => x.id !== id) : r))
      toast({ title: 'Layout deleted' })
      notifyLayoutsChanged()
    } catch {
      toast({ title: 'Could not delete layout', variant: 'destructive' })
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 bg-white text-xs font-medium" title="Saved layouts">
          <FolderOpen className="mr-1.5 h-3.5 w-3.5 text-stone-400" />
          <span className="hidden md:inline">Layouts</span>
          {rows && rows.length > 0 && (
            <span className="ml-1 rounded-full bg-stone-100 px-1.5 py-px text-[10px] font-semibold text-stone-500">
              {rows.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        {/* save current */}
        <div className="border-b border-stone-200/70 p-4">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Save current layout
          </p>
          <div className="mt-2.5 flex gap-2">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSave()
              }}
              placeholder={projectName || 'Layout name'}
              className="h-9 flex-1 bg-white text-xs"
              maxLength={80}
              aria-label="Layout name"
            />
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving}
              className="h-9 bg-charcoal px-3 text-xs font-semibold text-warmwhite hover:bg-charcoal/90"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        </div>

        {/* saved list */}
        <div className="p-2">
          <p className="px-2 pb-1.5 pt-1 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            Saved layouts
          </p>
          <div className="thin-scroll max-h-[300px] overflow-y-auto">
            {loading && !rows && (
              <div className="space-y-1.5 p-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg p-1.5">
                    <div className="h-12 w-16 animate-pulse rounded-md bg-stone-200/70" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-24 animate-pulse rounded bg-stone-200/70" />
                      <div className="h-2.5 w-16 animate-pulse rounded bg-stone-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {rows && rows.length === 0 && (
              <div className="m-1 rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center">
                <FolderOpen className="mx-auto h-5 w-5 text-stone-300" />
                <p className="mt-2 text-xs font-medium text-stone-500">No saved layouts yet</p>
                <p className="mt-0.5 text-[11px] text-stone-400">Name your plan above and hit Save.</p>
              </div>
            )}
            {rows && rows.length > 0 && (
              <ul className="space-y-0.5">
                {rows.map((r) => (
                  <li key={r.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => void handleLoad(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') void handleLoad(r.id)
                      }}
                      className={cn(
                        'group flex cursor-pointer items-center gap-3 rounded-lg p-1.5 pr-2 transition-colors hover:bg-stone-100/80',
                        justSavedId === r.id && 'bg-emerald-50/70',
                      )}
                    >
                      {r.thumb ? (
                        <img
                          src={r.thumb}
                          alt={`Preview of ${r.name}`}
                          className="h-12 w-16 shrink-0 rounded-md border border-stone-200 object-cover"
                        />
                      ) : (
                        <span
                          className="h-12 w-16 shrink-0 rounded-md border border-stone-200"
                          style={{ backgroundColor: r.brandColor }}
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-charcoal">{r.name}</span>
                          {justSavedId === r.id && <Check className="h-3 w-3 shrink-0 text-emerald-600" />}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] text-stone-400">
                          {r.itemCount} items · {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7 shrink-0',
                          confirmingId === r.id
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                            : 'text-stone-300 opacity-0 hover:text-red-600 group-hover:opacity-100',
                        )}
                        title={confirmingId === r.id ? 'Click again to confirm' : 'Delete layout'}
                        aria-label={confirmingId === r.id ? `Confirm delete ${r.name}` : `Delete ${r.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDelete(r.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function renderThumbSafe(snap: LayoutSnapshot): string | undefined {
  try {
    const thumb = renderThumbnail(snap, 460)
    return thumb || undefined
  } catch {
    return undefined
  }
}
