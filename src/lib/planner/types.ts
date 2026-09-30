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
  /** optional per-item price override (USD); undefined = catalog list price */
  price?: number
}

export interface RoomSpec {
  w: number
  d: number
}

/** functional area of the floor plan (drawn as a translucent wash + label) */
export type ZoneKind =
  | 'service'   // counters, checkout, pass
  | 'seating'   // loose chairs & lounge
  | 'dining'    // table service areas
  | 'entry'     // arrival / host
  | 'work'      // desks / focus
  | 'meeting'   // meeting spots
  | 'retail'    // merch display
  | 'support'   // fitting, phone booth, back-of-house

export interface ZoneDef {
  id: string
  label: string
  kind: ZoneKind
  /** center x in meters (room coords, 0 = middle) */
  x: number
  /** center z in meters */
  z: number
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
  /** functional zones drawn under the plan glyphs */
  zones?: ZoneDef[]
}

let uidCounter = 0
export function makeUid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  uidCounter += 1
  return `item-${Date.now()}-${uidCounter}`
}
