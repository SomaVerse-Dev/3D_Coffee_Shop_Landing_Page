# 3D Coffee Shop Landing Page

A 3D coffee shop landing page built with Next.js, Tailwind CSS, and Prisma.

## Tech stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database:** [Prisma](https://www.prisma.io/) / PostgreSQL
- **Package manager:** [Bun](https://bun.sh/)
- **Language:** TypeScript

## Project structure

```
src/              # Application source code (components, pages, routes)
prisma/           # Prisma schema and migrations
public/           # Static assets (images, fonts, icons)
scripts/          # Utility and seed scripts
mini-services/    # Small internal services
db/               # Database-related files
tests/            # Test files
examples/         # Example data and fixtures
```

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) installed
- A PostgreSQL database (local or hosted)
- A `.env` file with your database connection string (copy from `.env.example` if provided)

### Install dependencies

```sh
bun install
```

### Set up the database

```sh
bunx prisma migrate dev
bunx prisma generate
```

### Run the dev server

```sh
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build for production

```sh
bun run build
```

### Lint

```sh
bun run lint
```

## License

This project is proprietary and all rights are reserved. See [LICENSE](./LICENSE) for details.

---

© SomaVerse-Dev. All rights reserved.