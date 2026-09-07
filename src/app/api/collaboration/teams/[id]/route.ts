import { collaborationError, requireCollaborationAccount } from "@/features/collaboration/server/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { database } = await requireCollaborationAccount(request);
    const { data: team, error } = await database.from("collab_teams").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!team) return Response.json({ error: "Team not found or access denied." }, { status: 404 });
    const [{ data: challenge }, { data: members }, { data: application }, { data: milestones }, { data: contributions }] = await Promise.all([
      database.from("collab_challenges").select("*").eq("id", team.challenge_id).single(),
      database.from("collab_team_members").select("*").eq("team_id", id).order("created_at"),
      database.from("collab_applications").select("*").eq("team_id", id).maybeSingle(),
      database.from("collab_milestones").select("*").eq("challenge_id", team.challenge_id).order("sequence_number"),
      database.from("collab_contributions").select("*").eq("team_id", id).order("submitted_at", { ascending: false }),
    ]);
    const profileIds = [...new Set((members ?? []).map((member) => member.user_id))];
    const { data: profiles } = profileIds.length
      ? await database.from("collab_profiles").select("id,display_name,primary_mode,headline,institution,skills,availability,created_at").in("id", profileIds)
      : { data: [] };
    return Response.json({ team, challenge, members: members ?? [], profiles: profiles ?? [], application, milestones: milestones ?? [], contributions: contributions ?? [] });
  } catch (error) {
    return collaborationError(error);
  }
}

