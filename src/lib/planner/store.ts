import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlacedItem, RoomSpec, TemplateId, ViewMode } from './types'
import { makeUid } from './types'
import { getItem, halfExtents } from './catalog'
import { TEMPLATES } from './templates'

const SNAP = 0.05

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

  setRoom: (w: number, d: number) => void
  addItem: (catalogId: string, x: number, z: number) => void
  moveItem: (uid: string, x: number, z: number) => void
  rotateItem: (uid: string) => void
  removeItem: (uid: string) => void
  duplicateItem: (uid: string) => void
  select: (uid: string | null) => void
  arm: (catalogId: string | null) => void
  setViewMode: (m: ViewMode) => void
  toggleFire: () => void
  setCostOpen: (open: boolean) => void
  setPlanOpen: (open: boolean) => void
  setBrandColor: (color: string) => void
  setProjectName: (name: string) => void
  loadTemplate: (id: TemplateId) => void
  clearAll: () => void
}

export const usePlanner = create<PlannerState>()(
  persist(
    (set) => ({
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

      setRoom: (w, d) =>
        set((s) => {
          const room = { w, d }
          const items = s.items.map((it) => {
            const p = clampToRoom(it.x, it.z, it.id, it.rot, room)
            return { ...it, ...p }
          })
          return { room, items, templateId: 'custom' }
        }),

      addItem: (catalogId, x, z) =>
        set((s) => {
          if (!getItem(catalogId)) return s
          const p = clampToRoom(snap(x), snap(z), catalogId, 0, s.room)
          const item: PlacedItem = { uid: makeUid(), id: catalogId, x: p.x, z: p.z, rot: 0 }
          return { items: [...s.items, item], selectedUid: item.uid }
        }),

      moveItem: (uid, x, z) =>
        set((s) => {
          const it = s.items.find((i) => i.uid === uid)
          if (!it) return s
          const p = clampToRoom(snap(x), snap(z), it.id, it.rot, s.room)
          return {
            items: s.items.map((i) => (i.uid === uid ? { ...i, x: p.x, z: p.z } : i)),
            templateId: 'custom',
          }
        }),

      rotateItem: (uid) =>
        set((s) => {
          const it = s.items.find((i) => i.uid === uid)
          if (!it) return s
          const rot = (it.rot + Math.PI / 2) % (Math.PI * 2)
          const p = clampToRoom(it.x, it.z, it.id, rot, s.room)
          return {
            items: s.items.map((i) => (i.uid === uid ? { ...i, rot, ...p } : i)),
            templateId: 'custom',
          }
        }),

      removeItem: (uid) =>
        set((s) => ({
          items: s.items.filter((i) => i.uid !== uid),
          selectedUid: s.selectedUid === uid ? null : s.selectedUid,
        })),

      duplicateItem: (uid) =>
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
        }),

      select: (uid) => set({ selectedUid: uid, armedId: null }),
      arm: (catalogId) =>
        set((s) => ({
          armedId: catalogId,
          selectedUid: catalogId ? null : s.selectedUid,
        })),

      setViewMode: (m) => set({ viewMode: m }),
      toggleFire: () => set((s) => ({ showFire: !s.showFire })),
      setCostOpen: (open) => set({ costOpen: open }),
      setPlanOpen: (open) => set({ planOpen: open }),
      setBrandColor: (color) => set({ brandColor: color }),
      setProjectName: (name) => set({ projectName: name }),

      loadTemplate: (id) =>
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
          }
        }),

      clearAll: () => set({ items: [], selectedUid: null, armedId: null, templateId: 'custom' }),
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
