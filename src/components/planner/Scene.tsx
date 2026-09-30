'use client'

import * as THREE from 'three'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Grid, Html, Line, OrbitControls } from '@react-three/drei'
import { useTheme } from 'next-themes'
import { damp, damp3 } from 'maath/easing'
import { usePlanner, clampToRoom } from '@/lib/planner/store'
import { getItem, halfExtents } from '@/lib/planner/catalog'
import { egressRoutes } from '@/lib/planner/egress'
import { ZONE_META, drawableZones } from '@/lib/planner/zones'
import { ItemModel } from './furniture'

const WALL_H = 2.5
const WALL_T = 0.12

/* Day + night scene palettes — the 3D viewport re-lights when the theme flips */
const DAY = {
  bg: '#EDE7D9',
  fog: '#EDE7D9',
  floor: '#F5F0E4',
  apron: '#E9E1CF',
  wall: '#EFE8D8',
  wallCap: '#3A372F',
  gridCell: '#DCD2BA',
  gridSection: '#C6B995',
  windowGlass: '#D8E0D6',
  windowFrame: '#A78861',
  threshold: '#C9BC9C',
  hemiSky: '#FFFFFF',
  hemiGround: '#CBC2AC',
  ambient: 0.55,
  hemi: 0.55,
  sun: 1.25,
}

const NIGHT = {
  bg: '#191510',
  fog: '#191510',
  floor: '#2A251D',
  apron: '#201C15',
  wall: '#332D24',
  wallCap: '#514939',
  gridCell: '#3D362B',
  gridSection: '#514839',
  windowGlass: '#8FA08F',
  windowFrame: '#8A724E',
  threshold: '#57503F',
  hemiSky: '#6B6355',
  hemiGround: '#16120C',
  ambient: 0.34,
  hemi: 0.42,
  sun: 0.85,
}

function floorPoint(e: ThreeEvent<PointerEvent | MouseEvent>): { x: number; z: number } {
  const t = -e.ray.origin.y / e.ray.direction.y
  return {
    x: e.ray.origin.x + e.ray.direction.x * t,
    z: e.ray.origin.z + e.ray.direction.z * t,
  }
}

// ─── Floor measure tool ───────────────────────────────────────────────────

/** meters → feet/inches string, e.g. 2.4 m → 7′10″ */
function feetInches(m: number): string {
  const totalIn = m * 39.3701
  const ft = Math.floor(totalIn / 12)
  let inch = Math.round(totalIn - ft * 12)
  let ftOut = ft
  if (inch === 12) {
    ftOut += 1
    inch = 0
  }
  return `${ftOut}′${inch}″`
}

const MEASURE_INK = '#2E2B26'
const AREA_FILL = '#16A34A'

/** polygon area via the shoelace formula (meters → m²) */
function polygonArea(pts: Array<{ x: number; z: number }>): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += p.x * q.z - q.x * p.z
  }
  return Math.abs(a) / 2
}

/** polygon centroid (for the area label) — falls back to the vertex average */
function polygonCentroid(pts: Array<{ x: number; z: number }>): { x: number; z: number } {
  let a = 0
  let cx = 0
  let cz = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    const cross = p.x * q.z - q.x * p.z
    a += cross
    cx += (p.x + q.x) * cross
    cz += (p.z + q.z) * cross
  }
  if (Math.abs(a) < 1e-6) {
    const n = pts.length || 1
    return { x: pts.reduce((s, p) => s + p.x, 0) / n, z: pts.reduce((s, p) => s + p.z, 0) / n }
  }
  return { x: cx / (3 * a), z: cz / (3 * a) }
}

/** square meters → square feet string, e.g. 4.8 m² → 51.7 ft² */
function sqFeet(sqM: number): string {
  return `${(sqM * 10.7639).toFixed(1)} ft²`
}

/**
 * The area-measure overlay: a live polygon with a translucent fill, solid
 * committed edges, a dashed rubber edge to the cursor and a floating m² label.
 */
function AreaGizmo({
  pts, hover, closed,
}: {
  pts: Array<{ x: number; z: number }>
  hover: { x: number; z: number } | null
  closed: boolean
}) {
  const canClose = pts.length >= 3
  // while open, the last edge follows the cursor (unless the cursor sits on the start point)
  const snapping = !closed && canClose && hover && Math.hypot(hover.x - pts[0].x, hover.z - pts[0].z) < 0.25
  const cursor = !closed && hover && !snapping ? hover : null

  const loop = useMemo(() => {
    const out: Array<[number, number, number]> = pts.map((p) => [p.x, 0.025, p.z])
    if (cursor) out.push([cursor.x, 0.025, cursor.z])
    return out
  }, [pts, cursor])

  const fillMesh = useMemo(() => {
    if (!closed || pts.length < 3) return null
    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.z)))
    const geo = new THREE.ShapeGeometry(shape)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [closed, pts])

  const area = canClose ? polygonArea(pts) : 0
  const centroid = canClose ? polygonCentroid(pts) : null

  return (
    <group renderOrder={3}>
      {fillMesh && (
        <mesh geometry={fillMesh} position={[0, 0.018, 0]} renderOrder={2}>
          <meshBasicMaterial color={AREA_FILL} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {loop.length >= 2 && (
        <Line
          points={closed ? pts.map((p) => [p.x, 0.025, p.z] as [number, number, number]) : loop}
          color={snapping || closed ? AREA_FILL : MEASURE_INK}
          lineWidth={2}
          dashed={!closed && !snapping}
          dashSize={0.14}
          gapSize={0.1}
          transparent
          opacity={closed ? 0.95 : 0.8}
          renderOrder={3}
        />
      )}
      {pts.map((p, i) => (
        <MeasureMarker key={i} x={p.x} z={p.z} color={closed ? AREA_FILL : MEASURE_INK} />
      ))}
      {centroid && area > 0.05 && (
        <Html position={[centroid.x, 0.05, centroid.z]} center style={{ pointerEvents: 'none' }} zIndexRange={[30, 0]}>
          <div
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-charcoal/92 px-2.5 py-1 shadow-md ring-1 ring-white/20"
            data-testid="area-label"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: closed ? '#4ADE80' : '#D6D3D1' }}
              aria-hidden
            />
            <span className="font-display text-[11.5px] font-bold tabular-nums leading-none text-warmwhite">
              {area.toFixed(2)} m²
            </span>
            <span className="text-[9.5px] font-medium tabular-nums leading-none text-stone-300">
              {sqFeet(area)}
            </span>
            {!closed && <span className="text-[9.5px] font-medium leading-none text-stone-400">· Enter to close</span>}
          </div>
        </Html>
      )}
    </group>
  )
}

function MeasureMarker({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0.022, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <ringGeometry args={[0.09, 0.14, 28]} />
        <meshBasicMaterial color={color} depthWrite={false} transparent opacity={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <circleGeometry args={[0.045, 20]} />
        <meshBasicMaterial color={color} depthWrite={false} />
      </mesh>
    </group>
  )
}

/**
 * The tape-measure overlay: two sampled points, a straight run between them
 * and a floating distance label. While only A is set, the line follows the
 * cursor as a dashed preview.
 */
function MeasureGizmo({
  a, b, hover,
}: {
  a: { x: number; z: number }
  b: { x: number; z: number } | null
  hover: { x: number; z: number } | null
}) {
  const target = b ?? (hover && (Math.abs(hover.x - a.x) > 0.01 || Math.abs(hover.z - a.z) > 0.01) ? hover : null)
  const dist = target ? Math.hypot(target.x - a.x, target.z - a.z) : 0
  const mid = target ? { x: (a.x + target.x) / 2, z: (a.z + target.z) / 2 } : null
  const confirmed = b !== null

  return (
    <group renderOrder={3}>
      {target && (
        <Line
          points={[
            [a.x, 0.025, a.z],
            [target.x, 0.025, target.z],
          ]}
          color={MEASURE_INK}
          lineWidth={2}
          dashed={!confirmed}
          dashSize={0.14}
          gapSize={0.1}
          transparent
          opacity={confirmed ? 0.95 : 0.65}
          renderOrder={3}
        />
      )}
      <MeasureMarker x={a.x} z={a.z} color={MEASURE_INK} />
      {b && <MeasureMarker x={b.x} z={b.z} color="#16A34A" />}
      {mid && (
        <Html position={[mid.x, 0.05, mid.z]} center style={{ pointerEvents: 'none' }} zIndexRange={[30, 0]}>
          <div
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-charcoal/92 px-2.5 py-1 shadow-md ring-1 ring-white/20"
            data-testid="measure-label"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: confirmed ? '#4ADE80' : '#D6D3D1' }}
              aria-hidden
            />
            <span className="font-display text-[11.5px] font-bold tabular-nums leading-none text-warmwhite">
              {dist.toFixed(2)} m
            </span>
            <span className="text-[9.5px] font-medium tabular-nums leading-none text-stone-300">
              {feetInches(dist)}
            </span>
          </div>
        </Html>
      )}
    </group>
  )
}

function ZoneWashes({ zones, dark }: { zones: ReturnType<typeof drawableZones>; dark: boolean }) {
  return (
    <group>
      {zones.map(({ zone: zn, x1, z1, x2, z2 }) => (
        <mesh
          key={zn.id}
          position={[(x1 + x2) / 2, 0.0035, (z1 + z2) / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1}
        >
          <planeGeometry args={[x2 - x1, z2 - z1]} />
          <meshBasicMaterial
            color={ZONE_META[zn.kind].color}
            transparent
            opacity={dark ? 0.17 : 0.13}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─── Camera rig: smooth swing between plan and 3D + zoom requests ─────────

function CameraRig({
  roomW, roomD, viewMode, controlsRef, animatingRef,
}: {
  roomW: number
  roomD: number
  viewMode: 'plan' | '3d'
  controlsRef: React.MutableRefObject<any>
  animatingRef: React.MutableRefObject<boolean>
}) {
  const zoomReq = usePlanner((s) => s.zoomReq)
  const lastReq = useRef(0)
  /** active dolly animation: camera position we are easing toward, or null */
  const dollyTarget = useRef<THREE.Vector3 | null>(null)

  const target = useMemo(() => {
    return viewMode === 'plan'
      ? { pos: new THREE.Vector3(0.02, Math.max(roomW, roomD) * 1.3 + 3, 0.02), look: new THREE.Vector3(0, 0, 0) }
      : { pos: new THREE.Vector3(roomW * 0.52, Math.max(6, Math.max(roomW, roomD) * 0.52), roomD * 0.82), look: new THREE.Vector3(0, 0.4, 0) }
  }, [viewMode, roomW, roomD])

  useEffect(() => {
    animatingRef.current = true
  }, [target, animatingRef])

  // react to zoom requests coming from the HUD buttons / keyboard
  useEffect(() => {
    if (zoomReq.n === lastReq.current) return
    lastReq.current = zoomReq.n
    const c = controlsRef.current
    if (!c) return
    if (zoomReq.kind === 'fit') {
      // re-frame the room: replay the swing to the current view's home position
      animatingRef.current = true
      return
    }
    const cam = c.object as THREE.Camera
    const dir = cam.position.clone().sub(c.target)
    const len = dir.length()
    const next = THREE.MathUtils.clamp(
      zoomReq.kind === 'in' ? len * 0.72 : len * 1.42,
      c.minDistance ?? 3.5,
      c.maxDistance ?? 48,
    )
    if (Math.abs(next - len) < 0.05) return
    dollyTarget.current = c.target.clone().add(dir.setLength(next))
  }, [zoomReq, controlsRef])

  useFrame((state, dt) => {
    const c = controlsRef.current
    if (!c) return

    // eased zoom-in/out along the view vector
    if (dollyTarget.current) {
      damp3(state.camera.position, dollyTarget.current, 0.16, dt)
      if (state.camera.position.distanceTo(dollyTarget.current) < 0.04) {
        state.camera.position.copy(dollyTarget.current)
        dollyTarget.current = null
      }
      return
    }

    if (animatingRef.current) {
      c.enabled = false
      // top-down needs a stable roll: screen-up = north (-z); 3D restores standard up
      if (viewMode === 'plan') state.camera.up.set(0, 0, -1)
      else state.camera.up.set(0, 1, 0)
      damp3(state.camera.position, target.pos, 0.42, dt)
      damp3(c.target, target.look, 0.42, dt)
      state.camera.lookAt(target.look)
      if (state.camera.position.distanceTo(target.pos) < 0.06) {
        animatingRef.current = false
        c.enabled = true
      }
    }
  })
  return null
}

// ─── Room shell: floor, grid, walls, windows, exits ────────────────────────

type Palette = typeof DAY

function WallSegment({ x, z, len, alongX, pal }: { x: number; z: number; len: number; alongX: boolean; pal: Palette }) {
  if (len <= 0.05) return null
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, WALL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={alongX ? [len, WALL_H, WALL_T] : [WALL_T, WALL_H, len]} />
        <meshStandardMaterial color={pal.wall} roughness={0.92} />
      </mesh>
      <mesh position={[0, WALL_H + 0.03, 0]}>
        <boxGeometry args={alongX ? [len, 0.06, WALL_T + 0.04] : [WALL_T + 0.04, 0.06, len]} />
        <meshStandardMaterial color={pal.wallCap} roughness={0.8} />
      </mesh>
    </group>
  )
}

function Room({ w, d, showFire, pal }: { w: number; d: number; showFire: boolean; pal: Palette }) {
  const segs = useMemo(() => {
    const S = [
      { x: (-w / 2 + -0.7) / 2, z: d / 2 + WALL_T / 2, len: -0.7 - -w / 2, alongX: true },
      { x: (0.7 + w / 2) / 2, z: d / 2 + WALL_T / 2, len: w / 2 - 0.7, alongX: true },
    ]
    const rearX = w / 4
    const N = [
      { x: (-w / 2 + (rearX - 0.475)) / 2, z: -d / 2 - WALL_T / 2, len: rearX - 0.475 - -w / 2, alongX: true },
      { x: (rearX + 0.475 + w / 2) / 2, z: -d / 2 - WALL_T / 2, len: w / 2 - (rearX + 0.475), alongX: true },
    ]
    const W = [{ x: -w / 2 - WALL_T / 2, z: 0, len: d + WALL_T * 2, alongX: false }]
    const E = [{ x: w / 2 + WALL_T / 2, z: 0, len: d + WALL_T * 2, alongX: false }]
    return [...S, ...N, ...W, ...E]
  }, [w, d])

  const doorH = 1.4
  const rearW = 0.95

  return (
    <group>
      {/* floor slab */}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <boxGeometry args={[w, 0.08, d]} />
        <meshStandardMaterial color={pal.floor} roughness={0.95} />
      </mesh>
      {/* blueprint grid */}
      <Grid
        position={[0, 0.006, 0]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor={pal.gridCell}
        sectionSize={2}
        sectionThickness={0.9}
        sectionColor={pal.gridSection}
        fadeDistance={58}
        fadeStrength={1.1}
        infiniteGrid
      />
      {segs.map((s, i) => (
        <WallSegment key={i} {...s} pal={pal} />
      ))}
      {/* interior windows on west wall */}
      {[-d / 4, d / 4].map((z) => (
        <group key={z} position={[-w / 2 + 0.04, 0, z]}>
          <mesh position={[0, 1.45, 0]}>
            <boxGeometry args={[0.03, 1.3, Math.min(1.6, d / 3)]} />
            <meshStandardMaterial color={pal.windowGlass} transparent opacity={0.4} roughness={0.15} metalness={0.1} />
          </mesh>
          <mesh position={[0, 1.45, 0]}>
            <boxGeometry args={[0.05, 1.38, 0.06]} />
            <meshStandardMaterial color={pal.windowFrame} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <boxGeometry args={[0.07, 0.08, Math.min(1.66, d / 3 + 0.06)]} />
            <meshStandardMaterial color={pal.windowFrame} roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* entrance threshold + rear exit threshold */}
      <mesh position={[0, 0.005, d / 2 - 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[doorH, 0.16]} />
        <meshStandardMaterial color={pal.threshold} roughness={1} />
      </mesh>
      <mesh position={[w / 4, 0.005, -d / 2 + 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[rearW, 0.16]} />
        <meshStandardMaterial color={pal.threshold} roughness={1} />
      </mesh>
      {showFire && <Exits w={w} d={d} />}
    </group>
  )
}

function Exits({ w, d }: { w: number; d: number }) {
  const green = '#16A34A'
  const frame = (x: number, z: number, alongX: boolean, width: number) => (
    <group position={[x, 0, z]}>
      {/* jambs */}
      <mesh position={alongX ? [-width / 2 - 0.05, 1.1, 0] : [0, 1.1, -width / 2 - 0.05]} castShadow>
        <boxGeometry args={alongX ? [0.1, 2.2, WALL_T + 0.05] : [WALL_T + 0.05, 2.2, 0.1]} />
        <meshStandardMaterial color="#2F7A4F" emissive={green} emissiveIntensity={0.08} roughness={0.6} />
      </mesh>
      <mesh position={alongX ? [width / 2 + 0.05, 1.1, 0] : [0, 1.1, width / 2 + 0.05]} castShadow>
        <boxGeometry args={alongX ? [0.1, 2.2, WALL_T + 0.05] : [WALL_T + 0.05, 2.2, 0.1]} />
        <meshStandardMaterial color="#2F7A4F" emissive={green} emissiveIntensity={0.08} roughness={0.6} />
      </mesh>
      {/* header */}
      <mesh position={[0, 2.24, 0]}>
        <boxGeometry args={alongX ? [width + 0.2, 0.12, WALL_T + 0.05] : [WALL_T + 0.05, 0.12, width + 0.2]} />
        <meshStandardMaterial color="#2F7A4F" emissive={green} emissiveIntensity={0.08} roughness={0.6} />
      </mesh>
      {/* sign */}
      <mesh position={alongX ? [0, 2.3, z > 0 ? -0.35 : 0.35] : [x > 0 ? -0.35 : 0.35, 2.3, 0]}>
        <boxGeometry args={[0.44, 0.2, 0.05]} />
        <meshStandardMaterial color={green} emissive={green} emissiveIntensity={0.85} roughness={0.4} />
      </mesh>
    </group>
  )
  return (
    <group>
      {frame(0, d / 2 + WALL_T / 2, true, 1.4)}
      {frame(w / 4, -d / 2 - WALL_T / 2, true, 0.95)}
    </group>
  )
}

// ─── Animated egress chevrons ──────────────────────────────────────────────

function Chevron() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <coneGeometry args={[0.11, 0.34, 4]} />
      <meshBasicMaterial color="#16A34A" transparent opacity={0.95} />
    </mesh>
  )
}

function EgressPaths({ w, d }: { w: number; d: number }) {
  const { curves, counts, total } = useMemo(() => {
    const v = (x: number, z: number) => new THREE.Vector3(x, 0.035, z)
    const mk = (pts: THREE.Vector3[]) => new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4)
    const cs = egressRoutes({ w, d }).map((r) => mk(r.map((p) => v(p.x, p.z))))
    const countsArr = cs.map((c) => Math.max(7, Math.floor(c.getLength() / 0.62)))
    return { curves: cs, counts: countsArr, total: countsArr.reduce((a, b) => a + b, 0) }
  }, [w, d])

  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t0 = clock.elapsedTime * 0.16
    let idx = 0
    for (let ci = 0; ci < curves.length; ci++) {
      const c = curves[ci]
      const n = counts[ci]
      for (let i = 0; i < n; i++, idx++) {
        const obj = groupRef.current?.children[idx]
        if (!obj) continue
        const t = (t0 + i / n) % 1
        const p = c.getPointAt(t)
        const tan = c.getTangentAt(t)
        obj.position.set(p.x, 0.035, p.z)
        obj.lookAt(p.x + tan.x, 0.035, p.z + tan.z)
        const s = 0.55 + 0.55 * Math.sin(t * Math.PI)
        obj.scale.setScalar(s)
      }
    }
  })

  return (
    <group ref={groupRef}>
      {Array.from({ length: total }, (_, i) => (
        <Chevron key={i} />
      ))}
    </group>
  )
}

// ─── Placed items with drag support ────────────────────────────────────────

function PlacedItemView({
  uid, id, x, z, rot, brand, selected, primary, dragging, interactive,
  onPointerDown, onOpenContext,
}: {
  uid: string
  id: string
  x: number
  z: number
  rot: number
  brand: string
  /** member of the current selection (single or multi) */
  selected: boolean
  /** the anchor piece of a multi-selection (breathing brand ring) */
  primary: boolean
  dragging: boolean
  /** false while the measure tool is armed — no grab cursor / selection styling */
  interactive: boolean
  onPointerDown: (e: ThreeEvent<PointerEvent>, uid: string) => void
  onOpenContext: (e: ThreeEvent<MouseEvent>, uid: string) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (groupRef.current) damp(groupRef.current.rotation, 'y', rot, 0.16, dt)
    // primary ring gently breathes so the selection feels alive
    if (ringRef.current && primary) {
      const s = 1 + Math.sin(performance.now() * 0.004) * 0.025
      ringRef.current.scale.setScalar(s)
    }
  })
  const cat = getItem(id)
  const { hx, hz } = halfExtents(id, rot)
  const ringR = Math.max(hx, hz) + 0.14

  return (
    <>
      {selected && (
        <mesh
          ref={primary ? ringRef : undefined}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.014, z]}
        >
          <ringGeometry args={primary ? [ringR, ringR + 0.06, 44] : [ringR, ringR + 0.045, 40]} />
          <meshBasicMaterial color={primary ? brand : '#57534E'} transparent opacity={primary ? 0.85 : 0.75} />
        </mesh>
      )}
      {(dragging || selected) && cat && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, z]}>
          <planeGeometry args={[hx * 2, hz * 2]} />
          <meshBasicMaterial color={brand} transparent opacity={dragging ? 0.22 : 0.1} depthWrite={false} />
        </mesh>
      )}
      <group
        ref={groupRef}
        position={[x, 0, z]}
        onPointerDown={(e) => onPointerDown(e, uid)}
        onContextMenu={(e) => onOpenContext(e, uid)}
        onPointerOver={() => {
          if (interactive) document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <ItemModel id={id} brand={brand} />
      </group>
    </>
  )
}

// ─── Ghost preview ─────────────────────────────────────────────────────────

function Ghost({ id, x, z, brand }: { id: string; x: number; z: number; brand: string }) {
  const cat = getItem(id)
  if (!cat) return null
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.013, 0]}>
        <planeGeometry args={[cat.w, cat.d]} />
        <meshBasicMaterial color={brand} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <ItemModel id={id} brand={brand} />
    </group>
  )
}

// ─── Scene root ────────────────────────────────────────────────────────────

export default function Scene() {
  const room = usePlanner((s) => s.room)
  const items = usePlanner((s) => s.items)
  const brand = usePlanner((s) => s.brandColor)
  const viewMode = usePlanner((s) => s.viewMode)
  const showFire = usePlanner((s) => s.showFire)
  const zones = usePlanner((s) => s.zones)
  const showZones = usePlanner((s) => s.showZones)
  const armedId = usePlanner((s) => s.armedId)
  const selectedUid = usePlanner((s) => s.selectedUid)
  const selectedUids = usePlanner((s) => s.selectedUids)
  const addItem = usePlanner((s) => s.addItem)
  const dragItems = usePlanner((s) => s.dragItems)
  const select = usePlanner((s) => s.select)
  const setPrimary = usePlanner((s) => s.setPrimary)
  const toggleSelect = usePlanner((s) => s.toggleSelect)
  const arm = usePlanner((s) => s.arm)
  const openContextMenu = usePlanner((s) => s.openContextMenu)
  const measureMode = usePlanner((s) => s.measureMode)
  const measureA = usePlanner((s) => s.measureA)
  const measureB = usePlanner((s) => s.measureB)
  const measureTarget = usePlanner((s) => s.measureTarget)
  const areaPts = usePlanner((s) => s.areaPts)
  const areaClosed = usePlanner((s) => s.areaClosed)
  const setMeasurePoint = usePlanner((s) => s.setMeasurePoint)
  const addAreaPt = usePlanner((s) => s.addAreaPt)
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const pal = dark ? NIGHT : DAY

  const controlsRef = useRef<any>(null)
  const animatingRef = useRef(true)
  const dragUid = useRef<string | null>(null)
  const downScreen = useRef<{ x: number; y: number } | null>(null)
  /** where the right-button went down, so a right-drag pan doesn't open the menu */
  const rightDown = useRef<{ x: number; y: number } | null>(null)
  /** drag-start positions for every piece in the moving group (grab-offset preserved) */
  const dragStarts = useRef<Array<{ uid: string; x: number; z: number }>>([])
  /** floor point under the pointer at drag start (delta source) */
  const dragOrigin = useRef<{ x: number; z: number } | null>(null)
  const [ghost, setGhost] = useState<{ x: number; z: number } | null>(null)
  const [draggingUid, setDraggingUid] = useState<string | null>(null)
  /** live cursor point while the measure tool is armed (preview line/edge) */
  const [measureHover, setMeasureHover] = useState<{ x: number; z: number } | null>(null)

  useEffect(() => {
    const up = () => {
      dragUid.current = null
      dragStarts.current = []
      dragOrigin.current = null
      setDraggingUid(null)
      downScreen.current = null
      if (controlsRef.current) controlsRef.current.enabled = true
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const onGroundDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button === 2) {
      rightDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
      return
    }
    downScreen.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
  }

  const onGroundMove = (e: ThreeEvent<PointerEvent>) => {
    const pt = floorPoint(e)
    if (dragUid.current && dragOrigin.current && dragStarts.current.length > 0) {
      // whole-group delta from the drag origin; each piece keeps its grab offset
      dragItems(dragStarts.current, pt.x - dragOrigin.current.x, pt.z - dragOrigin.current.z)
      return
    }
    if (measureMode) {
      // only re-render when the cursor moved meaningfully (2 cm)
      setMeasureHover((prev) =>
        !prev || Math.abs(prev.x - pt.x) > 0.02 || Math.abs(prev.z - pt.z) > 0.02 ? { x: pt.x, z: pt.z } : prev,
      )
      return
    }
    if (armedId) {
      const p = clampToRoom(pt.x, pt.z, armedId, 0, room)
      setGhost(p)
    }
  }

  const onGroundUp = (e: ThreeEvent<PointerEvent>) => {
    const ds = downScreen.current
    downScreen.current = null
    if (dragUid.current) {
      dragUid.current = null
      dragStarts.current = []
      dragOrigin.current = null
      setDraggingUid(null)
      if (controlsRef.current) controlsRef.current.enabled = true
      return
    }
    if (!ds) return
    const moved = Math.hypot(e.nativeEvent.clientX - ds.x, e.nativeEvent.clientY - ds.y)
    if (moved > 7) return
    if (measureMode) {
      const pt = floorPoint(e)
      if (measureTarget === 'area') addAreaPt(pt)
      else setMeasurePoint(pt)
      setMeasureHover({ x: pt.x, z: pt.z })
      return
    }
    if (armedId) {
      const pt = floorPoint(e)
      addItem(armedId, pt.x, pt.z)
      arm(null)
      setGhost(null)
    } else {
      select(null)
    }
  }

  const onItemDown = (e: ThreeEvent<PointerEvent>, uid: string) => {
    if (measureMode) return // measure clicks pass through pieces to the floor
    if (armedId) return // let placement pass through
    if (e.nativeEvent.button !== 0) return // right/middle click → context menu, not drag
    // Shift+Click toggles membership in the multi-selection (no drag)
    if (e.nativeEvent.shiftKey || e.nativeEvent.metaKey || e.nativeEvent.ctrlKey) {
      e.stopPropagation()
      toggleSelect(uid)
      return
    }
    e.stopPropagation()
    // clicking a member of a multi-selection moves the whole group (re-anchor only);
    // clicking elsewhere starts a single selection with grab-offset preserved
    const isMember = selectedUids.includes(uid)
    if (isMember) setPrimary(uid)
    else select(uid)
    dragUid.current = uid
    dragStarts.current = items
      .filter((i) => (isMember ? selectedUids : [uid]).includes(i.uid))
      .map((i) => ({ uid: i.uid, x: i.x, z: i.z }))
    dragOrigin.current = floorPoint(e)
    setDraggingUid(uid)
    downScreen.current = null
    if (controlsRef.current) controlsRef.current.enabled = false
  }

  const onItemContext = (e: ThreeEvent<MouseEvent>, uid: string) => {
    if (measureMode) return // no context menu while measuring
    e.stopPropagation()
    e.nativeEvent.preventDefault()
    // ignore if this was the end of a right-drag pan
    const rd = rightDown.current
    rightDown.current = null
    if (rd && Math.hypot(e.nativeEvent.clientX - rd.x, e.nativeEvent.clientY - rd.y) > 6) return
    openContextMenu(uid, e.nativeEvent.clientX, e.nativeEvent.clientY)
  }

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [11, 8.5, 11], fov: 40, near: 0.1, far: 150 }}
      gl={{ antialias: true }}
      className={`!absolute inset-0${measureMode ? ' cursor-crosshair' : ''}`}
    >
      <color attach="background" args={[pal.bg]} />
      <fog attach="fog" args={[pal.fog, 34, 85]} />

      <ambientLight intensity={pal.ambient} />
      <hemisphereLight args={[pal.hemiSky, pal.hemiGround, pal.hemi]} />
      <directionalLight
        position={[9, 13, 7]}
        intensity={pal.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-bias={-0.0004}
      />

      <Suspense fallback={null}>
        <Room w={room.w} d={room.d} showFire={showFire} pal={pal} />
        {showZones && <ZoneWashes zones={drawableZones(zones, room)} dark={dark} />}
        {showFire && <EgressPaths w={room.w} d={room.d} />}

        {/* interaction ground */}
        <mesh
          position={[0, -0.09, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          onPointerDown={onGroundDown}
          onPointerMove={onGroundMove}
          onPointerUp={onGroundUp}
        >
          <planeGeometry args={[90, 90]} />
          <meshStandardMaterial color={pal.apron} roughness={1} />
        </mesh>

        {items.map((it) => (
          <PlacedItemView
            key={it.uid}
            {...it}
            brand={brand}
            selected={selectedUids.includes(it.uid) && !measureMode}
            primary={selectedUid === it.uid && !measureMode}
            dragging={draggingUid === it.uid}
            interactive={!measureMode}
            onPointerDown={onItemDown}
            onOpenContext={onItemContext}
          />
        ))}

        {armedId && ghost && <Ghost id={armedId} x={ghost.x} z={ghost.z} brand={brand} />}

        {measureMode && measureTarget === 'distance' && measureA && (
          <MeasureGizmo a={measureA} b={measureB} hover={measureHover} />
        )}
        {measureMode && measureTarget === 'area' && areaPts.length > 0 && (
          <AreaGizmo pts={areaPts} hover={measureHover} closed={areaClosed} />
        )}
      </Suspense>

      <CameraRig
        roomW={room.w}
        roomD={room.d}
        viewMode={viewMode}
        controlsRef={controlsRef}
        animatingRef={animatingRef}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.09}
        minDistance={3.5}
        maxDistance={48}
        maxPolarAngle={Math.PI / 2 - 0.05}
        enableRotate={viewMode === '3d'}
        onStart={() => {
          animatingRef.current = false
        }}
      />
    </Canvas>
  )
}
