create extension if not exists vector with schema extensions;
create schema if not exists private;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('department','university','industry','ngo','expert','provider')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  role text not null default 'citizen' check (role in ('citizen','officer','solver')),
  organization_id uuid references public.organizations(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  category text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  classification text not null default 'normal' check (classification in ('normal','recurring','systemic')),
  status text not null default 'open' check (status in ('open','review_pending','assigned','in_progress','awaiting_verification','rework_required','escalation_review','escalated','manual_review','verified')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_label text not null check (char_length(location_label) between 2 and 240),
  created_by uuid not null references public.profiles(id),
  verifier_id uuid references public.profiles(id),
  department_id uuid references public.organizations(id),
  recurrence_family_id uuid,
  predecessor_issue_id uuid references public.issues(id),
  priority integer not null default 0 check (priority between 0 and 100),
  unique_reporters integer not null default 1 check (unique_reporters >= 0),
  prior_verified_occurrences integer not null default 0 check (prior_verified_occurrences >= 0),
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  demo_source text not null default 'live' check (demo_source in ('live','imported','synthetic')),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references public.issues(id),
  reporter_id uuid not null references public.profiles(id),
  description text not null check (char_length(description) between 10 and 3000),
  selected_category text,
  occurrence_at timestamptz not null default now(),
  duration_text text,
  provider_or_asset text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_label text not null check (char_length(location_label) between 2 and 240),
  processing_status text not null default 'pending' check (processing_status in ('pending','processing','processed','failed','review_pending')),
  processing_error text,
  embedding extensions.vector(1536),
  embedding_model text,
  extraction jsonb not null default '{}'::jsonb,
  idempotency_key uuid not null,
  demo_source text not null default 'live' check (demo_source in ('live','imported','synthetic')),
  created_at timestamptz not null default now(),
  unique (reporter_id, idempotency_key)
);

create table public.issue_events (
  id uuid primary key default gen_random_uuid(), issue_id uuid not null references public.issues(id) on delete cascade,
  actor_id uuid references public.profiles(id), event_type text not null, details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(), issue_id uuid not null references public.issues(id) on delete cascade,
  organization_id uuid not null references public.organizations(id), assigned_by uuid not null references public.profiles(id),
  status text not null default 'assigned' check (status in ('assigned','acknowledged','completed','cancelled')),
  assigned_at timestamptz not null default now(), acknowledged_at timestamptz
);

create table public.resolution_attempts (
  id uuid primary key default gen_random_uuid(), issue_id uuid not null references public.issues(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id), note text not null check (char_length(note) between 5 and 3000),
  outcome text not null default 'pending' check (outcome in ('pending','accepted','rejected')),
  verifier_id uuid references public.profiles(id), rejection_reason text,
  created_at timestamptz not null default now(), decided_at timestamptz
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(), report_id uuid references public.reports(id) on delete cascade,
  issue_id uuid references public.issues(id) on delete cascade, resolution_attempt_id uuid references public.resolution_attempts(id) on delete cascade,
  storage_path text not null unique, uploader_id uuid not null references public.profiles(id), mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880), created_at timestamptz not null default now(),
  check (num_nonnulls(report_id, issue_id, resolution_attempt_id) >= 1)
);

create table public.historical_reports (
  id uuid primary key default gen_random_uuid(), issue_id uuid not null references public.issues(id) on delete cascade,
  source_issue_ids uuid[] not null default '{}', summary jsonb not null default '{}'::jsonb,
  generation_status text not null default 'pending' check (generation_status in ('pending','generated','unavailable','failed')),
  model text, version integer not null default 1, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),
  unique (issue_id, version)
);

create index reports_issue_idx on public.reports(issue_id);
create index reports_reporter_idx on public.reports(reporter_id, created_at desc);
create index issues_status_priority_idx on public.issues(status, priority desc, created_at);
create index issues_category_location_idx on public.issues(category, latitude, longitude);
create index issue_events_issue_idx on public.issue_events(issue_id, created_at);
create index assignments_issue_idx on public.assignments(issue_id, assigned_at desc);
create index assignments_org_idx on public.assignments(organization_id, status);
create index resolution_issue_idx on public.resolution_attempts(issue_id, created_at desc);

create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end; $$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.is_officer() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'officer');
$$;
revoke all on function private.is_officer() from public, anon;
grant execute on function private.is_officer() to authenticated;

create or replace function private.is_assigned_solver(target_issue uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.assignments a join public.profiles p on p.organization_id = a.organization_id
    where a.issue_id = target_issue and a.status in ('assigned','acknowledged') and p.id = (select auth.uid()) and p.role = 'solver'
  );
$$;
revoke all on function private.is_assigned_solver(uuid) from public, anon;
grant execute on function private.is_assigned_solver(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.issues enable row level security;
alter table public.reports enable row level security;
alter table public.issue_events enable row level security;
alter table public.assignments enable row level security;
alter table public.resolution_attempts enable row level security;
alter table public.evidence enable row level security;
alter table public.historical_reports enable row level security;

grant usage on schema public to authenticated;
grant select on public.organizations, public.issues to authenticated;
grant select on public.profiles to authenticated;
grant update(full_name) on public.profiles to authenticated;
grant select, insert on public.reports, public.evidence, public.issue_events, public.resolution_attempts to authenticated;
grant select, insert on public.assignments to authenticated;
grant update(status, acknowledged_at) on public.assignments to authenticated;
grant select, insert, update on public.historical_reports to authenticated;
grant insert, update on public.issues to authenticated;

create policy organizations_read on public.organizations for select to authenticated using (active);
create policy profiles_read_own_or_officer on public.profiles for select to authenticated using (id = (select auth.uid()) or (select private.is_officer()));
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy issues_read on public.issues for select to authenticated using (true);
create policy issues_insert_citizen on public.issues for insert to authenticated with check (created_by = (select auth.uid()));
create policy issues_update_officer on public.issues for update to authenticated using ((select private.is_officer())) with check ((select private.is_officer()));

create policy reports_read_allowed on public.reports for select to authenticated using (
  reporter_id = (select auth.uid()) or (select private.is_officer()) or (issue_id is not null and (select private.is_assigned_solver(issue_id)))
);
create policy reports_insert_own on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));

create policy events_read_allowed on public.issue_events for select to authenticated using (
  (select private.is_officer()) or actor_id = (select auth.uid()) or (select private.is_assigned_solver(issue_id)) or
  exists(select 1 from public.issues i where i.id = issue_id and (i.created_by = (select auth.uid()) or i.verifier_id = (select auth.uid())))
);
create policy events_insert_actor on public.issue_events for insert to authenticated with check (
  actor_id = (select auth.uid()) and ((select private.is_officer()) or (select private.is_assigned_solver(issue_id)) or
  exists(select 1 from public.issues i where i.id = issue_id and i.created_by = (select auth.uid())))
);

create policy assignments_read_allowed on public.assignments for select to authenticated using (
  (select private.is_officer()) or exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.organization_id = organization_id)
);
create policy assignments_insert_officer on public.assignments for insert to authenticated with check ((select private.is_officer()) and assigned_by = (select auth.uid()));
create policy assignments_update_allowed on public.assignments for update to authenticated using (
  (select private.is_officer()) or exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.organization_id = organization_id)
) with check (
  (select private.is_officer()) or exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.organization_id = organization_id)
);

create policy resolutions_read_allowed on public.resolution_attempts for select to authenticated using (
  (select private.is_officer()) or submitted_by = (select auth.uid()) or verifier_id = (select auth.uid()) or
  (select private.is_assigned_solver(issue_id)) or exists(select 1 from public.issues i where i.id = issue_id and i.created_by = (select auth.uid()))
);
create policy resolutions_insert_allowed on public.resolution_attempts for insert to authenticated with check (
  submitted_by = (select auth.uid()) and ((select private.is_officer()) or (select private.is_assigned_solver(issue_id)))
);

create policy evidence_read_allowed on public.evidence for select to authenticated using (
  uploader_id = (select auth.uid()) or (select private.is_officer()) or
  (issue_id is not null and (select private.is_assigned_solver(issue_id))) or
  exists(select 1 from public.reports r where r.id = report_id and r.reporter_id = (select auth.uid()))
);
create policy evidence_insert_own on public.evidence for insert to authenticated with check (uploader_id = (select auth.uid()));

create policy history_read_allowed on public.historical_reports for select to authenticated using (
  (select private.is_officer()) or (select private.is_assigned_solver(issue_id)) or
  exists(select 1 from public.issues i where i.id = issue_id and (i.created_by = (select auth.uid()) or i.verifier_id = (select auth.uid())))
);
create policy history_insert_officer on public.historical_reports for insert to authenticated with check ((select private.is_officer()) and created_by = (select auth.uid()));
create policy history_update_officer on public.historical_reports for update to authenticated using ((select private.is_officer())) with check ((select private.is_officer()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('evidence','evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy evidence_objects_insert_own on storage.objects for insert to authenticated with check (
  bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy evidence_objects_read_allowed on storage.objects for select to authenticated using (
  bucket_id = 'evidence' and (
    owner_id = (select auth.uid())::text or (select private.is_officer()) or
    exists(select 1 from public.evidence e where e.storage_path = name and e.issue_id is not null and (select private.is_assigned_solver(e.issue_id)))
  )
);
create policy evidence_objects_delete_own on storage.objects for delete to authenticated using (
  bucket_id = 'evidence' and owner_id = (select auth.uid())::text
);

insert into public.organizations(name, type) values
  ('Municipal Roads Cell','department'), ('Drainage & Sanitation Cell','department'),
  ('Public Health & Vector Control','department'), ('Water Services Cell','department'),
  ('Electricity Services Desk','provider'), ('Telecom & Provider Review Desk','provider'),
  ('Animal Welfare Cell','department'), ('Community Disturbance Review','department')
on conflict (name) do nothing;

-- Remove broad default table privileges before applying the explicit grants above.
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
grant select on public.organizations, public.issues, public.profiles to authenticated;
grant update(full_name) on public.profiles to authenticated;
grant select, insert on public.reports, public.evidence, public.issue_events, public.resolution_attempts, public.assignments to authenticated;
grant update(status, acknowledged_at) on public.assignments to authenticated;
grant select, insert, update on public.historical_reports to authenticated;
grant insert, update on public.issues to authenticated;

create index if not exists profiles_org_idx on public.profiles(organization_id);
create index if not exists issues_creator_idx on public.issues(created_by);
create index if not exists issues_verifier_idx on public.issues(verifier_id);
create index if not exists issues_department_idx on public.issues(department_id);
create index if not exists issues_predecessor_idx on public.issues(predecessor_issue_id);
create index if not exists events_actor_idx on public.issue_events(actor_id);
create index if not exists assignments_by_idx on public.assignments(assigned_by);
create index if not exists resolutions_submitter_idx on public.resolution_attempts(submitted_by);
create index if not exists resolutions_verifier_idx on public.resolution_attempts(verifier_id);
create index if not exists evidence_report_idx on public.evidence(report_id);
create index if not exists evidence_issue_idx on public.evidence(issue_id);
create index if not exists evidence_resolution_idx on public.evidence(resolution_attempt_id);
create index if not exists evidence_uploader_idx on public.evidence(uploader_id);
create index if not exists historical_creator_idx on public.historical_reports(created_by);
