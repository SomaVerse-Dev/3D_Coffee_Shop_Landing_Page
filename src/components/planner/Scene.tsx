'use client'

import * as THREE from 'three'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { useTheme } from 'next-themes'
import { damp, damp3 } from 'maath/easing'
import { usePlanner, clampToRoom } from '@/lib/planner/store'
import { getItem, halfExtents } from '@/lib/planner/catalog'
import { egressRoutes } from '@/lib/planner/egress'
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
  uid, id, x, z, rot, brand, selected, dragging,
  onPointerDown, onOpenContext,
}: {
  uid: string
  id: string
  x: number
  z: number
  rot: number
  brand: string
  selected: boolean
  dragging: boolean
  onPointerDown: (e: ThreeEvent<PointerEvent>, uid: string) => void
  onOpenContext: (e: ThreeEvent<MouseEvent>, uid: string) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (groupRef.current) damp(groupRef.current.rotation, 'y', rot, 0.16, dt)
    // selected ring gently breathes so the selection feels alive
    if (ringRef.current && selected) {
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
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.014, z]}>
          <ringGeometry args={[ringR, ringR + 0.06, 44]} />
          <meshBasicMaterial color={brand} transparent opacity={0.85} />
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
          document.body.style.cursor = 'grab'
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
  const armedId = usePlanner((s) => s.armedId)
  const selectedUid = usePlanner((s) => s.selectedUid)
  const addItem = usePlanner((s) => s.addItem)
  const moveItem = usePlanner((s) => s.moveItem)
  const select = usePlanner((s) => s.select)
  const arm = usePlanner((s) => s.arm)
  const openContextMenu = usePlanner((s) => s.openContextMenu)
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const pal = dark ? NIGHT : DAY

  const controlsRef = useRef<any>(null)
  const animatingRef = useRef(true)
  const dragUid = useRef<string | null>(null)
  const downScreen = useRef<{ x: number; y: number } | null>(null)
  /** where the right-button went down, so a right-drag pan doesn't open the menu */
  const rightDown = useRef<{ x: number; y: number } | null>(null)
  const [ghost, setGhost] = useState<{ x: number; z: number } | null>(null)
  const [draggingUid, setDraggingUid] = useState<string | null>(null)

  useEffect(() => {
    const up = () => {
      dragUid.current = null
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
    if (dragUid.current) {
      moveItem(dragUid.current, pt.x, pt.z)
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
      setDraggingUid(null)
      if (controlsRef.current) controlsRef.current.enabled = true
      return
    }
    if (!ds) return
    const moved = Math.hypot(e.nativeEvent.clientX - ds.x, e.nativeEvent.clientY - ds.y)
    if (moved > 7) return
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
    if (armedId) return // let placement pass through
    if (e.nativeEvent.button !== 0) return // right/middle click → context menu, not drag
    e.stopPropagation()
    select(uid)
    dragUid.current = uid
    setDraggingUid(uid)
    downScreen.current = null
    if (controlsRef.current) controlsRef.current.enabled = false
  }

  const onItemContext = (e: ThreeEvent<MouseEvent>, uid: string) => {
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
      className="!absolute inset-0"
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
            selected={selectedUid === it.uid}
            dragging={draggingUid === it.uid}
            onPointerDown={onItemDown}
            onOpenContext={onItemContext}
          />
        ))}

        {armedId && ghost && <Ghost id={armedId} x={ghost.x} z={ghost.z} brand={brand} />}
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
