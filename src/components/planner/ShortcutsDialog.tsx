'use client'

import { useEffect, useState } from 'react'
import { Keyboard } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export const SHORTCUTS_EVENT = 'forma:show-shortcuts'

interface ShortcutRow {
  keys: string[]
  action: string
}

const SHORTCUTS: Array<{ group: string; rows: ShortcutRow[] }> = [
  {
    group: 'Items',
    rows: [
      { keys: ['R'], action: 'Rotate the selected piece 90°' },
      { keys: ['D'], action: 'Duplicate the selected piece' },
      { keys: ['Del'], action: 'Remove the selected piece' },
      { keys: ['Right-click'], action: 'Quick actions on any piece' },
    ],
  },
  {
    group: 'View',
    rows: [
      { keys: ['1'], action: 'Swing to top-down plan' },
      { keys: ['2'], action: 'Swing to 3D perspective' },
      { keys: ['F'], action: 'Re-frame the whole room' },
      { keys: ['+'], action: 'Zoom in' },
      { keys: ['−'], action: 'Zoom out' },
      { keys: ['Esc'], action: 'Cancel placement / deselect' },
    ],
  },
  {
    group: 'Session',
    rows: [
      { keys: ['Ctrl', 'Z'], action: 'Undo' },
      { keys: ['Ctrl', '⇧', 'Z'], action: 'Redo' },
      { keys: ['Ctrl', 'Y'], action: 'Redo' },
      { keys: ['?'], action: 'This cheat sheet' },
    ],
  },
]

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

/** Global "?" shortcut listener + cheat-sheet dialog. */
export default function ShortcutsDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !isTypingTarget(e.target)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const onShow = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(SHORTCUTS_EVENT, onShow)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(SHORTCUTS_EVENT, onShow)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[420px] max-w-[92vw] gap-0 bg-warmwhite p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-stone-200/80 bg-white/60 px-5 py-4">
          <DialogTitle className="font-display flex items-center gap-2 text-base font-bold text-charcoal">
            <Keyboard className="h-4 w-4 text-stone-400" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            Everything the studio can do without touching a menu.
          </DialogDescription>
        </DialogHeader>
        <div className="thin-scroll max-h-[60vh] overflow-y-auto px-5 py-4">
          {SHORTCUTS.map((g) => (
            <section key={g.group} className="mb-4 last:mb-0">
              <p className="font-display text-[10.5px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                {g.group}
              </p>
              <ul className="mt-2 space-y-1">
                {g.rows.map((r) => (
                  <li
                    key={r.action}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-white/70"
                  >
                    <span className="min-w-0 flex-1 text-stone-600">{r.action}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {r.keys.map((k) => (
                        <kbd
                          key={k}
                          className="min-w-[22px] rounded border border-stone-300 bg-white px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold text-charcoal shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="border-t border-stone-200/80 bg-white/60 px-5 py-2.5 text-[10.5px] text-stone-400">
          Press <kbd className="rounded border border-stone-300 bg-white px-1 font-mono text-[10px] shadow-xs">?</kbd> anytime to toggle this sheet.
        </p>
      </DialogContent>
    </Dialog>
  )
}
