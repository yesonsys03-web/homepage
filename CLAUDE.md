# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VibeCoder Playground — a Korean vibe-coding community site. Full-stack app with a React frontend and a FastAPI backend.

## Commands

### Frontend (pnpm)

```bash
pnpm dev              # Vite dev server
pnpm build            # tsc -b && vite build
pnpm lint             # ESLint
pnpm test             # vitest run (all tests)
pnpm vitest run src/path/to/file.test.tsx   # single test file
pnpm vitest run -t "test name"              # single test by name
```

### Backend (uv, inside `server/`)

```bash
pnpm dev:backend      # cd server && uv run uvicorn main:app --reload --port 8000
uv sync --frozen      # install deps from lockfile
uv run pytest         # run all backend tests
uv run pytest server/tests/test_translate_api.py   # single test file
uv run ruff check .   # lint
uv run basedpyright   # type check
```

## Architecture

### Frontend (`src/`)

**Entry**: `src/main.tsx` → `src/App.tsx`

`App.tsx` is the routing hub. It uses React Router v7 with all screens lazy-loaded via `React.lazy`. Route parsing is handled by a manual `parseRoute()` function that maps URL patterns to a `Screen` union type. Navigation is prop-drilled as `onNavigate(screen)` callbacks into each screen component.

**Auth flow**: `AuthProvider` (`src/lib/auth-context.tsx`) stores JWT in `localStorage` under the key `vibecoder_token`. On mount it calls `api.getMe()` to validate and refresh user state. The context is split into: `auth-store.ts` (the React context object), `auth-context.tsx` (the provider), `use-auth.ts` (the consumer hook), and `auth-types.ts` (the `User` type).

**API layer**: `src/lib/api.ts` exports a single `api` object. Base URL comes from `VITE_API_BASE` env var (defaults to `http://localhost:8000`). Throws `ApiRequestError` on non-2xx responses.

**Admin section**: `src/components/screens/admin/` contains its own `AdminLayout` with nested routes under `/admin/*`. Admin access is gated by `isAdminRole()` from `src/lib/roles.ts`.

**Key lib files**:
- `src/lib/query-client.ts` — shared TanStack Query client (`appQueryClient`)
- `src/lib/roles.ts` — role checks (`isAdminRole`)
- `src/lib/glossary-text.ts` / `glossary-navigation.ts` — glossary feature utilities

**Path alias**: `@` resolves to `src/`.

**UI components**: shadcn/ui components live in `src/components/ui/`. Styling uses TailwindCSS v4 (via `@tailwindcss/vite` plugin). Design palette: background `#0B1020`, accent `#23D5AB`, secondary `#161F42`, text `#B8C3E6`.

### Backend (`server/`)

**Entry**: `server/main.py` — single FastAPI app with all routes. Python 3.12+, managed with `uv`.

**Database**: PostgreSQL via `psycopg2` with a connection pool. All DB logic is in `server/db.py`. The app calls `init_db()` on startup via an `asynccontextmanager` lifespan.

**Auth**: Bearer token auth via `OAuth2PasswordBearer`. Supports local accounts and Google OAuth. Token exchange for Google OAuth happens via the `/auth/google/exchange` endpoint.

**Env**: `server/.env` (not committed). Required vars include database connection string and Google OAuth credentials. `VITE_API_BASE` in the frontend `.env` points to the backend.

### Testing

Tests use Vitest + `@testing-library/react` + jsdom. Setup file: `src/test/setup.ts` (polyfills `localStorage`, imports `@testing-library/jest-dom/vitest`).

Test files are co-located with source: `*.test.tsx` or `*.smoke.test.tsx` alongside the component they test.

## Git conventions

- Branch naming: `feature/<scope>`
- Commit format: `type(scope): why` (e.g. `feat(comment): add report flow`)
- Update `docs/IMPLEMENTATION_LEARNING_LOG.md` on the same day as significant changes
