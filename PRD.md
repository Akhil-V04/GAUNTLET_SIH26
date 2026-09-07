# Gauntlet — Product Requirements Document

Version: 2.0

Updated: 2026-09-07

Status: Product redesign documented; implementation requires a separate instruction.

Team and application name: Gauntlet
Scope of this update: PRD only. This document describes planned behaviour, not completed development.

## 1. Product summary

Gauntlet connects publicly submitted societal problems with universities, NGOs, startups and industry partners that can turn them into scoped challenges. Students discover opportunities, express interest, find teammates, submit applications, contribute work and build a portfolio of reviewed contributions.

The platform manages collaboration. The challenge-owning organisation evaluates proposed work, supports selected participants and takes responsibility for any agreed pilot or implementation. Publishing a problem does not guarantee that an organisation will adopt it or that someone will solve it.

One-line description:

> Gauntlet turns community problems into organisation-owned challenges where students form teams, contribute solutions and earn recognition for reviewed work.

## 2. Requirements and source precedence

1. The user's latest instructions take precedence: there is no government involvement in this product, and the current task is documentation only.
2. The user's description of public problems, organisation ownership, role postings, student interest, team formation, applications, submission limits and contribution-based profiles defines the new core.
3. idea.txt supplies supporting concepts. Its government/authority roles, government-funded projects and examples requiring a government operator are excluded.
4. The original presentation, civic workflow and PRD v1.1 are historical context. They no longer govern the new architecture.

The SIH title supplied by the user is: “A digital platform to crowdsource societal challenges and facilitate collaborative problem solving through universities and industry partnerships.”

This PRD defines the team's chosen product scope; it does not assert that every broader requirement of an official statement has been independently verified or satisfied.

## 3. Problem and value proposition

### Community problem contributors

People and community organisations can describe a need, supply relevant evidence and make it discoverable. They can follow whether an organisation adopts it and see public project updates.

### Students

Students gain access to specific project briefs, potential teammates, declared support, review feedback and a record of their individual contributions. They can choose opportunities appropriate to their skills and availability.

Points and levels recognise reviewed work; they do not certify professional competence. Academic credit, funding, internships, employment and incubation are conditional benefits that may be advertised only when a partner has explicitly committed to them.

### Universities

University coordinators can adopt problems, post opportunities, guide student teams and retain evidence of project activity and reviewed outputs.

### NGOs

NGOs can identify practical needs, specify useful deliverables, provide community access and review outputs. The product should reduce volunteer coordination and handover work rather than create another collection of unsupported ideas.

### Startups and industry partners

Partners can own challenges or provide explicitly agreed mentorship, resources, evaluation and pilot support. Their involvement must identify a responsible person, a concrete contribution and the scope of that commitment.

These value propositions are hypotheses to validate through conversations with students, a university coordinator and an NGO or industry representative.

## 4. Scope and boundaries

### In the first MVP

- Account registration and profiles.
- Public societal-problem board with search and domain filters.
- Organisation onboarding and accountable challenge ownership.
- Adoption of a problem into a structured challenge.
- Open role and skill descriptions, scope, support, deliverables and limits.
- Interested-student pool and opt-in profile discovery.
- Team creation, invitations and join requests with consent.
- Individual or team applications, subject to challenge rules.
- Owner shortlisting, selection, rejection and feedback.
- Milestone work, individual contribution evidence and revision requests.
- Accepted contributions, points, levels and public portfolios.
- Public project status and clearly described outcomes.
- In-app activity and actionable status updates.

### Excluded from the MVP

- Government accounts, municipal routing, corporator workflows and government approval.
- A general maintenance complaint-resolution service.
- Guaranteed repairs, public-service fulfilment or automatic physical implementation.
- Payments, prize distribution, contracts or recruitment guarantees.
- Automatic student recommendations, skill-match percentages and AI selection decisions.
- Automatic GitHub commit attribution or claims that links independently prove authorship.
- Automatic penalties for rejection, low scores or leaving a project.
- Private chat, video calls, a social feed and large-scale recommendation infrastructure.
- Forecasting, live city dashboards and mandatory manual entry of latitude/longitude coordinates.
- Claims of verified organisations without a real verification process.

Existing government-oriented screens must not simply be relabelled as university screens. Their responsibilities and data flows need redesign before they can support this product.

## 5. Suitable problems

Focus on needs that a participating organisation can scope, support and evaluate. Initial example domains:

- Education and learning access.
- Community health awareness.
- Accessibility and inclusion.
- Livelihoods, employability and skills.
- Volunteer and community coordination.
- Digital access and nonprofit operations.
- Environment and sustainability projects.
- Other partner-supported societal needs.

Illustrative challenges:

| Community need | Possible challenge | Accountable partner |
| --- | --- | --- |
| An NGO needs more effective drug-awareness outreach | Develop reviewed materials, run an agreed session and evaluate participant learning | NGO and university coordinator |
| Volunteers struggle to coordinate food pickups | Prototype a scheduling workflow and test it with participating volunteers | Food-support NGO |
| A learning centre has unreliable connectivity | Build and evaluate an offline learning-content workflow | Learning centre and faculty mentor |
| An organisation's website is difficult to use with assistive technology | Assess accessibility and implement agreed improvements | Organisation and relevant mentor |

These are examples, not evidence that the team has researched or partnered with these organisations. A campaign's completion must not be described as the eradication of a social problem.

## 6. Roles and permissions

| Role | Responsibilities | Boundaries |
| --- | --- | --- |
| Visitor | Browse public problems, challenges and opted-in portfolios | Cannot apply, invite, submit or review |
| Community contributor | Publish a problem and follow public outcomes | Cannot assign student teams or award points |
| Student | Express interest, discover peers, join/form teams, apply and submit individual work | Cannot accept their own work or change challenge rules |
| Organisation representative | Represent a university, NGO, startup or industry organisation; own challenges and review work | May manage only authorised organisation challenges |
| Team leader | Invite members and submit the team's application | Cannot add people without consent or award points |
| Automated trust and safety controls | Verify organisation claims, detect duplicate problems and abuse/collusion, and apply defined system actions | No routine human moderation or unilateral human administrator decisions |

A user may be a problem contributor and a student. Organisation membership is a separately authorised relationship, not a browser-supplied role.

MVP default: one responsible coordinator per organisation, one primary owner per challenge and one selected team per challenge. Additional partner support can be recorded by the owner. Multi-coordinator administration and multiple selected teams can be expanded later.

Organisation claims receive an automated trust tier at signup: verified, unverified or flagged. Routine verification and moderation do not wait for human review. Reviewed work means reviewed by the named challenge owner; it must not imply independent professional certification.

## 7. End-to-end workflow

1. A user registers; full profile details are not required at signup.
2. A contributor publishes a problem with its context, required location path and optional evidence.
3. An organisation reviews the need and decides whether it can support a project.
4. The organisation adopts the problem and publishes a structured challenge.
5. Students read the brief, roles, support and restrictions.
6. Students express interest and opt into the interested-person directory.
7. Students form a team through accepted invitations or join requests.
8. An individual or team submits an application before the deadline.
9. The owner shortlists, selects or rejects applications with feedback.
10. The selected team works through agreed milestones.
11. Each contributor submits their own work description and evidence.
12. The owner accepts a contribution or requests revision.
13. Accepted contributions create one-time reputation awards.
14. The owner records the final deliverable and any demonstrated pilot outcome.
15. The public challenge and student portfolios show the recorded result.

No step assumes that an idea, proposal or prototype has already solved the original societal problem.

## 8. Problem submission and public discovery

Required fields:

- Title.
- Description of the affected group and observed need.
- Current workaround and why improvement is needed.
- Domain.
- Permission to publish the submitted text and evidence.
- Location, captured through one required path: the browser/device Geolocation API or a manual area/city selection.

Optional fields:
- Supporting source/document URL.
- Photo in JPG, PNG or WebP format.
- Relevant organisation or contact preference, kept separate from public data.

On submission, request the current location through the browser/device Geolocation API once. The user never manually enters latitude/longitude. The platform reverse-geocodes captured coordinates and displays only the resulting locality or area name. If permission is denied, the user must choose an area/city from the manual dropdown; this is a required fallback, not an optional field. Store the locality name as public data and captured raw coordinates as internal-only matching and deduplication data. Do not display raw coordinates publicly.

Do not publish phone numbers, private contact details or identifiable sensitive information by default.

An unadopted entry is labelled community-reported, not verified. It remains visible as awaiting an organisation. Adoption creates a linked challenge without deleting or rewriting the original report.

If a published problem remains unadopted for the configured threshold of X days, label it visibly: “Awaiting organisation — no adoption yet after [X] days.” The original submitter can see the count of organisations that viewed the problem, but not their identities or reasons for passing.

## 9. Challenge ownership and publishing

An organisation representative’s first “Adopt this problem” action is gated by the same one-time profile-completion step: domain of interest, organisation and location. These values are stored permanently on the profile and are not requested again for later adoption actions. Browsing/exploring problems and challenges remains fully accessible without this gate.

An owner must define:

- Responsible organisation and coordinator.
- Link to the original problem.
- Reviewed problem context and objective.
- Expected roles and useful skills.
- Deliverables and evaluation criteria.
- Constraints: time, resources, access, budget and permitted activities.
- Confirmed support: mentor, feedback, materials, access or funding, where agreed.
- Participation type: volunteering, academic project, research, sponsored project or other clearly described arrangement.
- Minimum and maximum team size.
- Maximum interested students and maximum applications.
- Deadline with an explicit timezone.
- Milestones and intended handover or pilot arrangements.
- For a university-owned challenge, an eligible-students scope: own institution only (the default), own institution plus named partner institutions, or open to all.

Role postings describe required contributions, such as design, research, facilitation or development. They are not job offers unless an authorised organisation explicitly publishes one.

The owner must not use reputation as an automatic substitute for reviewing the proposal and relevant evidence. New students start with no history and should still be eligible by default.

Evaluation criteria must be size-agnostic. When a challenge permits a solo applicant, owners must not apply an explicit or implicit preference for larger teams. A strong solo submission is evaluated against the same proposed approach, experience, feasibility and deliverable-quality criteria as a team submission, not against team size.

Once a milestone contribution is submitted, the responsible coordinator must accept it or request revision within the configured review-response window of 7–14 days. On a missed window, the system sends an automated reminder; on a second missed window, it marks the challenge “Stalled” publicly and applies an organisation demerit. Accumulated demerits lower the organisation’s trust tier and may restrict new challenge publishing until resolved. After the final configured stall threshold, the system may assign a recorded secondary coordinator or reopen the underlying problem for adoption by another organisation. This does not delete or invalidate the original team’s submitted/reviewed contributions or awarded points.

## 10. Interest and teammate discovery

- “I'm interested” expresses interest; it is not an application or selection.
- A student’s first “I'm interested” action is gated by a one-time profile-completion step requiring domain of interest, college and location. The completed details are stored permanently on the profile and are not requested again for later interest actions.
- Browsing or exploring problems and challenges never triggers profile completion; only the first interest action does.
- Students must consent to showing their display name, skills and opted-in profile to potential teammates.
- Interested people can inspect each other's self-described skills and availability.
- No private email or phone number is exposed through the directory.
- One interest record per student per challenge.
- Repeated clicks do not create duplicates or points.
- The UI clearly distinguishes interested, invited, team member, applied and selected.
- Private or inactive profiles must not remain discoverable after opting out, except for records necessary to an existing team's workflow.

An interest-capacity limit must be enforced by the backend, including simultaneous requests.

## 11. Team formation

- A student creates a team for one challenge and becomes its leader.
- The leader can invite interested students.
- Interested students can request to join a team.
- Invitations require student acceptance; join requests require leader acceptance.
- Pending invitations do not count as accepted members.
- Team capacity is checked when a request is accepted.
- A student may belong to only one active application team for the same challenge.
- Students may join teams for different challenges.
- The roster is frozen at application submission to prevent changing the reviewed team.
- Before submission, nonleaders can leave and leaders can manage pending requests.
- Post-selection changes require an explicit owner-reviewed amendment; they do not retroactively grant credit.
- For university-owned challenges, enforce the eligible-students scope using the student profile’s college at both invitation/join-request acceptance and application submission. Reject ineligible invitations, join requests and applications with a clear reason.

MVP default: individual applications are represented as one-person teams and are allowed only when the challenge minimum team size is one.

## 12. Applications and owner evaluation

Applications contain:

- Team and accepted member list.
- Proposed approach.
- Relevant experience or portfolio evidence.
- Planned responsibilities.
- Feasibility and constraints.
- A repository, document, prototype or presentation link where appropriate.

Planned defaults:

- One application per team per challenge.
- The same person cannot appear in multiple simultaneous applications for one challenge.
- Owner-configured application capacity and deadline enforced in the database.
- An application revision does not create another slot or reputation award.
- Original applicants and review history remain auditable.
- Private proposals are visible only to the applicant team and authorised reviewers.
- Owners can shortlist, reject or select with recorded feedback.
- One team is selected per challenge in the initial MVP.

Before an owner sees an application, a rule-based compliance filter automatically rejects incomplete submissions, submissions below the challenge minimum team size, and submissions past the deadline. This is eligibility enforcement, not a quality judgment.

For the remaining eligible pool, the review order is assistive only: reserve a configured fixed share for high-reputation teams and a configured fixed share for zero-history teams, then cap and pre-sort the shortlist-review order. The owner still manually reviews and selects from that list, preserving eligibility for new students.

The platform may rank problems for browsing organisations by domain/skill fit and rank candidate applications for an owner shortlist by skill overlap. These rankings are sort orders only: they never automatically select, reject, or assign a percentage suitability score. The human owner retains full decision authority.

No numerical suitability percentages, automated selection or guaranteed selection are required.

## 13. Project milestones and individual contributions

Suggested adaptable milestones:

1. Problem understanding and research.
2. Proposed intervention, design or prototype.
3. Testing, activity delivery or pilot.
4. Final handover and evaluation.

A campaign can use planning/materials/session/evaluation labels; a software challenge can use research/prototype/testing/handover labels.

Each individual contribution records:

- Contributor and team.
- Challenge and milestone.
- What that person completed.
- Evidence link or permitted attachment.
- Submission timestamp.
- Review status, reviewer, feedback and decision timestamp.

The team leader cannot claim identical credit for every member. Review is recorded for each person's work.

A reviewer may accept or request revision. Accepted records are immutable in the normal workflow. Corrections require an audited administrative process. A rejected or revised draft does not automatically penalise reputation.

## 14. Reputation, levels and portfolios

Reputation recognises reviewed contributions, not self-reported activity.

Proposed MVP scoring, to be confirmed before implementation:

| Event | Points |
| --- | ---: |
| Express interest, join a team or submit an application | 0 |
| Accepted research contribution | 25 |
| Accepted prototype/design/activity-preparation contribution | 25 |
| Accepted testing/pilot/evaluation contribution | 25 |
| Accepted final handover contribution | 100 |

One award is permitted per person, challenge and milestone. Retrying a review, uploading another version or refreshing a page must not award points again.

Proposed level rule: level = 1 + floor(total accepted points / 100).

Profiles show:

- Display name, affiliation, skills and availability.
- Points and level.
- Participation and accepted contribution history.
- Named challenge and reviewing organisation.
- Evidence links and review feedback intended for publication.
- Separately recorded project completion and pilot outcomes.

Skills are self-described unless assessed through a separate process. Points do not measure employability, societal impact or professional competence. No automatic negative points, peer voting or minimum-reputation barrier is included in the MVP.

Prevent self-review and disclose the limits of owner verification. Fake organisations and collusive awards require platform moderation; a points formula alone cannot prevent them.

## 15. Completion and implementation responsibility

Keep these states distinct:

| Result | What can be claimed |
| --- | --- |
| Proposal accepted | Owner selected an approach/team |
| Deliverable accepted | Owner reviewed and accepted the submitted output |
| Pilot conducted | A documented trial occurred |
| Outcome measured | A specific result was observed using a stated method |
| Adopted/implemented | A named organisation took responsibility for use or operation |

Final closure records the deliverable, evidence, evaluation, remaining limitations and implementation owner where applicable.

For example, an awareness project may report sessions delivered and pre/post learning feedback. It must not claim reduced drug use without suitable evidence.

## 16. State models

Problem:
Published → Awaiting organisation → Awaiting organisation — no adoption yet after [X] days → Adopted into challenge.

Challenge:
Open for interest/applications → Team selected → In progress → Stalled (when review SLA escalation applies) → Final deliverable accepted → Closed with recorded outcome.

Membership:
Invited or join requested → Accepted or declined.

Application:
Submitted → Shortlisted → Selected or rejected.

Contribution:
Submitted → Accepted or revision requested → Resubmitted.

All transitions enforce actor permissions, deadlines, capacity and current state on the server. Simultaneous acceptance, team joins and reputation awards must produce consistent results.

## 17. Technical architecture

Keep the existing lightweight web stack.

| Layer | Planned technology | Responsibility |
| --- | --- | --- |
| Web UI | Next.js, React, TypeScript | Public discovery, profiles, teams and owner workspaces |
| Styling | Tailwind CSS and existing design system | Responsive forms, cards, status and portfolios |
| Backend | Next.js Route Handlers / server components | Session validation, input validation and workflow requests |
| Database | Supabase PostgreSQL | Relationships, constraints, transactions and audit records |
| Authentication | Supabase Auth | User accounts and sessions |
| Evidence | Private Supabase Storage | Authorised uploads and expiring evidence links |
| Access control | RLS and narrow authorised database functions | Ownership, memberships and private applications |
| Hosting | Vercel | User-managed deployment after implementation and testing |

Planned request path:

Browser → Next.js authentication/validation → authorised database transaction → stored event/contribution → refreshed workspace.

Public discovery returns only intentionally public fields. Private proposals and draft evidence require membership or owner access. Reputation is calculated from an append-only award ledger; it is never accepted from browser input.

AI is not used for team formation, selection or reputation decisions. The platform uses similarity embeddings and historical-database search for automated duplicate/similar-problem detection; submissions above a configured threshold are auto-linked or auto-merged instead of creating duplicate listings. Geolocation capture, reverse geocoding and internal coordinate matching support required location handling. No paid API access is needed for the basic collaboration workflow.

## 18. Planned data model

| Entity | Purpose and important relationships |
| --- | --- |
| User profile | Auth identity, public display fields, affiliation/college, domain of interest, location, skills and discovery consent |
| Organisation | Type, name, website/domain, automated trust tier, demerit count and responsible/secondary coordinator |
| Organisation membership | Authorised users and ownership/reviewer permissions |
| Problem | Original author, public context, domain, public locality name, internal raw coordinates, view count, similarity links and evidence |
| Challenge | Problem, owning organisation, requirements, support, deadline, limits, institution-eligibility scope, named partner institutions, review-SLA timestamps and stall state |
| Interest | Unique student/challenge relationship |
| Team | Challenge, leader and team name |
| Team membership | Invitation/request/acceptance state and consent |
| Application | Team, private proposal, submission state and review |
| Milestone | Challenge/project stage and expected deliverable |
| Contribution | Individual work, milestone, evidence and owner review |
| Reputation award | Unique reviewed contribution and points |
| Outcome | Final handover, pilot evidence, evaluation and implementation responsibility |
| Activity/notification | Relevant transitions, recipients and timestamps |
| Trust and safety event | Automated verification checks, reports, abuse/collusion anomalies, system actions and rare-dispute fallback records |

Database invariants include unique interests, controlled active team membership, valid min/max sizes, institution-scope eligibility, deadline enforcement, fixed submitted rosters and one award per accepted contribution.

## 19. Screens and navigation

- Home: explain the problem-to-team concept and participant benefits.
- Explore: public problems and organisation-owned challenges with search/filtering.
- Submit problem: understandable context, required location through geolocation or manual area/city fallback, and optional evidence; no manual coordinate entry.
- Challenge detail: owner, brief, roles, constraints, support, deadlines and limits.
- Interested people: opted-in students and their relevant profile details.
- Team workspace: roster, invitations, join requests and application.
- Organisation workspace: adopted problems, challenge publishing, applications and review.
- Project workspace: selected team, milestones, contribution evidence and revision feedback.
- My profile/public portfolio: accepted work, points, level and discovery controls.
- Activity: invitations, application decisions and reviews requiring action.
- Trust and safety: automated organisation verification, duplicate detection, abuse/collusion controls and structured rare-dispute fallback, separate from challenge ownership.

Empty states must explain the next meaningful step. Avoid fictional counts, partners, profiles or completed projects in the live interface.

## 20. Security, trust and operational limits

- Derive identity and ownership from the authenticated session and stored membership.
- Do not trust client-supplied roles, reviewer IDs, points or organisation ownership.
- Keep private application and pending contribution data out of public responses.
- Require consent for public profiles and team membership.
- Restrict image formats and file size; proposed upload maximum is 4 MB.
- Keep storage private and issue authorised expiring links.
- Enforce request limits and database uniqueness, not just disabled buttons.
- Use transactions for selection, capacity checks and awards.
- Do not award points to an owner reviewing their own contribution.
- At signup, automatically cross-check organisation email domains against registered website domains (including WHOIS), registration numbers against applicable public NGO/business/tax registries, and require institutional email domains for universities. Assign verified, unverified or flagged trust tiers without a manual review step.
- Embed each new problem and search historical submissions for similarity. Auto-link or auto-merge submissions above the configured threshold instead of making duplicate public listings.
- Auto-hide reported content when its report count reaches the configured threshold. Run anomaly detection on the reputation-award ledger to flag statistically unusual patterns, including small closed groups repeatedly awarding one another, in addition to the database-level self-review block.
- For rare high-severity disputes, including contested organisation legitimacy, use a structured non-human fallback: rules-based escalation or a vote among high-reputation users, rather than a single human administrator.
- Maintain a review audit trail and distinguish automated trust tiers from owner review of work.
- Preserve existing data during migration; do not assume historic civic records are valid challenges.
- Avoid showing legacy government roles or repair-resolution claims in the redesigned UI.

## 21. Implementation phases

These are new phases for the redesigned product. They are all planned. Previous civic-phase completion does not mean these features are implemented.

| Phase | Deliverable | Exit check |
| --- | --- | --- |
| 1 — Foundation and migration design | Map reusable code, define new entities/access rules, redesign navigation and onboarding | Schema and role design reviewed; old data preserved |
| 2 — Problem discovery and ownership | Public submissions, evidence, organisation onboarding and challenge publishing | A member posts a problem and an organisation adopts it with a complete brief |
| 3 — Student profiles and interest | Skills, discovery consent, interest directory and profile access | Students can opt in, express interest once and inspect permitted peers |
| 4 — Teams and applications | Invitations, join requests, solo/team applications, limits and deadline enforcement | Consenting members form a valid team and submit once |
| 5 — Selection and project work | Owner feedback, selected team, milestones, contributions and revisions | Owner can select a team and review individual work |
| 6 — Reputation and presentation | Award ledger, levels, portfolios, activity states and responsive UI | Accepted work awards points once and appears correctly on profiles |
| 7 — Automated trust controls and deployment | Automated verification, duplicate/abuse controls, realistic test accounts, scenario checks, fixes and manual Vercel deployment | Full collaboration journey and automated control paths demonstrated; evidence recorded |

No new 16-hour promise is made. Re-estimate after inspecting implementation reuse and agreeing the first demo scenario.

## 22. Manual acceptance scenarios

All redesigned-workflow scenarios are NOT RUN.

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| N01 | Public problem submission | Discoverable problem with explicit publication consent |
| N02 | Organisation adopts a problem | Linked challenge with accountable owner and complete requirements |
| N03 | Unauthorised user changes another owner's challenge | Denied by backend/database |
| N04 | Student expresses interest twice | One interest and zero reputation awards |
| N05 | Profile not opted into discovery | Not exposed in teammate search |
| N06 | Invitation and join request | Membership added only after the correct person's acceptance |
| N07 | Last team place requested simultaneously | Maximum team size remains enforced |
| N08 | Student tries to join two application teams for one challenge | Conflict prevented |
| N09 | Deadline or application limit reached | New submission rejected with a clear reason |
| N10 | Solo applicant below minimum team size | Rejected without creating a valid application |
| N11 | Other team accesses a private proposal | Access denied |
| N12 | Owner selects a team | Selection recorded and project work opened to the selected members |
| N13 | Member submits individual evidence | Attribution remains with that member |
| N14 | Owner requests revision | Feedback retained; no points awarded |
| N15 | Accepted contribution reviewed again | No duplicate points |
| N16 | Student or owner attempts self-award | Denied |
| N17 | Public portfolio | Only permitted reviewed contributions and truthful totals shown |
| N18 | Final handover recorded | Deliverable acceptance distinguished from demonstrated impact |
| N19 | Public deployed journey | Registration through accepted contribution works over HTTPS |
| N20 | Location permission denied | Required manual area/city fallback is enforced; only locality name is public |
| N21 | First interest action | One-time profile completion is required; Explore remains accessible without it |
| N22 | University eligibility scope | Ineligible invite, join request and application are rejected with a clear reason |
| N23 | Review SLA missed twice | Reminder is sent, challenge becomes publicly Stalled and organisation receives a demerit |
| N24 | Duplicate or abusive submission | System auto-links/merges a high-similarity problem or auto-hides content after the report threshold |

## 23. Demo and research requirements

A complaint dataset and map are not prerequisites for this MVP. The central demonstration requires linked collaboration records:

- One documented societal need.
- One organisation willing to define and review a project, or clearly labelled simulated accounts.
- A scoped challenge with roles, support, deliverables and limits.
- Two or more students for team formation.
- An application, review, contribution and accepted-work example.

Synthetic records are acceptable for demonstrating mechanics if labelled. They do not prove partner participation, successful implementation or student demand.

Before making research claims, collect direct feedback from a problem owner, an organisation coordinator and potential student participants. Record willingness to participate, constraints, expected benefits and who will actually review the work.

Local startup and deployment instructions will be revised alongside implementation, not claimed complete through this PRD update.

## 24. Decisions and open implementation choices

Confirmed:

- No government involvement.
- Publicly submitted societal problems.
- Universities/NGOs and other nongovernment organisations can own challenges.
- Roles and participation limits are defined for each challenge.
- Students express interest, discover peers, form teams and apply.
- Individual reviewed contributions support profile progression.
- Location is mandatory through geolocation or a manual area/city fallback; public locality and internal raw coordinates are separated.
- Full profile completion is deferred until the first student interest action or organisation adoption action; browsing remains ungated.
- Evaluation is size-agnostic where solo participation is permitted.
- Organisation verification, duplicate detection, abuse/collusion controls and routine moderation are automated, with structured non-human high-severity dispute fallback.
- Unadopted problems receive a visible awaiting-organisation SLA label and private aggregate organisation-view count for the submitter.
- Challenge review-response SLAs, public Stalled status, organisation demerits and eventual coordinator reassignment/reopening are defined.
- Ranking is assistive sort order only; human owners retain selection decisions.
- Rule-based eligibility filtering and reputation-weighted review ordering preserve manual quality review and zero-history eligibility.
- University challenges have enforced institution-scoped student eligibility.
- Current task changes only this PRD.

Proposed MVP defaults requiring confirmation before implementation if material:

- One selected team per challenge.
- Individual applications represented by one-person teams.
- One responsible organisation coordinator initially.
- Points of 25/25/25/100 and 100-point level increments.
- No minimum reputation requirement for new participants.
- No automatic penalties for student rejection, low scores or leaving a project, and no algorithmic selection.
- Exact automated verification sources, similarity/report/anomaly thresholds, review-response windows, stall thresholds and review-order shares.

## 25. Definition of done

The redesign is complete only when the new workflow works end to end, access/capacity/award checks pass, participant-visible copy matches this scope, and deployment evidence exists.

Updating this PRD does not complete any implementation phase. PROGRESS.md should be updated when implementation is separately authorised and completed in meaningful batches, following the user's preference against constant documentation churn.
