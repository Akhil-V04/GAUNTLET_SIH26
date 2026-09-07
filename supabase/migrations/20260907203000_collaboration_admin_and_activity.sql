-- Complete platform moderation visibility and participant activity access.

drop policy "collab organizations are publicly readable" on public.collab_organizations;
create policy "collab visitors read visible organizations"
on public.collab_organizations for select to anon
using (verification_status <> 'rejected');
create policy "collab members read permitted organizations"
on public.collab_organizations for select to authenticated
using (
  verification_status <> 'rejected'
  or created_by = (select auth.uid())
  or (select collab_private.is_platform_admin())
);

drop policy "collab memberships are visible to participants" on public.collab_organization_memberships;
create policy "collab memberships are visible to participants"
on public.collab_organization_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or (select collab_private.is_org_member(organization_id))
  or (select collab_private.is_platform_admin())
);

drop policy "collab activity is visible to relevant users" on public.collab_activity;
create policy "collab activity is visible to relevant users"
on public.collab_activity for select to authenticated
using (
  visibility = 'public'
  or actor_id = (select auth.uid())
  or (entity_type = 'challenge' and (select collab_private.is_challenge_owner(entity_id)))
  or (entity_type = 'team' and (select collab_private.has_team_relationship(entity_id)))
  or (
    entity_type = 'application' and exists (
      select 1 from public.collab_applications a
      where a.id = entity_id
        and (
          (select collab_private.is_team_member(a.team_id))
          or (select collab_private.is_challenge_owner(a.challenge_id))
        )
    )
  )
  or (
    entity_type = 'contribution' and exists (
      select 1 from public.collab_contributions c
      where c.id = entity_id
        and (
          c.submitted_by = (select auth.uid())
          or (select collab_private.is_team_member(c.team_id))
          or (select collab_private.is_challenge_owner(c.challenge_id))
        )
    )
  )
  or (select collab_private.is_platform_admin())
);

create or replace function collab_private.log_organization_verification()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if old.verification_status is distinct from new.verification_status then
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, details, visibility)
    values (
      (select auth.uid()), 'organization', new.id, 'verification_' || new.verification_status,
      jsonb_build_object('previous_status', old.verification_status), 'public'
    );
  end if;
  return new;
end;
$$;

create trigger collab_organization_verification_activity
after update of verification_status on public.collab_organizations
for each row execute function collab_private.log_organization_verification();
