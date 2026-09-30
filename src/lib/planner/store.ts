import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category, PlacedItem, RoomSpec, TemplateId, ViewMode, ZoneDef, ZoneKind } from './types'
import { makeUid } from './types'
import { getItem, halfExtents } from './catalog'
import { TEMPLATES } from './templates'
import { computeCapacity, computeCost } from './capacity'

/** smallest zone allowed (keeps rects grabbable and labels readable) */
const ZONE_MIN = 0.6

const CHECKPOINT_LIMIT = 12

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

/**
 * Keep a zone rect inside the room on a 10 cm grid.
 * Returns null when nothing changed (so callers can skip state writes).
 */
export function clampZoneRect(
  zn: { x: number; z: number; w: number; d: number },
  room: RoomSpec,
): { x: number; z: number; w: number; d: number } | null {
  const w = Math.min(room.w, Math.max(ZONE_MIN, Math.round(zn.w * 10) / 10))
  const d = Math.min(room.d, Math.max(ZONE_MIN, Math.round(zn.d * 10) / 10))
  const mx = Math.max(0, room.w / 2 - w / 2)
  const mz = Math.max(0, room.d / 2 - d / 2)
  const x = Math.round(Math.min(mx, Math.max(-mx, zn.x)) * 10) / 10
  const z = Math.round(Math.min(mz, Math.max(-mz, zn.z)) * 10) / 10
  if (w === zn.w && d === zn.d && x === zn.x && z === zn.z) return null
  return { x, z, w, d }
}

/** Serializable snapshot of everything a saved/shared layout needs. */
export interface LayoutSnapshot {
  room: RoomSpec
  items: PlacedItem[]
  brandColor: string
  projectName: string
  templateId: TemplateId | 'custom'
  /** functional zones (optional so pre-v1.7 snapshots still decode) */
  zones?: ZoneDef[]
}

/** A named, device-local checkpoint of the session (undo-safe restore). */
export interface SessionCheckpoint {
  id: string
  label: string
  ts: number
  snap: LayoutSnapshot
  itemCount: number
  seats: number
  cost: number
}

/** How plan glyphs are colored: brand color everywhere, or one color per furniture category. */
export type PlanPalette = 'brand' | 'category'

interface PlannerState {
  room: RoomSpec
  items: PlacedItem[]
  /** functional zones shown as translucent washes (template-derived, travels with snapshots) */
  zones: ZoneDef[]
  showZones: boolean
  brandColor: string
  viewMode: ViewMode
  showFire: boolean
  armedId: string | null
  selectedUid: string | null
  costOpen: boolean
  planOpen: boolean
  projectName: string
  templateId: TemplateId | 'custom'
  /** optional fit-out budget in USD (device-local preference, not part of layout snapshots) */
  budget: number | null
  /** per-category spending caps in USD (device-local preference, category → cap) */
  categoryBudgets: Partial<Record<Category, number>>
  /** plan-glyph coloring mode (device-local preference) */
  planPalette: PlanPalette
  /** named session checkpoints (device-local, restored from the History popover) */
  checkpoints: SessionCheckpoint[]
  /** mirrors of the module-level history lengths so the UI can react */
  undoDepth: number
  redoDepth: number
  /** floating context menu anchored to a placed item (viewport px coords) */
  ctxMenu: { uid: string; x: number; y: number } | null
  /** monotonically increasing counter — CameraRig reacts to changes */
  zoomReq: { kind: 'in' | 'out' | 'fit'; n: number }
  /** floor measure tool: armed state + the two sampled points (session-only) */
  measureMode: boolean
  measureA: { x: number; z: number } | null
  measureB: { x: number; z: number } | null

  setRoom: (w: number, d: number) => void
  /** create a functional zone (defaults to a 3×2 m rect at room center); returns the new zone */
  addZone: (init?: Partial<Omit<ZoneDef, 'id'>>) => ZoneDef
  /** patch one zone (label, kind, x, z, w, d) — drag-friendly, undo-coalesced */
  updateZone: (id: string, patch: Partial<Omit<ZoneDef, 'id'>>, opts?: { silent?: boolean }) => void
  /** push one undo checkpoint before a drag gesture (drag deltas then update silently) */
  beginZoneEdit: () => void
  /** delete a zone by id */
  removeZone: (id: string) => void
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
  /** arm/disarm the floor measure tool (clears sampled points when arming) */
  setMeasureMode: (on: boolean) => void
  /** exit the measure tool entirely: mode off + points cleared */
  stopMeasure: () => void
  /** record a measure click: first click sets A, second sets B, next click restarts */
  setMeasurePoint: (p: { x: number; z: number }) => void
  /** clear the sampled measure points (tool stays armed) */
  clearMeasure: () => void
  setViewMode: (m: ViewMode) => void
  toggleFire: () => void
  toggleZones: () => void
  setCostOpen: (open: boolean) => void
  setPlanOpen: (open: boolean) => void
  setBrandColor: (color: string) => void
  setProjectName: (name: string) => void
  /** set the fit-out budget in USD (null clears it) */
  setBudget: (usd: number | null) => void
  /** set a spending cap for one category in USD (null removes the cap) */
  setCategoryBudget: (cat: Category, usd: number | null) => void
  /** switch plan-glyph coloring between brand color and per-category colors */
  setPlanPalette: (p: PlanPalette) => void
  /** capture a named checkpoint of the current session (max 12, newest first) */
  saveCheckpoint: (label?: string) => SessionCheckpoint
  /** remove one checkpoint by id */
  deleteCheckpoint: (id: string) => void
  loadTemplate: (id: TemplateId) => void
  /** wipe every zone (used by "clear zones" in the editor) */
  clearZones: () => void
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
  projectName: string; templateId: TemplateId | 'custom'; zones: ZoneDef[]
}): LayoutSnapshot {
  return {
    room: { ...s.room },
    items: s.items.map((i) => ({ ...i })),
    brandColor: s.brandColor,
    projectName: s.projectName,
    templateId: s.templateId,
    zones: s.zones.map((z) => ({ ...z })),
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
      zones: TEMPLATES.cafe.zones ?? [],
      showZones: true,
      brandColor: TEMPLATES.cafe.brandColor,
      viewMode: '3d',
      showFire: false,
      armedId: null,
      selectedUid: null,
      costOpen: false,
      planOpen: true,
      projectName: TEMPLATES.cafe.projectName,
      templateId: 'cafe',
      budget: null,
      categoryBudgets: {},
      planPalette: 'brand',
      checkpoints: [],
      undoDepth: 0,
      redoDepth: 0,
      ctxMenu: null,
      zoomReq: { kind: 'fit', n: 0 },
      measureMode: false,
      measureA: null,
      measureB: null,

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
          // placing furniture and measuring are mutually exclusive tools
          measureMode: catalogId ? false : s.measureMode,
        })),

      openContextMenu: (uid, x, y) => set({ ctxMenu: { uid, x, y }, selectedUid: uid, armedId: null }),
      closeContextMenu: () => set({ ctxMenu: null }),

      requestZoom: (kind) =>
        set((s) => ({ zoomReq: { kind, n: s.zoomReq.n + 1 } })),

      setMeasureMode: (on) =>
        set((s) => ({
          measureMode: on,
          // fresh arm: start a new measurement
          measureA: on ? null : s.measureA,
          measureB: on ? null : s.measureB,
          armedId: on ? null : s.armedId,
          ctxMenu: on ? null : s.ctxMenu,
        })),

      stopMeasure: () => set({ measureMode: false, measureA: null, measureB: null }),

      setMeasurePoint: (p) =>
        set((s) => {
          if (!s.measureMode) return s
          if (!s.measureA) return { measureA: { x: snap(p.x), z: snap(p.z) } }
          if (!s.measureB) return { measureB: { x: snap(p.x), z: snap(p.z) } }
          // third click restarts with a new baseline
          return { measureA: { x: snap(p.x), z: snap(p.z) }, measureB: null }
        }),

      clearMeasure: () => set({ measureA: null, measureB: null }),

      setViewMode: (m) => set({ viewMode: m }),
      toggleFire: () => set((s) => ({ showFire: !s.showFire })),
      toggleZones: () => set((s) => ({ showZones: !s.showZones })),
      setCostOpen: (open) => set({ costOpen: open }),
      setPlanOpen: (open) => set({ planOpen: open }),
      setBrandColor: (color) => {
        pushHistory(get(), 'brand')
        set({ brandColor: color })
        syncDepth(set)
      },
      setProjectName: (name) => set({ projectName: name }),

      setBudget: (usd) =>
        set({
          budget: usd === null ? null : Math.max(0, Math.min(2_000_000, Math.round(usd))),
        }),

      setCategoryBudget: (cat, usd) =>
        set((s) => {
          const next = { ...s.categoryBudgets }
          if (usd === null) delete next[cat]
          else next[cat] = Math.max(0, Math.min(2_000_000, Math.round(usd)))
          return { categoryBudgets: next }
        }),

      setPlanPalette: (p) => set({ planPalette: p }),

      saveCheckpoint: (label) => {
        const s = get()
        const snap = snapshotOf(s)
        const cap = computeCapacity(s.items, s.room, s.templateId === 'custom' ? 'cafe' : s.templateId)
        const cost = computeCost(s.items)
        const cp: SessionCheckpoint = {
          id: makeUid(),
          label: (label?.trim() || `${s.projectName} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`).slice(0, 80),
          ts: Date.now(),
          snap,
          itemCount: s.items.length,
          seats: cap.seats,
          cost: cost.total,
        }
        set((st) => ({ checkpoints: [cp, ...st.checkpoints].slice(0, CHECKPOINT_LIMIT) }))
        return cp
      },

      deleteCheckpoint: (id) =>
        set((s) => ({ checkpoints: s.checkpoints.filter((c) => c.id !== id) })),

      addZone: (init) => {
        pushHistory(get(), 'zone')
        const s = get()
        const base: Omit<ZoneDef, 'id'> = {
          label: `Zone ${s.zones.length + 1}`,
          kind: 'seating' as ZoneKind,
          x: 0,
          z: 0,
          w: 3,
          d: 2,
          ...init,
        }
        const clamped = clampZoneRect(base, s.room) ?? base
        const zn: ZoneDef = { id: makeUid(), ...base, ...clamped }
        set((st) => ({ zones: [...st.zones, zn], showZones: true }))
        syncDepth(set)
        return zn
      },

      updateZone: (id, patch, opts) => {
        if (!opts?.silent) pushHistory(get(), 'zone')
        set((s) => {
          const zn = s.zones.find((z) => z.id === id)
          if (!zn) return s
          const next = { ...zn, ...patch }
          const clamped = clampZoneRect(next, s.room)
          const merged = { ...next, ...(clamped ?? {}) }
          if (
            merged.label === zn.label && merged.kind === zn.kind &&
            merged.x === zn.x && merged.z === zn.z && merged.w === zn.w && merged.d === zn.d
          ) return s
          return { zones: s.zones.map((z) => (z.id === id ? merged : z)) }
        })
        syncDepth(set)
      },

      removeZone: (id) => {
        pushHistory(get(), 'zone')
        set((s) => ({ zones: s.zones.filter((z) => z.id !== id) }))
        syncDepth(set)
      },

      clearZones: () => {
        pushHistory(get(), 'zone')
        set({ zones: [] })
        syncDepth(set)
      },

      beginZoneEdit: () => {
        pushHistory(get(), 'zone')
        syncDepth(set)
      },

      loadTemplate: (id) => {
        pushHistory(get(), 'template')
        set(() => {
          const t = TEMPLATES[id]
          return {
            room: { w: t.roomW, d: t.roomD },
            items: t.items.map((it) => ({ uid: makeUid(), id: it.id, x: it.x, z: it.z, rot: it.rot ?? 0 })),
            zones: t.zones ?? [],
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
          zones: snap.zones ?? [],
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
          zones: prev.zones ?? [],
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
          zones: next.zones ?? [],
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
        zones: s.zones,
        brandColor: s.brandColor,
        projectName: s.projectName,
        templateId: s.templateId,
        budget: s.budget,
        categoryBudgets: s.categoryBudgets,
        planPalette: s.planPalette,
        checkpoints: s.checkpoints,
      }),
    },
  ),
)
