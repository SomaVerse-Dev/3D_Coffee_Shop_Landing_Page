'use client'

import type { PlacedItem, RoomSpec, ZoneDef } from '@/lib/planner/types'
import { getItem } from '@/lib/planner/catalog'
import { ALL_CATEGORIES, CATEGORY_META } from '@/lib/planner/capacity'
import { ZONE_META, drawableZones } from '@/lib/planner/zones'

interface PlanSVGProps {
  room: RoomSpec
  items: PlacedItem[]
  brand: string
  showFire?: boolean
  detailed?: boolean
  selectedUid?: string | null
  /** every selected uid (multi-selection) — members get a lighter highlight */
  selectedUids?: string[] | null
  className?: string
  transparentPaper?: boolean
  /** glyph coloring: brand color everywhere, or one color per furniture category */
  palette?: 'brand' | 'category'
  /** functional zones (translucent washes + labels) */
  zones?: ZoneDef[]
  showZones?: boolean
  refCb?: (el: SVGSVGElement | null) => void
}

const INK = '#2E2B26'
const PAPER = '#FDFAF3'
const GRID = '#E9E0CC'
const PATH_GREEN = '#16A34A'

/** 2D architectural plan, coordinates in meters (SVG user units). */
export default function PlanSVG({
  room, items, brand, showFire = false, detailed = false, selectedUid = null, selectedUids = null, className, transparentPaper = false, palette = 'brand', zones, showZones = false, refCb,
}: PlanSVGProps) {
  const { w, d } = room
  const pad = detailed ? 1.15 : 0.55
  const vb = `${-w / 2 - pad} ${-d / 2 - pad} ${w + pad * 2} ${d + pad * 2}`
  const pxPerM = 44
  const zonesToDraw = showZones ? drawableZones(zones, room) : []

  const rearX = w / 4
  const gridLines: React.ReactNode[] = []
  for (let x = Math.ceil(-w / 2); x <= w / 2; x += 1) {
    if (Math.abs(x % 2) > 0.01) continue
    gridLines.push(
      <line key={`v${x}`} x1={x} y1={-d / 2} x2={x} y2={d / 2} stroke={GRID} strokeWidth={0.02} />,
    )
  }
  for (let z = Math.ceil(-d / 2); z <= d / 2; z += 1) {
    if (Math.abs(z % 2) > 0.01) continue
    gridLines.push(
      <line key={`h${z}`} x1={-w / 2} y1={z} x2={w / 2} y2={z} stroke={GRID} strokeWidth={0.02} />,
    )
  }

  const egressPaths = [
    `M ${-w / 4} ${-d / 4} Q ${-w / 4.4} ${d / 8}, 0 ${d / 2 - 0.45}`,
    `M ${w / 5} ${d / 10} Q ${w / 7.5} ${d / 3}, 0.15 ${d / 2 - 0.45}`,
    `M ${w / 2.6} ${d / 4} Q ${w / 2.05} ${-d / 10}, ${w / 4} ${-d / 2 + 0.45}`,
  ]

  return (
    <svg
      ref={refCb}
      viewBox={vb}
      width={Math.round((w + pad * 2) * pxPerM)}
      height={Math.round((d + pad * 2) * pxPerM)}
      className={className}
      role="img"
      aria-label="Floor plan of the current layout"
    >
      <defs>
        <marker id="eg-arrow" markerWidth="5" markerHeight="5" refX="3.4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill={PATH_GREEN} />
        </marker>
      </defs>

      {/* paper + room interior + grid (skipped when layered over another plan) */}
      {!transparentPaper && (
        <>
          <rect x={-w / 2 - pad} y={-d / 2 - pad} width={w + pad * 2} height={d + pad * 2} fill={PAPER} />
          <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="#FFFFFF" />
          {/* interior grid every 2 m */}
          {gridLines}
        </>
      )}

      {/* egress arrows */}
      {showFire && (
        <g fill="none" stroke={PATH_GREEN} strokeWidth={0.09} strokeDasharray="0.32 0.22" markerEnd="url(#eg-arrow)" opacity={0.9}>
          {egressPaths.map((p, i) => (
            <path key={i} d={p} />
          ))}
        </g>
      )}

      {/* functional zones — translucent washes under the glyphs */}
      {zonesToDraw.map(({ zone: zn, x1, z1, x2, z2 }) => {
        const color = ZONE_META[zn.kind].color
        const zw = x2 - x1
        const zd = z2 - z1
        const cx = (x1 + x2) / 2
        const labelY = z1 + Math.min(0.4, zd / 2)
        return (
          <g key={zn.id}>
            <rect
              x={x1} y={z1} width={zw} height={zd} rx={0.1}
              fill={color} fillOpacity={0.12}
              stroke={color} strokeOpacity={0.55} strokeWidth={0.035} strokeDasharray="0.26 0.18"
            />
            <text
              x={cx} y={labelY}
              textAnchor="middle"
              fontSize={0.24}
              fontWeight={700}
              fill={color}
              fillOpacity={0.9}
              style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}
            >
              {zn.label.toUpperCase()}
            </text>
          </g>
        )
      })}

      {/* items */}
      {items.map((it) => {
        const cat = getItem(it.id)
        if (!cat) return null
        const deg = (-it.rot * 180) / Math.PI
        const catColor = CATEGORY_META[cat.category].color
        const brandFill =
          palette === 'category'
            ? catColor
            : cat.brandable
              ? brand
              : cat.shape === 'counter'
                ? INK
                : '#E7DFC9'
        const isPrimary = selectedUid === it.uid
        const isMember = !isPrimary && !!selectedUids?.includes(it.uid)
        const stroke = isPrimary || isMember ? brand : INK
        const sw = isPrimary ? 0.07 : isMember ? 0.05 : 0.032
        return (
          <g key={it.uid} transform={`translate(${it.x} ${it.z}) rotate(${deg})`}>
            {cat.shape === 'circle' ? (
              <circle
                r={Math.max(cat.w, cat.d) / 2 - 0.02}
                fill={cat.seats > 0 ? brandFill : '#EFE8D4'}
                stroke={stroke}
                strokeWidth={sw}
              />
            ) : (
              <rect
                x={-cat.w / 2}
                y={-cat.d / 2}
                width={cat.w}
                height={cat.d}
                rx={0.06}
                fill={brandFill}
                stroke={stroke}
                strokeWidth={sw}
              />
            )}
            {cat.shape === 'counter' && (
              <rect x={-cat.w / 2 + 0.07} y={-cat.d / 2 + 0.07} width={cat.w - 0.14} height={cat.d - 0.14} rx={0.04}
                fill="none" stroke="#FDFAF3" strokeWidth={0.028} />
            )}
            {detailed && (cat.shape === 'counter' || cat.w >= 1.8) && (
              <text
                x={0} y={0.11}
                textAnchor="middle"
                fontSize={0.24}
                fontWeight={600}
                fill={cat.shape === 'counter' ? '#FDFAF3' : INK}
                style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', letterSpacing: '0.02em' }}
              >
                {cat.name}
              </text>
            )}
          </g>
        )
      })}

      {/* room outline + walls */}
      <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="none" stroke={INK} strokeWidth={0.1} />

      {/* entrance door (south, centered) — swing symbol */}
      <g>
        <rect x={-0.7} y={d / 2 - 0.06} width={1.4} height={0.12} fill={PAPER} />
        <line x1={-0.7} y1={d / 2} x2={-0.7} y2={d / 2 - 1.4} stroke={INK} strokeWidth={0.045} />
        <path d={`M ${-0.7} ${d / 2 - 1.4} A 1.4 1.4 0 0 1 ${0.7} ${d / 2}`} fill="none" stroke={INK} strokeWidth={0.028} strokeDasharray="0.12 0.09" />
      </g>

      {/* rear exit (north) */}
      <g>
        <rect x={rearX - 0.475} y={-d / 2 - 0.06} width={0.95} height={0.12} fill={PAPER} />
        <line x1={rearX - 0.475} y1={-d / 2} x2={rearX - 0.475} y2={-d / 2 + 0.95} stroke={INK} strokeWidth={0.045} />
        <path d={`M ${rearX - 0.475} ${-d / 2 + 0.95} A 0.95 0.95 0 0 0 ${rearX + 0.475} ${-d / 2}`} fill="none" stroke={INK} strokeWidth={0.028} strokeDasharray="0.12 0.09" />
      </g>

      {/* egress labels */}
      {showFire && (
        <g fill={PATH_GREEN} fontSize={0.26} fontWeight={700} style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
          <text x={0} y={d / 2 + 0.42} textAnchor="middle">EXIT</text>
          <text x={rearX} y={-d / 2 - 0.28} textAnchor="middle">EXIT</text>
        </g>
      )}

      {detailed && (
        <g>
          {/* north arrow */}
          <g transform={`translate(${w / 2 + 0.62} ${-d / 2 - 0.62})`}>
            <circle r={0.3} fill="none" stroke={INK} strokeWidth={0.03} />
            <path d="M 0 -0.24 L 0.1 0.12 L 0 0.04 L -0.1 0.12 Z" fill={INK} />
            <text x={0} y={0.62} textAnchor="middle" fontSize={0.26} fill={INK} fontWeight={700}
              style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>N</text>
          </g>
          {/* scale bar */}
          <g transform={`translate(${-w / 2} ${d / 2 + 0.62})`}>
            <rect x={0} y={-0.07} width={1} height={0.14} fill={INK} />
            <rect x={1} y={-0.07} width={1} height={0.14} fill="none" stroke={INK} strokeWidth={0.03} />
            <text x={0} y={-0.18} fontSize={0.22} fill={INK}
              style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>0</text>
            <text x={1} y={-0.18} textAnchor="middle" fontSize={0.22} fill={INK}
              style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>1</text>
            <text x={2} y={-0.18} textAnchor="middle" fontSize={0.22} fill={INK}
              style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>2 m</text>
          </g>
          {/* category legend (palette mode) — sits right of the scale bar on the bottom margin */
          }
          {palette === 'category' && (
            <g transform={`translate(${-w / 2 + 2.55} ${d / 2 + 0.62})`}>
              <text x={0} y={0.075} fontSize={0.21} fill="#8A8375" fontWeight={600}
                style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', letterSpacing: '0.06em' }}>KEY</text>
              {ALL_CATEGORIES.map((c, i) => {
                const short = CATEGORY_META[c].label.split(' &')[0].split(' & ')[0]
                const x = 0.72 + i * 1.45
                return (
                  <g key={c} transform={`translate(${x} 0)`}>
                    <rect x={0} y={-0.085} width={0.2} height={0.2} rx={0.045} fill={CATEGORY_META[c].color} />
                    <text x={0.28} y={0.075} fontSize={0.21} fill={INK} fontWeight={500}
                      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>{short}</text>
                  </g>
                )
              })}
            </g>
          )}
        </g>
      )}
    </svg>
  )
}
