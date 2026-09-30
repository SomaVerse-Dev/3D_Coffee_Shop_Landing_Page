import type { CatalogItem, Category } from './types'

/**
 * Furniture & fixture catalog.
 * Footprints are rough real-world dimensions in meters.
 * Prices are rough USD fit-out estimates (supply only, mid-range).
 */
export const CATALOG: CatalogItem[] = [
  // ─── Seating ────────────────────────────────────────────────────────────
  {
    id: 'cafe-chair', name: 'Café Chair', category: 'seating', price: 120,
    w: 0.5, d: 0.52, seats: 1, brandable: true, shape: 'circle',
    blurb: 'Bentwood-style side chair with branded seat pad.',
  },
  {
    id: 'bar-stool', name: 'Counter Stool', category: 'seating', price: 150,
    w: 0.42, d: 0.42, seats: 1, brandable: true, shape: 'circle',
    blurb: 'Counter-height stool with footring and low back.',
  },
  {
    id: 'task-chair', name: 'Task Chair', category: 'seating', price: 310,
    w: 0.56, d: 0.56, seats: 1, brandable: true, shape: 'circle',
    blurb: 'Swivel desk chair, upholstered in brand fabric.',
  },
  {
    id: 'lounge-chair', name: 'Lounge Chair', category: 'seating', price: 520,
    w: 0.78, d: 0.8, seats: 1, brandable: true, shape: 'rect',
    blurb: 'Upholstered accent chair for waiting corners.',
  },
  {
    id: 'sofa', name: 'Two-seat Sofa', category: 'seating', price: 1650,
    w: 1.9, d: 0.88, seats: 3, brandable: true, shape: 'rect',
    blurb: 'Compact lounge sofa with brand cushions.',
  },
  {
    id: 'booth', name: 'Booth Banquette', category: 'seating', price: 2400,
    w: 1.8, d: 1.15, seats: 4, brandable: true, shape: 'rect',
    blurb: 'High-back dining booth, seats four along a wall.',
  },

  // ─── Tables & desks ─────────────────────────────────────────────────────
  {
    id: 'round-table', name: 'Round Café Table', category: 'tables', price: 280,
    w: 0.76, d: 0.76, seats: 0, shape: 'circle',
    blurb: 'Two-top pedestal table, solid oak top.',
  },
  {
    id: 'square-table', name: 'Square Table', category: 'tables', price: 420,
    w: 0.85, d: 0.85, seats: 0, shape: 'rect',
    blurb: 'Four-top square table on tapered legs.',
  },
  {
    id: 'dining-table', name: 'Dining Table', category: 'tables', price: 760,
    w: 1.6, d: 0.9, seats: 0, shape: 'rect',
    blurb: 'Full-service dining table for four to six.',
  },
  {
    id: 'window-bar', name: 'Window Bar', category: 'tables', price: 640,
    w: 1.8, d: 0.38, seats: 0, shape: 'rect',
    blurb: 'Slim standing bar for window frontage.',
  },
  {
    id: 'desk', name: 'Work Desk', category: 'tables', price: 520,
    w: 1.4, d: 0.72, seats: 0, shape: 'rect',
    blurb: 'Single workstation with monitor arm.',
  },
  {
    id: 'desk-cluster', name: 'Desk Cluster ×4', category: 'tables', price: 2100,
    w: 2.9, d: 2.0, seats: 4, shape: 'rect',
    blurb: 'Back-to-back benching for four, screens included.',
  },
  {
    id: 'meeting-table', name: 'Meeting Table', category: 'tables', price: 1250,
    w: 2.0, d: 1.0, seats: 0, shape: 'rect',
    blurb: 'Conference table with cable spine.',
  },

  // ─── Counters & service ─────────────────────────────────────────────────
  {
    id: 'cafe-counter', name: 'Café Counter', category: 'counters', price: 4800,
    w: 2.4, d: 0.68, seats: 0, brandable: true, shape: 'counter',
    blurb: 'Service counter with espresso station and till.',
  },
  {
    id: 'pastry-case', name: 'Pastry Display', category: 'counters', price: 2900,
    w: 1.25, d: 0.72, seats: 0, shape: 'counter',
    blurb: 'Refrigerated glass pastry case on plinth.',
  },
  {
    id: 'checkout', name: 'Checkout Counter', category: 'counters', price: 1800,
    w: 1.4, d: 0.62, seats: 0, brandable: true, shape: 'counter',
    blurb: 'Retail till point with wrap panel.',
  },
  {
    id: 'host-stand', name: 'Host Stand', category: 'counters', price: 450,
    w: 0.52, d: 0.46, seats: 0, brandable: true, shape: 'rect',
    blurb: 'Greeting podium with branded face panel.',
  },
  {
    id: 'service-station', name: 'Service Station', category: 'counters', price: 980,
    w: 1.0, d: 0.56, seats: 0, shape: 'counter',
    blurb: 'Back-of-house station for cutlery and water.',
  },

  // ─── Fixtures ───────────────────────────────────────────────────────────
  {
    id: 'shelf-unit', name: 'Shelf Unit', category: 'fixtures', price: 740,
    w: 0.95, d: 0.36, seats: 0, shape: 'rect',
    blurb: 'Open retail shelving, four tiers.',
  },
  {
    id: 'clothing-rail', name: 'Clothing Rail', category: 'fixtures', price: 260,
    w: 1.25, d: 0.5, seats: 0, brandable: true, shape: 'rect',
    blurb: 'Garment rail with mixed branded stock.',
  },
  {
    id: 'display-table', name: 'Display Table', category: 'fixtures', price: 890,
    w: 1.2, d: 0.8, seats: 0, brandable: true, shape: 'rect',
    blurb: 'Two-tier merchandising table.',
  },
  {
    id: 'mannequin', name: 'Mannequin', category: 'fixtures', price: 310,
    w: 0.4, d: 0.4, seats: 0, brandable: true, shape: 'circle',
    blurb: 'Headless display mannequin on disc base.',
  },
  {
    id: 'mirror', name: 'Floor Mirror', category: 'fixtures', price: 220,
    w: 0.65, d: 0.28, seats: 0, shape: 'rect',
    blurb: 'Leaning full-height mirror, oak frame.',
  },
  {
    id: 'cabinet', name: 'Storage Cabinet', category: 'fixtures', price: 560,
    w: 0.85, d: 0.48, seats: 0, shape: 'rect',
    blurb: 'Closed storage for back of house.',
  },
  {
    id: 'phone-booth', name: 'Phone Booth', category: 'fixtures', price: 4200,
    w: 1.05, d: 1.05, seats: 1, brandable: true, shape: 'rect',
    blurb: 'Acoustic focus booth for calls and video.',
  },
  {
    id: 'whiteboard', name: 'Whiteboard', category: 'fixtures', price: 340,
    w: 1.45, d: 0.42, seats: 0, brandable: true, shape: 'rect',
    blurb: 'Mobile A-frame whiteboard with casters.',
  },

  // ─── Decor ──────────────────────────────────────────────────────────────
  {
    id: 'plant', name: 'Potted Plant', category: 'decor', price: 140,
    w: 0.5, d: 0.5, seats: 0, shape: 'circle',
    blurb: 'Ficus in a stoneware pot.',
  },
  {
    id: 'rug', name: 'Area Rug', category: 'decor', price: 480,
    w: 2.0, d: 1.4, seats: 0, brandable: true, shape: 'rect',
    blurb: 'Flatweave rug dyed in brand color.',
  },
  {
    id: 'pendant', name: 'Pendant Light', category: 'decor', price: 190,
    w: 0.4, d: 0.4, seats: 0, brandable: true, shape: 'circle',
    blurb: 'Enamel pendant on long drop cord.',
  },
  {
    id: 'floor-lamp', name: 'Floor Lamp', category: 'decor', price: 210,
    w: 0.36, d: 0.36, seats: 0, brandable: true, shape: 'circle',
    blurb: 'Reading lamp with linen shade.',
  },
  {
    id: 'sign-board', name: 'Brand Sign Board', category: 'decor', price: 650,
    w: 1.1, d: 0.16, seats: 0, brandable: true, shape: 'rect',
    blurb: 'Wall-mounted logo board in brand enamel.',
  },
]

export const CATALOG_MAP: Record<string, CatalogItem> = Object.fromEntries(
  CATALOG.map((c) => [c.id, c]),
)

export const CATEGORY_META: Record<Category | 'all', { label: string }> = {
  all: { label: 'All' },
  seating: { label: 'Seating' },
  tables: { label: 'Tables & desks' },
  counters: { label: 'Counters' },
  fixtures: { label: 'Fixtures' },
  decor: { label: 'Decor' },
}

export function getItem(id: string): CatalogItem {
  return CATALOG_MAP[id]
}

/** effective footprint half-extents for a rotated item */
export function halfExtents(id: string, rot: number): { hx: number; hz: number } {
  const it = getItem(id)
  const c = Math.abs(Math.cos(rot))
  const s = Math.abs(Math.sin(rot))
  return { hx: (it.w * c + it.d * s) / 2, hz: (it.w * s + it.d * c) / 2 }
}
