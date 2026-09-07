-- Opted-out profiles remain hidden from discovery but visible inside an accepted team workflow.

create or replace function collab_private.can_view_profile(target_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1
      from public.collab_team_members viewer
      join public.collab_team_members target on target.team_id = viewer.team_id
      where viewer.user_id = (select auth.uid()) and viewer.membership_status = 'active'
        and target.user_id = target_user_id and target.membership_status = 'active'
    )
    or exists (
      select 1
      from public.collab_team_members target
      where target.user_id = target_user_id and target.membership_status = 'active'
        and (select collab_private.is_challenge_owner(target.challenge_id))
    )
  );
$$;

revoke all on function collab_private.can_view_profile(uuid) from public, anon;
grant execute on function collab_private.can_view_profile(uuid) to authenticated;

drop policy "collab public profiles are discoverable" on public.collab_profiles;
create policy "collab visitors read discoverable profiles"
on public.collab_profiles for select to anon
using (discoverable);
create policy "collab members read permitted profiles"
on public.collab_profiles for select to authenticated
using (
  discoverable
  or id = (select auth.uid())
  or (select collab_private.can_view_profile(id))
);
