# FORMA — 3D Commercial Space Planner

> **Plan, price, prove — before the lease is signed.**

A working, drag-and-drop 3D commercial space planner for cafés, co-working spaces, small offices, and boutique retail. Draw a room, place furniture, switch between plan and 3D, and watch **seats, fire-egress, and fit-out cost** update live. Export a print-ready layout sheet in one click.

https://github.com/SomaVerse-Dev/3D_Coffee_Shop_Landing_Page

---

## Badges

[![GitHub repo size](https://img.shields.io/github/repo-size/SomaVerse-Dev/3D_Coffee_Shop_Landing_Page?color=charcoal)](https://github.com/SomaVerse-Dev/3D_Coffee_Shop_Landing_Page)
[![GitHub last commit](https://img.shields.io/github/last-commit/SomaVerse-Dev/3D_Coffee_Shop_Landing_Page?color=charcoal)](https://github.com/SomaVerse-Dev/3D_Coffee_Shop_Landing_Page/commits/main)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-charcoal.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-charcoal?logo=nextdotjs)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-charcoal?logo=react)](https://react.dev/)
[![React Three Fiber](https://img.shields.io/badge/R3F-Three.js-charcoal?logo=three.js)](https://docs.pmnd.rs/react-three-fiber/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-charcoal?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-charcoal)](https://www.prisma.io/)
[![Bun](https://img.shields.io/badge/Bun-package%20manager-charcoal?logo=bun)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-charcoal?logo=typescript)](https://www.typescriptlang.org/)

---

## Table of contents

1. [About FORMA](#about-forma)
2. [Key features](#key-features)
3. [Demo & screenshots](#demo--screenshots)
4. [Tech stack](#tech-stack)
5. [Architecture overview](#architecture-overview)
6. [Quick start](#quick-start)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [Database setup](#database-setup)
   - [Run the dev server](#run-the-dev-server)
   - [Build for production](#build-for-production)
   - [Run in production](#run-in-production)
7. [Configuration](#configuration)
8. [Project structure](#project-structure)
9. [Core modules](#core-modules)
10. [API routes](#api-routes)
11. [Database schema](#database-schema)
12. [Keyboard shortcuts](#keyboard-shortcuts)
13. [Theming & brand](#theming--brand)
14. [Deployment](#deployment)
   - [Docker](#docker)
   - [Standalone Next.js output](#standalone-nextjs-output)
   - [Caddy reverse proxy](#caddy-reverse-proxy)
   - [Environment checklist for production](#environment-checklist-for-production)
15. [Testing](#testing)
16. [Code quality](#code-quality)
17. [Contributing](#contributing)
18. [Code of conduct](#code-of-conduct)
19. [Security policy](#security-policy)
20. [Support](#support)
21. [Roadmap](#roadmap)
22. [Changelog](#changelog)
23. [License](#license)
24. [Acknowledgments](#acknowledgments)

---

## About FORMA

FORMA is a practical space planner for small commercial interiors. It targets the moment before a lease is signed: you need to know whether your concept actually fits, how many covers it seats, whether fire egress works, and what the fit-out will cost — without hiring an architect for every iteration.

**Who it's for**

- Café and coffee-shop owners testing layouts
- Co-working operators planning desks and meeting pods
- Boutique retail fixtures planning
- Small-office space planners
- Designers and fit-out contractors producing early concept sheets

**Core value**

- **Drag-and-drop canvas** — place counters, tables, chairs, and fixtures directly on the floor plan
- **Plan ↔ 3D toggle** — work top-down, then step into a three.js walkthrough
- **Live capacity math** — seat counts and covers update as you move pieces
- **Fire-egress checks** — exit paths and travel distances validated live
- **Fit-out cost estimates** — budget figures refresh with every change
- **Templates & saved layouts** — start from a template, save snapshots with branding
- **Print-ready export** — one-click PDF layout sheet

---

## Key features

| Dimension | Capability |
|---|---|
| **Canvas** | Infinite scroll, zoom, pan, grid snap, object rotation (`R`), duplicate (`D`), delete (`Del`), re-frame (`F`) |
| **3D mode** | React Three Fiber walkthrough with orbit controls, lighting, and materials |
| **Furniture catalog** | 30+ pieces (counters, tables, chairs, sofas, shelving, POS, espresso machines) |
| **Templates** | Pre-built café, office, and boutique starter layouts |
| **Saved layouts** | Persist named snapshots (room + items + brand color) via Prisma/SQLite |
| **Capacity** | Live seat / cover counting per zone |
| **Egress** | Fire-exit travel-distance validation |
| **Cost** | Live fit-out budget estimate |
| **Theming** | Light/dark mode, custom brand color, system preference support |
| **Shortcuts** | Full keyboard command palette (`?` for all shortcuts) |
| **Context menu** | Right-click quick actions on any piece |
| **Tour** | Guided coach tour for first-time users |
| **Export** | PDF layout sheet export (jsPDF) |
| **Accessibility** | ARIA labels, keyboard navigation, reduced-motion aware, focus management |
| **i18n-ready** | next-intl configured for future localization |
| **Auth-ready** | NextAuth providers scaffolded |
| **Search/filter** | TanStack Table + Query for catalog and layout lists |

---

## Demo & screenshots

The landing page ships with an embedded workspace so you can try it immediately at `http://localhost:3000`.

- **Hero / Studio** — `src/app/page.tsx` — hero copy plus the embedded `PlannerWorkspace`
- **Template gallery** — starter café / office / retail layouts
- **Capacity guide** — live seat and cover math
- **Community gallery** — saved community floorplans
- **Brand strip** — brand-color theming preview

Add your own screenshots under `public/screenshots/` and reference them here:

```markdown
![Plan view](./public/screenshots/plan.png)
![3D walkthrough](./public/screenshots/three-dee.png)
![Export sheet](./public/screenshots/export.pdf)
```

---

## Tech stack

| Layer | Technology | Version | Role |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.1.1 | Pages, routes, SSR, standalone output |
| UI language | TypeScript | 5 | Type safety |
| Styling | Tailwind CSS | v4 | Utility-first design system |
| UI primitives | shadcn/ui + Radix UI | — | Accessible component primitives |
| Animations | Framer Motion | 12.23.2 | Transitions, gestures, layout animations |
| 3D engine | three.js + React Three Fiber + Drei | 0.186 / 9.8 / 10.7 | 3D scene, orbit controls, helpers |
| Forms | React Hook Form + Hookform Resolvers + Zod | 7.60 / 5.1 / 4.0 | Form state + schema validation |
| Data server state | TanStack Query | 5.82 | Caching, synchronization |
| Data tables | TanStack Table | 8.21 | Catalog & layout tables |
| Date utils | date-fns | 4.1 | Date formatting |
| Icons | Lucide React | 0.525 | Iconography |
| Notifications | Sonner | 2.0.6 | Toast notifications |
| PDF export | jsPDF | 4.2.1 | Print-ready layout sheets |
| Database ORM | Prisma | 6.11 | Data modeling, migrations, client |
| Database | SQLite | — | File-backed dev database |
| Auth | NextAuth.js | 4.24 | Authentication (scaffolded) |
| i18n | next-intl | 4.3.4 | Internationalization (ready) |
| Package manager | Bun | — | Install, run, build |
| Lint | ESLint | 9 | Code quality |
| Reverse proxy | Caddy | — | Production edge proxy (Caddyfile) |

---

## Architecture overview

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout, fonts, metadata, ThemeProvider
│   ├── page.tsx            # Landing page + embedded PlannerWorkspace
│   ├── globals.css         # Design tokens, CSS variables
│   ├── api/
│   │   ├── route.ts        # Health / hello endpoint
│   │   └── layouts/
│   │       ├── route.ts    # List / create saved layouts
│   │       └── [id]/route.ts # Get / update / delete a layout
│   └── s/[code]/           # Shareable short-link routes (+ OpenGraph image)
├── components/
│   ├── planner/            # Domain feature: space-planning studio
│   │   ├── PlannerWorkspace.tsx   # Top-level studio container
│   │   ├── Scene.tsx              # Three.js 3D scene
│   │   ├── PlanSVG.tsx            # 2D SVG floor plan
│   │   ├── CatalogSidebar.tsx     # Furniture catalog browser
│   │   ├── CapacityMeter.tsx      # Live seat/cover counter
│   │   ├── CostPanel.tsx          # Fit-out cost estimate
│   │   ├── ViewControls.tsx       # Zoom / pan / view toggles
│   │   ├── ViewportHud.tsx        # On-screen HUD readouts
│   │   ├── ZoneEditor.tsx         # Zone / capacity painting
│   │   ├── ExportModal.tsx        # PDF export dialog
│   │   ├── LayoutsMenu.tsx        # Saved layouts menu
│   │   ├── SessionHistory.tsx     # Undo/redo history
│   │   ├── CoachTour.tsx          # Guided onboarding tour
│   │   ├── ShortcutsDialog.tsx    # Keyboard shortcut reference
│   │   ├── ItemContextMenu.tsx    # Right-click quick actions
│   │   ├── HistoryDiffDialog.tsx  # History diff view
│   │   ├── Toolbar.tsx            # Main studio toolbar
│   │   ├── furniture.tsx          # Furniture geometry & catalog data
│   │   ├── galleryImages.ts       # Gallery image constants
│   │   └── sections.tsx           # Landing-page sections (gallery, capacity, brand)
│   └── ui/                 # shadcn/ui primitives (button, dialog, table, etc.)
├── hooks/
│   ├── use-mobile.ts       # Responsive breakpoint hook
│   └── use-toast.ts        # Toast wrapper
├── lib/
│   ├── db.ts               # Singleton PrismaClient (dev hot-reload safe)
│   ├── utils.ts            # cn() class-variance helper
│   └── planner/            # Planner domain logic
│       ├── store.ts        # Zustand state (canvas, items, selection)
│       ├── catalog.ts      # Furniture catalog definition
│       ├── templates.ts    # Starter layout templates
│       ├── capacity.ts     # Seat / cover calculation
│       ├── egress.ts       # Fire-egress validation
│       ├── cost.ts         # Fit-out cost estimation
│       ├── zones.ts        # Zone management
│       ├── events.ts       # Canvas event bus
│       ├── diff.ts         # History diffing
│       ├── share.ts        # Shareable link generation
│       ├── thumbnail.ts    # Layout thumbnail generation
│       ├── brandNames.ts   # Brand name utilities
│       └── types.ts        # TypeScript domain types
└── hooks/
```

### Data flow

1. **Canvas state** lives in a Zustand store (`src/lib/planner/store.ts`): room dimensions, placed items, selection, history stack.
2. **User actions** (drag, rotate, duplicate, delete) dispatch through an event bus (`events.ts`) and produce immutable history entries (`diff.ts`).
3. **Derived read models** — capacity, egress, cost — recompute from the current item set on every change.
4. **Render layer** — `PlanSVG.tsx` (2D) and `Scene.tsx` (3D) both read from the same store, so plan and 3D stay in sync.
5. **Persistence** — `SavedLayout` records are written/read through Prisma (`db.ts`) and exposed via `/api/layouts/*`.

---

## Quick start

### Prerequisites

- [Bun](https://bun.sh/) (package manager & runtime)
- Node.js 18+ (optional, for `npx` fallback)
- A database file path (SQLite by default) — writable directory required

### Installation

```bash
# Clone the repo
git clone https://github.com/SomaVerse-Dev/3D_Coffee_Shop_Landing_Page.git
cd 3D_Coffee_Shop_Landing_Page

# Install dependencies
bun install
```

### Database setup

FORMA uses Prisma with SQLite. The schema lives in `prisma/schema.prisma`.

```bash
# Generate the Prisma client
bunx prisma generate

# Push the schema to the SQLite database (creates / updates tables)
bun run db:push

# (Optional) Run migrations instead of push
bun run db:migrate

# (Optional) Reset the database
bun run db:reset
```

> The default `DATABASE_URL` in `.env` is `file:./db/dev.db`. Point it at your own writable SQLite file or a hosted Postgres connection string by changing `provider` and `url` in `prisma/schema.prisma`.

### Run the dev server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

Dev logs stream to `dev.log` (script tees output).

### Build for production

```bash
bun run build
```

The build uses Next.js `output: "standalone"` and copies `.next/static` and `public` into `.next/standalone/` so the output folder is self-contained.

### Run in production

```bash
# Build first
bun run build

# Start the standalone server
bun run start
```

The server listens on port 3000 by default (configurable via `PORT`).

---

## Configuration

Create a `.env` in the project root (copy from `.env.example` if present).

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:./db/dev.db` | Prisma datasource URL (SQLite file path or Postgres connection string) |
| `PORT` | `3000` | Dev/production server port |
| `NEXTAUTH_SECRET` | — | NextAuth session secret (required for auth) |
| `NEXTAUTH_URL` | `http://localhost:3000` | NextAuth callback base URL |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app URL (used for share links & OpenGraph) |

Example `.env`:

```env
DATABASE_URL=file:./db/dev.db
PORT=3000
NEXTAUTH_SECRET=replace-with-a-random-32-char-string
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate a strong secret:

```bash
bun run -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Core modules

### Planner store (`src/lib/planner/store.ts`)

Zustand store holding:
- `room` — room dimensions and wall layout
- `items` — array of placed furniture instances
- `selectedId` — currently selected item
- `history` — undo/redo stack
- `viewMode` — `"plan" \| "3d"`
- `brandColor` — active brand accent color

Actions: `addItem`, `moveItem`, `rotateItem`, `duplicateItem`, `removeItem`, `setRoom`, `undo`, `redo`, `setViewMode`, `setBrandColor`.

### Capacity (`src/lib/planner/capacity.ts`)

Computes seat counts and cover estimates from placed tables/chairs and zone definitions. Reactive — recomputes on every store change.

### Egress (`src/lib/planner/egress.ts`)

Validates fire-exit travel distance from each occupied point to the nearest exit. Flags violations in the HUD and capacity meter.

### Cost (`src/lib/planner/cost.ts`)

Fit-out cost estimate based on square footage, fixture categories, and finishes. Updates live as items are added/removed.

### Catalog (`src/lib/planner/catalog.ts`)

Furniture library: name, category, dimensions (plan + 3D), unit cost, default count, thumbnail.

### Templates (`src/lib/planner/templates.ts`)

Starter layouts: café, co-working, boutique, small office. Each is a pre-populated `items` array + room definition.

### Share (`src/lib/planner/share.ts`)

Generates short, shareable layout codes (`/s/[code]`) and OpenGraph images for saved layouts.

### Theme (`src/components/theme-provider.tsx`, `theme-toggle.tsx`)

`next-themes` provider with class-based dark mode (`darkMode: "class"` in Tailwind). Supports light / dark / system.

---

## API routes

| Route | Method | Description |
|---|---|---|
| `/api` | GET | Health check (`{ message: "Hello, world!" }`) |
| `/api/layouts` | GET | List saved layouts |
| `/api/layouts` | POST | Create a new saved layout |
| `/api/layouts/[id]` | GET | Get a single layout by ID |
| `/api/layouts/[id]` | PATCH | Update a layout |
| `/api/layouts/[id]` | DELETE | Delete a layout |
| `/s/[code]` | GET | Resolve a shareable short-link to a layout page |

All layout endpoints return JSON and require a valid Prisma `SavedLayout` record.

---

## Database schema

Defined in `prisma/schema.prisma` (SQLite provider).

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model SavedLayout {
  id         String   @id @default(cuid())
  name       String
  data       String   // JSON blob: { room, items, brandColor, projectName, templateId }
  thumb      String?  // PNG data-URL preview
  brandColor String   @default("#C05B2E")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([updatedAt])
}
```

Apply schema changes:

```bash
bun run db:push      # develop: push schema to SQLite
bun run db:migrate   # create and apply migration
bun run db:generate  # regenerate Prisma client
bun run db:reset     # reset and reseed database
```

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `R` | Rotate selected piece |
| `D` | Duplicate selected piece |
| `Del` / `Backspace` | Remove selected piece |
| `F` | Re-frame canvas to selection |
| `?` | Open all-shortcuts dialog |
| Right-click | Open context menu with quick actions |

Open the full reference from the toolbar's **Help** menu or press `?` inside the studio.

---

## Theming & brand

FORMA supports a customizable brand color and light/dark appearance.

- **Brand color** — set in the studio; stored per `SavedLayout` as `brandColor` (default `#C05B2E`).
- **Appearance** — light / dark / system via `ThemeProvider` (`next-themes`, class strategy).
- **Design tokens** — CSS variables in `src/app/globals.css` for `--background`, `--foreground`, `--primary`, `--card`, `--radius`, etc.

---

## Deployment

### Docker

A minimal production Dockerfile:

```dockerfile
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["bun", ".next/standalone/server.js"]
```

Build & run:

```bash
docker build -t forma-planner .
docker run -p 3000:3000 -e DATABASE_URL=file:/data/dev.db -v forma-data:/data forma-planner
```

### Standalone Next.js output

`next.config.ts` sets `output: "standalone"`. The build script copies `.next/static` and `public` into `.next/standalone/`, so `.next/standalone/server.js` is self-contained and can run with just `bun .next/standalone/server.js`.

### Caddy reverse proxy

`Caddyfile` (serves on port 81, proxies to localhost:3000):

```
:81 {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
}
```

Run: `caddy run` (or `caddy reload` after config changes).

### Environment checklist for production

- [ ] `DATABASE_URL` points to a persistent, backed-up database file or Postgres instance
- [ ] `NEXTAUTH_SECRET` is set to a strong random value (if using auth)
- [ ] `NEXTAUTH_URL` matches your public HTTPS origin
- [ ] `NEXT_PUBLIC_APP_URL` matches your public HTTPS origin
- [ ] `NODE_ENV=production`
- [ ] `NEXT_TELEMETRY_DISABLED=1`
- [ ] Port 3000 (or `PORT`) is reachable by your reverse proxy
- [ ] Database directory is writable and volume-mounted if using Docker

---

## Testing

Add tests under `tests/` or colocated with source. Recommended stack: Vitest + React Testing Library + Playwright.

```bash
# Run lint
bun run lint

# (Add) Run tests
# bun run test
```

There is no test runner configured yet — add one as the project grows. Suggested coverage targets: 80%+ on planner domain logic (`capacity`, `egress`, `cost`, `store`).

---

## Code quality

```bash
# Lint the whole project
bun run lint

# Type-check (build skips type errors by design; run tsc explicitly for strict checking)
bunx tsc --noEmit
```

ESLint config: `eslint.config.mjs` (ESLint 9 flat config, `eslint-config-next`).

Formatting: Prettier-compatible via Tailwind class sorting (`tailwind-merge`, `clsx`).

---

## Contributing

We welcome contributions. Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your change with tests
4. Run `bun run lint` and confirm it passes
5. Commit with a conventional message (`feat:`, `fix:`, `docs:`, `chore:`)
6. Push and open a pull request

Pull requests are reviewed against the AGPL-3.0 license — all contributed code must be compatible with AGPL-3.0 (strong copyleft).

---

## Code of conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to its terms.

---

## Security policy

### Supported versions

| Version | Supported |
|---|---|
| `main` | ✅ |
| Older | ❌ |

### Reporting a vulnerability

Please do **not** open public issues for security vulnerabilities. Email the maintainer or use GitHub's private vulnerability reporting. We will acknowledge receipt within 72 hours and provide a remediation timeline.

---

## Support

- **Issues:** https://github.com/SomaVerse-Dev/3D_Coffee_Shop_Landing_Page/issues
- **Discussions:** https://github.com/SomaVerse-Dev/3D_Coffee_Shop_Landing_Page/discussions
- **Documentation:** this README + inline code comments

---

## Roadmap

- [ ] PostgreSQL production provider support
- [ ] User accounts & team workspaces (NextAuth)
- [ ] Layout commenting & collaboration
- [ ] IFC / DXF import & export
- [ ] AR walkthrough (mobile)
- [ ] Print-quality blueprint export (SVG/PDF)
- [ ] Multi-language (next-intl) translations
- [ ] Public template marketplace

---

## Changelog

### Unreleased
- Initial public release of FORMA 3D Commercial Space Planner
- AGPL-3.0 license applied
- README expanded to full specification

See `worklog.md` for internal development notes.

---

## License

**GNU Affero General Public License v3.0 (AGPL-3.0)** — see [LICENSE](./LICENSE).

This is **free and open-source software** under a strong copyleft license:

- You may freely use, copy, modify, and distribute the software.
- Any modified or derivative work must also be licensed under AGPL-3.0.
- If you run a modified version on a server and users interact with it over a network, you must make the corresponding source available to those users at no charge.
- Commercial use is permitted, but derived works remain copyleft.

This license is deliberately the most right-preserving OSI-approved open-source license available — it maximizes freedom for end users and community contributors while preventing proprietary enclosure.

© 2025–2026 FORMA Studio / SomaVerse-Dev.

---

## Acknowledgments

- [Next.js](https://nextjs.org/) — App Router & standalone output
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) & [three.js](https://threejs.org/) — 3D engine
- [Tailwind CSS](https://tailwindcss.com/) — design system
- [shadcn/ui](https://ui.shadcn.com/) & [Radix UI](https://www.radix-ui.com/) — accessible primitives
- [Prisma](https://www.prisma.io/) — data layer
- [TanStack Query / Table](https://tanstack.com/) — server state & tables
- [Framer Motion](https://www.framer.com/motion/) — animation
- [Lucide](https://lucide.dev/) — icons
- [Sonner](https://sonner.emilkowal.ski/) — toasts
- [jsPDF](https://github.com/MrRio/jsPDF) — PDF export
- [Bun](https://bun.sh/) — runtime & package manager

---

> FORMA — plan, price, prove — before the lease is signed.
