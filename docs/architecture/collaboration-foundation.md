# Collaboration foundation

This document records the Phase 1 migration and access design for the Gauntlet PRD v2.0.

## Reuse map

Reused from the original prototype:

- Next.js App Router, TypeScript and Tailwind setup.
- Supabase browser/server clients, cookie session refresh and email/password authentication.
- Existing visual tokens and responsive foundations.
- Private-storage approach for later evidence uploads.

Archived outside the active application under `archive/legacy-civic`:

- Civic reports, mandatory coordinates, maps, department routing and repair verification.
- Recurrence scoring, historical RAG and issue forecasting.
- Citizen, officer and solver role assumptions.

The old source, SQL and database records remain available. They are excluded from the active TypeScript build and are not converted into collaboration challenges because their meaning and consent are different. `/dashboard` redirects to the new workspace.

## Source layout

```text
src/
  app/
    (collaboration)/       authenticated collaboration routes
    api/collaboration/     authenticated collaboration mutations
  features/collaboration/
    components/            feature UI
    server/                server-only account and session operations
    constants.ts           shared controlled values
    types.ts               feature types
supabase/migrations/        additive database migrations
```

## Identity and authority

The onboarding `primary_mode` chooses the starting experience. It does not grant authority. Any authenticated member can later contribute a public problem. Organisation permissions come only from an active `collab_organization_memberships` record. Platform administration comes only from a server-managed `collab_platform_roles` record. Neither is read from editable user metadata.

## Entity map

| Area | Tables |
| --- | --- |
| Identity | `collab_profiles`, `collab_platform_roles` |
| Ownership | `collab_organizations`, `collab_organization_memberships` |
| Discovery | `collab_problems`, `collab_problem_contacts`, `collab_challenges` |
| Participation | `collab_interests`, `collab_teams`, `collab_team_members`, `collab_applications` |
| Project work | `collab_milestones`, `collab_contributions`, `collab_outcomes` |
| Recognition and audit | `collab_reputation_awards`, `collab_activity` |

## Access matrix for Phase 1

| Data | Visitor | Signed-in member | Organisation owner | Platform admin |
| --- | --- | --- | --- | --- |
| Discoverable profiles | Read | Read; manage own profile | Same | Same |
| Published problems/challenges | Read | Read | Read | Read |
| Draft challenge | No | No | Read for own organisation | Future moderation API |
| Private problem contact | No | Author only | Linked challenge owner | Read |
| Team/application/contribution draft | No | Involved team only | Owning challenge only | Future audited moderation API |
| Accepted contribution/published outcome | Read | Read | Read | Read |
| Reputation award | Read only for discoverable profile | Own or discoverable profile | Same | Same |

Only profile insert/update is granted in Phase 1. Later workflows receive narrowly scoped transaction functions or authenticated route handlers in their own phases.

## Database invariants prepared for later phases

- One interest per student and challenge.
- One active team membership per user and challenge.
- One application per team and challenge.
- One selected application per challenge.
- Ordered team-size limits.
- Frozen application roster field.
- One reputation award per recipient, challenge and milestone.
- Private contact data stored separately from public problem content.
- RLS enabled on every new exposed table.
