import { collaborationError, requireCollaborationAccount } from "@/features/collaboration/server/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { database, user } = await requireCollaborationAccount(request);
    const [{ data: profile, error: profileError }, { data: organizationMemberships }, { data: teamMemberships }, { data: interests }, { data: awards }, { data: activity }] = await Promise.all([
      database.from("collab_profiles").select("*").eq("id", user.id).maybeSingle(),
      database.from("collab_organization_memberships").select("*").eq("user_id", user.id).eq("membership_status", "active"),
      database.from("collab_team_members").select("*").eq("user_id", user.id).in("membership_status", ["invited", "active"]),
      database.from("collab_interests").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
      database.from("collab_reputation_awards").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false }),
      database.from("collab_activity").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    if (profileError) throw profileError;

    const organizationIds = (organizationMemberships ?? []).map((item) => item.organization_id);
    const teamIds = (teamMemberships ?? []).map((item) => item.team_id);
    const challengeIds = [...new Set([...(interests ?? []).map((item) => item.challenge_id), ...(teamMemberships ?? []).map((item) => item.challenge_id)])];
    const [{ data: organizations }, { data: teams }, { data: challenges }, { data: contributions }] = await Promise.all([
      organizationIds.length ? database.from("collab_organizations").select("*").in("id", organizationIds) : Promise.resolve({ data: [] }),
      teamIds.length ? database.from("collab_teams").select("*").in("id", teamIds) : Promise.resolve({ data: [] }),
      challengeIds.length ? database.from("collab_challenges").select("*").in("id", challengeIds) : Promise.resolve({ data: [] }),
      database.from("collab_contributions").select("*").eq("submitted_by", user.id).order("submitted_at", { ascending: false }),
    ]);
    const points = (awards ?? []).reduce((total, award) => total + award.points, 0);

    return Response.json({
      profile,
      reputation: { points, level: 1 + Math.floor(points / 100), awards: awards ?? [] },
      organizations: organizations ?? [],
      organizationMemberships: organizationMemberships ?? [],
      interests: interests ?? [],
      teams: teams ?? [],
      teamMemberships: teamMemberships ?? [],
      challenges: challenges ?? [],
      contributions: contributions ?? [],
      activity: activity ?? [],
    });
  } catch (error) {
    return collaborationError(error);
  }
}

