export type Category = 'seating' | 'tables' | 'counters' | 'fixtures' | 'decor'

export type ViewMode = 'plan' | '3d'

export type TemplateId = 'cafe' | 'coworking' | 'boutique' | 'restaurant'

export interface CatalogItem {
  id: string
  name: string
  category: Category
  price: number
  /** footprint width in meters along local x axis (before rotation) */
  w: number
  /** footprint depth in meters along local z axis (before rotation) */
  d: number
  /** number of seats / workstations this item contributes to capacity */
  seats: number
  /** item reacts to brand color */
  brandable?: boolean
  /** 2D plan glyph shape */
  shape: 'rect' | 'circle' | 'counter'
  blurb: string
}

export interface PlacedItem {
  uid: string
  /** catalog item id */
  id: string
  x: number
  z: number
  /** rotation in radians, CCW around Y (0 = faces +z / south) */
  rot: number
}

export interface RoomSpec {
  w: number
  d: number
}

export interface TemplateDef {
  id: TemplateId
  name: string
  tagline: string
  roomW: number
  roomD: number
  brandColor: string
  projectName: string
  items: Array<{ id: string; x: number; z: number; rot?: number }>
}

let uidCounter = 0
export function makeUid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  uidCounter += 1
  return `item-${Date.now()}-${uidCounter}`
}
