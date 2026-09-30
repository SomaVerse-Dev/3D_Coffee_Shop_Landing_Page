'use client'

import type { ReactNode } from 'react'

/**
 * Procedural furniture meshes built from primitives.
 * All dimensions in meters; items face +z (south) by default.
 */

// palette (warm white / oat / charcoal + wood + metal accents)
const CHARCOAL = '#35322C'
const CHARCOAL_SOFT = '#4A463E'
const OAT = '#E4DAC4'
const OAT_DEEP = '#CDBFA2'
const WOOD = '#C8A97E'
const WOOD_DARK = '#A78861'
const WHITE_WARM = '#F2EDE1'
const STONE = '#EAE3D1'
const METAL = '#8E8778'
const METAL_DARK = '#57534A'
const GLASS = '#D8E0D6'
const LEAF_1 = '#4E7A4E'
const LEAF_2 = '#5E8A55'
const LEAF_3 = '#44693F'
const POT = '#BE8A5A'
const NEUTRAL_BODY = '#EDE7D9'
const BULB = '#FFE2A8'

type Vec3 = [number, number, number]

function Bx({ p, s, c, rx = 0, ry = 0, rz = 0, rough = 0.85, metal = 0, op }: {
  p: Vec3; s: Vec3; c: string; rx?: number; ry?: number; rz?: number
  rough?: number; metal?: number; op?: number
}) {
  return (
    <mesh position={p} rotation={[rx, ry, rz]} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c} roughness={rough} metalness={metal}
        {...(op !== undefined ? { transparent: true, opacity: op } : {})}
      />
    </mesh>
  )
}

function Cy({ p, rt, rb, h, c, rx = 0, ry = 0, rz = 0, rough = 0.8, metal = 0, seg = 20, flat = false, emissive, ei = 0 }: {
  p: Vec3; rt: number; rb: number; h: number; c: string
  rx?: number; ry?: number; rz?: number; rough?: number; metal?: number
  seg?: number; flat?: boolean; emissive?: string; ei?: number
}) {
  return (
    <mesh position={p} rotation={[rx, ry, rz]} castShadow receiveShadow>
      <cylinderGeometry args={[rt, rb, h, seg]} />
      <meshStandardMaterial
        color={c} roughness={rough} metalness={metal} flatShading={flat}
        {...(emissive ? { emissive, emissiveIntensity: ei } : {})}
      />
    </mesh>
  )
}

function Sp({ p, r, c, flat = true, emissive, ei = 0 }: {
  p: Vec3; r: number; c: string; flat?: boolean; emissive?: string; ei?: number
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <sphereGeometry args={[r, 18, 14]} />
      <meshStandardMaterial
        color={c} roughness={0.85} flatShading={flat}
        {...(emissive ? { emissive, emissiveIntensity: ei } : {})}
      />
    </mesh>
  )
}

function Legs4({ w, d, h, r = 0.018, c = WOOD_DARK, y }: { w: number; d: number; h: number; r?: number; c?: string; y?: number }) {
  const yy = y ?? h / 2
  const xs = w / 2 - 0.04
  const zs = d / 2 - 0.04
  return (
    <>
      {([[-xs, -zs], [xs, -zs], [-xs, zs], [xs, zs]] as Vec2[]).map(([x, z], i) => (
        <Cy key={i} p={[x, yy, z]} rt={r} rb={r} h={h} c={c} />
      ))}
    </>
  )
}
type Vec2 = [number, number]

// ─── Seating ───────────────────────────────────────────────────────────────

function CafeChair({ brand }: M) {
  return (
    <group>
      <Legs4 w={0.44} d={0.44} h={0.45} c={WOOD_DARK} />
      <Bx p={[0, 0.47, 0]} s={[0.46, 0.05, 0.46]} c={brand} rough={0.95} />
      <Bx p={[0, 0.74, -0.2]} s={[0.44, 0.4, 0.04]} c={WOOD_DARK} />
      <Bx p={[0, 0.71, -0.17]} s={[0.36, 0.28, 0.02]} c={brand} rough={0.95} />
    </group>
  )
}

function BarStool({ brand }: M) {
  return (
    <group>
      <Cy p={[0, 0.76, 0]} rt={0.17} rb={0.17} h={0.05} c={brand} rough={0.95} />
      <Legs4 w={0.34} d={0.34} h={0.76} r={0.014} c={METAL_DARK} />
      <Cy p={[0, 0.24, 0]} rt={0.15} rb={0.15} h={0.012} c={METAL} seg={24} />
      <Bx p={[0, 0.98, -0.15]} s={[0.3, 0.16, 0.03]} c={brand} rough={0.95} />
    </group>
  )
}

function TaskChair({ brand }: M) {
  return (
    <group>
      <Cy p={[0, 0.04, 0]} rt={0.26} rb={0.28} h={0.04} c={CHARCOAL_SOFT} />
      <Cy p={[0, 0.22, 0]} rt={0.024} rb={0.024} h={0.34} c={METAL_DARK} />
      <Bx p={[0, 0.42, 0]} s={[0.5, 0.07, 0.5]} c={brand} rough={0.95} />
      <Bx p={[0, 0.85, -0.24]} s={[0.48, 0.55, 0.06]} c={brand} rough={0.95} />
      <Bx p={[-0.28, 0.58, 0.02]} s={[0.05, 0.04, 0.28]} c={CHARCOAL_SOFT} />
      <Bx p={[0.28, 0.58, 0.02]} s={[0.05, 0.04, 0.28]} c={CHARCOAL_SOFT} />
    </group>
  )
}

function LoungeChair({ brand }: M) {
  return (
    <group>
      <Bx p={[0, 0.14, 0]} s={[0.78, 0.08, 0.8]} c={WOOD} />
      <Legs4 w={0.7} d={0.72} h={0.12} r={0.02} c={WOOD_DARK} />
      <Bx p={[0, 0.3, 0.04]} s={[0.72, 0.18, 0.66]} c={brand} rough={0.95} />
      <Bx p={[0, 0.58, -0.3]} s={[0.72, 0.5, 0.14]} c={brand} rx={-0.14} rough={0.95} />
    </group>
  )
}

function Sofa({ brand }: M) {
  const frame = OAT_DEEP
  return (
    <group>
      <Bx p={[0, 0.24, 0]} s={[1.9, 0.28, 0.85]} c={frame} />
      <Bx p={[-0.87, 0.42, 0]} s={[0.16, 0.36, 0.85]} c={frame} />
      <Bx p={[0.87, 0.42, 0]} s={[0.16, 0.36, 0.85]} c={frame} />
      <Bx p={[0, 0.52, -0.33]} s={[1.9, 0.42, 0.19]} c={frame} />
      <Bx p={[-0.4, 0.46, 0.06]} s={[0.76, 0.14, 0.6]} c={brand} rough={0.95} />
      <Bx p={[0.4, 0.46, 0.06]} s={[0.76, 0.14, 0.6]} c={brand} rough={0.95} />
      <Bx p={[-0.4, 0.62, -0.28]} s={[0.72, 0.3, 0.12]} c={brand} rough={0.95} rx={-0.08} />
      <Bx p={[0.4, 0.62, -0.28]} s={[0.72, 0.3, 0.12]} c={brand} rough={0.95} rx={-0.08} />
      <Legs4 w={1.7} d={0.7} h={0.1} r={0.02} c={WOOD_DARK} />
    </group>
  )
}

function Booth({ brand }: M) {
  return (
    <group>
      <Bx p={[0, 0.58, -0.5]} s={[1.8, 1.16, 0.1]} c={WOOD_DARK} />
      <Bx p={[0, 0.2, -0.24]} s={[1.8, 0.4, 0.52]} c={WOOD} />
      <Bx p={[0, 0.46, -0.24]} s={[1.8, 0.12, 0.56]} c={brand} rough={0.95} />
    </group>
  )
}

// ─── Tables & desks ────────────────────────────────────────────────────────

function RoundTable() {
  return (
    <group>
      <Cy p={[0, 0.725, 0]} rt={0.38} rb={0.38} h={0.045} c={WOOD} seg={28} />
      <Cy p={[0, 0.36, 0]} rt={0.03} rb={0.03} h={0.7} c={CHARCOAL_SOFT} />
      <Cy p={[0, 0.02, 0]} rt={0.21} rb={0.23} h={0.035} c={CHARCOAL_SOFT} seg={28} />
    </group>
  )
}

function SquareTable() {
  return (
    <group>
      <Bx p={[0, 0.73, 0]} s={[0.85, 0.05, 0.85]} c={WOOD} />
      <Legs4 w={0.85} d={0.85} h={0.71} r={0.022} c={CHARCOAL_SOFT} />
    </group>
  )
}

function DiningTable() {
  return (
    <group>
      <Bx p={[0, 0.75, 0]} s={[1.6, 0.05, 0.9]} c={WOOD} />
      <Legs4 w={1.6} d={0.9} h={0.73} r={0.032} c={WOOD_DARK} />
    </group>
  )
}

function WindowBar() {
  return (
    <group>
      <Bx p={[0, 1.03, 0]} s={[1.8, 0.045, 0.38]} c={WOOD} />
      <Bx p={[-0.8, 0.5, 0]} s={[0.06, 1.0, 0.32]} c={CHARCOAL_SOFT} />
      <Bx p={[0.8, 0.5, 0]} s={[0.06, 1.0, 0.32]} c={CHARCOAL_SOFT} />
      <Cy p={[0, 0.22, 0.14]} rt={0.015} rb={0.015} h={1.7} c={METAL} rz={Math.PI / 2} />
    </group>
  )
}

function Desk({ brand: _brand }: M) {
  return (
    <group>
      <Bx p={[0, 0.73, 0]} s={[1.4, 0.04, 0.7]} c={WOOD} />
      <Bx p={[-0.66, 0.36, 0]} s={[0.04, 0.71, 0.64]} c={CHARCOAL_SOFT} />
      <Bx p={[0.66, 0.36, 0]} s={[0.04, 0.71, 0.64]} c={CHARCOAL_SOFT} />
      <Bx p={[0, 0.98, -0.18]} s={[0.52, 0.32, 0.025]} c={CHARCOAL} />
      <Bx p={[0, 0.82, -0.18]} s={[0.06, 0.14, 0.05]} c={CHARCOAL_SOFT} />
      <Bx p={[0, 0.75, -0.14]} s={[0.2, 0.02, 0.12]} c={CHARCOAL_SOFT} />
      <Bx p={[0, 0.755, 0.08]} s={[0.4, 0.015, 0.13]} c={WHITE_WARM} />
    </group>
  )
}

function DeskCluster({ brand }: M) {
  return (
    <group>
      {([-0.72, 0.72] as number[]).map((x) =>
        ([-0.36, 0.36] as number[]).map((z) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <Bx p={[0, 0.73, 0]} s={[1.4, 0.04, 0.66]} c={WOOD} />
            <Bx p={[-0.64, 0.36, 0]} s={[0.04, 0.71, 0.6]} c={CHARCOAL_SOFT} />
            <Bx p={[0.64, 0.36, 0]} s={[0.04, 0.71, 0.6]} c={CHARCOAL_SOFT} />
          </group>
        )),
      )}
      <Bx p={[0, 0.98, 0]} s={[2.9, 0.34, 0.04]} c={CHARCOAL_SOFT} />
      {([-0.72, 0.72] as number[]).map((x) =>
        ([-1, 1] as number[]).map((s) => (
          <group key={`m${x}-${s}`} position={[x, 0, s * 0.44]}>
            <Bx p={[0, 0.96, 0]} s={[0.45, 0.28, 0.02]} c={CHARCOAL} />
            <Bx p={[0, 0.82, 0]} s={[0.05, 0.12, 0.04]} c={CHARCOAL_SOFT} />
          </group>
        )),
      )}
      {([-0.72, 0.72] as number[]).map((x) =>
        ([-1, 1] as number[]).map((s) => (
          <group key={`c${x}-${s}`} position={[x, 0, s * 0.98]} rotation={[0, s > 0 ? Math.PI : 0, 0]}>
            <Cy p={[0, 0.04, 0]} rt={0.24} rb={0.26} h={0.04} c={CHARCOAL_SOFT} />
            <Cy p={[0, 0.2, 0]} rt={0.022} rb={0.022} h={0.3} c={METAL_DARK} />
            <Bx p={[0, 0.4, 0]} s={[0.48, 0.06, 0.48]} c={brand} rough={0.95} />
            <Bx p={[0, 0.78, -0.22]} s={[0.44, 0.5, 0.05]} c={brand} rough={0.95} />
          </group>
        )),
      )}
    </group>
  )
}

function MeetingTable() {
  return (
    <group>
      <Bx p={[0, 0.74, 0]} s={[2.0, 0.05, 1.0]} c={WOOD_DARK} />
      <Bx p={[-0.8, 0.36, 0]} s={[0.08, 0.72, 0.8]} c={CHARCOAL_SOFT} />
      <Bx p={[0.8, 0.36, 0]} s={[0.08, 0.72, 0.8]} c={CHARCOAL_SOFT} />
    </group>
  )
}

// ─── Counters & service ────────────────────────────────────────────────────

function CafeCounter({ brand }: M) {
  return (
    <group>
      <Bx p={[0, 0.45, -0.02]} s={[2.4, 0.9, 0.62]} c={CHARCOAL} />
      <Bx p={[0, 0.925, -0.02]} s={[2.5, 0.05, 0.7]} c={STONE} />
      <Bx p={[0, 0.45, 0.3]} s={[2.28, 0.5, 0.03]} c={brand} rough={0.7} />
      {/* espresso machine */}
      <group position={[-0.6, 0, 0]}>
        <Bx p={[0, 1.12, 0]} s={[0.56, 0.34, 0.4]} c={METAL_DARK} metal={0.4} rough={0.4} />
        <Bx p={[0, 1.31, 0]} s={[0.6, 0.05, 0.44]} c={CHARCOAL} />
        <Bx p={[0, 0.985, 0.16]} s={[0.4, 0.06, 0.08]} c={METAL} metal={0.5} rough={0.35} />
        <Cy p={[0.16, 1.02, 0.1]} rt={0.035} rb={0.03} h={0.07} c={WHITE_WARM} />
        <Cy p={[-0.1, 1.02, 0.1]} rt={0.035} rb={0.03} h={0.07} c={WHITE_WARM} />
      </group>
      {/* grinder */}
      <group position={[-0.05, 0, 0]}>
        <Cy p={[0, 1.08, 0]} rt={0.06} rb={0.07} h={0.28} c={CHARCOAL} />
        <Cy p={[0, 1.28, 0]} rt={0.08} rb={0.05} h={0.14} c={GLASS} op={0.5} />
      </group>
      {/* register */}
      <group position={[0.85, 0, 0]}>
        <Bx p={[0, 1.02, -0.05]} s={[0.32, 0.18, 0.26]} c={CHARCOAL_SOFT} />
        <Bx p={[0, 1.12, 0.08]} s={[0.26, 0.03, 0.14]} c={CHARCOAL} rx={-0.3} />
      </group>
      <Cy p={[0.4, 0.98, 0.12]} rt={0.042} rb={0.034} h={0.09} c={WHITE_WARM} />
      <Cy p={[0.52, 0.98, 0.12]} rt={0.042} rb={0.034} h={0.09} c={WHITE_WARM} />
    </group>
  )
}

function PastryCase() {
  return (
    <group>
      <Bx p={[0, 0.25, 0]} s={[1.25, 0.5, 0.72]} c={CHARCOAL} />
      <Bx p={[0, 0.52, 0]} s={[1.3, 0.04, 0.76]} c={STONE} />
      <Bx p={[0, 0.77, 0]} s={[1.2, 0.42, 0.62]} c={GLASS} op={0.28} rough={0.15} metal={0.1} />
      <Bx p={[0, 0.98, 0]} s={[1.24, 0.04, 0.66]} c={METAL} metal={0.5} rough={0.4} />
      <Bx p={[0, 0.66, 0]} s={[1.14, 0.02, 0.56]} c={OAT} />
      <Bx p={[0, 0.82, 0]} s={[1.14, 0.02, 0.56]} c={OAT} />
      {([[-0.4, 0.7], [-0.1, 0.71], [0.25, 0.7], [0.45, 0.71], [-0.3, 0.87], [0.1, 0.87], [0.4, 0.86]] as Vec2[]).map(
        ([x, y], i) => (
          <Bx key={i} p={[x, y, (i % 2 ? 0.12 : -0.1)]} s={[0.11, 0.06, 0.14]} c={WOOD} rough={0.7} />
        ),
      )}
    </group>
  )
}

function Checkout({ brand }: M) {
  return (
    <group>
      <Bx p={[0, 0.475, 0]} s={[1.4, 0.95, 0.56]} c={CHARCOAL} />
      <Bx p={[0, 0.97, 0]} s={[1.5, 0.04, 0.64]} c={STONE} />
      <Bx p={[0, 0.45, 0.29]} s={[1.2, 0.45, 0.03]} c={brand} rough={0.7} />
      <Bx p={[-0.4, 1.05, 0.05]} s={[0.12, 0.16, 0.08]} c={CHARCOAL_SOFT} rx={-0.25} />
      <Cy p={[0.3, 1.01, 0.1]} rt={0.045} rb={0.038} h={0.08} c={WHITE_WARM} />
    </group>
  )
}

function HostStand({ brand }: M) {
  return (
    <group>
      <Bx p={[0, 0.55, 0]} s={[0.52, 1.1, 0.42]} c={WOOD_DARK} />
      <Bx p={[0, 1.12, 0]} s={[0.6, 0.04, 0.5]} c={WOOD} />
      <Bx p={[0, 0.8, 0.22]} s={[0.4, 0.3, 0.02]} c={brand} rough={0.7} />
    </group>
  )
}

function ServiceStation() {
  return (
    <group>
      <Bx p={[0, 0.42, 0]} s={[1.0, 0.84, 0.5]} c={CHARCOAL} />
      <Bx p={[0, 0.86, 0]} s={[1.06, 0.04, 0.56]} c={STONE} />
      <Bx p={[0, 0.28, 0.18]} s={[0.9, 0.02, 0.34]} c={CHARCOAL_SOFT} />
      <Bx p={[0, 0.55, 0.18]} s={[0.9, 0.02, 0.34]} c={CHARCOAL_SOFT} />
      <Cy p={[-0.22, 0.9, 0]} rt={0.085} rb={0.075} h={0.05} c={WHITE_WARM} />
      <Cy p={[-0.22, 0.94, 0]} rt={0.075} rb={0.065} h={0.05} c={WHITE_WARM} />
      <Cy p={[0.2, 0.92, 0]} rt={0.04} rb={0.034} h={0.09} c={GLASS} op={0.5} />
    </group>
  )
}

// ─── Fixtures ──────────────────────────────────────────────────────────────

function ShelfUnit() {
  return (
    <group>
      <Bx p={[-0.455, 0.9, 0]} s={[0.04, 1.8, 0.34]} c={WOOD} />
      <Bx p={[0.455, 0.9, 0]} s={[0.04, 1.8, 0.34]} c={WOOD} />
      {[0.12, 0.62, 1.12, 1.62].map((y) => (
        <Bx key={y} p={[0, y, 0]} s={[0.87, 0.03, 0.32]} c={WOOD_DARK} />
      ))}
      <Bx p={[-0.25, 0.24, 0]} s={[0.2, 0.22, 0.2]} c={WHITE_WARM} />
      <Bx p={[0.05, 0.25, 0.02]} s={[0.16, 0.2, 0.16]} c={OAT_DEEP} />
      <Bx p={[0.3, 0.76, 0]} s={[0.22, 0.24, 0.18]} c={CHARCOAL_SOFT} />
      <Bx p={[-0.15, 1.26, 0]} s={[0.18, 0.24, 0.18]} c={OAT_DEEP} />
      <Bx p={[0.2, 1.74, 0.01]} s={[0.24, 0.14, 0.16]} c={WHITE_WARM} />
    </group>
  )
}

function ClothingRail({ brand }: M) {
  const colors = [brand, OAT_DEEP, CHARCOAL_SOFT, brand, WHITE_WARM]
  return (
    <group>
      <Cy p={[-0.6, 0.75, 0]} rt={0.02} rb={0.02} h={1.5} c={METAL_DARK} />
      <Cy p={[0.6, 0.75, 0]} rt={0.02} rb={0.02} h={1.5} c={METAL_DARK} />
      <Bx p={[-0.6, 0.015, 0]} s={[0.09, 0.03, 0.5]} c={METAL_DARK} />
      <Bx p={[0.6, 0.015, 0]} s={[0.09, 0.03, 0.5]} c={METAL_DARK} />
      <Cy p={[0, 1.46, 0]} rt={0.014} rb={0.014} h={1.22} c={METAL} rz={Math.PI / 2} />
      {colors.map((c, i) => (
        <Bx
          key={i} p={[-0.48 + i * 0.24, 1.16, 0]}
          s={[0.05, 0.56, 0.36]} c={c} ry={(i % 2 - 0.5) * 0.12} rough={0.95}
        />
      ))}
    </group>
  )
}

function DisplayTable({ brand }: M) {
  return (
    <group>
      <Bx p={[0, 0.82, 0]} s={[1.2, 0.05, 0.8]} c={CHARCOAL} />
      <Bx p={[0, 0.3, 0]} s={[1.08, 0.04, 0.68]} c={CHARCOAL_SOFT} />
      <Legs4 w={1.2} d={0.8} h={0.8} r={0.024} c={CHARCOAL_SOFT} />
      {([[-0.35, 0.2], [-0.05, -0.15], [0.3, 0.15]] as Vec2[]).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Bx p={[0, 0.87, 0]} s={[0.26, 0.04, 0.32]} c={i === 1 ? brand : WHITE_WARM} rough={0.95} />
          <Bx p={[0.02, 0.91, 0.01]} s={[0.24, 0.04, 0.3]} c={i === 1 ? OAT_DEEP : brand} rough={0.95} />
        </group>
      ))}
      <Bx p={[0, 0.36, 0.05]} s={[0.3, 0.05, 0.34]} c={OAT_DEEP} />
    </group>
  )
}

function Mannequin({ brand }: M) {
  return (
    <group>
      <Cy p={[0, 0.015, 0]} rt={0.22} rb={0.24} h={0.03} c={CHARCOAL} seg={28} />
      <Cy p={[0, 0.2, 0]} rt={0.018} rb={0.018} h={0.35} c={METAL_DARK} />
      <Cy p={[0, 0.72, 0]} rt={0.13} rb={0.17} h={0.65} c={NEUTRAL_BODY} rough={0.6} />
      <Sp p={[0, 1.06, 0]} r={0.125} c={NEUTRAL_BODY} flat={false} />
      <Sp p={[0, 1.26, 0]} r={0.1} c={NEUTRAL_BODY} flat={false} />
      <Bx p={[0, 1.02, 0.08]} s={[0.2, 0.06, 0.1]} c={brand} rough={0.95} />
    </group>
  )
}

function Mirror() {
  return (
    <group rotation={[0.06, 0, 0]}>
      <Bx p={[0, 0.875, 0]} s={[0.65, 1.75, 0.05]} c={WOOD} />
      <Bx p={[0, 0.9, 0.028]} s={[0.55, 1.6, 0.02]} c={'#D7D3C6'} metal={0.85} rough={0.08} />
    </group>
  )
}

function Cabinet() {
  return (
    <group>
      <Bx p={[0, 0.55, 0]} s={[0.85, 1.1, 0.48]} c={WOOD} />
      <Bx p={[-0.2, 0.55, 0.245]} s={[0.38, 0.98, 0.02]} c={WOOD_DARK} />
      <Bx p={[0.2, 0.55, 0.245]} s={[0.38, 0.98, 0.02]} c={WOOD_DARK} />
      <Cy p={[-0.05, 0.55, 0.27]} rt={0.012} rb={0.012} h={0.14} c={METAL} rx={0} />
      <Cy p={[0.05, 0.55, 0.27]} rt={0.012} rb={0.012} h={0.14} c={METAL} />
      <Bx p={[0, 1.115, 0]} s={[0.9, 0.03, 0.52]} c={CHARCOAL} />
    </group>
  )
}

function PhoneBooth({ brand }: M) {
  return (
    <group>
      <Bx p={[0, 0.03, 0]} s={[1.05, 0.06, 1.05]} c={CHARCOAL} />
      <Bx p={[0, 1.11, -0.5]} s={[1.05, 2.1, 0.05]} c={CHARCOAL} />
      <Bx p={[-0.5, 1.11, 0]} s={[0.05, 2.1, 1.05]} c={CHARCOAL} />
      <Bx p={[0.5, 1.11, 0]} s={[0.05, 2.1, 1.05]} c={CHARCOAL} />
      <Bx p={[0, 2.16, 0]} s={[1.05, 0.08, 1.05]} c={CHARCOAL} />
      <Bx p={[0, 1.05, 0.5]} s={[0.9, 1.9, 0.03]} c={GLASS} op={0.25} rough={0.15} />
      <Bx p={[0, 1.98, 0.5]} s={[0.94, 0.18, 0.02]} c={GLASS} op={0.25} />
      <Bx p={[0, 2.07, 0.52]} s={[1.0, 0.14, 0.03]} c={brand} rough={0.7} />
      <Bx p={[0, 2.02, 0.1]} s={[0.5, 0.03, 0.5]} c={BULB} emissive={BULB} ei={0.7} />
      <Cy p={[0, 0.35, -0.2]} rt={0.19} rb={0.21} h={0.06} c={CHARCOAL_SOFT} />
    </group>
  )
}

function Whiteboard({ brand }: M) {
  return (
    <group>
      <Bx p={[0, 1.32, -0.03]} s={[1.49, 0.96, 0.02]} c={CHARCOAL_SOFT} />
      <Bx p={[0, 1.32, 0]} s={[1.45, 0.92, 0.04]} c={'#F7F4EC'} rough={0.35} />
      <Bx p={[-0.25, 1.38, 0.03]} s={[0.5, 0.3, 0.005]} c={brand} op={0.75} rough={0.6} />
      <Bx p={[0.3, 1.25, 0.03]} s={[0.34, 0.025, 0.005]} c={CHARCOAL_SOFT} />
      <Bx p={[-0.62, 0.66, 0.1]} s={[0.06, 1.32, 0.05]} c={CHARCOAL_SOFT} />
      <Bx p={[0.62, 0.66, 0.1]} s={[0.06, 1.32, 0.05]} c={CHARCOAL_SOFT} />
      <Bx p={[-0.62, 0.66, -0.12]} s={[0.06, 1.32, 0.05]} c={CHARCOAL_SOFT} rz={0.06} />
      <Bx p={[0.62, 0.66, -0.12]} s={[0.06, 1.32, 0.05]} c={CHARCOAL_SOFT} rz={-0.06} />
      <Bx p={[0, 0.9, 0.06]} s={[0.9, 0.02, 0.07]} c={CHARCOAL_SOFT} />
    </group>
  )
}

// ─── Decor ─────────────────────────────────────────────────────────────────

function Plant() {
  return (
    <group>
      <Cy p={[0, 0.15, 0]} rt={0.14} rb={0.11} h={0.3} c={POT} />
      <Cy p={[0, 0.3, 0]} rt={0.12} rb={0.12} h={0.02} c={'#4A3B2C'} />
      <Sp p={[0, 0.62, 0]} r={0.22} c={LEAF_1} />
      <Sp p={[0.1, 0.8, 0.05]} r={0.16} c={LEAF_2} />
      <Sp p={[-0.12, 0.74, -0.06]} r={0.13} c={LEAF_3} />
    </group>
  )
}

function Rug({ brand }: M) {
  return (
    <group>
      <Bx p={[0, 0.009, 0]} s={[2.0, 0.018, 1.4]} c={brand} rough={1} />
      <Bx p={[0, 0.01, 0.67]} s={[2.0, 0.02, 0.07]} c={OAT} rough={1} />
      <Bx p={[0, 0.01, -0.67]} s={[2.0, 0.02, 0.07]} c={OAT} rough={1} />
      <Bx p={[0.965, 0.01, 0]} s={[0.07, 0.02, 1.4]} c={OAT} rough={1} />
      <Bx p={[-0.965, 0.01, 0]} s={[0.07, 0.02, 1.4]} c={OAT} rough={1} />
    </group>
  )
}

function Pendant({ brand }: M) {
  return (
    <group>
      <Cy p={[0, 2.48, 0]} rt={0.035} rb={0.035} h={0.02} c={CHARCOAL} />
      <Cy p={[0, 2.12, 0]} rt={0.006} rb={0.006} h={0.72} c={CHARCOAL} />
      <Cy p={[0, 1.66, 0]} rt={0.06} rb={0.2} h={0.2} c={brand} rough={0.6} seg={26} />
      <Sp p={[0, 1.6, 0]} r={0.045} c={'#FFF3D6'} flat={false} emissive={BULB} ei={1.2} />
    </group>
  )
}

function FloorLamp({ brand }: M) {
  return (
    <group>
      <Cy p={[0, 0.012, 0]} rt={0.14} rb={0.15} h={0.024} c={CHARCOAL} seg={24} />
      <Cy p={[0, 0.7, 0]} rt={0.014} rb={0.014} h={1.36} c={METAL_DARK} />
      <Cy p={[0, 1.48, 0]} rt={0.13} rb={0.17} h={0.24} c={brand} rough={0.95} seg={24} />
      <Sp p={[0, 1.44, 0]} r={0.04} c={'#FFF3D6'} flat={false} emissive={BULB} ei={1} />
    </group>
  )
}

function SignBoard({ brand }: M) {
  return (
    <group>
      <Bx p={[0, 1.5, 0]} s={[1.1, 0.66, 0.05]} c={CHARCOAL} />
      <Bx p={[0, 1.5, 0.03]} s={[1.02, 0.58, 0.02]} c={brand} rough={0.65} />
      <Cy p={[0, 1.66, 0.045]} rt={0.09} rb={0.09} h={0.015} c={WHITE_WARM} rx={Math.PI / 2} seg={24} />
      <Bx p={[0, 1.38, 0.045]} s={[0.5, 0.035, 0.015]} c={WHITE_WARM} />
      <Bx p={[-0.45, 1.5, -0.1]} s={[0.04, 0.04, 0.16]} c={METAL} />
      <Bx p={[0.45, 1.5, -0.1]} s={[0.04, 0.04, 0.16]} c={METAL} />
    </group>
  )
}

// ─── Registry ──────────────────────────────────────────────────────────────

interface M {
  brand: string
}

export const MODELS: Record<string, (props: M) => ReactNode> = {
  'cafe-chair': CafeChair,
  'bar-stool': BarStool,
  'task-chair': TaskChair,
  'lounge-chair': LoungeChair,
  'sofa': Sofa,
  'booth': Booth,
  'round-table': RoundTable,
  'square-table': SquareTable,
  'dining-table': DiningTable,
  'window-bar': WindowBar,
  'desk': Desk,
  'desk-cluster': DeskCluster,
  'meeting-table': MeetingTable,
  'cafe-counter': CafeCounter,
  'pastry-case': PastryCase,
  'checkout': Checkout,
  'host-stand': HostStand,
  'service-station': ServiceStation,
  'shelf-unit': ShelfUnit,
  'clothing-rail': ClothingRail,
  'display-table': DisplayTable,
  'mannequin': Mannequin,
  'mirror': Mirror,
  'cabinet': Cabinet,
  'phone-booth': PhoneBooth,
  'whiteboard': Whiteboard,
  'plant': Plant,
  'rug': Rug,
  'pendant': Pendant,
  'floor-lamp': FloorLamp,
  'sign-board': SignBoard,
}

export function ItemModel({ id, brand }: { id: string; brand: string }) {
  const Comp = MODELS[id]
  if (!Comp) return null
  return <Comp brand={brand} />
}
