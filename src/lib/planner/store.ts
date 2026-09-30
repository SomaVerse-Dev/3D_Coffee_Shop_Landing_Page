import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlacedItem, RoomSpec, TemplateId, ViewMode } from './types'
import { makeUid } from './types'
import { getItem, halfExtents } from './catalog'
import { TEMPLATES } from './templates'

const SNAP = 0.05
const HISTORY_LIMIT = 60
const COALESCE_MS = 900

export function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP
}

export function clampToRoom(
  x: number, z: number, id: string, rot: number, room: RoomSpec,
): { x: number; z: number } {
  const { hx, hz } = halfExtents(id, rot)
  const mx = Math.max(0, room.w / 2 - hx - 0.03)
  const mz = Math.max(0, room.d / 2 - hz - 0.03)
  return {
    x: Math.min(mx, Math.max(-mx, x)),
    z: Math.min(mz, Math.max(-mz, z)),
  }
}

/** Serializable snapshot of everything a saved/shared layout needs. */
export interface LayoutSnapshot {
  room: RoomSpec
  items: PlacedItem[]
  brandColor: string
  projectName: string
  templateId: TemplateId | 'custom'
}

interface PlannerState {
  room: RoomSpec
  items: PlacedItem[]
  brandColor: string
  viewMode: ViewMode
  showFire: boolean
  armedId: string | null
  selectedUid: string | null
  costOpen: boolean
  planOpen: boolean
  projectName: string
  templateId: TemplateId | 'custom'
  /** mirrors of the module-level history lengths so the UI can react */
  undoDepth: number
  redoDepth: number
  /** floating context menu anchored to a placed item (viewport px coords) */
  ctxMenu: { uid: string; x: number; y: number } | null
  /** monotonically increasing counter — CameraRig reacts to changes */
  zoomReq: { kind: 'in' | 'out' | 'fit'; n: number }

  setRoom: (w: number, d: number) => void
  addItem: (catalogId: string, x: number, z: number) => void
  moveItem: (uid: string, x: number, z: number) => void
  rotateItem: (uid: string) => void
  removeItem: (uid: string) => void
  duplicateItem: (uid: string) => void
  /** override the catalog price for one placed item (null = back to list price) */
  setItemPrice: (uid: string, price: number | null) => void
  select: (uid: string | null) => void
  arm: (catalogId: string | null) => void
  openContextMenu: (uid: string, x: number, y: number) => void
  closeContextMenu: () => void
  requestZoom: (kind: 'in' | 'out' | 'fit') => void
  setViewMode: (m: ViewMode) => void
  toggleFire: () => void
  setCostOpen: (open: boolean) => void
  setPlanOpen: (open: boolean) => void
  setBrandColor: (color: string) => void
  setProjectName: (name: string) => void
  loadTemplate: (id: TemplateId) => void
  clearAll: () => void
  /** replace the whole layout (undo/redo, saved layouts, share links) */
  applySnapshot: (snap: LayoutSnapshot) => void
  getSnapshot: () => LayoutSnapshot
  undo: () => void
  redo: () => void
}

// ─── Undo / redo history (module scope, coalesces rapid drags) ─────────────

const past: LayoutSnapshot[] = []
const future: LayoutSnapshot[] = []
let lastPush: { type: string; t: number } = { type: '', t: 0 }

function snapshotOf(s: {
  room: RoomSpec; items: PlacedItem[]; brandColor: string
  projectName: string; templateId: TemplateId | 'custom'
}): LayoutSnapshot {
  return {
    room: { ...s.room },
    items: s.items.map((i) => ({ ...i })),
    brandColor: s.brandColor,
    projectName: s.projectName,
    templateId: s.templateId,
  }
}

/** push current state onto the undo stack; same-type actions within COALESCE_MS merge */
function pushHistory(state: PlannerState, type: string) {
  const now = Date.now()
  const coalesce = lastPush.type === type && now - lastPush.t < COALESCE_MS
  lastPush = { type, t: now }
  if (coalesce && past.length > 0) return
  past.push(snapshotOf(state))
  if (past.length > HISTORY_LIMIT) past.shift()
  future.length = 0
}

function syncDepth(set: (p: Partial<PlannerState>) => void) {
  set({ undoDepth: past.length, redoDepth: future.length })
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const usePlanner = create<PlannerState>()(
  persist(
    (set, get) => ({
      room: { w: TEMPLATES.cafe.roomW, d: TEMPLATES.cafe.roomD },
      items: TEMPLATES.cafe.items.map((t) => ({ uid: makeUid(), id: t.id, x: t.x, z: t.z, rot: t.rot ?? 0 })),
      brandColor: TEMPLATES.cafe.brandColor,
      viewMode: '3d',
      showFire: false,
      armedId: null,
      selectedUid: null,
      costOpen: false,
      planOpen: true,
      projectName: TEMPLATES.cafe.projectName,
      templateId: 'cafe',
      undoDepth: 0,
      redoDepth: 0,
      ctxMenu: null,
      zoomReq: { kind: 'fit', n: 0 },

      setRoom: (w, d) => {
        pushHistory(get(), 'room')
        set((s) => {
          const room = { w, d }
          const items = s.items.map((it) => {
            const p = clampToRoom(it.x, it.z, it.id, it.rot, room)
            return { ...it, ...p }
          })
          return { room, items, templateId: 'custom' }
        })
        syncDepth(set)
      },

      addItem: (catalogId, x, z) => {
        pushHistory(get(), 'add')
        set((s) => {
          if (!getItem(catalogId)) return s
          const p = clampToRoom(snap(x), snap(z), catalogId, 0, s.room)
          const item: PlacedItem = { uid: makeUid(), id: catalogId, x: p.x, z: p.z, rot: 0 }
          return { items: [...s.items, item], selectedUid: item.uid }
        })
        syncDepth(set)
      },

      moveItem: (uid, x, z) => {
        pushHistory(get(), 'move')
        set((s) => {
          const it = s.items.find((i) => i.uid === uid)
          if (!it) return s
          const p = clampToRoom(snap(x), snap(z), it.id, it.rot, s.room)
          return {
            items: s.items.map((i) => (i.uid === uid ? { ...i, x: p.x, z: p.z } : i)),
            templateId: 'custom',
          }
        })
        syncDepth(set)
      },

      rotateItem: (uid) => {
        pushHistory(get(), 'rotate')
        set((s) => {
          const it = s.items.find((i) => i.uid === uid)
          if (!it) return s
          const rot = (it.rot + Math.PI / 2) % (Math.PI * 2)
          const p = clampToRoom(it.x, it.z, it.id, rot, s.room)
          return {
            items: s.items.map((i) => (i.uid === uid ? { ...i, rot, ...p } : i)),
            templateId: 'custom',
          }
        })
        syncDepth(set)
      },

      removeItem: (uid) => {
        pushHistory(get(), 'remove')
        set((s) => ({
          items: s.items.filter((i) => i.uid !== uid),
          selectedUid: s.selectedUid === uid ? null : s.selectedUid,
          ctxMenu: s.ctxMenu?.uid === uid ? null : s.ctxMenu,
        }))
        syncDepth(set)
      },

      duplicateItem: (uid) => {
        pushHistory(get(), 'duplicate')
        set((s) => {
          const it = s.items.find((i) => i.uid === uid)
          if (!it) return s
          const copy: PlacedItem = {
            ...it,
            uid: makeUid(),
            x: snap(it.x + 0.4),
            z: snap(it.z + 0.4),
          }
          return { items: [...s.items, copy], selectedUid: copy.uid }
        })
        syncDepth(set)
      },

      setItemPrice: (uid, price) => {
        pushHistory(get(), 'price')
        set((s) => ({
          items: s.items.map((i) => {
            if (i.uid !== uid) return i
            const next = { ...i }
            if (price === null) delete next.price
            else next.price = Math.max(0, Math.round(price))
            return next
          }),
          templateId: 'custom',
        }))
        syncDepth(set)
      },

      select: (uid) => set({ selectedUid: uid, armedId: null, ctxMenu: null }),
      arm: (catalogId) =>
        set((s) => ({
          armedId: catalogId,
          selectedUid: catalogId ? null : s.selectedUid,
          ctxMenu: null,
        })),

      openContextMenu: (uid, x, y) => set({ ctxMenu: { uid, x, y }, selectedUid: uid, armedId: null }),
      closeContextMenu: () => set({ ctxMenu: null }),

      requestZoom: (kind) =>
        set((s) => ({ zoomReq: { kind, n: s.zoomReq.n + 1 } })),

      setViewMode: (m) => set({ viewMode: m }),
      toggleFire: () => set((s) => ({ showFire: !s.showFire })),
      setCostOpen: (open) => set({ costOpen: open }),
      setPlanOpen: (open) => set({ planOpen: open }),
      setBrandColor: (color) => {
        pushHistory(get(), 'brand')
        set({ brandColor: color })
        syncDepth(set)
      },
      setProjectName: (name) => set({ projectName: name }),

      loadTemplate: (id) => {
        pushHistory(get(), 'template')
        set(() => {
          const t = TEMPLATES[id]
          return {
            room: { w: t.roomW, d: t.roomD },
            items: t.items.map((it) => ({ uid: makeUid(), id: it.id, x: it.x, z: it.z, rot: it.rot ?? 0 })),
            brandColor: t.brandColor,
            projectName: t.projectName,
            templateId: id,
            selectedUid: null,
            armedId: null,
            ctxMenu: null,
          }
        })
        syncDepth(set)
      },

      clearAll: () => {
        pushHistory(get(), 'clear')
        set({ items: [], selectedUid: null, armedId: null, ctxMenu: null, templateId: 'custom' })
        syncDepth(set)
      },

      applySnapshot: (snap) => {
        pushHistory(get(), 'snapshot')
        set(() => ({
          room: { ...snap.room },
          items: snap.items.map((i) => ({ ...i, uid: i.uid || makeUid() })),
          brandColor: snap.brandColor,
          projectName: snap.projectName,
          templateId: snap.templateId,
          selectedUid: null,
          armedId: null,
          ctxMenu: null,
        }))
        syncDepth(set)
      },

      getSnapshot: () => snapshotOf(get()),

      undo: () => {
        const prev = past.pop()
        if (!prev) return
        future.push(snapshotOf(get()))
        lastPush = { type: '', t: 0 }
        set(() => ({
          room: { ...prev.room },
          items: prev.items.map((i) => ({ ...i })),
          brandColor: prev.brandColor,
          projectName: prev.projectName,
          templateId: prev.templateId,
          selectedUid: null,
          armedId: null,
          ctxMenu: null,
        }))
        syncDepth(set)
      },

      redo: () => {
        const next = future.pop()
        if (!next) return
        past.push(snapshotOf(get()))
        lastPush = { type: '', t: 0 }
        set(() => ({
          room: { ...next.room },
          items: next.items.map((i) => ({ ...i })),
          brandColor: next.brandColor,
          projectName: next.projectName,
          templateId: next.templateId,
          selectedUid: null,
          armedId: null,
          ctxMenu: null,
        }))
        syncDepth(set)
      },
    }),
    {
      name: 'forma-planner-v1',
      // avoid SSR hydration mismatch: rehydrate manually after mount
      skipHydration: true,
      partialize: (s) => ({
        room: s.room,
        items: s.items,
        brandColor: s.brandColor,
        projectName: s.projectName,
        templateId: s.templateId,
      }),
    },
  ),
)
