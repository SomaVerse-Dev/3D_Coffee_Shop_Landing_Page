'use client'

import { useEffect, useRef } from 'react'
import { BoxSelect, Copy, DollarSign, RotateCw, Trash2 } from 'lucide-react'
import { usePlanner } from '@/lib/planner/store'
import { getItem } from '@/lib/planner/catalog'
import { fmtMoney } from '@/lib/planner/capacity'
import { cn } from '@/lib/utils'

/**
 * Floating context menu that opens on right-click over a placed item.
 * Lives in the viewport layer (position: fixed at pointer coords) and
 * closes on Esc / scroll / any outside pointer-down / action.
 */
export default function ItemContextMenu() {
  const ctxMenu = usePlanner((s) => s.ctxMenu)
  const items = usePlanner((s) => s.items)
  const selectedUids = usePlanner((s) => s.selectedUids)
  const closeContextMenu = usePlanner((s) => s.closeContextMenu)
  const rotateItem = usePlanner((s) => s.rotateItem)
  const duplicateItem = usePlanner((s) => s.duplicateItem)
  const removeItem = usePlanner((s) => s.removeItem)
  const rotateItems = usePlanner((s) => s.rotateItems)
  const duplicateItems = usePlanner((s) => s.duplicateItems)
  const removeItems = usePlanner((s) => s.removeItems)
  const selectMany = usePlanner((s) => s.selectMany)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ctxMenu) return
    const close = () => closeContextMenu()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu()
    }
    // pointerdown fires before click, so menu actions can run before the close
    window.addEventListener('pointerdown', onOutside)
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', close, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onOutside)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', close)
    }
  }, [ctxMenu, closeContextMenu])

  // keep the menu inside the window when right-clicking near an edge
  const pos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  if (ctxMenu) {
    const W = 224
    const H = 236
    pos.current = {
      x: Math.min(ctxMenu.x, window.innerWidth - W - 10),
      y: Math.min(ctxMenu.y, window.innerHeight - H - 10),
    }
  }

  const item = items.find((i) => i.uid === ctxMenu?.uid)
  const cat = item ? getItem(item.id) : null
  if (!ctxMenu || !item || !cat) return null

  const custom = item.price !== undefined && item.price !== cat.price
  // right-clicking a member of the multi-selection acts on the whole group
  const isGroup = selectedUids.includes(item.uid) && selectedUids.length > 1
  const targets = isGroup ? selectedUids : [item.uid]
  const sameType = items.filter((i) => i.id === item.id)
  const canSelectType = sameType.length > 1

  function onOutside(e: PointerEvent) {
    if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return
    closeContextMenu()
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${cat.name}`}
      className="ctx-glass pointer-events-auto fixed z-50 w-52 rounded-xl p-1.5 ctx-pop"
      style={{ left: pos.current.x, top: pos.current.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* header */}
      <div className="flex items-center justify-between gap-2 px-2.5 pb-1.5 pt-1">
        <span className="truncate font-display text-xs font-bold tracking-tight text-charcoal">
          {isGroup ? `${targets.length} pieces` : cat.name}
        </span>
        <span className="shrink-0 font-display text-[11px] font-semibold tabular-nums" style={{ color: usePlanner.getState().brandColor }}>
          {isGroup
            ? fmtMoney(targets.reduce((sum, uid) => {
                const it = items.find((i) => i.uid === uid)
                const c = it ? getItem(it.id) : null
                return sum + (it && c ? (it.price ?? c.price) : 0)
              }, 0))
            : fmtMoney(item.price ?? cat.price)}
        </span>
      </div>
      {isGroup && (
        <div className="mx-1.5 mb-1 rounded-md bg-stone-100/80 px-2 py-1 text-[10px] font-medium text-stone-500">
          Actions apply to every selected piece
        </div>
      )}
      {custom && !isGroup && (
        <div className="mx-1.5 mb-1 rounded-md bg-amber-100/70 px-2 py-1 text-[10px] font-medium text-amber-800">
          Custom price — differs from list
        </div>
      )}
      <div className="mx-1 mb-1 h-px bg-stone-200/80" aria-hidden />

      <MenuItem
        icon={<RotateCw className="h-3.5 w-3.5" />}
        label={isGroup ? 'Rotate all 90°' : 'Rotate 90°'}
        hint="R"
        onClick={() => {
          if (isGroup) rotateItems(targets)
          else rotateItem(item.uid)
          closeContextMenu()
        }}
      />
      <MenuItem
        icon={<Copy className="h-3.5 w-3.5" />}
        label={isGroup ? 'Duplicate all' : 'Duplicate'}
        hint="D"
        onClick={() => {
          if (isGroup) duplicateItems(targets)
          else duplicateItem(item.uid)
          closeContextMenu()
        }}
      />
      {!isGroup && (
        <MenuItem
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label={custom ? 'Reset price' : 'Edit price'}
          onClick={() => {
            // jump straight into the price popover via selection controls
            usePlanner.getState().select(item.uid)
            closeContextMenu()
            window.dispatchEvent(new CustomEvent('forma:edit-price', { detail: { uid: item.uid } }))
          }}
        />
      )}
      {!isGroup && canSelectType && (
        <MenuItem
          icon={<BoxSelect className="h-3.5 w-3.5" />}
          label={`Select all ${sameType.length} ${cat.name}s`}
          onClick={() => {
            selectMany(sameType.map((i) => i.uid))
            closeContextMenu()
          }}
        />
      )}
      <div className="mx-1 my-1 h-px bg-stone-200/80" aria-hidden />
      <MenuItem
        icon={<Trash2 className="h-3.5 w-3.5" />}
        label={isGroup ? 'Remove all' : 'Remove'}
        hint="Del"
        destructive
        onClick={() => {
          if (isGroup) removeItems(targets)
          else removeItem(item.uid)
          closeContextMenu()
        }}
      />
    </div>
  )
}

function MenuItem({
  icon, label, hint, destructive, onClick,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  destructive?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
        destructive
          ? 'text-red-600 hover:bg-red-50'
          : 'text-stone-600 hover:bg-stone-100/80 hover:text-charcoal',
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {hint && <kbd className="rounded border border-stone-300/80 bg-white px-1 font-mono text-[9.5px] text-stone-400">{hint}</kbd>}
    </button>
  )
}
