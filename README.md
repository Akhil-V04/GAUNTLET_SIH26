# Gauntlet

A civic reporting and verified-resolution website for Team Gauntlet's SIH prototype.

## Current stage

Phases 1–2: the Next.js foundation, responsive introductory page, shared issue categories, backend endpoints, Supabase schema, private evidence bucket, authentication, and citizen/officer/solver role-aware workspace are implemented. Reporting and AI processing are subsequent phases. The landing-page workflow is labelled as a preview and contains no fabricated live records.

## Local development

Use Node.js 24 LTS and npm. Install from the lockfile with `npm ci`.

Copy `.env.example` to `.env.local` and configure the real project values securely. A local environment may already have been configured by the setup agent; do not overwrite it blindly.

```sh
npm run dev
```

Open http://localhost:3000. The app shell runs without an AI key. Future AI features need separately configured API access.

```sh
npm run check:env
npm run lint
npm run typecheck
npm run build
npm start
```

`check:env` prints only presence/missing indicators and exits nonzero when required integration variables are missing. It does not verify credentials.

## Foundation endpoints

- `GET /api/health`: app liveness only, never database/AI readiness.
- `GET /api/categories`: the eleven supported category groups.

## Deployment preparation

Vercel framework: Next.js. Node.js: 24.x. Build command: `npm run build`. Output: default Next.js output. Set environment variables from `.env.example` in Vercel; change `APP_URL` to the deployed URL. Configure Supabase authentication redirects during the authentication phase.

No extra server, container, or custom Vercel configuration is needed for the scaffold. The existing CLI login needs renewal before deployment. Do not commit `.env.local` or `.vercel`.

## Project documents

- [PRD.md](./PRD.md): requirements and acceptance checks.
- [PROGRESS.md](./PROGRESS.md): update after every change, including validations and blockers.

The user will provide the external real dataset later. Development must not depend on its arrival. Future imports must preserve source provenance and distinguish imported history, labelled demo data, and live submissions.
