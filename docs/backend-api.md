# Gauntlet collaboration backend

The backend uses Supabase Auth cookies, Next.js Route Handlers, RLS and database transactions. Browser code never supplies an acting user, reviewer, owner or point total. Those values come from the authenticated session and stored memberships.

## Read endpoints

| Method and path | Access | Result |
| --- | --- | --- |
| `GET /api/collaboration/explore?q=&domain=` | Public | Published problems, visible challenges and organisations |
| `GET /api/collaboration/problems/:id` | Public; author receives private fields | Original problem and linked challenge |
| `GET /api/collaboration/challenges/:id` | Public plus RLS-filtered participant data | Brief, owner, milestones, interest directory, permitted teams/applications/contributions and outcome |
| `GET /api/collaboration/organizations/:id` | Public plus owner data | Organisation, challenges and RLS-filtered review queues |
| `GET /api/collaboration/profiles/:id` | Public when discoverable | Profile, accepted contributions, points and level |
| `GET /api/collaboration/teams/:id` | Team relationship or challenge owner | Roster, application, milestones and contributions |
| `GET /api/collaboration/workspace` | Authenticated | Current profile, memberships, interests, teams, contributions, awards and activity |
| `GET /api/collaboration/admin` | Platform administrator | Organisation verification queue and memberships |
| `GET /api/collaboration/evidence?path=` | Uploader or adopted-challenge owner | Five-minute signed private-storage URL |

## Workflow command endpoint

`POST /api/collaboration/command`

```json
{
  "command": "set_interest",
  "payload": { "challenge_id": "uuid", "note": "Optional note" }
}
```

Supported commands:

| Phase | Command | Main database guarantees |
| --- | --- | --- |
| 2 | `create_organization` | Creator becomes the active owner; organisation starts self-declared |
| 2 | `publish_problem` | Publication consent and required context |
| 2 | `adopt_problem` | Active organisation owner, one challenge per problem, future deadline and milestones |
| 3 | `set_interest`, `remove_interest` | Discovery consent, one interest, capacity and deadline checks |
| 4 | `create_team` | Interest required; one active team relationship per challenge |
| 4 | `invite_member`, `request_to_join`, `respond_membership`, `leave_team` | Correct actor consent, accepted-capacity check and roster lock |
| 4 | `submit_application` | Leader only, team size/mode, deadline, capacity, frozen roster and one submission |
| 5 | `review_application` | Challenge owner only; one selected team |
| 5 | `submit_contribution` | Selected active team member and valid milestone |
| 5–6 | `review_contribution` | Different authorised reviewer, immutable acceptance and one-time points |
| 5 | `publish_outcome` | Accepted work required; truthful handover/pilot/evaluation fields kept separate |
| 6 | `verify_organization` | Platform administrator only |

## Organisation membership consent

`POST /api/collaboration/organization-membership`

- Invite: `{ "action": "invite", "organizationId": "uuid", "userId": "uuid", "role": "coordinator" }`
- Respond: `{ "action": "respond", "organizationId": "uuid", "role": "accept" }`

The invited account must accept before receiving organisation access. Reviewer and coordinator roles are stored relationships and are never derived from profile mode or editable Auth metadata.

## Evidence upload

`POST /api/collaboration/evidence` accepts multipart form data with `problemId` and `file`. Only the problem author can upload. JPG, PNG and WebP are accepted up to 4 MB. The bucket is private; the uploader and the accountable owner of an adopted challenge can request a short-lived link.

## Reputation

Only an accepted contribution creates an award. Database triggers verify that the recipient submitted the accepted contribution, the reviewer is different, the challenge and milestone match and the points equal the milestone value. Unique constraints prevent repeated review calls from awarding points twice.

```text
level = 1 + floor(total accepted points / 100)
```

Interest, team membership and applications award zero points.

## Platform administrator bootstrap

No public API can grant platform administration. A trusted database operator must insert the first `collab_platform_roles` row for an existing Auth user. Do not place this permission in Auth user metadata or expose a service-role key to the browser.
