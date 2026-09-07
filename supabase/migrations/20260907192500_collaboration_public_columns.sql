-- Keep public discovery limited to intentionally public columns.

alter table public.collab_problems
  add column source_url text;

revoke select on public.collab_profiles, public.collab_organizations,
  public.collab_problems, public.collab_challenges, public.collab_milestones,
  public.collab_contributions, public.collab_reputation_awards,
  public.collab_outcomes from anon;

grant select (id, display_name, primary_mode, headline, institution, skills, availability, created_at)
  on public.collab_profiles to anon;
grant select (id, name, organization_type, website, summary, verification_status, created_at, updated_at)
  on public.collab_organizations to anon;
grant select (id, author_id, title, summary, affected_group, current_workaround, domain,
  approximate_location, source_url, status, created_at, updated_at)
  on public.collab_problems to anon;
grant select (id, problem_id, organization_id, owner_id, title, objective, expected_roles,
  useful_skills, constraints, support_offered, deliverables, application_mode,
  engagement_type, minimum_team_size, maximum_team_size, maximum_interests,
  maximum_applications, submission_limit, application_deadline, evaluation_criteria,
  timezone, status, created_at, updated_at)
  on public.collab_challenges to anon;
grant select (id, challenge_id, title, description, sequence_number, due_at, points, created_at)
  on public.collab_milestones to anon;
grant select (id, challenge_id, milestone_id, team_id, submitted_by, summary, output_url,
  limitations, status, submitted_at, reviewed_at)
  on public.collab_contributions to anon;
grant select (id, recipient_id, challenge_id, milestone_id, contribution_id, points, reason, created_at)
  on public.collab_reputation_awards to anon;
grant select (id, challenge_id, final_deliverable_url, handover_summary, pilot_result,
  evaluation, implementation_responsibility, status, created_at, updated_at)
  on public.collab_outcomes to anon;

comment on column public.collab_problems.source_url is 'Optional public supporting source or document URL supplied with publication consent.';
