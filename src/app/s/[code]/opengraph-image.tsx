import { ImageResponse } from 'next/og'
import { decodeLayout } from '@/lib/planner/share'
import { getItem, halfExtents } from '@/lib/planner/catalog'
import { computeCost, fmtMoney } from '@/lib/planner/capacity'
import { ZONE_META, drawableZones } from '@/lib/planner/zones'
import type { RoomSpec, ZoneDef } from '@/lib/planner/types'

export const alt = 'FORMA space plan preview card'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#2E2B26'
const STONE = '#8A8375'
const PAPER = '#FDFAF3'
const APRON = '#F1EADB'
const BEIGE = '#E7DFC9'

export default async function OgImage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const snap = decodeLayout(code)

  if (!snap) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#C05B2E' }} />
              <div style={{ fontSize: 38, fontWeight: 700, color: INK }}>FORMA</div>
            </div>
            <div style={{ fontSize: 30, color: INK, fontWeight: 600 }}>This share link looks broken</div>
            <div style={{ fontSize: 22, color: STONE }}>Open the studio to start a new plan.</div>
          </div>
        </div>
      ),
      size,
    )
  }

  const room: RoomSpec = snap.room
  const zones: ZoneDef[] = snap.zones ?? []
  const cost = computeCost(snap.items)
  const seats = snap.items.reduce((sum, it) => sum + (getItem(it.id)?.seats ?? 0), 0)
  const venue = snap.templateId === 'custom' ? 'Custom layout' : (snap.templateId.charAt(0).toUpperCase() + snap.templateId.slice(1))

  // fit the room into the right panel
  const maxW = 600
  const maxH = 460
  const scale = Math.min(maxW / (room.w + 1), maxH / (room.d + 1))
  const px = (m: number) => m * scale
  const roomW = px(room.w)
  const roomH = px(room.d)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', backgroundColor: PAPER,
        }}
      >
        {/* left column */}
        <div
          style={{
            width: 470, height: '100%', display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', padding: '52px 48px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: snap.brandColor }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: INK, letterSpacing: '-0.02em' }}>FORMA</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: STONE, letterSpacing: '0.28em' }}>SPACE PLANNER</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: snap.brandColor, letterSpacing: '0.18em' }}>
              {venue.toUpperCase()}
            </div>
            <div style={{ fontSize: 54, fontWeight: 700, color: INK, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              {snap.projectName}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
              {[
                ['Floor area', `${room.w}×${room.d} m · ${(room.w * room.d).toFixed(0)} m²`],
                ['Seats', seats > 0 ? `${seats}` : '—'],
                ['Pieces placed', `${snap.items.length}`],
                ['Estimated fit-out', fmtMoney(cost.total)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: STONE, letterSpacing: '0.1em' }}>
                    {k.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: k === 'Estimated fit-out' ? snap.brandColor : INK }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 20, color: STONE, fontWeight: 600 }}>
            Open the interactive 3D planner →
          </div>
        </div>

        {/* right column: mini plan */}
        <div
          style={{
            flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: APRON,
          }}
        >
          <div
            style={{
              position: 'relative', display: 'flex', width: roomW, height: roomH,
              backgroundColor: '#FFFFFF', border: `6px solid ${INK}`, borderRadius: 10,
            }}
          >
            {/* zone washes */}
            {drawableZones(zones, room).map(({ zone: zn, x1, z1, x2, z2 }) => (
              <div
                key={zn.id}
                style={{
                  position: 'absolute',
                  left: px(x1 + room.w / 2), top: px(z1 + room.d / 2),
                  width: px(x2 - x1), height: px(z2 - z1),
                  backgroundColor: ZONE_META[zn.kind].color, opacity: 0.16, borderRadius: 4,
                }}
              />
            ))}
            {/* furniture glyphs */}
            {snap.items.map((it) => {
              const cat = getItem(it.id)
              if (!cat) return null
              const { hx, hz } = halfExtents(it.id, it.rot)
              const fill = cat.brandable ? snap.brandColor : cat.shape === 'counter' ? INK : BEIGE
              return (
                <div
                  key={it.uid}
                  style={{
                    position: 'absolute',
                    left: px(it.x - hx + room.w / 2), top: px(it.z - hz + room.d / 2),
                    width: px(hx * 2), height: px(hz * 2),
                    backgroundColor: fill,
                    borderRadius: cat.shape === 'circle' ? 999 : Math.max(2, px(0.06)),
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>
    ),
    size,
  )
}
