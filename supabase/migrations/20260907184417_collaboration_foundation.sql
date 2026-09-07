-- Gauntlet collaboration foundation (PRD v2.0, Phase 1)
-- This schema is additive. Legacy civic-reporting tables and records are preserved.

create schema if not exists collab_private;

create table public.collab_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 100),
  primary_mode text not null check (primary_mode in ('student', 'community_contributor', 'organization_representative')),
  headline text not null default '' check (char_length(headline) <= 160),
  institution text not null default '' check (char_length(institution) <= 160),
  skills text[] not null default '{}',
  availability text not null default 'open' check (availability in ('open', 'limited', 'unavailable')),
  discoverable boolean not null default true,
  onboarding_completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collab_profiles_skills_limit check (cardinality(skills) <= 20)
);

comment on column public.collab_profiles.primary_mode is
  'Self-selected onboarding preference used for UX only. It does not grant organization or platform permissions.';

create table public.collab_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  organization_type text not null check (organization_type in ('university', 'ngo', 'startup', 'industry')),
  website text,
  summary text not null default '' check (char_length(summary) <= 1200),
  verification_status text not null default 'self_declared' check (verification_status in ('self_declared', 'under_review', 'verified', 'rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collab_organization_memberships (
  organization_id uuid not null references public.collab_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_role text not null check (membership_role in ('owner', 'coordinator', 'reviewer')),
  membership_status text not null default 'pending' check (membership_status in ('pending', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.collab_problems (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 8 and 160),
  summary text not null check (char_length(summary) between 30 and 3000),
  affected_group text not null check (char_length(affected_group) between 3 and 500),
  current_workaround text not null default '' check (char_length(current_workaround) <= 1200),
  domain text not null check (char_length(domain) between 2 and 80),
  approximate_location text not null default '' check (char_length(approximate_location) <= 160),
  evidence_path text,
  publication_consent boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'adopted', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collab_problem_publish_consent check (status not in ('published', 'adopted') or publication_consent)
);

create table public.collab_challenges (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null unique references public.collab_problems(id) on delete restrict,
  organization_id uuid not null references public.collab_organizations(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 8 and 160),
  objective text not null check (char_length(objective) between 30 and 3000),
  expected_roles text[] not null default '{}',
  useful_skills text[] not null default '{}',
  constraints text not null default '' check (char_length(constraints) <= 2000),
  support_offered text not null default '' check (char_length(support_offered) <= 2000),
  deliverables text not null check (char_length(deliverables) between 10 and 2000),
  participation_type text not null default 'team' check (participation_type in ('individual', 'team', 'individual_or_team')),
  minimum_team_size integer not null default 1 check (minimum_team_size between 1 and 20),
  maximum_team_size integer not null default 4 check (maximum_team_size between 1 and 20),
  application_limit integer check (application_limit is null or application_limit between 1 and 1000),
  submission_limit integer not null default 1 check (submission_limit between 1 and 20),
  application_deadline timestamptz,
  status text not null default 'draft' check (status in ('draft', 'open', 'active', 'completed', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collab_challenge_team_size_order check (minimum_team_size <= maximum_team_size)
);

create table public.collab_interests (
  challenge_id uuid not null references public.collab_challenges(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  note text not null default '' check (char_length(note) <= 500),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (challenge_id, student_id)
);

create table public.collab_teams (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.collab_challenges(id) on delete cascade,
  leader_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 100),
  status text not null default 'forming' check (status in ('forming', 'ready', 'applied', 'selected', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, challenge_id)
);

create table public.collab_team_members (
  team_id uuid not null,
  challenge_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('leader', 'member')),
  membership_status text not null default 'invited' check (membership_status in ('invited', 'active', 'left', 'removed')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id),
  foreign key (team_id, challenge_id) references public.collab_teams(id, challenge_id) on delete cascade
);

create unique index collab_one_active_team_per_challenge
  on public.collab_team_members(challenge_id, user_id)
  where membership_status in ('invited', 'active');

create table public.collab_applications (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.collab_challenges(id) on delete cascade,
  team_id uuid not null references public.collab_teams(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  proposal text not null check (char_length(proposal) between 30 and 5000),
  limitations text not null check (char_length(limitations) between 5 and 2000),
  status text not null default 'submitted' check (status in ('submitted', 'shortlisted', 'selected', 'rejected', 'withdrawn')),
  reviewed_by uuid references auth.users(id) on delete restrict,
  review_note text not null default '' check (char_length(review_note) <= 2000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (challenge_id, team_id)
);

create unique index collab_one_selected_team_per_challenge
  on public.collab_applications(challenge_id)
  where status = 'selected';

create table public.collab_milestones (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.collab_challenges(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1200),
  sequence_number integer not null check (sequence_number between 1 and 100),
  due_at timestamptz,
  points integer not null default 10 check (points between 0 and 100),
  created_at timestamptz not null default now(),
  unique (challenge_id, sequence_number)
);

create table public.collab_contributions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.collab_challenges(id) on delete cascade,
  milestone_id uuid references public.collab_milestones(id) on delete set null,
  team_id uuid not null references public.collab_teams(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  summary text not null check (char_length(summary) between 20 and 3000),
  output_url text,
  limitations text not null default '' check (char_length(limitations) <= 2000),
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'revision_requested', 'accepted', 'rejected')),
  review_note text not null default '' check (char_length(review_note) <= 2000),
  reviewed_by uuid references auth.users(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.collab_reputation_awards (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.collab_challenges(id) on delete cascade,
  milestone_id uuid not null references public.collab_milestones(id) on delete cascade,
  contribution_id uuid not null references public.collab_contributions(id) on delete cascade,
  points integer not null check (points between 1 and 100),
  reason text not null check (char_length(reason) between 3 and 300),
  awarded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (recipient_id, challenge_id, milestone_id),
  unique (recipient_id, contribution_id)
);

create table public.collab_activity (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null check (entity_type in ('profile', 'organization', 'problem', 'challenge', 'interest', 'team', 'application', 'contribution', 'award')),
  entity_id uuid not null,
  action text not null check (char_length(action) between 2 and 80),
  details jsonb not null default '{}'::jsonb,
  visibility text not null default 'participants' check (visibility in ('private', 'participants', 'public')),
  created_at timestamptz not null default now()
);

create index collab_organizations_created_by_idx on public.collab_organizations(created_by);
create index collab_memberships_user_idx on public.collab_organization_memberships(user_id, membership_status);
create index collab_problems_author_idx on public.collab_problems(author_id, status);
create index collab_problems_status_idx on public.collab_problems(status, created_at desc);
create index collab_challenges_org_idx on public.collab_challenges(organization_id, status);
create index collab_challenges_owner_idx on public.collab_challenges(owner_id);
create index collab_interests_student_idx on public.collab_interests(student_id);
create index collab_teams_challenge_idx on public.collab_teams(challenge_id);
create index collab_team_members_user_idx on public.collab_team_members(user_id, membership_status);
create index collab_applications_team_idx on public.collab_applications(team_id);
create index collab_milestones_challenge_idx on public.collab_milestones(challenge_id);
create index collab_contributions_challenge_idx on public.collab_contributions(challenge_id, status);
create index collab_contributions_team_idx on public.collab_contributions(team_id);
create index collab_awards_recipient_idx on public.collab_reputation_awards(recipient_id, created_at desc);
create index collab_activity_entity_idx on public.collab_activity(entity_type, entity_id, created_at desc);

create or replace function collab_private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger collab_profiles_touch_updated_at before update on public.collab_profiles
for each row execute function collab_private.touch_updated_at();
create trigger collab_organizations_touch_updated_at before update on public.collab_organizations
for each row execute function collab_private.touch_updated_at();
create trigger collab_memberships_touch_updated_at before update on public.collab_organization_memberships
for each row execute function collab_private.touch_updated_at();
create trigger collab_problems_touch_updated_at before update on public.collab_problems
for each row execute function collab_private.touch_updated_at();
create trigger collab_challenges_touch_updated_at before update on public.collab_challenges
for each row execute function collab_private.touch_updated_at();
create trigger collab_teams_touch_updated_at before update on public.collab_teams
for each row execute function collab_private.touch_updated_at();

create or replace function collab_private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.collab_organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.membership_status = 'active'
  );
$$;

create or replace function collab_private.is_challenge_owner(target_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.collab_challenges challenge
    join public.collab_organization_memberships membership
      on membership.organization_id = challenge.organization_id
    where challenge.id = target_challenge_id
      and membership.user_id = (select auth.uid())
      and membership.membership_status = 'active'
      and membership.membership_role in ('owner', 'coordinator')
  );
$$;

create or replace function collab_private.is_team_member(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.collab_team_members member
    where member.team_id = target_team_id
      and member.user_id = (select auth.uid())
      and member.membership_status = 'active'
  );
$$;

revoke all on schema collab_private from public;
grant usage on schema collab_private to authenticated;
revoke all on function collab_private.is_org_member(uuid) from public, anon;
revoke all on function collab_private.is_challenge_owner(uuid) from public, anon;
revoke all on function collab_private.is_team_member(uuid) from public, anon;
grant execute on function collab_private.is_org_member(uuid) to authenticated;
grant execute on function collab_private.is_challenge_owner(uuid) to authenticated;
grant execute on function collab_private.is_team_member(uuid) to authenticated;

alter table public.collab_profiles enable row level security;
alter table public.collab_organizations enable row level security;
alter table public.collab_organization_memberships enable row level security;
alter table public.collab_problems enable row level security;
alter table public.collab_challenges enable row level security;
alter table public.collab_interests enable row level security;
alter table public.collab_teams enable row level security;
alter table public.collab_team_members enable row level security;
alter table public.collab_applications enable row level security;
alter table public.collab_milestones enable row level security;
alter table public.collab_contributions enable row level security;
alter table public.collab_reputation_awards enable row level security;
alter table public.collab_activity enable row level security;

revoke all on public.collab_profiles, public.collab_organizations,
  public.collab_organization_memberships, public.collab_problems,
  public.collab_challenges, public.collab_interests, public.collab_teams,
  public.collab_team_members, public.collab_applications, public.collab_milestones,
  public.collab_contributions, public.collab_reputation_awards,
  public.collab_activity from anon, authenticated;

grant select on public.collab_profiles, public.collab_organizations, public.collab_problems,
  public.collab_challenges, public.collab_milestones, public.collab_contributions,
  public.collab_reputation_awards to anon;
grant select on public.collab_profiles, public.collab_organizations,
  public.collab_organization_memberships, public.collab_problems,
  public.collab_challenges, public.collab_interests, public.collab_teams,
  public.collab_team_members, public.collab_applications, public.collab_milestones,
  public.collab_contributions, public.collab_reputation_awards,
  public.collab_activity to authenticated;
grant insert, update on public.collab_profiles to authenticated;

create policy "collab public profiles are discoverable"
on public.collab_profiles for select to anon, authenticated
using (discoverable or id = (select auth.uid()));

create policy "collab users create their profile"
on public.collab_profiles for insert to authenticated
with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy "collab users update their profile"
on public.collab_profiles for update to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()))
with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy "collab organizations are publicly readable"
on public.collab_organizations for select to anon, authenticated
using (verification_status <> 'rejected' or created_by = (select auth.uid()));

create policy "collab memberships are visible to participants"
on public.collab_organization_memberships for select to authenticated
using (user_id = (select auth.uid()) or (select collab_private.is_org_member(organization_id)));

create policy "collab published problems are readable"
on public.collab_problems for select to anon, authenticated
using (status in ('published', 'adopted') or author_id = (select auth.uid()));

create policy "collab public challenges are readable"
on public.collab_challenges for select to anon, authenticated
using (status in ('open', 'active', 'completed', 'closed'));

create policy "collab organization members read draft challenges"
on public.collab_challenges for select to authenticated
using ((select collab_private.is_org_member(organization_id)));

create policy "collab interests are visible to involved users"
on public.collab_interests for select to authenticated
using (
  student_id = (select auth.uid())
  or (is_visible and exists (
    select 1 from public.collab_profiles profile
    where profile.id = student_id and profile.discoverable
  ))
  or (select collab_private.is_challenge_owner(challenge_id))
);

create policy "collab teams are visible to participants"
on public.collab_teams for select to authenticated
using ((select collab_private.is_team_member(id)) or (select collab_private.is_challenge_owner(challenge_id)));

create policy "collab team memberships are visible to participants"
on public.collab_team_members for select to authenticated
using ((select collab_private.is_team_member(team_id)) or (select collab_private.is_challenge_owner(challenge_id)));

create policy "collab applications are visible to participants"
on public.collab_applications for select to authenticated
using ((select collab_private.is_team_member(team_id)) or (select collab_private.is_challenge_owner(challenge_id)));

create policy "collab public milestones follow challenge visibility"
on public.collab_milestones for select to anon, authenticated
using (exists (
  select 1 from public.collab_challenges challenge
  where challenge.id = challenge_id
    and challenge.status in ('open', 'active', 'completed', 'closed')
));

create policy "collab organization members read draft milestones"
on public.collab_milestones for select to authenticated
using ((select collab_private.is_challenge_owner(challenge_id)));

create policy "collab accepted contributions are public"
on public.collab_contributions for select to anon, authenticated
using (status = 'accepted');

create policy "collab participants read their contributions"
on public.collab_contributions for select to authenticated
using (
  submitted_by = (select auth.uid())
  or (select collab_private.is_team_member(team_id))
  or (select collab_private.is_challenge_owner(challenge_id))
);

create policy "collab awards follow portfolio visibility"
on public.collab_reputation_awards for select to anon, authenticated
using (
  recipient_id = (select auth.uid())
  or exists (
    select 1 from public.collab_profiles profile
    where profile.id = recipient_id and profile.discoverable
  )
);

create policy "collab activity is visible to relevant users"
on public.collab_activity for select to authenticated
using (
  visibility = 'public'
  or actor_id = (select auth.uid())
  or (entity_type = 'challenge' and (select collab_private.is_challenge_owner(entity_id)))
  or (entity_type = 'team' and (select collab_private.is_team_member(entity_id)))
);

comment on table public.collab_profiles is 'Phase 1 identity and onboarding profile. Self-selected mode never grants organization authority.';
comment on table public.collab_organizations is 'Nongovernment challenge-owning organizations: universities, NGOs, startups and industry.';
comment on table public.collab_problems is 'Community-submitted societal problems, preserved separately from adopted challenges.';
comment on table public.collab_challenges is 'Organization-owned, scoped collaboration opportunities linked to original problems.';
