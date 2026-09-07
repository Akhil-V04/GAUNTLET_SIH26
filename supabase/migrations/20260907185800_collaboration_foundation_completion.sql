-- Complete the Phase 1 entity model after reviewing the PRD access and privacy rules.

alter table public.collab_challenges rename column participation_type to application_mode;
alter table public.collab_challenges rename column application_limit to maximum_applications;
alter table public.collab_challenges
  add column engagement_type text not null default 'volunteering'
    check (engagement_type in ('volunteering', 'academic_project', 'research', 'sponsored_project', 'other')),
  add column maximum_interests integer check (maximum_interests is null or maximum_interests between 1 and 5000),
  add column evaluation_criteria text not null default '' check (char_length(evaluation_criteria) <= 2000),
  add column timezone text not null default 'Asia/Kolkata' check (char_length(timezone) between 3 and 80);

alter table public.collab_team_members
  add column request_type text not null default 'invitation'
    check (request_type in ('invitation', 'join_request', 'leader')),
  add column requested_by uuid references auth.users(id) on delete restrict,
  add column responded_by uuid references auth.users(id) on delete restrict,
  add column responded_at timestamptz;

alter table public.collab_applications
  add column relevant_experience text not null default '' check (char_length(relevant_experience) <= 2000),
  add column responsibility_plan text not null default '' check (char_length(responsibility_plan) <= 3000),
  add column portfolio_url text,
  add column roster_snapshot uuid[] not null default '{}',
  add column revision integer not null default 1 check (revision between 1 and 100);

create table public.collab_problem_contacts (
  problem_id uuid primary key references public.collab_problems(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_preference text not null default '' check (char_length(contact_preference) <= 500),
  relevant_organization text not null default '' check (char_length(relevant_organization) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collab_platform_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  platform_role text not null check (platform_role in ('administrator', 'moderator')),
  granted_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.collab_outcomes (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null unique references public.collab_challenges(id) on delete cascade,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  final_deliverable_url text,
  handover_summary text not null check (char_length(handover_summary) between 20 and 4000),
  pilot_result text not null default '' check (char_length(pilot_result) <= 3000),
  evaluation text not null default '' check (char_length(evaluation) <= 3000),
  implementation_responsibility text not null default '' check (char_length(implementation_responsibility) <= 1000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index collab_problem_contacts_owner_idx on public.collab_problem_contacts(owner_id);
create index collab_outcomes_challenge_idx on public.collab_outcomes(challenge_id, status);

create trigger collab_problem_contacts_touch_updated_at before update on public.collab_problem_contacts
for each row execute function collab_private.touch_updated_at();
create trigger collab_outcomes_touch_updated_at before update on public.collab_outcomes
for each row execute function collab_private.touch_updated_at();

create or replace function collab_private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.collab_platform_roles platform_access
    where platform_access.user_id = (select auth.uid())
      and platform_access.platform_role = 'administrator'
  );
$$;

revoke all on function collab_private.is_platform_admin() from public, anon;
grant execute on function collab_private.is_platform_admin() to authenticated;

alter table public.collab_problem_contacts enable row level security;
alter table public.collab_platform_roles enable row level security;
alter table public.collab_outcomes enable row level security;

revoke all on public.collab_problem_contacts, public.collab_platform_roles,
  public.collab_outcomes from anon, authenticated;
grant select on public.collab_problem_contacts, public.collab_platform_roles,
  public.collab_outcomes to authenticated;
grant select on public.collab_outcomes to anon;

create policy "collab problem contacts stay private"
on public.collab_problem_contacts for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from public.collab_challenges challenge
    where challenge.problem_id = problem_id
      and (select collab_private.is_challenge_owner(challenge.id))
  )
  or (select collab_private.is_platform_admin())
);

create policy "collab platform roles are visible to holder or admin"
on public.collab_platform_roles for select to authenticated
using (user_id = (select auth.uid()) or (select collab_private.is_platform_admin()));

create policy "collab published outcomes are public"
on public.collab_outcomes for select to anon, authenticated
using (status = 'published');

create policy "collab owners read draft outcomes"
on public.collab_outcomes for select to authenticated
using ((select collab_private.is_challenge_owner(challenge_id)));

comment on table public.collab_problem_contacts is 'Private contact preferences separated from the public problem record.';
comment on table public.collab_platform_roles is 'Server-managed platform moderation authority; never derived from user metadata.';
comment on table public.collab_outcomes is 'Owner-recorded handover, pilot and evaluation evidence without claiming the societal problem was solved.';
