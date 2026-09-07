alter table public.issues add column if not exists embedding extensions.vector(1536);
alter table public.issues add column if not exists embedding_model text;
alter table public.reports add column if not exists match_outcome text check (match_outcome in ('new_issue','active_match','resolved_match'));

create index if not exists issues_embedding_hnsw on public.issues using hnsw (embedding extensions.vector_cosine_ops);

drop policy issues_insert_citizen on public.issues;
create policy issues_insert_citizen on public.issues for insert to authenticated with check (
  created_by = (select auth.uid()) and verifier_id = (select auth.uid()) and
  status = 'open' and classification = 'normal' and priority = 0 and
  unique_reporters in (0, 1) and prior_verified_occurrences = 0 and failed_attempts = 0 and
  department_id is null and verified_at is null and demo_source = 'live' and
  (predecessor_issue_id is null or recurrence_family_id is not null)
);

create or replace function private.validate_issue_recurrence_link() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  previous public.issues%rowtype;
  radius_m numeric := case when new.category = 'streetlights' then 120 when new.category = 'internet' then 250 else 500 end;
  threshold numeric := case when new.embedding_model = 'local-hash-v1' then .55 else .82 end;
begin
  if new.predecessor_issue_id is null then
    new.recurrence_family_id := null;
    return new;
  end if;
  select i.* into previous from public.issues i where i.id = new.predecessor_issue_id and i.status = 'verified';
  if previous.id is null or previous.category <> new.category or previous.embedding is null or new.embedding is null or
     previous.embedding_model is distinct from new.embedding_model or
     abs(previous.latitude - new.latitude) > radius_m / 111320 or
     abs(previous.longitude - new.longitude) > radius_m / (111320 * greatest(abs(cos(radians(new.latitude))), .2)) or
     (1 - (previous.embedding OPERATOR(extensions.<=>) new.embedding)) < threshold then
    raise exception 'Invalid recurrence link';
  end if;
  new.recurrence_family_id := coalesce(previous.recurrence_family_id, previous.id);
  return new;
end; $$;
revoke all on function private.validate_issue_recurrence_link() from public, anon, authenticated;
drop trigger if exists validate_issue_recurrence_before_insert on public.issues;
create trigger validate_issue_recurrence_before_insert before insert on public.issues
for each row execute function private.validate_issue_recurrence_link();

create or replace function private.refresh_issue_priority() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  reporter_count integer;
  previous_count integer;
  severity_factor numeric;
begin
  select count(distinct reporter_id)::integer into reporter_count
  from public.reports where issue_id = new.issue_id;

  select case severity when 'low' then .25 when 'medium' then .5 when 'high' then .75 else 1 end,
         case when predecessor_issue_id is null then prior_verified_occurrences
              else greatest(prior_verified_occurrences, coalesce((select p.prior_verified_occurrences + 1 from public.issues p where p.id = predecessor_issue_id), 1)) end
  into severity_factor, previous_count from public.issues where id = new.issue_id;

  update public.issues set
    unique_reporters = reporter_count,
    prior_verified_occurrences = previous_count,
    classification = case when previous_count > 0 then 'recurring' else classification end,
    priority = least(100, round(
      40 * severity_factor +
      25 * least(reporter_count::numeric / 10, 1) +
      20 * least(previous_count::numeric / 3, 1) +
      15 * least(extract(epoch from (now() - created_at)) / 604800, 1)
    )::integer)
  where id = new.issue_id;
  return new;
end; $$;
revoke all on function private.refresh_issue_priority() from public, anon, authenticated;
drop trigger if exists refresh_issue_priority_after_report on public.reports;
create trigger refresh_issue_priority_after_report after insert on public.reports
for each row execute function private.refresh_issue_priority();

create or replace function public.submit_report(
  p_description text, p_category text, p_title text, p_severity text,
  p_occurrence_at timestamptz, p_latitude double precision, p_longitude double precision,
  p_location_label text, p_duration_text text, p_provider_or_asset text,
  p_embedding extensions.vector(1536), p_embedding_model text, p_extraction jsonb,
  p_idempotency_key uuid
) returns table(report_id uuid, issue_id uuid, match_outcome text, similarity real, priority integer)
language plpgsql security invoker set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  target public.issues%rowtype;
  target_similarity real;
  new_issue_id uuid;
  new_report_id uuid;
  outcome text;
  radius_m numeric := case when p_category = 'streetlights' then 120 when p_category = 'internet' then 250 else 500 end;
  threshold numeric := case when p_embedding_model = 'local-hash-v1' then .55 else .82 end;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if p_category not in ('roads','drainage','sanitation','streetlights','mosquitoes','noise','internet','animals','water','electricity','other') then raise exception 'Invalid category'; end if;
  if p_severity not in ('low','medium','high','critical') then raise exception 'Invalid severity'; end if;
  if char_length(trim(p_description)) not between 10 and 3000 or char_length(trim(p_title)) not between 3 and 160 then raise exception 'Invalid report text'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Invalid coordinates'; end if;

  select r.id, r.issue_id, r.match_outcome, i.priority
  into new_report_id, new_issue_id, outcome, priority
  from public.reports r join public.issues i on i.id = r.issue_id
  where r.reporter_id = actor and r.idempotency_key = p_idempotency_key;
  if found then return query select new_report_id, new_issue_id, outcome, null::real, priority; return; end if;

  select i.* into target
  from public.issues i
  where i.category = p_category and i.embedding_model = p_embedding_model and i.embedding is not null
    and abs(i.latitude - p_latitude) <= radius_m / 111320
    and abs(i.longitude - p_longitude) <= radius_m / (111320 * greatest(abs(cos(radians(p_latitude))), .2))
    and (1 - (i.embedding OPERATOR(extensions.<=>) p_embedding)) >= threshold
  order by i.embedding OPERATOR(extensions.<=>) p_embedding, i.created_at desc limit 1;

  if target.id is not null then
    target_similarity := (1 - (target.embedding OPERATOR(extensions.<=>) p_embedding))::real;
  end if;

  if target.id is not null and target.status <> 'verified' then
    new_issue_id := target.id; outcome := 'active_match';
  else
    outcome := case when target.id is not null then 'resolved_match' else 'new_issue' end;
    insert into public.issues(
      title, category, severity, classification, status, latitude, longitude, location_label,
      created_by, verifier_id, recurrence_family_id, predecessor_issue_id, priority,
      unique_reporters, prior_verified_occurrences, embedding, embedding_model
    ) values (
      trim(p_title), p_category, p_severity, 'normal', 'open', p_latitude, p_longitude, trim(p_location_label),
      actor, actor, case when target.id is null then null else coalesce(target.recurrence_family_id, target.id) end,
      target.id, 0, 0, 0, p_embedding, p_embedding_model
    ) returning id into new_issue_id;
  end if;

  insert into public.reports(
    issue_id, reporter_id, description, selected_category, occurrence_at, duration_text,
    provider_or_asset, latitude, longitude, location_label, processing_status, embedding,
    embedding_model, extraction, idempotency_key, match_outcome
  ) values (
    new_issue_id, actor, trim(p_description), p_category, coalesce(p_occurrence_at, now()), nullif(trim(p_duration_text), ''),
    nullif(trim(p_provider_or_asset), ''), p_latitude, p_longitude, trim(p_location_label), 'processed', p_embedding,
    p_embedding_model, coalesce(p_extraction, '{}'::jsonb), p_idempotency_key, outcome
  ) returning id into new_report_id;

  select i.priority into priority from public.issues i where i.id = new_issue_id;
  return query select new_report_id, new_issue_id, outcome, target_similarity, priority;
end; $$;
revoke all on function public.submit_report(text,text,text,text,timestamptz,double precision,double precision,text,text,text,extensions.vector,text,jsonb,uuid) from public, anon;
grant execute on function public.submit_report(text,text,text,text,timestamptz,double precision,double precision,text,text,text,extensions.vector,text,jsonb,uuid) to authenticated;

grant update(outcome, rejection_reason, decided_at) on public.resolution_attempts to authenticated;
drop policy if exists resolutions_update_verifier on public.resolution_attempts;
create policy resolutions_update_verifier on public.resolution_attempts for update to authenticated
using (outcome = 'pending' and (verifier_id = (select auth.uid()) or (select private.is_officer())))
with check (outcome in ('accepted','rejected') and (verifier_id = (select auth.uid()) or (select private.is_officer())));

create or replace function private.apply_resolution_decision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.outcome = 'pending' and new.outcome = 'accepted' then
    update public.issues set status = 'verified', verified_at = coalesce(new.decided_at, now()) where id = new.issue_id;
    insert into public.issue_events(issue_id, actor_id, event_type, details)
    values (new.issue_id, (select auth.uid()), 'resolution_verified', jsonb_build_object('resolution_id', new.id));
  elsif old.outcome = 'pending' and new.outcome = 'rejected' then
    update public.issues set status = 'rework_required', failed_attempts = failed_attempts + 1 where id = new.issue_id;
    insert into public.issue_events(issue_id, actor_id, event_type, details)
    values (new.issue_id, (select auth.uid()), 'resolution_rejected', jsonb_build_object('resolution_id', new.id, 'reason', new.rejection_reason));
  end if;
  return new;
end; $$;
revoke all on function private.apply_resolution_decision() from public, anon, authenticated;
drop trigger if exists apply_resolution_decision_after_update on public.resolution_attempts;
create trigger apply_resolution_decision_after_update after update of outcome on public.resolution_attempts
for each row execute function private.apply_resolution_decision();
