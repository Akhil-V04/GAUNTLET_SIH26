import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const database = await createClient();
  const { data: profile, error } = await database
    .from("collab_profiles")
    .select("id,display_name,primary_mode,headline,institution,skills,availability,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!profile) return Response.json({ error: "Public profile not found." }, { status: 404 });

  const [{ data: awards }, { data: contributions }] = await Promise.all([
    database.from("collab_reputation_awards").select("id,recipient_id,challenge_id,milestone_id,contribution_id,points,reason,created_at").eq("recipient_id", id).order("created_at", { ascending: false }),
    database.from("collab_contributions").select("id,challenge_id,milestone_id,team_id,submitted_by,summary,output_url,limitations,status,submitted_at,reviewed_at").eq("submitted_by", id).eq("status", "accepted").order("reviewed_at", { ascending: false }),
  ]);
  const challengeIds = [...new Set((awards ?? []).map((award) => award.challenge_id))];
  const { data: challenges } = challengeIds.length
    ? await database.from("collab_challenges").select("id,title,organization_id,status").in("id", challengeIds)
    : { data: [] };
  const organizationIds = [...new Set((challenges ?? []).map((challenge) => challenge.organization_id))];
  const { data: organizations } = organizationIds.length
    ? await database.from("collab_organizations").select("id,name,organization_type,verification_status").in("id", organizationIds)
    : { data: [] };
  const points = (awards ?? []).reduce((total, award) => total + award.points, 0);

  return Response.json({
    profile,
    reputation: { points, level: 1 + Math.floor(points / 100) },
    awards: awards ?? [],
    contributions: contributions ?? [],
    challenges: challenges ?? [],
    organizations: organizations ?? [],
    disclosure: "Skills are self-described. Contributions are reviewed by the named challenge owner and are not independent certification.",
  });
}

