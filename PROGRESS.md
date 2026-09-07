# Gauntlet — Development Progress

Last updated: 2026-09-07 19:20 IST

Requirements: [PRD.md](./PRD.md) v2.0

Current stage: Redesigned Phase 1 complete; Phases 2–7 pending

Deployment: Pending user-managed Vercel deployment in Phase 7

This file tracks the redesigned collaboration product. The earlier civic-reporting prototype remains in Git and its database records are preserved, but its phase labels do not describe the current product.

## Current result

| Area | State | Evidence and limits |
| --- | --- | --- |
| Product foundation | Complete | The active home, login, onboarding and workspace experience now describes community problems, nongovernment organisation ownership and student collaboration. |
| Authentication | Reused and connected | Supabase email/password signup, confirmation callback, cookie sessions and sign-out are connected to the new workspace. |
| Onboarding | Complete | Signed-in users can create/update a student, community-contributor or organisation-representative profile with skills, affiliation, availability and discovery consent. |
| Authority model | Complete for Phase 1 | A profile mode shapes UX only. Organisation authority requires an active stored membership; platform administration requires a server-managed platform role. Editable Auth user metadata grants no permissions. |
| Collaboration schema | Complete | Sixteen additive `collab_*` tables cover identity, organisations, problems, challenges, interests, teams, applications, milestones, contributions, awards, outcomes and audit activity. |
| Access controls | Complete for Phase 1 | RLS is enabled on all 16 collaboration tables. Only own-profile insert/update is enabled. Public and participant reads are separated; later mutations remain disabled until their transaction rules are implemented. |
| Legacy data | Preserved | The original two legacy profile rows and zero issue rows remained unchanged after migration. No civic row was converted into a collaboration record. |
| Source organisation | Complete | Collaboration code is grouped under `src/features/collaboration`, routes under `src/app/(collaboration)` and `src/app/api/collaboration`, architecture under `docs/architecture`, and schema changes under `supabase/migrations`. Legacy civic source and SQL are retained under `archive/legacy-civic` and excluded from the build. |
| Problem/challenge workflow | Pending Phase 2 | No submission, organisation onboarding or challenge publishing UI/API is claimed complete. |
| Student interest/profile discovery | Pending Phase 3 | Profile data exists; public directory and challenge interest actions are not implemented. |
| Teams/applications | Pending Phase 4 | Constraints are prepared in the schema; invitations, join requests and application transactions/UI are not implemented. |
| Project work | Pending Phase 5 | Milestone, contribution and outcome tables exist; selection/review workflow is not implemented. |
| Reputation/presentation | Pending Phase 6 | Award uniqueness is prepared; points, levels, portfolios and activity UX are not implemented. |
| Deployment/testing | Pending Phase 7 | Static checks and a rolled-back database policy test passed. Full browser acceptance and Vercel deployment remain later work. |

## Phase tracker

| Phase | Deliverable | State | Exit evidence |
| --- | --- | --- | --- |
| 1 — Foundation and migration design | Reuse map, new entities/access rules, navigation and onboarding | **Complete** | Additive live schema; RLS/grants checked; legacy counts unchanged; onboarding API/UI and role-aware workspace compile successfully. |
| 2 — Problem discovery and ownership | Public submissions, evidence, organisation onboarding and challenge publishing | Pending | Not started. |
| 3 — Student profiles and interest | Discovery consent, interest directory and permitted peer profiles | Pending | Not started. |
| 4 — Teams and applications | Invitations, join requests, applications, limits and deadlines | Pending | Not started. |
| 5 — Selection and project work | Owner decisions, milestones, contributions and revisions | Pending | Not started. |
| 6 — Reputation and presentation | Award ledger, levels, portfolios, activity and responsive polish | Pending | Not started. |
| 7 — Manual verification and deployment | Test accounts, full scenarios, fixes and Vercel evidence | Pending | User will handle deployment after development and testing. |

## Phase 1 implementation

### Database

Applied to Supabase project `riewkdcmcwqtimrgvity`:

1. `collaboration_foundation` created the additive core tables, indexes, timestamps, private membership helpers, grants and RLS policies.
2. `collaboration_foundation_completion` added private problem-contact data, server-managed platform roles, challenge outcomes, application roster snapshots and the remaining PRD fields.
3. `collaboration_foundation_advisor_fixes` covered foreign keys and consolidated read policies identified by the performance advisor.
4. `collaboration_public_columns` added optional public source URLs and restricted anonymous reads to intentionally public columns.

Prepared invariants:

- One interest per student/challenge.
- One active or invited team per user/challenge.
- One application per team/challenge.
- One selected team per challenge.
- Ordered minimum/maximum team sizes.
- A stored roster snapshot for submitted applications.
- One reputation award per recipient/challenge/milestone and contribution.
- Public problem content separated from private contact preferences.
- Published content separated from participant-only drafts.

### Application

- Replaced civic/government language on the active home and login routes.
- Added `/onboarding` with mode, identity, skills, availability and discovery controls.
- Added `/api/collaboration/profile` with same-origin validation, bounded input, authenticated identity derivation and RLS-backed upsert.
- Added `/workspace` with honest role-specific next states and no fictional challenges, partners, counts or impact.
- Moved the legacy civic route tree, components, libraries, tests and SQL under `archive/legacy-civic`, excluded it from the active build and retained `/dashboard` as a redirect to the new workspace.
- Updated confirmation and login redirects to `/workspace`.
- Added a feature-based collaboration folder and architecture/access document.

## Validation register

| Check | Result | Evidence / limit |
| --- | --- | --- |
| ESLint | PASS | `npm run lint` completed with no findings after Phase 1 changes. |
| TypeScript | PASS | `npm run typecheck` generated Next.js route types and completed `tsc --noEmit`. |
| Production build | PASS | `npm run build` compiled Next.js 16.3.4 and registered `/onboarding`, `/workspace` and `/api/collaboration/profile`. |
| Schema application | PASS | All four collaboration migrations returned success. |
| RLS coverage | PASS | 16 collaboration tables found; all 16 have RLS enabled. |
| Direct grants | PASS | Anonymous profile insert is false; authenticated own-profile insert is enabled; Phase 2 organisation writes remain disabled. |
| Authenticated profile policy | PASS | A transaction using an existing Auth session identity inserted/updated its own profile and returned `session_identity_used = true`; the transaction was rolled back. |
| Legacy preservation | PASS | Legacy row counts stayed at two profiles and zero issues before and after the additive migrations. |
| Supabase security advisor | REVIEWED | No collaboration schema/RLS finding. Project-level leaked-password protection remains disabled and can be enabled in Auth settings before production. |
| Supabase performance advisor | PASS for actionable Phase 1 findings | No missing-index or multiple-policy finding remains for collaboration tables. Empty new tables are naturally reported as having unused indexes. |
| Browser acceptance | NOT RUN | Reserved for the later testing phase, as requested. |

## Files added or changed in Phase 1

- `src/features/collaboration/{types.ts,constants.ts}`
- `src/features/collaboration/components/{app-header.tsx,onboarding-form.tsx}`
- `src/features/collaboration/server/{account.ts,actions.ts}`
- `src/app/(collaboration)/{onboarding,workspace}/page.tsx`
- `src/app/api/collaboration/profile/route.ts`
- `src/app/{page.tsx,layout.tsx,globals.css}`
- `src/app/login/{page.tsx,auth-form.tsx}`
- `src/app/auth/callback/route.ts`
- `src/app/dashboard/layout.tsx`
- `src/types/database.ts`
- `docs/architecture/collaboration-foundation.md`
- `supabase/migrations/*_collaboration_*.sql`
- `archive/legacy-civic/` (preserved inactive prototype source and SQL)

## Next development step

Phase 2 begins with public problem submission and discovery, then organisation onboarding, membership establishment and accountable challenge publishing. No Phase 2 code was added in this work batch.

## Change log

### V2-001 — 2026-09-07 — Complete redesigned Phase 1

- **Change:** Implemented the additive collaboration schema, access model, new landing/login content, profile onboarding and role-aware workspace foundation.
- **Reason:** Replace the earlier government-facing complaint workflow with the approved societal problem and nongovernment collaboration model.
- **Safety:** Preserved all legacy records, isolated new tables with a `collab_` prefix, enabled RLS everywhere and withheld later-phase mutation grants.
- **Validation:** Lint, typecheck, production build, live schema inspection, advisor review and a rolled-back authenticated RLS write check passed within the limits recorded above.
- **Remaining:** Phases 2–7.
