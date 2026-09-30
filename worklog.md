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

---
Task ID: 6
Agent: Z.ai Code (cron webDevReview)
Task: Round 2 — QA sweep + Night-Studio dark theme + item context menu + camera zoom controls + per-item price override

Work Log:
- Status assessment: v1.1 stable before this round (lint 0 errors, GET / 200, console clean, agent-browser desktop 1440 + mobile 390 sweep found no bugs; templates/capacity/brand sections + footer verified). Phase = stable → new-feature round per mandate.
- Night-Studio dark mode (next-themes, already installed):
  - globals.css: converted FORMA palette tokens (charcoal/oat/warmwhite) from literal @theme values to var() indirection so `.dark` overrides them at runtime; added a full `.dark` block — warm espresso shadcn tokens (background #17140F, card #201C16, popover #241F19…) AND warm remaps of the default tailwind scales (--color-white → #262119, stone-50…950 flipped to warm darks) so every hand-rolled `bg-white`/`text-stone-*` utility re-themes with zero component changes; dark variants for .blueprint-grid, .blueprint-band, .thin-scroll, .card-glass, .chip-glass, ::selection, focus-visible ring, input[type=color] swatch.
  - Scene.tsx: 3D viewport re-lights itself — DAY/NIGHT palettes (bg/fog/floor/apron/walls/grid/windows/threshold + ambient/hemi/sun intensities); Room/WallSegment take a `pal` prop; night scene is moody espresso with brand-colored furniture popping.
  - ThemeProvider (next-themes, attribute=class, defaultTheme=light, disableTransitionOnChange) in layout.tsx; ThemeToggle (sun/moon cross-fade + rotate) in the sticky header; useSyncExternalStore mounted flag (lint-safe).
  - Theme-proof fixes: footer rebuilt with literal always-dark ink colors (#211D17 band + warm gray text) so it stays a dark footer in both themes; template-card photo overlay gradient switched from from-charcoal/45 to literal #1F1B15 so photos keep a dark scrim in dark mode. Pair-contrast usages (bg-charcoal text-warmwhite CTAs) invert gracefully.
- Right-click context menu (ItemContextMenu.tsx):
  - R3F onContextMenu on each item group; rightDown ref guards against right-drag pan (6px threshold); onItemDown now ignores non-primary buttons; store state ctxMenu {uid,x,y} + openContextMenu/closeContextMenu; menu closes on Esc/wheel/outside pointerdown/any action; edge-clamped fixed positioning; ctx-glass + ctx-pop keyframe styles; menu shows item name + brand-colored price, custom-price badge, Rotate 90° (R), Duplicate (D), Edit price (jumps to selection popover via forma:edit-price event), destructive Remove (Del); selecting via menu syncs SelectionControls.
- Camera zoom controls (ViewControls.tsx):
  - Glass cluster on viewport left edge: Zoom in / Zoom out / Re-frame room with tooltips + shortcut hints; store zoomReq {kind,n} counter; CameraRig watches it — in/out dolly along the view vector eased via damp3 (clamped to OrbitControls min/max), fit replays the plan/3D home-position swing; keyboard: +/-/= zoom, F re-frame; also added D = duplicate shortcut in PlannerWorkspace.
- Per-item price override:
  - types.ts PlacedItem.price?: number; store setItemPrice(uid, price|null) with history push; computeCost groups custom-priced units into separate lines (key id::unit) and flags them custom; CostPanel renders amber CUSTOM chips + "custom unit prices applied" note; SelectionControls gained a price popover (BadgeDollarSign trigger, $ input, Apply, reset-to-list) with custom-price dot indicator; flows through undo/redo, share links, saved layouts and PDF export (all consume computeCost/snapshot as-is).
  - store: ctxMenu cleared on all destructive/global actions (remove/loadTemplate/clearAll/applySnapshot/undo/redo/arm/select).
- Styling details: breathing selection ring (scale osc in useFrame), grab cursor on item hover, hint chip copy updated (D duplicate · right-click for actions), hero tip kbd row now shows R/D/Del/F + right-click, dev-only window.__forma QA handle (NODE_ENV-guarded) for browser automation.
- E2E verified via agent-browser: dark toggle (all sections + footer + 3D scene re-light screenshots at 1440), light restore, context menu open/duplicate (32→33)/edit price ($280→$200 custom), cost math ($20.5k + dup $280 − $80 discount = $20.7k ✓), CostPanel CUSTOM line + note, zoom in ×2 + re-frame fit, D shortcut + Ctrl+Z, plan/3D swing regression, mobile 390 (0px overflow, ViewControls + theme toggle fit), Corner Café template restored afterwards. Lint 0 errors; dev.log clean (only benign THREE warnings + transient Fast-Refresh reloads during edits).

Stage Summary:
- v1.2: Night-Studio dark theme (UI + 3D scene), right-click item actions, camera zoom/re-frame with keyboard shortcuts, per-item price overrides with live cost integration.
- Files: src/app/{globals.css,layout.tsx,page.tsx}; src/components/{theme-provider.tsx,theme-toggle.tsx}; src/components/planner/{Scene.tsx,PlannerWorkspace.tsx,ItemContextMenu.tsx,ViewControls.tsx,ViewportHud.tsx,CostPanel.tsx,sections.tsx}; src/lib/planner/{store.ts,types.ts,capacity.ts}.
- Next-round ideas (priority): public gallery of shared layouts (server-rendered + OG image), multi-room/zones, layout diff history panel, per-category budget caps, drag-from-catalog ghost improvements, a11y pass on 3D canvas (focusable viewport with roving instructions).

---
Task ID: 7
Agent: Z.ai Code (cron webDevReview)
Task: Round 3 — QA sweep (desktop+mobile) + Budget guardrails + Community gallery + CSV BOM + Shortcuts dialog

Work Log:
- Status assessment: v1.2 was stable (lint 0 errors, GET / 200). agent-browser sweep at 1440x900 + 390x844 re-verified all v1 features: fire toggle, plan/3D swing, brand recolor, cost math ($20,460), export build-up + PDF download, sections, footer, 0px mobile overflow.
- Environment traps hit & solved (document for future rounds):
  (a) Stale-cache ghosts: browser sessions that survive dev-server restarts serve old Turbopack chunks from HTTP cache — earlier "ThemeProvider is not defined" / "APRON_COLOR is not defined" / "getItem is not defined" errors were ALL this. Fix = agent-browser close + reopen (fresh session) after any dev-server restart; sources were never wrong.
  (b) Dev server died mid-round (silent, likely supervisor cycle) → restarted via `nohup bun run dev >> dev.log 2>&1 &`; also did one full `rm -rf .next` rebuild to rule out cache corruption.
- Budget guardrails (feature):
  - store.ts: `budget: number | null` + setBudget() (clamped 0..2M), persisted via partialize (device-local; NOT in layout snapshots/undo).
  - capacity.ts: computeCategoryBreakdown() (spend by category, server-safe), CATEGORY_META colors, budgetStatusOf() → under/close/over at 90%/100%.
  - CostPanel.tsx: Budget guardrail card (input + 15k/25k/40k/60k presets + Clear), animated progress bar with role=progressbar, status chip, "over by $X" readout; Spend-by-category stacked ribbon + legend rows; Estimated total turns red when over.
  - Toolbar.tsx: cost pill reacts — amber border when ≥90%, red tint + TriangleAlert icon + red amount when over, "/ budget" hint at 2xl.
- Community gallery (feature): `CommunityGallery` in sections.tsx, mounted between CapacityGuide and BrandStrip; nav links (header + footer) added. Cards = SVG-plan thumbnail, venue chip (from VENUES via templateId), m² badge, seats/items meta, relative save time, "Open in the studio" → GET /api/layouts/[id] → applySnapshot + toast + smooth scroll to #planner. Live refresh via `forma:layouts-changed` window event (dispatched by LayoutsMenu on save/delete) + manual Refresh button; skeleton + dashed empty states; whileInView stagger animations.
- API: GET /api/layouts now also returns seats (via catalog), areaM2, templateId per row (single-call gallery data; safeParse fallback keeps old rows working).
- CSV BOM (feature): "BOM · CSV" button in CostPanel downloads a bill-of-materials (meta header w/ project/template/area/seats/date, line items w/ pricing flag, subtotal/install/contingency/total/budget) via Blob+a.click; slugified filename.
- Shortcuts dialog (feature): ShortcutsDialog.tsx — "?" toggles a grouped cheat-sheet (Items/View/Session) with kbd chips; NEW keyboard shortcuts: 1 = plan view, 2 = 3D view (wired in PlannerWorkspace); tip line under workspace now advertises "?".
- Seed data: scripts/seed-community.ts (bun + Prisma) — 6 curated layouts from templates + variations (Roastery lounge, Harbor Bakery, extra booths, desk cluster), inline SVG plan thumbnails (blueprint grid, glyph shapes in brand color, walls w/ door gaps); guarded to no-op when table non-empty. DB has 6 rows.
- Styling details: community cards hover-lift + image zoom + brand-dot chips; budget bars w/ inset-track shadows + 500ms eased fills; preset chips with active charcoal state; glassy dialog header; nav "Community" link. Dark mode verified re-theming the new section (thumbnails intentionally stay light "paper on dark desk").
- E2E verified via agent-browser: budget 25k/15k → Over ($3,896 / $13,896 over) red states; 40k → Under emerald 72%; pill red+alert at 15k; BOM CSV click clean (0 errors); "Open Bistro Verde in the studio" → 42 items/43 seats/toast/scroll; save "QA Round 7 Budget Test" → community card appeared instantly (event); DELETE via API 200; 1/2 keys swing views; mobile 390 = 0px overflow; lint 0 errors; 0 page errors on fresh session; test row deleted, template/budget/brand reset to defaults.

Stage Summary:
- v1.3: budget guardrails (panel + toolbar + CSV), community gallery wall (API-backed, seeded, live-refresh), keyboard shortcut sheet + 1/2 view keys.
- Files: src/lib/planner/{store.ts,capacity.ts}; src/components/planner/{CostPanel.tsx,Toolbar.tsx,sections.tsx,LayoutsMenu.tsx,PlannerWorkspace.tsx,ShortcutsDialog.tsx (new)}; src/app/api/layouts/route.ts; src/app/page.tsx; scripts/seed-community.ts (new).
- Known nits/risks: dev-server restarts strand long-lived browser sessions on stale cached chunks (QA-only, not user-facing); dev-tools "1 Issue" badge = benign THREE.Clock/PCFSoftShadowMap deprecation warnings (dev-only); seeded thumbs are SVG data-URLs (light paper look in dark mode is intentional).
- Next-round ideas (priority): per-category budget caps; zone/area tints; layout diff history panel; OG meta + share-preview polish; a11y pass on 3D canvas (roving instructions, focusable viewport); prune seeded rows w/ a /api/layouts?limit param if gallery gets crowded.

---
Task ID: 8
Agent: Z.ai Code (cron webDevReview)
Task: Round 4 — QA sweep (desktop+mobile) + Readiness checks (exit-access compliance) + Layout insights + PNG plan export + OG/Twitter meta + template egress fixes

Work Log:
- Status assessment: v1.3 stable (lint 0, GET / 200, console clean). agent-browser sweep at 1440×900 + 390×844 re-verified: place/drag (32→33 via synthetic pointer events on canvas), undo (33→32), plan/3D keyboard swing (1/2 keys; toggle labels are hidden <1536px so keyboard/store is the QA path), fire toggle (chevrons + EXIT frames + minimap dashed paths), cost math ($20.5k→$20.6k on placement). No bugs found → stable phase → new-feature round.
- Shared egress module (NEW src/lib/planner/egress.ts): egressRoutes()/exitDoors() (Scene.tsx now imports waypoints from here — single source of truth), dischargeZones() (1.2 m deep × 1.1 m wide landing in front of both exit doors, IBC-style), dischargeBlockages() (rotated-AABB overlap ≥2 cm on both axes; NON_BLOCKING_IDS = pendant (ceiling-hung) + rug (walkable) excluded), sampleRoute() kept for future overlays.
- Design decision (learned the hard way): full-route clearance checking (0.45 m off the drawn chevron paths) flags 5 items in EVERY curated template because the routes deliberately weave between tables → whack-a-mole. Pivoted to code-aligned **exit discharge zone** check (what inspectors actually care about) + kept routes purely visual. Thresholds: overlap → fail "N blocking".
- ReadinessCard (NEW src/components/planner/InsightsCards.tsx): 4-row compliance checklist in the cost panel — Exit capacity (load vs 420), Seat density (m²/seat vs venue guide), Exit access (discharge zones; offender rows "name · main/rear exit" with click-to-locate = select(uid)+close panel so the breathing selection ring is visible), Budget guardrail. Pass/warn/fail/muted icon rings + chips, "N/4 passed" counter, contextual footer hint. Wire: ReadinessCard mounts above InsightsCard in CostPanel scroll area.
- InsightsCard (same file): brand-colored SVG donut (animated stroke-dashoffset) for floor occupancy %, Cost/seat + Spend/m² with rAF count-up ticker (useCountUp, easeOutCubic, sub-cent skip to satisfy react-hooks/set-state-in-effect), furniture footprint m² readout, "Where the seats sit" seat-mix bars (top 4, animated widths). Helper computeInsights() added to capacity.ts.
- Template egress fixes so every curated layout passes its own check: café shelf-unit 2.6→1.1 (was sitting in the rear landing), restaurant café-counter 1.8→0.95 + stools/pendants shifted west (counter w=2.4 reached into the rear landing), boutique checkout/sign 3.2→3.65 + mannequin −0.6→−0.95 + clothing-rail/pendant 2.2→1.5. All four templates verify "Exit access: Clear" (DOM loop across templates).
- CapacityMeter live chip: spring-animated red "Exit access blocked — N items in the landing" button appears in the viewport HUD when a landing is blocked; click opens the cost panel (AnimatePresence height/opacity).
- PNG plan export: "Plan · PNG" button next to BOM · CSV in CostPanel footer; renders the offscreen detailed PlanSVG (fire paths included when toggled) at 2× into a canvas with FORMA brand header strip + project meta line (name · m² · seats · total) → downloads forma-plan-<slug>.png + toast. Footer venue line now shows occupant load (58/420).
- OG/Twitter meta polish (layout.tsx): metadataBase, og:image=/gallery/cafe.png w/h/alt, og:locale, twitter:card summary_large_image — verified tags render via curl.
- Environment traps (documented): (a) headless renderer occasionally crashes to about:blank after heavy synthetic pointer/eval storms → recover by `agent-browser open` again; zustand persist then re-adds state (a test booth survived a reload via localStorage persistence — legit behavior). (b) Full-viewport screenshots of the open Sheet showed a stale LIGHT composite even after dark-mode flips, while element-level screenshots (`screenshot '<selector>' path`) + getComputedStyle were correct — QA dark-mode surfaces via ELEMENT screenshots, not viewport captures.
- E2E verified: 4/4 templates Exit access Clear; negative case booth@landing → meter chip + panel "1 blocking" → locate click → panel closes + booth selected; second booth → "2 items" (duplicate persistence across reload via zustand persist — correct); PNG export downloaded & inspected (brand header, meta line, north arrow, scale bar); OG tags rendered; mobile 390 = 0px overflow with all new cards fitting; dark mode via element capture (espresso cards, warm text, brand donut); lint 0 errors; console clean; test state cleaned (32 items, café, no budget).

Stage Summary:
- v1.4: compliance "Readiness checks" (exit-access discharge zones, density, budget) with click-to-locate offenders + viewport warning chip; "Layout insights" (occupancy donut, cost/seat, spend/m², seat mix) with animated tickers; PNG plan export; OG/Twitter share preview; curated templates now pass their own egress checks.
- Files: src/lib/planner/{egress.ts (new), capacity.ts, templates.ts}; src/components/planner/{InsightsCards.tsx (new), CostPanel.tsx, CapacityMeter.tsx, Scene.tsx}; src/app/layout.tsx.
- Known nits/risks: readiness "Tight" on Studio Works (4.9 m²/seat vs 4.6×1.25 guide) is honest, not a bug; seeded community rows (DB) still snapshot pre-fix layouts — loading one may show a landing warning (acceptable, user-shaped data); PlanSVG detailed labels can clip on long names in PNG export (pre-existing).
- Next-round ideas (priority): per-category budget caps; zone/area tints; layout diff history panel; first-visit coach tour; a11y pass on the 3D canvas (roving instructions); /api/layouts?limit param for the community gallery.
---
Task ID: 9
Agent: Z.ai Code (cron webDevReview)
Task: Round 5 — QA sweep (desktop+mobile) + Session checkpoints + first-visit coach tour + gallery pagination + hero styling polish

Work Log:
- Status assessment: v1.4 stable (lint 0, GET / 200, console clean). agent-browser sweep at 1440×900 + 390×844 re-verified: plan/3D swing (1/2 keys), catalog arm + canvas click placement (32→33) + cost pill update ($20.5k→$20.6k), mobile 0px overflow, no offscreen buttons, 0 page errors on fresh session. No bugs found → stable phase → new-feature round (v1.5).
- Session checkpoints (feature): store.ts adds `checkpoints: SessionCheckpoint[]` (id/label/ts/snap/itemCount/seats/cost, persisted device-local, max 12 newest-first) + saveCheckpoint()/deleteCheckpoint() (seats+cost computed at save time via computeCapacity/computeCost). NEW SessionHistory.tsx toolbar popover: label input (optional, defaults to "project · HH:MM") + Pin button, checkpoint rows with meta (items · seats · cost · time-ago) and LIVE DIFF vs current layout (±N items, ±$X cost, green/red; "matches now" chip when identical), click-row-to-restore (220ms beat for the spinner, closes + toast "Ctrl+Z undoes this"), two-click delete confirm. Toolbar gains "History" button (badge count).
- Coach tour (feature): NEW CoachTour.tsx — 7-step spotlight onboarding (canvas, catalog, view-toggle, fire, brand, cost, export) anchored to real elements via data-tour attributes. Auto-starts once on first visit (localStorage forma-tour-done, ≥1024px viewports only, 1.4s delay); manual re-open via toolbar Help menu (new CircleHelp popover: "Take the studio tour" + "Keyboard shortcuts" → SHORTCUTS_EVENT). Animated cutout = fixed div w/ 9999px box-shadow scrim + spring morph (framer-motion), card clamps below/above target, progress dots, Back/Next/Skip, ArrowLeft/Right/Enter/Esc keys, last step = "Start planning". data-tour attrs added in Toolbar (view-toggle, fire, brand, cost, export) + PlannerWorkspace (canvas, catalog).
- Gallery pagination (feature): GET /api/layouts?limit=N (clamp 1..96, default 24) now returns `total` (Promise.all count query). CommunityGallery fetches limit=48, shows 8 initially, header chip "N plans on the wall" / "X of Y plans" (hidden on mobile), "Load more layouts +N" pill button when rows > visible; refresh/live-event keeps visible state.
- Styling polish: hero — soft brand-tinted radial wash (color-mix var(--chart-1)) behind the headline, ping-dot pulse in the audience badge, stat values get hover-lift + brand underline sweep; tip line now advertises the tour via the help menu. All new UI uses theme tokens (bg-card/text-charcoal/stone-*) — verified in Night-Studio dark mode via element screenshot of the History popover.
- Environment traps (per prior rounds): fresh agent-browser session after dev-server restarts; element screenshots for dark-mode QA. Lint fix this round: react-hooks/set-state-in-effect in CoachTour → initial remeasure deferred via requestAnimationFrame.
- E2E verified: tour auto-start + 7 steps + spotlight framing (screenshots) + finish/flag; Help-menu restart works; checkpoint pin → row w/ meta → add chair → diff shows "−1 items · −$144 cost" → restore (33→32 + toast) → delete w/ confirm → empty state; gallery: 4 POSTed QA rows → chip "8 of 10 plans" + "Load more layouts +2" → click → 10 cards, button gone → all 4 QA rows DELETEd (total back to 6); mobile 390: 0 overflow, tour correctly skips auto-start, History visible; dark mode popover element-shot clean; lint 0 errors; console 0 errors; test state cleaned (checkpoints=[], light theme, café 32 items, gallery 6 rows).

Stage Summary:
- v1.5: session checkpoints w/ live diff (History popover), 7-stop coach tour (auto first-visit + Help menu), community gallery pagination + count chip, hero styling polish.
- Files: src/lib/planner/store.ts; src/components/planner/{SessionHistory.tsx (new), CoachTour.tsx (new), Toolbar.tsx, PlannerWorkspace.tsx, sections.tsx}; src/app/api/layouts/route.ts; src/app/page.tsx.
- Known nits/risks: checkpoints live in the same persisted store key as the layout (forma-planner-v1) — older saved states rehydrate without checkpoints (handled: default []). Restore is undo-able via Ctrl+Z (pushHistory 'snapshot') but checkpoints themselves are not undo history. Tour spotlight on very short viewports (<560px height) may overlap the card — clamped, untested below 390×844.
- Next-round ideas (priority): per-category budget caps; zone/area tints in plan view; layout diff history panel (checkpoint → checkpoint compare view); share-link OG cards; a11y pass on the 3D canvas (roving instructions, focusable viewport); tour step targeting the catalog sheet on mobile.

---
Task ID: 10
Agent: Z.ai Code (cron webDevReview)
Task: Round 6 — QA sweep (desktop+mobile) + per-category budget caps + plan-glyph palette + keyboard nudge/a11y + cost-panel overflow fix

Work Log:
- Status assessment: v1.5 stable (lint 0, GET / 200, console clean). agent-browser sweep at 1440×900 + 390×844 re-verified all prior features: addItem/undo cycle (32→33→32), 1/2-key view swing, fire toggle (chevrons + EXIT), cost math ($20,460), dark-mode re-light, mobile 0px overflow. Two environment traps hit (documented): agent-browser relaunches to about:blank after CDP timeouts (fix: close --all + reopen); `open --viewport` flag unreliable → use `agent-browser set viewport W H` after opening. Tour auto-start guard (innerWidth<1024 skip) verified correct — apparent mobile tour was a load-at-1280-then-resize artifact. No bugs in shipped features → new-feature round (v1.6).
- BUG FIX (pre-existing, caught this round): CostPanel scrolled content could overflow the 380px sheet by up to ~116px — Radix ScrollArea viewport uses display:table + min-width:100%, so any nowrap "truncate" text's min-content propagated to the whole panel (widest offender: ReadinessCard's "Both exit landings keep the code-style 120 cm clear zone" hint, min-content 386px). Fix: content wrapper inside ScrollArea changed to `grid grid-cols-[minmax(0,1fr)]` which zeroes the track's min-content contribution; verified content now exactly 379px (panel minus scrollbar) with all sections intact.
- Per-category budget caps (feature):
  - store.ts: `categoryBudgets: Partial<Record<Category, number>>` (device-local, persisted via partialize, NOT in layout snapshots/undo) + setCategoryBudget(cat, usd|null) clamped 0..2M.
  - capacity.ts: ALL_CATEGORIES export (display order) + computeCategorySpend(items) (all five categories incl. $0) + CATEGORY_COLORS record (Category|'all' → color, for catalog chips).
  - CostPanel: NEW "Category caps" card (above Readiness checks) — one row per category: colored dot, label, compact spend ($3.6k style), 72px cap input ($ prefix, placeholder "cap", Enter/blur commit, empty clears); capped rows get a slim status bar (emerald/amber/red per budgetStatusOf) + right-aligned % readout; header chip flips "N over" (red, TriangleAlert) / "N close" (amber) / "on track" (emerald); card border turns red when any cap over; footer note "Caps stay on this device…". Input editing verified E2E: type 8000 + Enter → store 8000, row 45%, chip flips to on track.
  - Toolbar cost pill: amber tint + TriangleAlert + aria-label/title "Over cap: <cats>" when any category cap exceeded and the overall budget isn't already red (red still wins).
- Plan-glyph palette (feature):
  - store.ts: `planPalette: 'brand' | 'category'` (device-local, persisted) + setPlanPalette.
  - PlanSVG: `palette` prop (default 'brand'); category mode fills every glyph with its CATEGORY_META color (counters keep white inner stroke); detailed mode + category palette renders a print legend ("KEY · Seating · Tables · Counters · Fixtures · Decor" with swatches) along the bottom margin right of the scale bar (positioning fixed after first render overlapped the 1–2 m outline box).
  - ViewportHud PlanMinimap: footer restructured to two rows — "N items placed · live plan" + full-width segmented toggle (Palette icon + "BRAND COLORS | BY CATEGORY") — first single-row attempt wrapped ("live plan" clipped); minimap PlanSVG gets the palette.
  - CostPanel hidden PlanSVG (PNG export) gets palette too → exported sheet matches the on-screen palette and carries the legend (verified in downloaded PNG: category colors + clean legend, no scale-bar overlap). PDF/ExportModal path untouched (brand sheet is the deliverable default there).
- Keyboard nudge + a11y (feature):
  - PlannerWorkspace: Arrow keys nudge the selected piece 5 cm (snap), Shift+Arrow 25 cm, up = north; preventDefault stops page scroll; Delete/Backspace now also preventDefault. Undo coalescing keeps a burst as one step (COALESCE_MS).
  - Viewport div: tabIndex=0, role="group", dynamic aria-label ("Plan editor viewport. N pieces placed…"), focus-visible inset ring; sr-only aria-live="polite" role="status" region announces selection ("{name} selected at x by z meters. Arrow keys nudge…") debounced 250 ms (rAF-free, lint-safe).
  - ShortcutsDialog: two new rows (↑↓←→ nudge 5 cm; ⇧+↑↓←→ 25 cm).
- Styling details: catalog category filter chips now carry their category color dot (active chips get a warmwhite ring on the dot); minimap footer segmented control styled (charcoal active, rounded-lg, flex-1 touch targets); caps card uses the same inset-shadow tracks + 500ms eased fills as the budget bar for visual continuity; HintChip text truncated + mentions "arrows nudge".
- E2E verified via agent-browser (fresh sessions, desktop 1280/1440 + mobile 390): nudge (+0.05 x / −0.25 z with Shift; clamped at walls — counter against north wall correctly stopped), undo restores, palette toggle → minimap fills switch to all five category colors and back, caps over/close/on-track states + "1 over" chip + 179% red bar + amber toolbar pill, cap input UI editing, persistence across reload (caps + palette), PNG export with legend (downloaded + inspected), dark-mode caps card (element screenshot), plan/3D swing regression, mobile 390 = 0px overflow, a11y attrs (tabIndex/role/aria-live) present, console clean (only known benign THREE warnings), lint 0 errors. QA state cleaned: caps cleared, palette → brand, café template reloaded (32 items).
- MultiEdit lesson: a two-edit MultiEdit to CostPanel silently applied only the first hunk once — after batch edits, grep-verify every intended change (the missed `palette={planPalette}` prop made the PNG export stay brand-colored until re-applied).

Stage Summary:
- v1.6: per-category budget caps (card + status bars + toolbar pill alert + persistence), plan-glyph palette (brand vs by-category, minimap toggle, PNG legend), arrow-key nudge + focusable viewport + aria-live announcements, cost-panel horizontal-overflow bug fixed.
- Files: src/lib/planner/{store.ts, capacity.ts}; src/components/planner/{CostPanel.tsx, PlanSVG.tsx, ViewportHud.tsx, PlannerWorkspace.tsx, Toolbar.tsx, CatalogSidebar.tsx, ShortcutsDialog.tsx}.
- Known nits/risks: PNG legend assumes rooms ≥ ~6.5 m wide to fit all five entries on one line (narrower rooms may clip the right-most label; acceptable for current template sizes); palette persists device-local so a shared layout opens with the recipient's last-used palette; caps are advisory only (no hard blocks) by design.
- Next-round ideas (priority): zone/area tints in plan view (drawn zones, not just glyph colors); layout diff history panel (checkpoint → checkpoint compare); share-link OG cards; per-cap BOM CSV column; drag-from-catalog ghost in plan view; tour step targeting the catalog sheet on mobile.
- Post-round note: dev server silently died right after the round (same as Round 3's supervisor cycle) — restarted via `nohup bun run dev >> dev.log 2>&1 &`, GET / and /api/layouts verified 200 afterwards.

---
Task ID: 11
Agent: Z.ai Code (cron webDevReview)
Task: Round 7 — QA sweep (desktop+mobile) + functional zones with area tints + share-link OG preview cards + per-cap BOM CSV

Work Log:
- Status assessment: v1.6 stable (lint 0, GET / 200). agent-browser sweep at 1440×900 + 390×844 re-verified: addItem/undo (32→33→32), 1/2-key swing, fire toggle, mobile 0px overflow, no page errors. No bugs in shipped features → new-feature round (v1.7).
- Functional zones with area tints (flagship feature):
  - types.ts: ZoneKind ('service' | 'seating' | 'dining' | 'entry' | 'work' | 'meeting' | 'retail' | 'support') + ZoneDef {id,label,kind,x,z,w,d} + TemplateDef.zones?.
  - NEW src/lib/planner/zones.ts: ZONE_META (warm muted wash palette: sage/amber/coffee/rust/slate/deep-sage/tan/gray), clipZone() (AABB ∩ room bounds, drops <0.15 m slivers), drawableZones() — zones auto-clip when the room is resized smaller.
  - templates.ts: hand-tuned zones per template (café 5: Espresso bar/Entry/Window bar/Café floor/Lounge; coworking 5: Open studio/Meeting/Focus booth/Lounge/Entry; boutique 4: Merch floor/Checkout/Fitting/Feature display; restaurant 4: Bar & pass/Host stand/Booths/Dining room).
  - store.ts: zones: ZoneDef[] state + showZones (session UI default true) + toggleZones; loadTemplate loads template zones; snapshotOf/applySnapshot/undo/redo carry zones (LayoutSnapshot.zones optional for pre-v1.7 compat); partialize persists zones with the layout.
  - PlanSVG: zones + showZones props — draws clipped translucent washes (12% fill, dashed 55%-alpha outline, rx 0.1) with uppercase letterspaced micro-cap labels pinned to each zone's top edge, under the item glyphs.
  - Scene.tsx: ZoneWashes 3D floor decals (y 0.0035, renderOrder 1, depthWrite false, opacity 0.13 day / 0.17 night).
  - Toolbar: compact zones toggle next to Fire safety — LayoutGrid icon + zone-count badge, active state charcoal-tinted, aria-pressed + tooltip; count badge hidden when template has none.
  - ViewportHud minimap + CostPanel PNG export + ExportModal PDF export all pass zones/showZones (exports match the on-screen toggle; verified PNG shows washes + labels).
- Share-link OG preview cards (feature):
  - NEW /s/[code]/page.tsx: server landing for share links — generateMetadata builds title/description/OG+Twitter card tags from the decoded snapshot (project name, venue, m², pieces); humans get an instant `location.replace('/?plan=<code>')` inline script + styled blueprint fallback card (FORMA mark, project meta, pulse dots, "Open the studio" link) for no-JS.
  - NEW /s/[code]/opengraph-image.tsx: next/og ImageResponse 1200×630 — decodes the code server-side (decodeLayout is pure TS; atob fine on node), renders wordmark + venue chip + project name + stats rows (area/seats/pieces/est. cost in brand color) + a live mini plan (zones as rgba washes, items as brand/ink/beige rounded rects via halfExtents AABB math) on an apron panel. Graceful "broken link" card for invalid codes.
  - share.ts buildShareUrl now returns /s/<code> (was /?plan=<code>); decodeLayout now passes zones through; Toolbar share toast copy mentions the preview card.
  - Satori lesson (cost a 500 first render): every multi-child div needs explicit display:flex — the room box (absolute children) initially lacked it; error surfaced as "failed to pipe response … Expected <div> to have explicit display:flex" in dev.log.
  - E2E: GET /s/<code> → 200 HTML with correct og:title/twitter:card; GET /s/<code>/opengraph-image → 200 image/png 43.5 KB, card inspected (plan renders, stats correct); opening the link in-browser redirects to /?plan=… and applies the layout incl. all 5 zones.
- Per-cap BOM CSV (feature): downloadBomCsv gains an optional caps section — "Category caps" header + rows Category,Cap (USD),Spend (USD),Status (UNDER/CLOSE/OVER) appended when any cap is set; verified in downloaded CSV ("Seating,2000,3580,OVER").
- Bug found & fixed during E2E: decodeLayout dropped the new zones field → share links opened with zones silently stripped (symptom: zones:0 after redirect). Fixed with zones passthrough; full share round-trip re-verified (5 zones restored).
- Styling details: zone labels use 0.12em tracking uppercase micro-caps (blueprint annotation feel); toolbar zones toggle matches the fire-toggle visual family; OG card follows the FORMA paper/ink/apron system; /s landing reuses blueprint-grid + warmwhite tokens.
- Environment notes: browser cache after dev-server HMR of share.ts required a fresh page load to pick up the module (share code generated in-page for testing); clipboard read is blocked headless — share URL tested via in-page encodeLayout replication + button click.
- E2E verified (fresh sessions, desktop 1280/1440 + mobile 390): zones visible in 3D (day + night) and minimap with labels; toggle hides/shows everywhere; per-template zones swap on template change (coworking labels verified); PNG export with zone washes + labels inspected; BOM CSV caps section; OG image + meta tags fetched and inspected; share round-trip keeps zones; room-resize zone clipping exercised implicitly via clipZone unit-path; mobile 390 = 0px overflow; console clean; lint 0 errors. QA state restored (café, 32 items, 5 zones, no caps, brand palette, light theme).

Stage Summary:
- v1.7: functional zones (per-template tinted areas with labels in plan/3D/PNG/PDF, toolbar toggle, snapshot-travelling), /s/<code> share links with dynamic OG preview cards (next/og plan renderer), per-cap BOM CSV section, decodeLayout zones passthrough fix.
- Files: src/lib/planner/{types.ts, zones.ts (new), templates.ts, store.ts, share.ts}; src/components/planner/{PlanSVG.tsx, Scene.tsx, Toolbar.tsx, ViewportHud.tsx, CostPanel.tsx, ExportModal.tsx}; src/app/s/[code]/{page.tsx, opengraph-image.tsx} (new).
- Known nits/risks: seeded community rows (pre-v1.7 DB snapshots) have no zones → open without washes (user-shaped data, acceptable); OG mini-plan uses AABBs so rotated items are conservative boxes; OG route first compile takes ~3 s (dev-only); zone labels can sit under tall item clusters in dense layouts (wash is an underlay by design).
- Next-round ideas (priority): zone editor (draw/move/rename zones for custom layouts); layout diff history panel (checkpoint → checkpoint compare); community gallery OG thumbnails from DB rows via /s-style renderer; per-zone seat/area stats card; tour step targeting the catalog sheet on mobile; /api/layouts?limit param already done in v1.5.

---
Task ID: 12
Agent: Z.ai Code (cron webDevReview)
Task: Round 8 — QA sweep (desktop+mobile) + interactive zone editor + per-zone stats card + styling details

Work Log:
- Status assessment: v1.7 stable on arrival. agent-browser full sweep (desktop 1440/1280 + mobile 390): page load, coach tour (fresh session), plan↔3D swing, catalog place (32→33 via floor click), undo, zones toggle, Radix template switch (Studio Works 25 pcs ↔ Corner Café 32), brand color hex re-tint (22 elements verified), cost panel dialog, all 5 marketing sections render, desktop + mobile 0px overflow, console clean (only benign THREE warnings). No shipped-feature bugs found → new-feature round (v1.8). Note: agent-browser loopback DNS flaked twice ("ERR_NAME_NOT_RESOLVED" on localhost AND 127.0.0.1 right after relaunch) — retry on the already-running instance works; use 127.0.0.1.
- Interactive zone editor (flagship feature):
  - store.ts: addZone(init?) (defaults 3×2 at center, clamps via new clampZoneRect — 10 cm grid, min 0.6 m, stays inside walls), updateZone(id, patch, opts?.silent) (silent skips history for drag deltas), beginZoneEdit() (one undo checkpoint per gesture), removeZone, clearZones. Zone ops deliberately do NOT flip templateId to 'custom' (venue capacity factor stays intact).
  - NEW src/components/planner/ZoneEditor.tsx: wide Dialog (max-w-5xl) — left: live PlanSVG + same-viewBox overlay SVG (pointer capture, touch-action none); gestures: drag body = move, 4 corner handles = resize (opposite corner anchored), Draw-zone mode = rubber band with live W×D m readout, all snapped 10 cm + room-clamped; right: zone list (kind-colored dot, name input, 8-kind Select, delete, size chip) + precise X/Z/W/D number inputs for the selected zone + Add / Draw / Clear all + snap hint. Edits hit the live store → plan, 3D washes, minimap, exports update in real time. Empty state with dashed hint card. Label input is a self-contained ZoneLabelInput keyed by `id:label` (no sync effects — passes the new react-hooks/set-state-in-effect rule).
  - Race hardening: final draw rect computed from the pointerup event position (not lagging rubber state); setPointerCapture wrapped in try/catch (fast taps / synthetic pointers).
  - NEW src/lib/planner/events.ts: ZONE_EDITOR_EVENT + openZoneEditor() helper (decoupled cross-component trigger).
  - Toolbar: zones toggle + NEW pencil button joined as a segmented pair (rounded-l-lg / border-l-0 rounded-r-lg); pencil opens ZoneEditor; Toolbar also listens for the window event.
- Per-zone stats card (feature):
  - zones.ts: computeZoneStats(zones, items, room) → per-zone clipped area, pieces, seats, spend (center-in-rect rule, overlap allowed), pctOfFloor; ZONE_KINDS ordered list.
  - CostPanel: NEW "Zone breakdown" card between Category caps and Readiness — per-zone row: color dot, label, seats chip, m², spend ($8.8k style), slim color bar (budget-bar visual family) + "% floor" readout, role="meter" a11y; empty state shows dashed card with "Open the zone editor" button (dispatches the event); header "Edit" button likewise.
- Styling details: joined zone-toggle/pencil segmented control; editor handles = warmwhite squares with ink ring + nwse/nesw cursor classes; draw banner = charcoal pill (micro-caps); selected zone row ring + inset coordinate grid; kind selects carry dot swatches; blueprint-grid backdrop behind the editor plan; zone card bars reuse the inset-shadow track + 500ms eased fill language of the budget bar.
- E2E verified via agent-browser (desktop + mobile): drag zone (-1.5,-3.3 → -1,-3, 0.1 snap, exactly 1 undo step), SE-handle resize (5.4×1.6 → 5.9×1.9, NW anchored), Ctrl+Z reverts resize, rename → "Espresso & pass" propagates to minimap label, kind service→dining, Add → Zone 6 3×2 at 0,0, draw mode → Zone 7 3.0×1.4 from rubber band, delete Zone 6 → 6 zones, precise input Entry w 1.2→2.5 committed, undo history steps verified against template ground truth (café Entry is w 2.4 — two undos land on exact expected states), CostPanel Edit button opens editor via event, minimap shows renamed zone live, snapshot carries zones (share/save safe), mobile 390 dialog = plan 388px + scrollable list + 0px page overflow, screenshots inspected (desktop editor + selected state + mobile). Regression: 1/2 view swing + template reload OK. Lint 0 errors. QA state restored: café, 32 items, 5 template zones.
- Also fixed: pre-existing TS2367 narrowing error in Toolbar cost-pill title (budgetState.status comparison after narrowing) — tsc planner-scoped now clean.
- MultiEdit lesson (again): a 5-hunk MultiEdit to ZoneEditor reported failure on hunk 3 but HAD applied hunks 1-2 and silently skipped 4-5 — always grep-verify every hunk after batch edits.

Stage Summary:
- v1.8: full interactive zone editor (draw/move/resize/rename/retype/delete/clear with undo + precise inputs), per-zone stats card in the cost panel, zone-editor event bus, Toolbar segmented zones control, setPointerCapture hardening, Toolbar TS fix.
- Files: src/lib/planner/{store.ts, zones.ts, events.ts (new)}; src/components/planner/{ZoneEditor.tsx (new), Toolbar.tsx, CostPanel.tsx}.
- Known nits/risks: zone draws ignore overlapping-item hit priority (drawing over a zone always wins in draw mode — by design); a drag longer than COALESCE_MS(900ms) uses beginZoneEdit so it stays ONE undo step, but label/kind/precise commits each push their own step (intended); pre-existing tsc errors remain in src/components/planner/furniture.tsx ('op'/'emissive' props) + examples/ + skills/ (untouched legacy, dev runtime unaffected; next dev does not type-block); agent-browser loopback DNS is intermittently flaky in this sandbox.
- Next-round ideas (priority): layout diff history panel (checkpoint → checkpoint compare); community gallery OG thumbnails from DB rows via the /s renderer; drag-from-catalog ghost preview inside the plan minimap; per-zone BOM filter (CSV rows scoped to a zone); tour step targeting the zone editor; keyboard nudge for zones (arrow keys when a zone is selected in the editor).

---
Task ID: 13
Agent: Z.ai Code (main)
Task: Round 9 — status QA sweep (desktop+mobile) + v1.9 "evidence & precision": checkpoint compare diff panel, floor measure tool, per-zone BOM CSV, zone arrow-key nudge, dialog-scoped shortcuts

Work Log:
- Status assessment: v1.8 arrived stable. agent-browser sweep (desktop 1440×900 + mobile 390×844): load, plan↔3D swing, zone editor render, cost panel render, all 5 sections, 0px overflow, console clean (benign THREE warnings only). No shipped-feature bugs → new-feature round (v1.9). Note: dev server had died between sessions (port 3000 refused); restarted `bun run dev` in background — fine since.
- Checkpoint compare / layout diff (flagship feature):
  - NEW src/lib/planner/diff.ts: diffSnapshots(a, b) — items matched by uid (stable across checkpoints/undo) so moves are never double-counted as add+remove; grouped added/removed DiffLines by catalog id (qty delta + unit price), movedCount + maxMove (>5.1 cm eps), seatDelta, costDelta via computeCost totals (incl. install+contingency), roomChanged/areaDelta, zoneChanges matched by id (added/removed/renamed/moved with meters, resized with old→new dims).
  - NEW src/components/planner/HistoryDiffDialog.tsx: max-w-4xl dialog — two Selects (Base / Compare, each = any checkpoint or "Current layout (now)"; defaults newest-checkpoint→now; deleted-checkpoint fallback via derived state, no set-state-in-effect), side-by-side live PlanSVG renders in warmwhite frames (each side's own snapshot brand color + zones on) with caption dots (green=now), PlanChips (pieces/seats/floor/est.), DeltaChip row (+N pieces / seats / est. cost inverted semantics / m² floor / "N moved · up to X m"), emerald "added" + red "removed" grouped panels with $/ea., zones change list with kind badges, identical-layout dashed empty state, cost footnote. Entry: "Compare layouts side by side" button (GitCompareArrows) in SessionHistory popover, shown when ≥1 checkpoint; dialog mounted outside PopoverContent so it survives popover close.
  - E2E verified: pin "Before reshuffle" → add 2 café chairs + move 1 → dialog shows 32→34 pieces, +2 seats, +$288 est. cost, "1 moved · up to 1.2 m" (move clamp), "+2 Café Chair $120 ea."; side-by-side plans render both snapshots correctly; mobile 390 stacks plans vertically, 0px overflow.
- Floor measure tool (flagship feature):
  - store.ts: session-only measureMode/measureA/measureB + setMeasureMode(on) (arming clears points, disarms placement via armedId=null), stopMeasure(), setMeasurePoint() (click 1 → A, click 2 → B, click 3 restarts), clearMeasure(); arm(catalogId) now disables measureMode (mutual exclusion with placement). Not in partialize.
  - Scene.tsx: MeasureGizmo (drei Line ink 2px — dashed while previewing on hover, solid after B; flat ring+dot markers at A (ink) and B (emerald); drei Html charcoal pill label at midpoint: "3.83 m · 12′7″" (feetInches helper), data-testid=measure-label, confirmed dot turns green); ground pointermove sets hover point (2 cm threshold to limit re-renders); ground click (≤7 px) samples measure points; item pointerDown/context pass through to the floor while measuring (no stopPropagation, no grab cursor via new interactive prop, selection ring suppressed); Canvas gets cursor-crosshair while armed.
  - Toolbar: Ruler toggle button in the toggle family (active = charcoal-tinted), live 2-decimal readout inline when both points set (hidden below 2xl to keep one row), context-aware tooltip (click two points / re-measure / exit).
  - PlannerWorkspace: 'M' toggles measure; Escape exits measure (stopMeasure) alongside existing arm/select clears. Verified: arm → click near a chair (pass-through, selectedUid stays null) → click elsewhere → exact 3.83 m label; third click restarts; Esc exits.
- Per-zone BOM CSV (feature):
  - CostPanel refactor: csvEsc/slugify/triggerCsvDownload helpers; buildBomCsv(..., scope?) — scope adds "Zone bill of materials" title, Scope/Zone area/Zone seats header rows, omits budget+caps sections; downloadZoneBomCsv computes computeCost(itemsInZone) and downloads forma-bom-<project>-<zone>.csv.
  - zones.ts: NEW itemsInZone(zone, items, room) (center-in-clipped-rect, same rule as stats).
  - ZoneBreakdownCard rows: hover-reveal Download icon (h-6 w-6, focus-visible fallback, group/zone) per zone; empty zone → toast "That zone is empty"; success → "Zone BOM saved · 5 pieces from 'Espresso bar' exported as CSV" (verified in Radix viewport).
- Zone arrow-key nudge (feature): ZoneEditor window keydown while open+selected — arrows nudge 0.1 m (Shift 0.5 m), skips INPUT/TEXTAREA/SELECT targets, commits via updateZone (auto-coalesced history; one undo step per discrete press verified). Footer hint appears under the selected zone: "Arrow keys nudge the selected zone — hold ⇧ for 50 cm" (kbd chip). Verified ArrowUp moved Espresso bar z −3.3→−3.2 (up = north).
- Shortcut conflict fix: PlannerWorkspace global key handler now returns early while a [role=dialog] is open (zone editor/cost sheet/export/compare) EXCEPT Escape and Ctrl/Cmd+Z|Y — prevents arrows double-firing item+zone nudges and other item shortcuts leaking under modals, while keeping the zone editor's advertised Ctrl+Z undo working (verified undo inside the dialog).
- ShortcutsDialog: View group gains "M — Measure distances on the floor" and updated Esc copy; NEW "Zones" group (arrows nudge zone 10 cm, Shift+arrows 50 cm).
- Styling details: diff dialog in the blueprint language (framed paper plans, caption dots, tabular-nums chips, emerald/red wash panels); measure pill echoes the charcoal/HUD family with green confirm dot; hover-reveal per-zone download buttons keep the cost panel quiet; nudge hint uses kbd chip styling; toolbar readout hidden below 2xl.
- E2E regression pass after changes: fresh session → coach tour (fresh-session gate), plan↔3D swing, measure round-trip, zone editor (select/nudge/undo-in-dialog/Esc), compare dialog (desktop + mobile), per-zone CSV toast, 0px overflow both viewports, lint 0 errors. QA state restored (pristine café, 32 items, 0 checkpoints).

Stage Summary:
- v1.9: checkpoint→checkpoint (or ↔ now) layout diff with side-by-side plan renders + identity-matched change lists; floor measure tool with live m/ft-in readout; per-zone BOM CSV export; zone arrow-key nudge with hint; dialog-scoped global shortcuts fix.
- Files: src/lib/planner/{diff.ts (new), zones.ts, store.ts}; src/components/planner/{HistoryDiffDialog.tsx (new), SessionHistory.tsx, Scene.tsx, Toolbar.tsx, PlannerWorkspace.tsx, CostPanel.tsx, ZoneEditor.tsx, ShortcutsDialog.tsx}.
- Known nits/risks: diff matches zones by id — zone copies (duplicate flows) count as add+remove pairs (no zone cloning exists today); measure label uses drei Html (DOM overlay — not part of PNG/PDF exports by design); measure gizmo only visible while the tool is armed (points kept if toggled off, hidden until re-armed); dev server now started manually via nohup (`bun run dev` auto-runner had exited) — check port 3000 before QA.
- Next-round ideas (priority): item multi-select (shift-click) + group move/delete/align; drag-from-catalog ghost preview in the minimap; community gallery OG thumbnails from DB rows via the /s renderer; measure tool: angle + area mode (3+ points polygon), snap-to-wall/item edges; tour step for the compare + measure tools; export the diff report as a PDF appendix.
