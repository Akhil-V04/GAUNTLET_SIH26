-- Organisation membership consent and forming-team discovery for interested students.

drop policy "collab teams are visible to participants" on public.collab_teams;
create policy "collab teams are visible to participants"
on public.collab_teams for select to authenticated
using (
  (select collab_private.has_team_relationship(id))
  or (select collab_private.is_challenge_owner(challenge_id))
  or (
    status in ('forming', 'ready')
    and exists (
      select 1 from public.collab_interests i
      where i.challenge_id = collab_teams.challenge_id
        and i.student_id = (select auth.uid())
    )
  )
);

create or replace function public.collab_organization_membership_command(
  p_action text,
  p_organization_id uuid,
  p_user_id uuid default null,
  p_role text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
  v_status text;
begin
  if v_user is null then raise exception 'Sign in first.'; end if;
  if p_action = 'invite' then
    if p_role not in ('coordinator', 'reviewer') then raise exception 'Choose coordinator or reviewer.'; end if;
    if not exists (
      select 1 from public.collab_organization_memberships m
      where m.organization_id = p_organization_id and m.user_id = v_user
        and m.membership_status = 'active' and m.membership_role in ('owner', 'coordinator')
    ) then raise exception 'Organisation owner access required.'; end if;
    if not exists (select 1 from public.collab_profiles p where p.id = p_user_id) then
      raise exception 'Gauntlet profile not found.';
    end if;
    insert into public.collab_organization_memberships(organization_id,user_id,membership_role,membership_status)
    values (p_organization_id,p_user_id,p_role,'pending')
    on conflict (organization_id,user_id) do update set
      membership_role=excluded.membership_role, membership_status='pending', updated_at=now()
    where public.collab_organization_memberships.membership_status='revoked';
    if not found then raise exception 'This membership already exists.'; end if;
    v_target := p_user_id;
    v_status := 'pending';
  elsif p_action = 'respond' then
    if p_role not in ('accept','decline') then raise exception 'Choose accept or decline.'; end if;
    update public.collab_organization_memberships
      set membership_status=case when p_role='accept' then 'active' else 'revoked' end, updated_at=now()
      where organization_id=p_organization_id and user_id=v_user and membership_status='pending';
    if not found then raise exception 'Pending organisation invitation not found.'; end if;
    v_target := v_user;
    v_status := case when p_role='accept' then 'active' else 'revoked' end;
  else
    raise exception 'Unknown organisation membership action.';
  end if;
  insert into public.collab_activity(actor_id,entity_type,entity_id,action,details,visibility)
  values (v_user,'organization',p_organization_id,'membership_'||p_action,
    jsonb_build_object('user_id',v_target,'status',v_status),'participants');
  return jsonb_build_object('organization_id',p_organization_id,'user_id',v_target,'status',v_status);
end;
$$;

revoke all on function public.collab_organization_membership_command(text,uuid,uuid,text) from public,anon;
grant execute on function public.collab_organization_membership_command(text,uuid,uuid,text) to authenticated;
