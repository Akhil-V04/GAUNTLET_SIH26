-- Consolidated MVP workflow. Apply after lifecycle_actions.sql and rag.sql.
-- Privileged operations live in private, validate the actor, and expose narrow invoker wrappers.
alter table public.issues add column source_dataset text;
alter table public.issues add column source_id text;
alter table public.issues add column source_url text;
alter table public.issues add column provider_or_asset text;
alter table public.issues add column resolution_path text not null default 'department' check (resolution_path in ('department','solver'));
create unique index issues_source_key on public.issues(source_dataset, source_id) where source_id is not null;
alter table public.assignments add column historical_report_id uuid references public.historical_reports(id);
create index assignments_history_idx on public.assignments(historical_report_id);
create unique index one_pending_resolution on public.resolution_attempts(issue_id) where outcome = 'pending';

create table public.admin_events (
  id uuid primary key default gen_random_uuid(), actor_id uuid not null references public.profiles(id),
  action text not null, details jsonb not null, created_at timestamptz not null default now()
);
alter table public.admin_events enable row level security;
grant select on public.admin_events to authenticated;
create policy admin_events_read on public.admin_events for select to authenticated using ((select private.is_officer()));
create index admin_events_actor_idx on public.admin_events(actor_id);

create or replace function private.workflow_action(p_issue_id uuid, p_action text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); actor_profile public.profiles%rowtype;
  issue public.issues%rowtype; assignment public.assignments%rowtype;
  org public.organizations%rowtype; attempt public.resolution_attempts%rowtype;
  new_id uuid; history_id uuid; note text := trim(coalesce(p_payload->>'note',''));
  outcome text; next_status text; officer boolean; solver boolean;
begin
  if actor is null then raise exception 'Sign in first' using errcode='42501'; end if;
  select * into actor_profile from public.profiles where id=actor;
  officer := actor_profile.role='officer';
  select * into issue from public.issues where id=p_issue_id for update;
  if not found then raise exception 'Issue not found' using errcode='P0002'; end if;
  select * into assignment from public.assignments where issue_id=p_issue_id and status in ('assigned','acknowledged') order by assigned_at desc limit 1;
  solver := coalesce(actor_profile.role='solver' and actor_profile.organization_id=assignment.organization_id,false);
  if p_action <> 'verify' and not (coalesce(officer,false) or solver) then raise exception 'This action is not permitted' using errcode='42501'; end if;
  if p_payload ? 'expectedStatus' and p_payload->>'expectedStatus' is distinct from issue.status then
    raise exception 'Issue changed. Refresh before trying again' using errcode='40001';
  end if;
  if p_action in ('progress','resolve') and solver and (p_payload->>'assignmentId')::uuid is distinct from assignment.id then
    raise exception 'Assignment changed. Refresh before trying again' using errcode='40001';
  end if;

  if p_action='assign' then
    if not officer then raise exception 'Officer access required' using errcode='42501'; end if;
    if issue.status in ('verified','awaiting_verification') then raise exception 'Finish verification before routing this issue'; end if;
    select * into org from public.organizations where id=(p_payload->>'organizationId')::uuid and active;
    if not found then raise exception 'Choose an active organisation'; end if;
    if char_length(note) not between 5 and 3000 then raise exception 'Explain the assignment or modified approach in 5–3,000 characters'; end if;
    if org.type not in ('department','provider') then
      if issue.classification='normal' then raise exception 'Assess and escalate this issue before assigning an external solver'; end if;
      history_id := (p_payload->>'historyId')::uuid;
      if not exists(select 1 from public.historical_reports where id=history_id and issue_id=p_issue_id) then raise exception 'Prepare and select a historical report to forward'; end if;
    end if;
    update public.assignments set status='cancelled' where issue_id=p_issue_id and status in ('assigned','acknowledged');
    insert into public.assignments(issue_id,organization_id,assigned_by,historical_report_id)
    values(p_issue_id,org.id,actor,history_id) returning id into new_id;
    update public.issues set status='assigned', department_id=case when org.type in ('department','provider') then org.id else department_id end,
      resolution_path=case when org.type in ('department','provider') then 'department' else 'solver' end where id=p_issue_id;
    insert into public.issue_events(issue_id,actor_id,event_type,details) values(p_issue_id,actor,'issue_assigned',jsonb_build_object('organization_name',org.name,'note',note,'history_id',history_id,'assignment_id',new_id));
  elsif p_action='escalate' then
    if not officer then raise exception 'Officer access required' using errcode='42501'; end if;
    if issue.status in ('verified','awaiting_verification') then raise exception 'This issue cannot be escalated now'; end if;
    if char_length(note) not between 5 and 3000 then raise exception 'Record the assessment in 5–3,000 characters'; end if;
    if coalesce(p_payload->>'classification','') not in ('recurring','systemic') then raise exception 'Choose recurring or systemic'; end if;
    update public.assignments set status='cancelled' where issue_id=p_issue_id and status in ('assigned','acknowledged');
    update public.issues set classification=p_payload->>'classification',status='escalated',resolution_path='solver' where id=p_issue_id;
    insert into public.issue_events(issue_id,actor_id,event_type,details) values(p_issue_id,actor,'issue_escalated',jsonb_build_object('note',note,'classification',p_payload->>'classification'));
  elsif p_action='progress' then
    if assignment.id is null or issue.status not in ('assigned','in_progress','rework_required') then raise exception 'An active assignment is required; manual review requires reassignment'; end if;
    if char_length(note) not between 5 and 3000 then raise exception 'Add a progress note in 5–3,000 characters'; end if;
    update public.assignments set status='acknowledged',acknowledged_at=coalesce(acknowledged_at,now()) where id=assignment.id;
    update public.issues set status='in_progress' where id=p_issue_id;
    insert into public.issue_events(issue_id,actor_id,event_type,details) values(p_issue_id,actor,'work_progress',jsonb_build_object('note',note,'assignment_id',assignment.id));
  elsif p_action='resolve' then
    if issue.status not in ('assigned','in_progress','rework_required') or assignment.id is null then raise exception 'Assign the issue and complete the work before submitting resolution'; end if;
    if char_length(note) not between 5 and 3000 then raise exception 'Add a resolution note in 5–3,000 characters'; end if;
    if coalesce(p_payload->>'mimeType','') not in ('image/jpeg','image/png','image/webp') or coalesce((p_payload->>'sizeBytes')::integer,0) not between 1 and 5242880 then raise exception 'Invalid evidence image'; end if;
    if split_part(coalesce(p_payload->>'storagePath',''), '/',1)<>actor::text or not exists(select 1 from storage.objects where bucket_id='evidence' and name=p_payload->>'storagePath' and owner_id=actor::text) then raise exception 'Upload your completion evidence first'; end if;
    new_id := (p_payload->>'resolutionId')::uuid;
    insert into public.resolution_attempts(id,issue_id,submitted_by,note,verifier_id)
    values(new_id,p_issue_id,actor,note,coalesce(issue.verifier_id,issue.created_by));
    insert into public.evidence(id,issue_id,resolution_attempt_id,storage_path,uploader_id,mime_type,size_bytes)
    values((p_payload->>'evidenceId')::uuid,p_issue_id,new_id,p_payload->>'storagePath',actor,p_payload->>'mimeType',(p_payload->>'sizeBytes')::integer);
    update public.issues set status='awaiting_verification' where id=p_issue_id;
    insert into public.issue_events(issue_id,actor_id,event_type,details) values(p_issue_id,actor,'resolution_submitted',jsonb_build_object('resolution_id',new_id,'note',note));
  elsif p_action='verify' then
    select * into attempt from public.resolution_attempts where id=(p_payload->>'resolutionId')::uuid and issue_id=p_issue_id for update;
    if not found then raise exception 'Resolution not found'; end if;
    if actor is distinct from attempt.verifier_id and not coalesce(officer,false) then raise exception 'Only the designated citizen or officer may verify' using errcode='42501'; end if;
    if actor=attempt.submitted_by and issue.demo_source='live' then raise exception 'A different citizen or authority must verify your work'; end if;
    if issue.status<>'awaiting_verification' or attempt.outcome<>'pending' then raise exception 'Resolution already decided or no longer pending' using errcode='40001'; end if;
    outcome := p_payload->>'outcome';
    if coalesce(outcome,'') not in ('accepted','rejected') then raise exception 'Choose accept or reject'; end if;
    if outcome='rejected' and char_length(note) not between 5 and 500 then raise exception 'Explain rejection in 5–500 characters'; end if;
    update public.resolution_attempts set outcome=workflow_action.outcome,rejection_reason=case when workflow_action.outcome='rejected' then note end,decided_at=now() where id=attempt.id;
    -- Decision trigger records closure/rework and the immutable audit event.
  else raise exception 'Unknown workflow action'; end if;
  select status into next_status from public.issues where id=p_issue_id;
  return jsonb_build_object('id',new_id,'status',next_status);
end; $$;
revoke all on function private.workflow_action(uuid,text,jsonb) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.workflow_action(uuid,text,jsonb) to authenticated;
create or replace function public.workflow_action(p_issue_id uuid,p_action text,p_payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$select private.workflow_action(p_issue_id,p_action,p_payload);$$;
revoke all on function public.workflow_action(uuid,text,jsonb) from public,anon;
grant execute on function public.workflow_action(uuid,text,jsonb) to authenticated;

create or replace function private.apply_resolution_decision() returns trigger language plpgsql security definer set search_path='' as $$
declare path text;
begin
  if old.outcome<>'pending' or new.outcome not in ('accepted','rejected') then return new; end if;
  select resolution_path into path from public.issues where id=new.issue_id;
  update public.issues set status=case when new.outcome='accepted' then 'verified' when path='solver' then 'manual_review' else 'rework_required' end,
    verified_at=case when new.outcome='accepted' then new.decided_at else null end,
    failed_attempts=failed_attempts+case when new.outcome='rejected' then 1 else 0 end where id=new.issue_id;
  if new.outcome='accepted' then update public.assignments set status='completed' where issue_id=new.issue_id and status in ('assigned','acknowledged');
  elsif path='solver' then update public.assignments set status='cancelled' where issue_id=new.issue_id and status in ('assigned','acknowledged'); end if;
  insert into public.issue_events(issue_id,actor_id,event_type,details) values(new.issue_id,auth.uid(),case when new.outcome='accepted' then 'resolution_verified' else 'resolution_rejected' end,jsonb_build_object('resolution_id',new.id,'reason',new.rejection_reason,'next_step',case when new.outcome='rejected' and path='solver' then 'Officer manual review and reassignment' else null end));
  return new;
end; $$;
revoke all on function private.apply_resolution_decision() from public,anon,authenticated;
-- Prevent direct writes bypassing the state machine. Existing read policies remain.
revoke update on public.issues from authenticated;
revoke insert on public.assignments,public.resolution_attempts from authenticated;
revoke update(status,acknowledged_at) on public.assignments from authenticated;
revoke update(outcome,rejection_reason,decided_at) on public.resolution_attempts from authenticated;
revoke execute on function public.route_issue(uuid,uuid) from authenticated;
revoke execute on function public.submit_resolution(uuid,uuid,text,uuid,text,text,integer) from authenticated;

create or replace function private.admin_action(p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid; org_id uuid; new_role text;
begin
  if actor is null or not private.is_officer() then raise exception 'Officer access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(9284732);
  if p_action='role' then
    target:=(p_payload->>'userId')::uuid; new_role:=p_payload->>'role'; org_id:=(nullif(p_payload->>'organizationId',''))::uuid;
    if target=actor then raise exception 'Another officer must change your role'; end if;
    if coalesce(new_role,'') not in ('citizen','officer','solver') then raise exception 'Invalid role'; end if;
    if new_role='solver' and not exists(select 1 from public.organizations where id=org_id and active) then raise exception 'Choose the solver organisation'; end if;
    if new_role<>'solver' then org_id:=null; end if;
    if not exists(select 1 from public.profiles where id=target) then raise exception 'The user must register first'; end if;
    update public.profiles set role=new_role,organization_id=org_id,updated_at=now() where id=target;
  elsif p_action='organization' then
    if char_length(trim(coalesce(p_payload->>'name',''))) not between 2 and 120 or coalesce(p_payload->>'type','') not in ('department','provider','university','industry','ngo','expert') then raise exception 'Provide an organisation name and valid type'; end if;
    insert into public.organizations(name,type) values(trim(p_payload->>'name'),p_payload->>'type') returning id into org_id;
  else raise exception 'Unknown administration action'; end if;
  insert into public.admin_events(actor_id,action,details) values(actor,p_action,jsonb_build_object('user_id',target,'role',new_role,'organization_id',org_id));
  return jsonb_build_object('ok',true,'organizationId',org_id);
end; $$;
revoke all on function private.admin_action(text,jsonb) from public,anon;
grant execute on function private.admin_action(text,jsonb) to authenticated;
create function public.admin_action(p_action text,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.admin_action(p_action,p_payload);$$;
revoke all on function public.admin_action(text,jsonb) from public,anon;
grant execute on function public.admin_action(text,jsonb) to authenticated;

-- Only the exact snapshot explicitly forwarded to an active solver is shared.
drop policy history_read_allowed on public.historical_reports;
create policy history_read_allowed on public.historical_reports for select to authenticated using (
  (select private.is_officer()) or exists(select 1 from public.assignments a join public.profiles p on p.organization_id=a.organization_id
    where a.historical_report_id=historical_reports.id and a.status in ('assigned','acknowledged') and p.id=(select auth.uid()) and p.role='solver')
);

create function private.import_dataset(p_dataset text,p_source_url text,p_provenance text,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); row jsonb; inserted integer:=0; skipped integer:=0; issue_id uuid;
  parent public.issues%rowtype; occurrence timestamptz; closure timestamptz; provenance text;
begin
  if actor is null or not private.is_officer() then raise exception 'Officer access required' using errcode='42501'; end if;
  if char_length(trim(coalesce(p_dataset,''))) not between 3 and 100 then raise exception 'Dataset name must be 3–100 characters'; end if;
  if coalesce(p_provenance,'') not in ('synthetic','imported') then raise exception 'Imports must be labelled synthetic or imported'; end if;
  if coalesce(p_source_url,'') !~ '^https?://' or char_length(p_source_url)>1000 then raise exception 'Record a valid source URL'; end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 200 then raise exception 'Import 1–200 rows'; end if;
  perform pg_advisory_xact_lock(hashtextextended('dataset:'||trim(p_dataset),0));
  if exists(select 1 from public.issues where source_dataset=trim(p_dataset) and (demo_source<>p_provenance or source_url<>p_source_url)) then raise exception 'Dataset name is already used with a different source or provenance'; end if;
  for row in select value from jsonb_array_elements(p_rows) order by (value->>'occurrence_at')::timestamptz loop
    if char_length(coalesce(row->>'source_id','')) not between 1 and 100 then raise exception 'Source ID is required'; end if;
    if exists(select 1 from public.issues where source_dataset=trim(p_dataset) and source_id=row->>'source_id') then skipped:=skipped+1; continue; end if;
    if coalesce(row->>'category','') not in ('roads','drainage','sanitation','streetlights','mosquitoes','noise','internet','animals','water','electricity','other') then raise exception 'Invalid category'; end if;
    if coalesce(row->>'status','') not in ('open','verified') then raise exception 'Invalid source status'; end if;
    occurrence:=(row->>'occurrence_at')::timestamptz; closure:=(row->>'verified_at')::timestamptz;
    if occurrence is null or occurrence>now() then raise exception 'Invalid occurrence date'; end if;
    if row->>'status'='verified' and (closure is null or closure<=occurrence or closure>now() or char_length(trim(coalesce(row->>'resolution_note',''))) not between 5 and 3000) then raise exception 'Verified history needs recorded closure dates and intervention'; end if;
    if row->>'status'='open' and (closure is not null or nullif(row->>'resolution_note','') is not null) then raise exception 'Open history cannot contain verified closure'; end if;
    parent:=null;
    if nullif(row->>'predecessor_source_id','') is not null then
      select * into parent from public.issues where source_dataset=trim(p_dataset) and source_id=row->>'predecessor_source_id';
      if not found or parent.status<>'verified' or parent.verified_at>=occurrence or parent.provider_or_asset is distinct from nullif(row->>'provider_or_asset','') then raise exception 'Predecessor must exist, be verified earlier, and concern the same provider/asset'; end if;
    end if;
    insert into public.issues(title,category,status,latitude,longitude,location_label,created_by,verifier_id,created_at,verified_at,demo_source,
      source_dataset,source_id,source_url,embedding,embedding_model,predecessor_issue_id,classification,prior_verified_occurrences,provider_or_asset)
    values(row->>'title',row->>'category',row->>'status',(row->>'latitude')::double precision,(row->>'longitude')::double precision,row->>'location_label',actor,actor,occurrence,closure,p_provenance,
      trim(p_dataset),row->>'source_id',p_source_url,(row->>'embedding')::extensions.vector,'local-hash-v1',parent.id,case when parent.id is null then 'normal' else 'recurring' end,coalesce(parent.prior_verified_occurrences+1,0),nullif(row->>'provider_or_asset','')) returning id into issue_id;
    insert into public.reports(issue_id,reporter_id,description,selected_category,occurrence_at,latitude,longitude,location_label,processing_status,idempotency_key,demo_source,created_at,embedding,embedding_model,match_outcome,extraction,provider_or_asset)
    values(issue_id,actor,row->>'description',row->>'category',occurrence,(row->>'latitude')::double precision,(row->>'longitude')::double precision,row->>'location_label','processed',gen_random_uuid(),p_provenance,occurrence,(row->>'embedding')::extensions.vector,'local-hash-v1',case when parent.id is null then 'new_issue' else 'resolved_match' end,jsonb_build_object('source_id',row->>'source_id','dataset',p_dataset,'engine','local-import'),nullif(row->>'provider_or_asset',''));
    if row->>'status'='verified' then
      insert into public.resolution_attempts(issue_id,submitted_by,note,outcome,verifier_id,created_at,decided_at)
      values(issue_id,actor,row->>'resolution_note','accepted',actor,closure,closure);
    end if;
    insert into public.issue_events(issue_id,actor_id,event_type,details) values(issue_id,actor,'source_record_imported',jsonb_build_object('dataset',p_dataset,'source_id',row->>'source_id','provenance',p_provenance,'note','Imported source record; not an independently verified Gauntlet repair.'));
    inserted:=inserted+1;
  end loop;
  insert into public.admin_events(actor_id,action,details) values(actor,'dataset_import',jsonb_build_object('dataset',p_dataset,'inserted',inserted,'skipped',skipped,'provenance',p_provenance));
  return jsonb_build_object('inserted',inserted,'skipped',skipped);
end; $$;
revoke all on function private.import_dataset(text,text,text,jsonb) from public,anon;
grant execute on function private.import_dataset(text,text,text,jsonb) to authenticated;
create function public.import_dataset(p_dataset text,p_source_url text,p_provenance text,p_rows jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.import_dataset(p_dataset,p_source_url,p_provenance,p_rows);$$;
revoke all on function public.import_dataset(text,text,text,jsonb) from public,anon;
grant execute on function public.import_dataset(text,text,text,jsonb) to authenticated;

-- Serialize matching decisions and keep test/imported rows separate from live submissions.
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
  perform pg_advisory_xact_lock(hashtextextended('report:'||p_category,0));
  if p_occurrence_at is null or p_occurrence_at>now() then raise exception 'Occurrence time cannot be in the future'; end if;
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
  where i.demo_source = 'live' and i.category = p_category
    and i.provider_or_asset is not distinct from nullif(lower(trim(p_provider_or_asset)), '')
    and (i.status <> 'verified' or i.verified_at < p_occurrence_at) and i.embedding_model = p_embedding_model and i.embedding is not null
    and abs(i.latitude - p_latitude) <= radius_m / 111320
    and abs(i.longitude - p_longitude) <= radius_m / (111320 * greatest(abs(cos(radians(p_latitude))), .2))
    and (1 - (i.embedding OPERATOR(extensions.<=>) p_embedding)) >= threshold
  order by (i.status = 'verified'), i.embedding OPERATOR(extensions.<=>) p_embedding, i.created_at desc limit 1;

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
      unique_reporters, prior_verified_occurrences, embedding, embedding_model, provider_or_asset
    ) values (
      trim(p_title), p_category, p_severity, 'normal', 'open', p_latitude, p_longitude, trim(p_location_label),
      actor, actor, case when target.id is null then null else coalesce(target.recurrence_family_id, target.id) end,
      target.id, 0, 0, 0, p_embedding, p_embedding_model, nullif(lower(trim(p_provider_or_asset)), '')
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
