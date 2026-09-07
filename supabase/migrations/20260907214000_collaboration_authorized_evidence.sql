-- Evidence is private to its uploader and the accountable owner of an adopted challenge.

create or replace function collab_private.can_read_problem_evidence(object_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.collab_problems p
    where p.evidence_path = object_name
      and (
        p.author_id = (select auth.uid())
        or exists (
          select 1 from public.collab_challenges c
          where c.problem_id = p.id and (select collab_private.is_challenge_owner(c.id))
        )
      )
  );
$$;

revoke all on function collab_private.can_read_problem_evidence(text) from public, anon;
grant execute on function collab_private.can_read_problem_evidence(text) to authenticated;

drop policy "collaboration owners read evidence" on storage.objects;
create policy "collaboration authorized users read evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'collaboration'
  and (
    owner_id = (select auth.uid())::text
    or (select collab_private.can_read_problem_evidence(name))
  )
);
