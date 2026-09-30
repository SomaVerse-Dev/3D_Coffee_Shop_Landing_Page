# FORMA — 3D Commercial Space Planner · Worklog

Project: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + react-three-fiber (three@0.186, @react-three/fiber@9, @react-three/drei@10, maath, jspdf@4).
Product: "FORMA" — 3D planner for cafés / co-working / boutique retail with plan↔3D camera swing, brand-color theming, capacity + fire-egress meter, live cost estimator, PDF export with build-up animation.

---
Task ID: 1
Agent: Z.ai Code (main)
Task: Project setup + dependency install

Work Log:
- Inspected scaffold (Next.js 16, Tailwind 4, shadcn/ui full set, zustand, framer-motion present).
- Installed: three@0.186, @react-three/fiber@9, @react-three/drei@10, maath, jspdf@4, @types/three.
- Image-search skill was down (upstream 400/429); pivoted to image-generation skill → 4 documentary-style interiors in public/gallery/{cafe,coworking,boutique,restaurant}.png.

Stage Summary:
- Deps + assets ready.

---
Task ID: 2
Agent: Z.ai Code (main)
Task: Full application build (data layer, 3D scene, workspace UI, sections, export)

Work Log:
- Data layer:
  - src/lib/planner/types.ts (CatalogItem, PlacedItem, TemplateDef…)
  - catalog.ts — 31 furniture items (footprints, prices, seats, brandable flags, plan shapes)
  - templates.ts — 4 hand-tuned layouts: Corner Café 10×8, Studio Works 12×9, Atelier Retail 9×7, Bistro Verde 11×9
  - store.ts — zustand + persist (skipHydration + manual rehydrate after mount to avoid SSR mismatch), snap 0.05 m, room clamping
  - capacity.ts — IBC-style occupant factors (cafe/restaurant 1.4, coworking 9.3, retail 0.6 m²/p), EXIT_CAPACITY=420 (1.2m+0.9m doors), density statuses, cost engine (12% install, 8% contingency)
- 3D scene (src/components/planner/Scene.tsx):
  - CameraRig: damped swing between top-down plan (north-up via camera.up=(0,0,-1)) and 3D perspective; OrbitControls disabled mid-swing
  - Room: floor slab + drei Grid + walls with real door gaps (1.4 m south entrance, 0.95 m north rear exit) + west-wall windows
  - furniture.tsx: 31 procedural models from primitives (café counter w/ espresso machine, booth, desk cluster ×4 w/ chairs, phone booth, clothing rail, mannequin, pendants…)
  - Drag & drop via ground-plane raycast, snap + clamp; ghost preview when armed; selection ring + footprint tint; damped rotation
  - EgressPaths: 3 CatmullRom curves, flowing cone chevrons animated in useFrame; green exit frames + emissive signs
- Workspace UI:
  - Toolbar: template Select, room-size popover sliders, Plan/3D segmented toggle, Fire safety switch, brand picker (8 presets + custom color + hex), live cost badge, Export PDF
  - CatalogSidebar: search + category chips + 31 item cards (price, footprint, seats, brand dot); mobile variant in left Sheet
  - HUD: HintChip, CapacityMeter (animated seat counter, density bar, occupant load vs egress 420), SelectionControls (rotate/duplicate/delete), PlanMinimap (live PlanSVG, collapsible)
  - CostPanel: right Sheet with grouped lines, subtotal/install/contingency/total
  - ExportModal: staged build-up animation (grid → walls clip-reveal → furniture → egress → title-block stamp) + real PDF via hidden PlanSVG → canvas → jsPDF A4
- Sections: TemplateGallery (photo cards + live stats + Load), CapacityGuide (rules table + feature cards), BrandStrip (8 swatches, live apply), sticky charcoal footer, sticky top nav
- Theme: warm-white/oat/charcoal tokens in globals.css, blueprint-grid + thin-scroll utilities, Space Grotesk (display) + Inter (body)
- Fixes during browser QA (agent-browser):
  - duplicate `computedBrandName` import; maath import → `import { damp, damp3 } from 'maath/easing'`
  - react-hooks lint: animating ref renamed animatingRef; mounted via useSyncExternalStore
  - plan-view 45° roll fixed via camera.up=(0,0,-1) in plan mode
  - export sheet furniture hidden by overlay layer's white rect → transparentPaper now skips paper/room-fill/grid
  - placement deselected item (arm(null) wiped selectedUid) → arm keeps selection when disarming
  - zustand persist hydration mismatch → skipHydration:true + rehydrate() in effect
  - Math.random() in skeleton → deterministic delays
- Verified via agent-browser: place chair (15→16 seats), plan/3D swing, fire toggle (chevrons + EXIT + minimap paths), brand recolor live, cost panel math ($20,604), PDF download toast "Layout sheet exported", template switch, drag cluster (-3.4,-2.3)→(-0.95,0.1) grid-snapped, keyboard R/Delete, mobile 390px layout + Add items sheet, gallery/footer render.

Stage Summary:
- App fully functional at / (only route). Lint clean, dev.log clean (only benign THREE deprecation warnings).
- Remaining known nits: fire exit frame could be prettier; chevron size tuned; gallery images are AI-generated (search service was down).

---
Task ID: 3-a
Agent: frontend-styling-expert (subagent)
Task: Visual polish pass — see instructions in its section below (PENDING at time of writing)

---
Task ID: 3-a
Agent: frontend-styling-expert
Task: Visual polish pass

Work Log:
- globals.css: added `.card-glass` / `.chip-glass` (shared HUD glass: warm-white translucency + backdrop-blur + inset highlight + soft charcoal shadow), `.blueprint-band` (faded masked blueprint grid for the hero), `.pb-safe` (safe-area-inset footer padding), warm oat `::selection`, smooth anchor scrolling guarded by `prefers-reduced-motion`, and a base `button/a/[role=button]:focus-visible` double-ring (warm-white + charcoal) for every hand-rolled control. `blueprint-grid` and `thin-scroll` kept intact. No blue/indigo introduced anywhere.
- Toolbar.tsx: refined rhythm (px-3/py-2.5, sm:gap-2.5, inset hairline under the bar), brand swatch now a shaded+ringed tile, template Select trigger gained a LayoutTemplate icon and 186px width, room-size dims use tabular-nums, Plan/3D became an inset segmented control (p-0.5 track, rounded-lg thumbs, charcoal active w/ shadow-sm), fire-safety & brand buttons got hover border + shadow-xs, brand preset swatches got aria-pressed + shadow, cost control restyled as a rounded-full pill badge with font-display bold tabular-nums amount, Export PDF got shadow + active:scale press.
- CatalogSidebar.tsx: header now shows a "31 pieces" count chip, search clear button is a rounded hover target, category chips got aria-pressed/shadow/hover states, item cards got hover lift (-translate-y-px + directional shadow), armed/active card got a deep charcoal shadow plus a pulsing "placing" ping dot, prices/dims use tabular-nums, name tracking tightened, empty state turned into a dashed card. Switched the card grid from 2 columns to 1 (292px sidebar was truncating names — caught in QA).
- ViewportHud.tsx / CapacityMeter.tsx: all four floating panels (hint chip, selection controls, minimap, capacity meter) moved onto the shared `.card-glass`/`.chip-glass` treatment; big seat counter + all numeric readouts now font-display/tabular-nums; status pill gained shadow-xs + backdrop-blur; minimap header is a labeled hoverable toggle with aria-label + aria-expanded, plan frame got shadow-xs, footer meta got a green "live" dot; rotate/duplicate/delete buttons got explicit aria-labels; capacity bar track got an inset shadow.
- page.tsx: header nav converted to padded hover chips; hero section now `relative` with a decorative `.blueprint-band` strip (aria-hidden, -z-10) behind the copy, eyebrow chip + kbd styling got shadow-xs, h1/subcopy got text-balance/text-pretty, stat trio rebuilt as a semantic dl with 2xl tabular-nums figures and icon labels; footer rebuilt: gradient hairline top highlight, 1.5fr/1fr/1.3fr column rhythm, small rules under column headings, footer links animate a dash + slide on hover, and a new bottom legal bar (border-t white/10) with © line and tagline, `.pb-safe` safe-area padding. Footer remains sticky-to-bottom via existing min-h-screen flex + mt-auto.
- sections.tsx: template cards — added charcoal gradient overlay on photos (deepens on hover), price pill flipped to dark charcoal/90 + ring + tabular-nums showing cost · dims, stats row now seats/m²/installed-cost with tabular-nums, card hover deepens border + xl shadow, Load button got press feedback; capacity guide table got zebra rows (odd:bg-white/50) + row hover, header tracking unified; feature cards became staggered motion.divs (whileInView, 0.08s stagger, SSR-safe) with hover border/shadow; brand swatches got title tooltips, aria-pressed, ring-charcoal/10 definition and drop-shadow on the check; "what gets repainted" tiles got hover:bg-white; signature card got ring + inner-shaded swatch.
- QA loop with agent-browser + VLM at 1440px and 390px: fixed sidebar 2-col truncation (→1 col) and strengthened price-pill contrast (bg-charcoal/90 + ring) from findings; programmatic overflow check = 0px horizontal overflow at 390px; Plan/3D toggle smoke-tested both directions; console clean apart from pre-existing benign THREE deprecation warnings.

Stage Summary:
- Pure className/style/copy-level polish; store.ts, Scene.tsx, furniture.tsx, capacity logic and all interaction behavior untouched; no new packages; still a single `/` route; footer still sticky-to-bottom with safe-area padding.
- Files touched: src/app/globals.css, src/components/planner/Toolbar.tsx, CatalogSidebar.tsx, ViewportHud.tsx, CapacityMeter.tsx, src/components/planner/sections.tsx, src/app/page.tsx.
- New reusable utilities: .card-glass, .chip-glass, .blueprint-band, .pb-safe + global focus-visible ring, oat ::selection, reduced-motion-guarded smooth scroll.
- `bun run lint` passes with 0 errors; VLM screenshot QA (desktop + mobile + full page) reports no clipping/overflow; remaining nits: none blocking.

---
Task ID: 4
Agent: Z.ai Code (main)
Task: Post-polish verification + handoff to scheduled QA

Work Log:
- Re-verified after subagent polish pass: page loads at 1280px with refined toolbar (icon select trigger, cost pill badge, segmented view control), hero stat trio, gallery price pills.
- `bun run lint` → 0 errors. dev.log → GET / 200, no runtime errors. Console clean (only benign THREE deprecation warnings).
- Feature matrix confirmed working earlier in Task 2 QA: place/drag/rotate/delete, plan↔3D swing (north-up plan), fire egress chevrons + exit frames + minimap paths, brand recolor (8 presets + custom), capacity meter statuses (Comfortable/Getting tight), cost panel math, PDF export toast, template switching, mobile layout + catalog sheet.

Stage Summary:
- Project is feature-complete for v1 and visually polished. Handed off to 15-minute webDevReview cron for continuous QA/iteration.
- Next-step ideas for future rounds: undo/redo, save named layouts to Prisma, multi-floor, item context menu, shareable layout URLs, dark mode.

---
Task ID: 5
Agent: Z.ai Code (cron webDevReview)
Task: Round 1 — QA sweep + Undo/Redo + Saved Layouts (Prisma/API) + Share links + toolbar fit polish

Work Log:
- Status assessment: v1 stable (lint 0 errors, GET / 200, console clean, agent-browser desktop+mobile sweep showed no bugs). Phase = stable → new-feature round per mandate.
- Undo/Redo:
  - store.ts: module-level history (past/future, limit 60) with same-action coalescing (900 ms) so drags/slider sweeps collapse into one undo step; undoDepth/redoDepth mirrored into store for reactive buttons; actions applySnapshot/getSnapshot/undo/redo added; every mutating action pushes history.
  - Keyboard: Ctrl/Cmd+Z, Ctrl+Shift+Z, Ctrl+Y (guarded against inputs); Toolbar got a joined undo/redo icon pair with tooltips + disabled states.
- Saved layouts (backend):
  - prisma/schema.prisma: SavedLayout model (name, data JSON, thumb PNG data-URL, brandColor, timestamps) → bun run db:push OK.
  - API (route handlers, zod-validated): GET/POST /api/layouts, GET/DELETE /api/layouts/[id]. List returns {id,name,brandColor,thumb,updatedAt,itemCount}.
  - thumbnail.ts: canvas-drawn 2D plan preview (grid, rounded rect/circle glyphs in brand color, walls) → PNG data-URL for thumbnails.
  - LayoutsMenu.tsx popover: inline save form (name defaults to project name, Enter submits), saved list with thumbnails + relative dates (date-fns), row click loads, two-step delete confirm (2.6 s window), loading skeletons, dashed empty state, count badge on trigger.
- Share links:
  - share.ts: URL-safe base64 codec (TextEncoder/Decoder, +/→-_) + buildShareUrl; Toolbar share button copies link (clipboard w/ toast fallback showing URL); PlannerWorkspace effect parses ?plan= on mount → applySnapshot + toast + history.replaceState cleanup; invalid code → destructive toast.
- Toolbar fit polish (styling mandate): measured children (1399 px needed vs 1230 available) → template select 150 px, view-toggle labels / fire-safety text / brand name now hidden below 2xl (all return at ≥1536 px), gap 2. Toolbar now one row (59 px) at 1440 and wraps gracefully below; mobile 390 px has zero horizontal overflow.
- E2E verified via agent-browser: save "QA Test Café" (toast + thumbnail row + badge 1), template switch → load saved (back to 32 items/15 seats), 2-step delete (confirm state ON → DELETE OK, API list []), place chair → Undo button enable → 16→15→16 via buttons AND Ctrl+Z/Ctrl+Y, share copy ("Share link copied"), opening captured ?plan=… URL restores exact layout (32 items/15 seats).

Stage Summary:
- New capabilities: full undo/redo, persistent saved-layouts library (SQLite via Prisma + REST API), one-click shareable layout URLs, thumbnails generated client-side.
- Files: prisma/schema.prisma; src/app/api/layouts/{route.ts,[id]/route.ts}; src/lib/planner/{store.ts,share.ts,thumbnail.ts}; src/components/planner/{Toolbar.tsx,LayoutsMenu.tsx,PlannerWorkspace.tsx}.
- Lint 0 errors; dev.log clean; desktop 1440 + mobile 390 QA passed; leftover test row deleted (DB back to empty).
- Next-round ideas (priority): light/dark theme toggle; item context menu (right-click rotate/duplicate/delete); layout diff history panel; per-item price override; multi-room/zone support; SoundCloud-style public gallery of shared layouts (server-rendered page with OG image).
