create or replace function public.retrieve_issue_history(p_issue_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id = auth.uid() and role = 'officer') then
    raise exception 'Officer access required' using errcode = '42501';
  end if;
  if not exists(select 1 from public.issues where id = p_issue_id) then
    raise exception 'Issue not found' using errcode = 'P0002';
  end if;
  with recursive current_issue as (
    select * from public.issues where id = p_issue_id
  ), ancestors as (
    select i.id, i.predecessor_issue_id, array[c.id, i.id] path, 1 depth
    from current_issue c join public.issues i on i.id = c.predecessor_issue_id
    union all
    select i.id, i.predecessor_issue_id, a.path || i.id, a.depth + 1
    from ancestors a join public.issues i on i.id = a.predecessor_issue_id
    where a.depth < 20 and not i.id = any(a.path)
  ), linked as (
    select i.id from public.issues i cross join current_issue c
    where i.id <> c.id and (i.id in (select id from ancestors) or
      (i.created_at <= c.created_at and coalesce(i.recurrence_family_id,i.id) = coalesce(c.recurrence_family_id,c.id)))
    order by i.created_at desc, i.id limit 20
  ), analogues as (
    select i.id, (1 - (i.embedding operator(extensions.<=>) c.embedding))::double precision similarity
    from public.issues i cross join current_issue c
    where i.id <> c.id and i.id not in (select id from linked)
      and coalesce(i.recurrence_family_id,i.id) <> coalesce(c.recurrence_family_id,c.id)
      and i.demo_source = c.demo_source and i.category = c.category and i.status = 'verified'
      and i.created_at <= c.created_at and i.embedding_model = c.embedding_model
      and i.embedding is not null and c.embedding is not null
      and 1 - (i.embedding operator(extensions.<=>) c.embedding) >=
        case when c.embedding_model = 'local-hash-v1' then .55 else .75 end
    order by i.embedding operator(extensions.<=>) c.embedding, i.id limit 5
  ), selected as (
    select p_issue_id id, 'current'::text relationship, 0 rank, null::double precision similarity
    union all select id, 'linked', 1, null from linked
    union all select id, 'analogous', 2, similarity from analogues
  )
  select jsonb_build_object('sources', jsonb_agg(
    jsonb_build_object(
      'relationship', s.relationship, 'similarity', s.similarity,
      'issue', to_jsonb(i) - array['embedding','created_by','verifier_id'],
      'report_count', (select count(*) from public.reports r where r.issue_id = i.id),
      'reports', coalesce((select jsonb_agg(to_jsonb(r)) from (
        select id, description, occurrence_at, created_at, demo_source from public.reports
        where issue_id = i.id order by occurrence_at desc, id limit 20
      ) r), '[]'::jsonb),
      'resolution_count', (select count(*) from public.resolution_attempts r where r.issue_id = i.id),
      'resolutions', coalesce((select jsonb_agg(to_jsonb(r)) from (
        select id, note, outcome, rejection_reason, created_at, decided_at from public.resolution_attempts
        where issue_id = i.id order by created_at desc, id limit 20
      ) r), '[]'::jsonb),
      'evidence_count', (select count(*) from public.evidence e where e.issue_id = i.id
        or e.report_id in (select id from public.reports where issue_id = i.id)
        or e.resolution_attempt_id in (select id from public.resolution_attempts where issue_id = i.id)),
      'evidence', coalesce((select jsonb_agg(to_jsonb(e)) from (
        select e.id, e.report_id, e.resolution_attempt_id, e.mime_type, e.created_at from public.evidence e
        where e.issue_id = i.id or e.report_id in (select id from public.reports where issue_id = i.id)
          or e.resolution_attempt_id in (select id from public.resolution_attempts where issue_id = i.id)
        order by e.created_at desc, e.id limit 20
      ) e), '[]'::jsonb),
      'events', coalesce((select jsonb_agg(to_jsonb(e)) from (
        select id, event_type, created_at, details from public.issue_events
        where issue_id = i.id order by created_at desc, id limit 20
      ) e), '[]'::jsonb),
      'department', (select name from public.organizations where id = i.department_id),
      'assignments', coalesce((select jsonb_agg(to_jsonb(a)) from (
        select a.id, o.name organization, a.status, a.assigned_at, a.acknowledged_at
        from public.assignments a join public.organizations o on o.id = a.organization_id
        where a.issue_id = i.id order by a.assigned_at desc, a.id limit 10
      ) a), '[]'::jsonb)
    ) order by s.rank, i.created_at desc, i.id
  ), 'limits', jsonb_build_object('linked',20,'analogous',5,'records_per_type',20))
  into result from selected s join public.issues i on i.id = s.id;
  return result;
end; $$;
revoke all on function public.retrieve_issue_history(uuid) from public, anon;
grant execute on function public.retrieve_issue_history(uuid) to authenticated;
-- Historical bundles include cross-issue observations, so only officers may read the raw bundle.
drop policy if exists history_read_allowed on public.historical_reports;
create policy history_read_allowed on public.historical_reports for select to authenticated
using ((select private.is_officer()));
-- Published snapshots are immutable; preparing another report inserts a new version.
drop policy if exists history_update_officer on public.historical_reports;
revoke update, delete on public.historical_reports from authenticated;
