-- Gauntlet PRD v2 phases 2-6: atomic collaboration workflow.

alter table public.collab_contributions alter column milestone_id set not null;

create or replace function collab_private.has_team_relationship(target_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.collab_team_members m
    where m.team_id = target_team_id and m.user_id = (select auth.uid())
      and m.membership_status in ('invited', 'active')
  );
$$;

revoke all on function collab_private.has_team_relationship(uuid) from public, anon;
grant execute on function collab_private.has_team_relationship(uuid) to authenticated;

drop policy "collab teams are visible to participants" on public.collab_teams;
create policy "collab teams are visible to participants"
on public.collab_teams for select to authenticated
using (
  (select collab_private.has_team_relationship(id))
  or (select collab_private.is_challenge_owner(challenge_id))
);

drop policy "collab team memberships are visible to participants" on public.collab_team_members;
create policy "collab team memberships are visible to participants"
on public.collab_team_members for select to authenticated
using (
  user_id = (select auth.uid())
  or (select collab_private.has_team_relationship(team_id))
  or (select collab_private.is_challenge_owner(challenge_id))
);

create or replace function public.collab_command(
  p_command text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_other uuid;
  v_target uuid;
  v_milestone uuid;
  v_team public.collab_teams%rowtype;
  v_challenge public.collab_challenges%rowtype;
  v_application public.collab_applications%rowtype;
  v_contribution public.collab_contributions%rowtype;
  v_member public.collab_team_members%rowtype;
  v_count integer;
  v_position integer;
  v_points integer;
  v_members uuid[];
  v_decision text;
  v_text text;
  v_roles text[];
  v_skills text[];
begin
  if v_user is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.collab_profiles p where p.id = v_user and p.onboarding_completed) then
    raise exception 'Complete your collaboration profile first.';
  end if;

  if p_command = 'create_organization' then
    insert into public.collab_organizations(name, organization_type, website, summary, created_by)
    values (
      trim(p_payload->>'name'),
      p_payload->>'organization_type',
      nullif(trim(p_payload->>'website'), ''),
      coalesce(trim(p_payload->>'summary'), ''),
      v_user
    ) returning id into v_id;
    insert into public.collab_organization_memberships(organization_id, user_id, membership_role, membership_status)
    values (v_id, v_user, 'owner', 'active');
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, visibility)
    values (v_user, 'organization', v_id, 'organization_created', 'public');
    return jsonb_build_object('id', v_id, 'kind', 'organization');

  elsif p_command = 'publish_problem' then
    if coalesce((p_payload->>'publication_consent')::boolean, false) is not true then
      raise exception 'Publication consent is required.';
    end if;
    insert into public.collab_problems(
      author_id, title, summary, affected_group, current_workaround, domain,
      approximate_location, source_url, publication_consent, status
    ) values (
      v_user, trim(p_payload->>'title'), trim(p_payload->>'summary'),
      trim(p_payload->>'affected_group'), coalesce(trim(p_payload->>'current_workaround'), ''),
      trim(p_payload->>'domain'), coalesce(trim(p_payload->>'approximate_location'), ''),
      nullif(trim(p_payload->>'source_url'), ''), true, 'published'
    ) returning id into v_id;
    insert into public.collab_problem_contacts(problem_id, owner_id, contact_preference, relevant_organization)
    values (
      v_id, v_user, coalesce(trim(p_payload->>'contact_preference'), ''),
      coalesce(trim(p_payload->>'relevant_organization'), '')
    );
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, visibility)
    values (v_user, 'problem', v_id, 'problem_published', 'public');
    return jsonb_build_object('id', v_id, 'kind', 'problem');

  elsif p_command = 'attach_problem_evidence' then
    v_id := (p_payload->>'problem_id')::uuid;
    v_text := trim(p_payload->>'evidence_path');
    if not exists (select 1 from public.collab_problems p where p.id = v_id and p.author_id = v_user) then
      raise exception 'Only the problem author can attach evidence.';
    end if;
    if v_text not like v_user::text || '/problems/' || v_id::text || '/%' then
      raise exception 'Invalid evidence path.';
    end if;
    update public.collab_problems set evidence_path = v_text where id = v_id;
    return jsonb_build_object('id', v_id, 'kind', 'problem');

  elsif p_command = 'adopt_problem' then
    v_id := (p_payload->>'problem_id')::uuid;
    v_other := (p_payload->>'organization_id')::uuid;
    if not exists (
      select 1 from public.collab_organization_memberships m
      where m.organization_id = v_other and m.user_id = v_user
        and m.membership_status = 'active' and m.membership_role in ('owner', 'coordinator')
    ) then raise exception 'Organisation owner access required.'; end if;
    perform 1 from public.collab_problems p where p.id = v_id and p.status = 'published' for update;
    if not found then raise exception 'This problem is unavailable or already adopted.'; end if;
    if coalesce(jsonb_array_length(p_payload->'milestones'), 0) < 1 then
      raise exception 'Add at least one milestone.';
    end if;
    v_roles := array(select trim(value) from jsonb_array_elements_text(coalesce(p_payload->'expected_roles', '[]'::jsonb)));
    v_skills := array(select trim(value) from jsonb_array_elements_text(coalesce(p_payload->'useful_skills', '[]'::jsonb)));
    insert into public.collab_challenges(
      problem_id, organization_id, owner_id, title, objective, expected_roles, useful_skills,
      constraints, support_offered, deliverables, application_mode, minimum_team_size,
      maximum_team_size, maximum_interests, maximum_applications, submission_limit,
      application_deadline, status, engagement_type, evaluation_criteria, timezone
    ) values (
      v_id, v_other, v_user, trim(p_payload->>'title'), trim(p_payload->>'objective'), v_roles, v_skills,
      coalesce(trim(p_payload->>'constraints'), ''), coalesce(trim(p_payload->>'support_offered'), ''),
      trim(p_payload->>'deliverables'), coalesce(p_payload->>'application_mode', 'team'),
      coalesce((p_payload->>'minimum_team_size')::integer, 1),
      coalesce((p_payload->>'maximum_team_size')::integer, 4),
      nullif(p_payload->>'maximum_interests', '')::integer,
      nullif(p_payload->>'maximum_applications', '')::integer,
      1, (p_payload->>'application_deadline')::timestamptz, 'open',
      coalesce(p_payload->>'engagement_type', 'volunteering'),
      coalesce(trim(p_payload->>'evaluation_criteria'), ''),
      coalesce(nullif(trim(p_payload->>'timezone'), ''), 'Asia/Kolkata')
    ) returning id into v_target;
    if (select application_deadline from public.collab_challenges where id = v_target) <= now() then
      raise exception 'Application deadline must be in the future.';
    end if;
    v_position := 0;
    for v_text in select trim(value) from jsonb_array_elements_text(p_payload->'milestones') loop
      v_position := v_position + 1;
      insert into public.collab_milestones(challenge_id, title, sequence_number, points)
      values (
        v_target, v_text, v_position,
        case when v_position = jsonb_array_length(p_payload->'milestones') then 100 else 25 end
      );
    end loop;
    update public.collab_problems set status = 'adopted' where id = v_id;
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, details, visibility)
    values (v_user, 'challenge', v_target, 'challenge_published', jsonb_build_object('problem_id', v_id), 'public');
    return jsonb_build_object('id', v_target, 'kind', 'challenge');

  elsif p_command = 'set_interest' then
    v_id := (p_payload->>'challenge_id')::uuid;
    select * into v_challenge from public.collab_challenges where id = v_id for update;
    if not found or v_challenge.status <> 'open' then raise exception 'Challenge is not open for interest.'; end if;
    if v_challenge.application_deadline is not null and v_challenge.application_deadline <= now() then
      raise exception 'The challenge deadline has passed.';
    end if;
    if not exists (select 1 from public.collab_profiles p where p.id = v_user and p.discoverable) then
      raise exception 'Enable profile discovery before joining the interest directory.';
    end if;
    if exists (select 1 from public.collab_interests i where i.challenge_id = v_id and i.student_id = v_user) then
      return jsonb_build_object('id', v_id, 'kind', 'interest', 'created', false);
    end if;
    select count(*) into v_count from public.collab_interests i where i.challenge_id = v_id;
    if v_challenge.maximum_interests is not null and v_count >= v_challenge.maximum_interests then
      raise exception 'The interest capacity has been reached.';
    end if;
    insert into public.collab_interests(challenge_id, student_id, note, is_visible)
    values (v_id, v_user, coalesce(trim(p_payload->>'note'), ''), true);
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, visibility)
    values (v_user, 'interest', v_id, 'interest_expressed', 'participants');
    return jsonb_build_object('id', v_id, 'kind', 'interest', 'created', true);

  elsif p_command = 'remove_interest' then
    v_id := (p_payload->>'challenge_id')::uuid;
    if exists (
      select 1 from public.collab_team_members m
      where m.challenge_id = v_id and m.user_id = v_user and m.membership_status = 'active'
    ) then raise exception 'Leave the team before removing interest.'; end if;
    delete from public.collab_interests where challenge_id = v_id and student_id = v_user;
    return jsonb_build_object('id', v_id, 'kind', 'interest', 'removed', true);

  elsif p_command = 'create_team' then
    v_id := (p_payload->>'challenge_id')::uuid;
    select * into v_challenge from public.collab_challenges where id = v_id for update;
    if not found or v_challenge.status <> 'open' then raise exception 'Challenge is not open for teams.'; end if;
    if not exists (select 1 from public.collab_interests i where i.challenge_id = v_id and i.student_id = v_user) then
      raise exception 'Express interest before creating a team.';
    end if;
    if exists (
      select 1 from public.collab_team_members m
      where m.challenge_id = v_id and m.user_id = v_user and m.membership_status in ('invited', 'active')
    ) then raise exception 'You already have a team relationship for this challenge.'; end if;
    insert into public.collab_teams(challenge_id, leader_id, name)
    values (v_id, v_user, trim(p_payload->>'name')) returning id into v_other;
    insert into public.collab_team_members(team_id, challenge_id, user_id, member_role, membership_status, request_type, requested_by, responded_by, responded_at)
    values (v_other, v_id, v_user, 'leader', 'active', 'leader', v_user, v_user, now());
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, visibility)
    values (v_user, 'team', v_other, 'team_created', 'participants');
    return jsonb_build_object('id', v_other, 'kind', 'team');

  elsif p_command in ('invite_member', 'request_to_join') then
    v_other := (p_payload->>'team_id')::uuid;
    select * into v_team from public.collab_teams where id = v_other for update;
    if not found or v_team.status not in ('forming', 'ready') then raise exception 'This team is not accepting members.'; end if;
    select * into v_challenge from public.collab_challenges where id = v_team.challenge_id for update;
    if p_command = 'invite_member' then
      if v_team.leader_id <> v_user then raise exception 'Only the team leader can invite members.'; end if;
      v_target := (p_payload->>'student_id')::uuid;
      if not exists (
        select 1 from public.collab_interests i join public.collab_profiles p on p.id = i.student_id
        where i.challenge_id = v_team.challenge_id and i.student_id = v_target and i.is_visible and p.discoverable
      ) then raise exception 'Choose a discoverable interested student.'; end if;
      insert into public.collab_team_members(team_id, challenge_id, user_id, member_role, membership_status, request_type, requested_by)
      values (v_other, v_team.challenge_id, v_target, 'member', 'invited', 'invitation', v_user);
    else
      v_target := v_user;
      if not exists (select 1 from public.collab_interests i where i.challenge_id = v_team.challenge_id and i.student_id = v_user) then
        raise exception 'Express interest before requesting to join.';
      end if;
      insert into public.collab_team_members(team_id, challenge_id, user_id, member_role, membership_status, request_type, requested_by)
      values (v_other, v_team.challenge_id, v_user, 'member', 'invited', 'join_request', v_user);
    end if;
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, details, visibility)
    values (v_user, 'team', v_other, p_command, jsonb_build_object('student_id', v_target), 'participants');
    return jsonb_build_object('id', v_other, 'kind', 'team_membership');

  elsif p_command = 'respond_membership' then
    v_other := (p_payload->>'team_id')::uuid;
    v_target := (p_payload->>'student_id')::uuid;
    v_decision := p_payload->>'decision';
    if v_decision not in ('accept', 'decline') then raise exception 'Choose accept or decline.'; end if;
    select * into v_team from public.collab_teams where id = v_other for update;
    select * into v_member from public.collab_team_members
      where team_id = v_other and user_id = v_target and membership_status = 'invited' for update;
    if not found then raise exception 'Pending membership not found.'; end if;
    if (v_member.request_type = 'invitation' and v_target <> v_user)
      or (v_member.request_type = 'join_request' and v_team.leader_id <> v_user) then
      raise exception 'You cannot decide this membership.';
    end if;
    if v_decision = 'accept' then
      select * into v_challenge from public.collab_challenges where id = v_team.challenge_id for update;
      select count(*) into v_count from public.collab_team_members m
        where m.team_id = v_other and m.membership_status = 'active';
      if v_count >= v_challenge.maximum_team_size then raise exception 'The team is already full.'; end if;
      update public.collab_team_members set membership_status = 'active', responded_by = v_user, responded_at = now()
        where team_id = v_other and user_id = v_target;
    else
      update public.collab_team_members set membership_status = 'removed', responded_by = v_user, responded_at = now()
        where team_id = v_other and user_id = v_target;
    end if;
    return jsonb_build_object('id', v_other, 'kind', 'team_membership', 'decision', v_decision);

  elsif p_command = 'leave_team' then
    v_other := (p_payload->>'team_id')::uuid;
    select * into v_team from public.collab_teams where id = v_other for update;
    if v_team.leader_id = v_user then raise exception 'The leader cannot leave the team.'; end if;
    if v_team.status not in ('forming', 'ready') then raise exception 'The submitted roster is locked.'; end if;
    update public.collab_team_members set membership_status = 'left', responded_at = now()
      where team_id = v_other and user_id = v_user and membership_status = 'active';
    if not found then raise exception 'Active team membership not found.'; end if;
    return jsonb_build_object('id', v_other, 'kind', 'team_membership');

  elsif p_command = 'submit_application' then
    v_other := (p_payload->>'team_id')::uuid;
    select * into v_team from public.collab_teams where id = v_other for update;
    if not found or v_team.leader_id <> v_user then raise exception 'Only the team leader can apply.'; end if;
    if v_team.status not in ('forming', 'ready') then raise exception 'This team has already applied.'; end if;
    select * into v_challenge from public.collab_challenges where id = v_team.challenge_id for update;
    if v_challenge.status <> 'open' or (v_challenge.application_deadline is not null and v_challenge.application_deadline <= now()) then
      raise exception 'Applications are closed.';
    end if;
    select array_agg(m.user_id order by m.created_at), count(*) into v_members, v_count
      from public.collab_team_members m where m.team_id = v_other and m.membership_status = 'active';
    if v_count < v_challenge.minimum_team_size or v_count > v_challenge.maximum_team_size then
      raise exception 'Team size is outside the challenge limits.';
    end if;
    if v_challenge.application_mode = 'individual' and v_count <> 1 then raise exception 'This challenge accepts individual applications only.'; end if;
    if v_challenge.application_mode = 'team' and v_count < 2 then raise exception 'This challenge requires a team.'; end if;
    select count(*) into v_position from public.collab_applications a
      where a.challenge_id = v_challenge.id and a.status in ('submitted', 'shortlisted', 'selected');
    if v_challenge.maximum_applications is not null and v_position >= v_challenge.maximum_applications then
      raise exception 'The application capacity has been reached.';
    end if;
    insert into public.collab_applications(
      challenge_id, team_id, submitted_by, proposal, limitations, relevant_experience,
      responsibility_plan, portfolio_url, roster_snapshot
    ) values (
      v_challenge.id, v_other, v_user, trim(p_payload->>'proposal'), trim(p_payload->>'limitations'),
      coalesce(trim(p_payload->>'relevant_experience'), ''), coalesce(trim(p_payload->>'responsibility_plan'), ''),
      nullif(trim(p_payload->>'portfolio_url'), ''), v_members
    ) returning id into v_id;
    update public.collab_teams set status = 'applied' where id = v_other;
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, details, visibility)
    values (v_user, 'application', v_id, 'application_submitted', jsonb_build_object('team_id', v_other), 'participants');
    return jsonb_build_object('id', v_id, 'kind', 'application', 'team_id', v_other);

  elsif p_command = 'review_application' then
    v_id := (p_payload->>'application_id')::uuid;
    v_decision := p_payload->>'decision';
    if v_decision not in ('shortlisted', 'selected', 'rejected') then raise exception 'Invalid application decision.'; end if;
    select * into v_application from public.collab_applications where id = v_id for update;
    select * into v_challenge from public.collab_challenges where id = v_application.challenge_id for update;
    if not exists (
      select 1 from public.collab_organization_memberships m
      where m.organization_id = v_challenge.organization_id and m.user_id = v_user
        and m.membership_status = 'active' and m.membership_role in ('owner', 'coordinator')
    ) then raise exception 'Challenge owner access required.'; end if;
    if v_application.status not in ('submitted', 'shortlisted') then raise exception 'Application is already decided.'; end if;
    if v_decision = 'selected' and exists (
      select 1 from public.collab_applications a where a.challenge_id = v_challenge.id and a.status = 'selected' and a.id <> v_id
    ) then raise exception 'A team is already selected.'; end if;
    update public.collab_applications set status = v_decision, reviewed_by = v_user,
      review_note = coalesce(trim(p_payload->>'review_note'), ''), reviewed_at = now() where id = v_id;
    if v_decision = 'selected' then
      update public.collab_teams set status = 'selected' where id = v_application.team_id;
      update public.collab_challenges set status = 'active' where id = v_challenge.id;
    end if;
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, details, visibility)
    values (v_user, 'application', v_id, 'application_' || v_decision, jsonb_build_object('team_id', v_application.team_id), 'participants');
    return jsonb_build_object('id', v_id, 'kind', 'application', 'decision', v_decision);

  elsif p_command = 'submit_contribution' then
    v_other := (p_payload->>'team_id')::uuid;
    v_milestone := (p_payload->>'milestone_id')::uuid;
    select * into v_team from public.collab_teams where id = v_other;
    if not exists (
      select 1 from public.collab_team_members m where m.team_id = v_other and m.user_id = v_user and m.membership_status = 'active'
    ) or not exists (
      select 1 from public.collab_applications a where a.team_id = v_other and a.status = 'selected'
    ) then raise exception 'Selected team membership required.'; end if;
    if not exists (select 1 from public.collab_milestones m where m.id = v_milestone and m.challenge_id = v_team.challenge_id) then
      raise exception 'Choose a valid milestone.';
    end if;
    if exists (
      select 1 from public.collab_reputation_awards a
      where a.recipient_id = v_user and a.challenge_id = v_team.challenge_id and a.milestone_id = v_milestone
    ) then raise exception 'This milestone contribution is already accepted.'; end if;
    insert into public.collab_contributions(challenge_id, milestone_id, team_id, submitted_by, summary, output_url, limitations, status)
    values (
      v_team.challenge_id, v_milestone, v_other, v_user, trim(p_payload->>'summary'),
      nullif(trim(p_payload->>'output_url'), ''), coalesce(trim(p_payload->>'limitations'), ''), 'submitted'
    ) returning id into v_id;
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, visibility)
    values (v_user, 'contribution', v_id, 'contribution_submitted', 'participants');
    return jsonb_build_object('id', v_id, 'kind', 'contribution', 'team_id', v_other);

  elsif p_command = 'review_contribution' then
    v_id := (p_payload->>'contribution_id')::uuid;
    v_decision := p_payload->>'decision';
    if v_decision not in ('accepted', 'revision_requested') then raise exception 'Invalid contribution decision.'; end if;
    select * into v_contribution from public.collab_contributions where id = v_id for update;
    if not found or v_contribution.status <> 'submitted' then raise exception 'Contribution is not awaiting review.'; end if;
    if not (select collab_private.is_challenge_owner(v_contribution.challenge_id)) then
      raise exception 'Challenge owner access required.';
    end if;
    if v_contribution.submitted_by = v_user then raise exception 'You cannot review your own contribution.'; end if;
    update public.collab_contributions set status = v_decision, reviewed_by = v_user,
      review_note = coalesce(trim(p_payload->>'review_note'), ''), reviewed_at = now() where id = v_id;
    if v_decision = 'accepted' then
      select points into v_points from public.collab_milestones where id = v_contribution.milestone_id;
      v_other := null;
      insert into public.collab_reputation_awards(recipient_id, challenge_id, milestone_id, contribution_id, points, reason, awarded_by)
      values (
        v_contribution.submitted_by, v_contribution.challenge_id, v_contribution.milestone_id,
        v_id, v_points, 'Accepted contribution', v_user
      ) on conflict do nothing returning id into v_other;
    end if;
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, details, visibility)
    values (v_user, 'contribution', v_id, 'contribution_' || v_decision,
      jsonb_build_object('points_awarded', case when v_other is null then 0 else coalesce(v_points, 0) end), 'participants');
    return jsonb_build_object('id', v_id, 'kind', 'contribution', 'decision', v_decision,
      'points_awarded', case when v_other is null then 0 else coalesce(v_points, 0) end);

  elsif p_command = 'publish_outcome' then
    v_id := (p_payload->>'challenge_id')::uuid;
    if not (select collab_private.is_challenge_owner(v_id)) then raise exception 'Challenge owner access required.'; end if;
    if not exists (select 1 from public.collab_contributions c where c.challenge_id = v_id and c.status = 'accepted') then
      raise exception 'Accept at least one contribution before recording the final outcome.';
    end if;
    insert into public.collab_outcomes(
      challenge_id, recorded_by, final_deliverable_url, handover_summary, pilot_result,
      evaluation, implementation_responsibility, status
    ) values (
      v_id, v_user, nullif(trim(p_payload->>'final_deliverable_url'), ''),
      trim(p_payload->>'handover_summary'), coalesce(trim(p_payload->>'pilot_result'), ''),
      coalesce(trim(p_payload->>'evaluation'), ''), coalesce(trim(p_payload->>'implementation_responsibility'), ''), 'published'
    ) on conflict (challenge_id) do update set
      final_deliverable_url = excluded.final_deliverable_url,
      handover_summary = excluded.handover_summary,
      pilot_result = excluded.pilot_result,
      evaluation = excluded.evaluation,
      implementation_responsibility = excluded.implementation_responsibility,
      status = 'published', updated_at = now()
    returning id into v_other;
    update public.collab_challenges set status = 'closed' where id = v_id;
    insert into public.collab_activity(actor_id, entity_type, entity_id, action, visibility)
    values (v_user, 'challenge', v_id, 'outcome_published', 'public');
    return jsonb_build_object('id', v_other, 'kind', 'outcome', 'challenge_id', v_id);

  elsif p_command = 'verify_organization' then
    if not (select collab_private.is_platform_admin()) then raise exception 'Platform administrator access required.'; end if;
    v_id := (p_payload->>'organization_id')::uuid;
    v_decision := p_payload->>'verification_status';
    if v_decision not in ('under_review', 'verified', 'rejected') then raise exception 'Invalid verification state.'; end if;
    update public.collab_organizations set verification_status = v_decision where id = v_id;
    if not found then raise exception 'Organisation not found.'; end if;
    return jsonb_build_object('id', v_id, 'kind', 'organization', 'verification_status', v_decision);
  else
    raise exception 'Unknown collaboration command.';
  end if;
end;
$$;

revoke all on function public.collab_command(text, jsonb) from public, anon;
grant execute on function public.collab_command(text, jsonb) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('collaboration', 'collaboration', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "collaboration owners upload evidence" on storage.objects;
drop policy if exists "collaboration owners read evidence" on storage.objects;
create policy "collaboration owners upload evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'collaboration'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "collaboration owners read evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'collaboration'
  and owner_id = (select auth.uid()::text)
);
