begin;
create temporary table rag_fixture(name text primary key, id uuid not null default gen_random_uuid()) on commit drop;
insert into rag_fixture(name) values ('officer'),('citizen'),('past'),('current'),('analogue'),('wrong_model'),('wrong_category'),('wrong_provenance'),('empty');
grant select on rag_fixture to authenticated;
insert into auth.users(id,email,raw_user_meta_data)
select id,name || '-' || id || '@example.invalid',jsonb_build_object('full_name','RAG test ' || name)
from rag_fixture where name in ('officer','citizen');
update public.profiles set role='officer' where id=(select id from rag_fixture where name='officer');

insert into public.issues(id,title,category,status,latitude,longitude,location_label,created_by,verifier_id,
  embedding,embedding_model,demo_source,created_at,verified_at)
select f.id, 'RAG test ' || f.name,case when f.name='wrong_category' then 'water' else 'drainage' end,
  case when f.name='empty' then 'open' else 'verified' end,23.34,85.30,'Test location',
  u.id,u.id,array_prepend(1::real,array_fill(0::real,array[1535]))::extensions.vector,
  case when f.name='wrong_model' then 'different-model' else 'local-hash-v1' end,
  case when f.name='wrong_provenance' then 'live' else 'synthetic' end,
  now()-interval '10 days',case when f.name='empty' then null else now()-interval '5 days' end
from rag_fixture f cross join rag_fixture u where u.name='officer'
and f.name in ('past','analogue','wrong_model','wrong_category','wrong_provenance','empty');

insert into public.issues(id,title,category,status,latitude,longitude,location_label,created_by,verifier_id,
  embedding,embedding_model,demo_source,predecessor_issue_id,recurrence_family_id)
select c.id,'RAG current drain overflow','drainage','open',23.34,85.30,'Test location',u.id,u.id,
 array_prepend(1::real,array_fill(0::real,array[1535]))::extensions.vector,'local-hash-v1','synthetic',p.id,p.id
from rag_fixture c cross join rag_fixture p cross join rag_fixture u
where c.name='current' and p.name='past' and u.name='officer';

update public.issues set created_by=(select id from rag_fixture where name='citizen'), verifier_id=(select id from rag_fixture where name='citizen') where id=(select id from rag_fixture where name='current');

insert into public.resolution_attempts(issue_id,submitted_by,verifier_id,note,outcome,rejection_reason,decided_at)
select p.id,u.id,u.id,'Drain was cleared but remained blocked','rejected','Still blocked',now()-interval '6 days'
from rag_fixture p cross join rag_fixture u where p.name='past' and u.name='officer';

set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from rag_fixture where name='officer'),true);
do $test$
declare result jsonb; empty_result jsonb; target uuid; report_id uuid; rejected boolean := false;
begin
  select id into target from rag_fixture where name='current';
  result := public.retrieve_issue_history(target);
  if jsonb_array_length(result->'sources') <> 3 then raise exception 'Expected current, linked and one analogue'; end if;
  if (select count(*) from jsonb_array_elements(result->'sources') s where s->>'relationship'='linked') <> 1 then raise exception 'Linked case missing'; end if;
  if (select count(*) from jsonb_array_elements(result->'sources') s where s->>'relationship'='analogous') <> 1 then raise exception 'Analogue missing'; end if;
  if not exists(select 1 from jsonb_array_elements(result->'sources') s
    where s->>'relationship'='linked' and s->'resolutions'->0->>'rejection_reason'='Still blocked') then raise exception 'Resolution evidence missing'; end if;
  if exists(select 1 from jsonb_array_elements(result->'sources') s where s->'issue' ? 'embedding' or s->'issue' ? 'created_by') then raise exception 'Unnecessary private fields exposed'; end if;
  if exists(select 1 from jsonb_array_elements(result->'sources') s where (s->'issue'->>'id')::uuid in (select id from rag_fixture where name like 'wrong_%')) then raise exception 'Incompatible analogue included'; end if;
  empty_result := public.retrieve_issue_history((select id from rag_fixture where name='wrong_category'));
  if jsonb_array_length(empty_result->'sources') <> 1 then raise exception 'Empty history fabricated sources'; end if;
  insert into public.historical_reports(issue_id,created_by,source_issue_ids,summary,generation_status,version)
  values(target,auth.uid(),array(select (s->'issue'->>'id')::uuid from jsonb_array_elements(result->'sources') s),result,'unavailable',1)
  returning id into report_id;
  begin
    insert into public.historical_reports(issue_id,created_by,summary,version) values(target,auth.uid(),result,1);
  exception when unique_violation then rejected := true; end;
  if not rejected then raise exception 'Duplicate version was permitted'; end if;
  if not exists(select 1 from public.historical_reports where id=report_id and generation_status='unavailable') then raise exception 'Factual fallback not saved'; end if;
end $test$;

select set_config('request.jwt.claim.sub',(select id::text from rag_fixture where name='citizen'),true);
do $test$
declare rejected boolean := false;
begin
  begin
    perform public.retrieve_issue_history((select id from rag_fixture where name='current'));
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Citizen gained officer retrieval access'; end if;
  if has_table_privilege('authenticated','public.historical_reports','update') then raise exception 'Saved versions can be overwritten'; end if;
  if exists(select 1 from public.historical_reports) then raise exception 'Unrelated citizen could read report'; end if;
  if has_function_privilege('anon','public.retrieve_issue_history(uuid)','execute') then raise exception 'Anonymous RPC access enabled'; end if;
end $test$;
reset role;
select 'PASS: retrieval, linked versus analogous, model/category/provenance isolation, outcomes, empty history, version uniqueness, citizen and anonymous access' as result;
rollback;
