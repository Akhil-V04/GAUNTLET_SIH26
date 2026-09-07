-- Officer routing and evidence-backed resolution workflow.

create or replace function public.route_issue(p_issue_id uuid, p_organization_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  assignment_id uuid;
  organization_name text;
begin
  if actor is null or not exists (
    select 1 from public.profiles where id = actor and role = 'officer'
  ) then raise exception 'Officer access required'; end if;

  select name into organization_name from public.organizations
  where id = p_organization_id and active and type in ('department', 'provider');
  if organization_name is null then raise exception 'Choose an active department or provider'; end if;
  if not exists (select 1 from public.issues where id = p_issue_id) then raise exception 'Issue not found'; end if;

  update public.assignments set status = 'cancelled'
  where issue_id = p_issue_id and status in ('assigned', 'acknowledged');
  insert into public.assignments(issue_id, organization_id, assigned_by)
  values (p_issue_id, p_organization_id, actor) returning id into assignment_id;
  update public.issues set department_id = p_organization_id, status = 'assigned'
  where id = p_issue_id;
  insert into public.issue_events(issue_id, actor_id, event_type, details)
  values (p_issue_id, actor, 'department_assigned', jsonb_build_object(
    'assignment_id', assignment_id, 'organization_id', p_organization_id,
    'organization_name', organization_name
  ));
  return assignment_id;
end; $$;
revoke all on function public.route_issue(uuid, uuid) from public, anon;
grant execute on function public.route_issue(uuid, uuid) to authenticated;

create or replace function public.submit_resolution(
  p_issue_id uuid, p_resolution_id uuid, p_note text, p_evidence_id uuid,
  p_storage_path text, p_mime_type text, p_size_bytes integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  verifier uuid;
begin
  if actor is null or not exists (
    select 1 from public.profiles where id = actor and role = 'officer'
  ) then raise exception 'Officer access required'; end if;
  if char_length(trim(p_note)) not between 5 and 3000 then raise exception 'Resolution note must contain 5 to 3,000 characters'; end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp') or p_size_bytes not between 1 and 5242880 then
    raise exception 'Evidence must be a JPG, PNG or WebP image no larger than 5 MB';
  end if;
  if p_storage_path not like actor::text || '/%' then raise exception 'Invalid evidence path'; end if;

  select coalesce(verifier_id, created_by) into verifier from public.issues
  where id = p_issue_id and status not in ('verified');
  if verifier is null then raise exception 'Issue cannot be resolved'; end if;

  insert into public.resolution_attempts(id, issue_id, submitted_by, note, verifier_id)
  values (p_resolution_id, p_issue_id, actor, trim(p_note), verifier);
  insert into public.evidence(id, issue_id, resolution_attempt_id, storage_path, uploader_id, mime_type, size_bytes)
  values (p_evidence_id, p_issue_id, p_resolution_id, p_storage_path, actor, p_mime_type, p_size_bytes);
  update public.issues set status = 'awaiting_verification', verifier_id = verifier where id = p_issue_id;
  insert into public.issue_events(issue_id, actor_id, event_type, details)
  values (p_issue_id, actor, 'resolution_submitted', jsonb_build_object('resolution_id', p_resolution_id));
  return p_resolution_id;
end; $$;
revoke all on function public.submit_resolution(uuid,uuid,text,uuid,text,text,integer) from public, anon;
grant execute on function public.submit_resolution(uuid,uuid,text,uuid,text,text,integer) to authenticated;

drop policy if exists evidence_read_allowed on public.evidence;
create policy evidence_read_allowed on public.evidence for select to authenticated using (
  uploader_id = (select auth.uid()) or (select private.is_officer()) or
  (issue_id is not null and (select private.is_assigned_solver(issue_id))) or
  exists(select 1 from public.reports r where r.id = report_id and r.reporter_id = (select auth.uid())) or
  exists(select 1 from public.issues i where i.id = issue_id and (i.created_by = (select auth.uid()) or i.verifier_id = (select auth.uid())))
);

drop policy if exists evidence_objects_read_allowed on storage.objects;
create policy evidence_objects_read_allowed on storage.objects for select to authenticated using (
  bucket_id = 'evidence' and (
    owner_id = (select auth.uid())::text or (select private.is_officer()) or
    exists(select 1 from public.evidence e where e.storage_path = name and e.issue_id is not null and (
      (select private.is_assigned_solver(e.issue_id)) or exists(
        select 1 from public.issues i where i.id = e.issue_id and (i.created_by = (select auth.uid()) or i.verifier_id = (select auth.uid()))
      )
    ))
  )
);
