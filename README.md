# Gauntlet

Gauntlet connects community-reported societal problems with universities, NGOs, startups and industry partners that can own clear challenges. Students discover the work, form teams, contribute and build a record of reviewed outcomes.

## Current stage

The collaboration backend for Phases 1–6 is complete: authentication and profiles, problem publishing, organisation adoption, challenge management, student interest, team formation, applications, reviewed contributions, reputation awards, outcomes, evidence access and platform administration. The remaining product work is the frontend for these workflows and manual deployment in Phase 7.

The previous civic-reporting prototype is retained under `archive/legacy-civic` and excluded from the active build. Its database data is preserved separately from the new `collab_*` tables.

## Project structure

```text
src/app/                     routes and authenticated API handlers
src/features/collaboration/  collaboration UI, constants, types and server code
src/lib/supabase/            browser/server Supabase clients and session refresh
src/types/database.ts        generated types from the connected Supabase project
supabase/migrations/         additive collaboration migrations
docs/architecture/           access and migration decisions
archive/legacy-civic/        inactive previous prototype source and SQL
```

## Local development

Use Node.js 24 and npm.

```sh
npm ci
npm run check:env
npm run dev
```

Open `http://127.0.0.1:3000`. Copy `.env.example` to `.env.local` if local environment values have not already been configured. Do not overwrite or commit an existing `.env.local`.

## Validation commands

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

## Active routes

- `/` — collaboration product introduction.
- `/login` — Supabase sign in and account creation.
- `/onboarding` — authenticated collaboration profile setup.
- `/workspace` — authenticated role-aware starting point.
- `/api/collaboration/*` — public discovery plus session-authorized collaboration workflows documented below.
- `GET /api/health` — application liveness only.

## Documents

- [PRD.md](./PRD.md) — product requirements and seven implementation phases.
- [PROGRESS.md](./PROGRESS.md) — evidence-based implementation state.
- [docs/architecture/collaboration-foundation.md](./docs/architecture/collaboration-foundation.md) — Phase 1 reuse, schema and access decisions.
- [docs/backend-api.md](./docs/backend-api.md) — collaboration endpoints, commands and database guarantees.
