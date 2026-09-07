-- Defense-in-depth guards for frozen rosters, review attribution and the append-only award ledger.

create or replace function collab_private.guard_team_roster()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare v_status text;
begin
  select status into v_status from public.collab_teams where id = coalesce(new.team_id, old.team_id);
  if v_status not in ('forming', 'ready') then
    raise exception 'The submitted team roster is locked.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger collab_team_roster_update_guard
before update of membership_status, user_id, team_id on public.collab_team_members
for each row execute function collab_private.guard_team_roster();
create trigger collab_team_roster_delete_guard
before delete on public.collab_team_members
for each row execute function collab_private.guard_team_roster();

create or replace function collab_private.guard_contribution_review()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if old.status = 'accepted' and to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception 'Accepted contributions are immutable.';
  end if;
  if new.status = 'accepted' and (new.reviewed_by is null or new.reviewed_by = new.submitted_by or new.reviewed_at is null) then
    raise exception 'Accepted contributions require a different recorded reviewer.';
  end if;
  return new;
end;
$$;

create trigger collab_contribution_review_guard
before update on public.collab_contributions
for each row execute function collab_private.guard_contribution_review();

create or replace function collab_private.guard_reputation_award()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if new.recipient_id = new.awarded_by then raise exception 'Self-awards are not allowed.'; end if;
  if not exists (
    select 1
    from public.collab_contributions c
    join public.collab_milestones m on m.id = c.milestone_id
    where c.id = new.contribution_id
      and c.status = 'accepted'
      and c.submitted_by = new.recipient_id
      and c.reviewed_by = new.awarded_by
      and c.challenge_id = new.challenge_id
      and c.milestone_id = new.milestone_id
      and m.points = new.points
  ) then raise exception 'Award must match an accepted reviewed contribution.'; end if;
  return new;
end;
$$;

create trigger collab_reputation_award_guard
before insert or update on public.collab_reputation_awards
for each row execute function collab_private.guard_reputation_award();

drop policy if exists "collaboration owners delete evidence" on storage.objects;
create policy "collaboration owners delete evidence"
on storage.objects for delete to authenticated
using (bucket_id = 'collaboration' and owner_id = (select auth.uid())::text);
