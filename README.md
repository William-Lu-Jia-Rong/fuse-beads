# Fuse Beads Analyzer

Next.js app that uploads fuse-bead pattern screenshots, calls OpenAI vision, and stores results. **Database: SQLite** (single `dev.db` file — no Docker or Postgres required for local use).

## Prerequisites

- Node.js 18+
- OpenAI API key (configured in the app **Settings** page)

## Setup

```bash
npm install
copy .env.example .env
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000. Configure your API key under **Settings** before analyzing images.

## Tech notes

- Prisma 7 uses `@prisma/adapter-better-sqlite3`; see `src/lib/prisma.ts`.
- `DATABASE_URL` must be a `file:` URL (see `.env.example`). `prisma.config.ts` supplies the URL for migrations.
- `postinstall` runs `prisma generate` for fresh installs.

## Privacy

API keys are stored only on the server (SQLite); the settings API returns a masked key only.
