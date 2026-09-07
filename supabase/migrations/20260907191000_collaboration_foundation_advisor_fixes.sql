-- Phase 1 advisor fixes: cover foreign keys and consolidate authenticated read policies.

create index collab_activity_actor_idx on public.collab_activity(actor_id);
create index collab_applications_reviewed_by_idx on public.collab_applications(reviewed_by);
create index collab_applications_submitted_by_idx on public.collab_applications(submitted_by);
create index collab_contributions_milestone_idx on public.collab_contributions(milestone_id);
create index collab_contributions_reviewed_by_idx on public.collab_contributions(reviewed_by);
create index collab_contributions_submitted_by_idx on public.collab_contributions(submitted_by);
create index collab_outcomes_recorded_by_idx on public.collab_outcomes(recorded_by);
create index collab_platform_roles_granted_by_idx on public.collab_platform_roles(granted_by);
create index collab_awards_awarded_by_idx on public.collab_reputation_awards(awarded_by);
create index collab_awards_challenge_idx on public.collab_reputation_awards(challenge_id);
create index collab_awards_contribution_idx on public.collab_reputation_awards(contribution_id);
create index collab_awards_milestone_idx on public.collab_reputation_awards(milestone_id);
create index collab_team_members_requester_idx on public.collab_team_members(requested_by);
create index collab_team_members_responder_idx on public.collab_team_members(responded_by);
create index collab_team_members_team_challenge_idx on public.collab_team_members(team_id, challenge_id);
create index collab_teams_leader_idx on public.collab_teams(leader_id);

drop policy "collab public challenges are readable" on public.collab_challenges;
drop policy "collab organization members read draft challenges" on public.collab_challenges;
create policy "collab visitors read public challenges"
on public.collab_challenges for select to anon
using (status in ('open', 'active', 'completed', 'closed'));
create policy "collab members read permitted challenges"
on public.collab_challenges for select to authenticated
using (
  status in ('open', 'active', 'completed', 'closed')
  or (select collab_private.is_org_member(organization_id))
);

drop policy "collab public milestones follow challenge visibility" on public.collab_milestones;
drop policy "collab organization members read draft milestones" on public.collab_milestones;
create policy "collab visitors read public milestones"
on public.collab_milestones for select to anon
using (exists (
  select 1 from public.collab_challenges challenge
  where challenge.id = challenge_id and challenge.status in ('open', 'active', 'completed', 'closed')
));
create policy "collab members read permitted milestones"
on public.collab_milestones for select to authenticated
using (
  exists (
    select 1 from public.collab_challenges challenge
    where challenge.id = challenge_id and challenge.status in ('open', 'active', 'completed', 'closed')
  )
  or (select collab_private.is_challenge_owner(challenge_id))
);

drop policy "collab accepted contributions are public" on public.collab_contributions;
drop policy "collab participants read their contributions" on public.collab_contributions;
create policy "collab visitors read accepted contributions"
on public.collab_contributions for select to anon
using (status = 'accepted');
create policy "collab members read permitted contributions"
on public.collab_contributions for select to authenticated
using (
  status = 'accepted'
  or submitted_by = (select auth.uid())
  or (select collab_private.is_team_member(team_id))
  or (select collab_private.is_challenge_owner(challenge_id))
);

drop policy "collab published outcomes are public" on public.collab_outcomes;
drop policy "collab owners read draft outcomes" on public.collab_outcomes;
create policy "collab visitors read published outcomes"
on public.collab_outcomes for select to anon
using (status = 'published');
create policy "collab members read permitted outcomes"
on public.collab_outcomes for select to authenticated
using (status = 'published' or (select collab_private.is_challenge_owner(challenge_id)));
