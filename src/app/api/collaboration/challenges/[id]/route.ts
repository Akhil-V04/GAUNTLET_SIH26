import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const database = await createClient();
  const { data: challenge, error } = await database.from("collab_challenges").select("*").eq("id", id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!challenge) return Response.json({ error: "Challenge not found." }, { status: 404 });

  const { data: { user } } = await database.auth.getUser();
  const baseQueries = await Promise.all([
    database.from("collab_problems").select("id,author_id,title,summary,affected_group,current_workaround,domain,approximate_location,source_url,status,created_at,updated_at").eq("id", challenge.problem_id).maybeSingle(),
    database.from("collab_organizations").select("id,name,organization_type,website,summary,verification_status,created_at,updated_at").eq("id", challenge.organization_id).maybeSingle(),
    database.from("collab_milestones").select("*").eq("challenge_id", id).order("sequence_number"),
    database.from("collab_outcomes").select("id,challenge_id,final_deliverable_url,handover_summary,pilot_result,evaluation,implementation_responsibility,status,created_at,updated_at").eq("challenge_id", id).maybeSingle(),
  ]);

  if (!user) {
    return Response.json({
      challenge,
      problem: baseQueries[0].data,
      organization: baseQueries[1].data,
      milestones: baseQueries[2].data ?? [],
      outcome: baseQueries[3].data,
      viewer: null,
    });
  }

  const [{ data: profile }, { data: interest }, { data: visibleInterests }, { data: memberships }, { data: availableTeams }, { data: applications }, { data: contributions }] = await Promise.all([
    database.from("collab_profiles").select("*").eq("id", user.id).maybeSingle(),
    database.from("collab_interests").select("*").eq("challenge_id", id).eq("student_id", user.id).maybeSingle(),
    database.from("collab_interests").select("challenge_id,student_id,note,is_visible,created_at").eq("challenge_id", id).eq("is_visible", true),
    database.from("collab_team_members").select("*").eq("challenge_id", id),
    database.from("collab_teams").select("*").eq("challenge_id", id).in("status", ["forming", "ready"]),
    database.from("collab_applications").select("*").eq("challenge_id", id).order("submitted_at", { ascending: false }),
    database.from("collab_contributions").select("*").eq("challenge_id", id).order("submitted_at", { ascending: false }),
  ]);

  const interestedIds = (visibleInterests ?? []).map((item) => item.student_id);
  const teamIds = [...new Set((memberships ?? []).map((item) => item.team_id))];
  const [{ data: interestedProfiles }, { data: teams }] = await Promise.all([
    interestedIds.length
      ? database.from("collab_profiles").select("id,display_name,primary_mode,headline,institution,skills,availability,created_at").in("id", interestedIds)
      : Promise.resolve({ data: [] }),
    teamIds.length
      ? database.from("collab_teams").select("*").in("id", teamIds)
      : Promise.resolve({ data: [] }),
  ]);

  return Response.json({
    challenge,
    problem: baseQueries[0].data,
    organization: baseQueries[1].data,
    milestones: baseQueries[2].data ?? [],
    outcome: baseQueries[3].data,
    viewer: { profile, interest, memberships: memberships ?? [], teams: teams ?? [] },
    availableTeams: availableTeams ?? [],
    interestedPeople: interestedProfiles ?? [],
    applications: applications ?? [],
    contributions: contributions ?? [],
  });
}
