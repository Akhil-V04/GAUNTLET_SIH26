import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const database = await createClient();
  const { data: organization, error } = await database.from("collab_organizations").select("id,name,organization_type,website,summary,verification_status,created_at,updated_at").eq("id", id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!organization) return Response.json({ error: "Organisation not found." }, { status: 404 });
  const { data: { user } } = await database.auth.getUser();
  const [{ data: challenges }, { data: memberships }] = await Promise.all([
    database.from("collab_challenges").select("*").eq("organization_id", id).order("created_at", { ascending: false }),
    user ? database.from("collab_organization_memberships").select("*").eq("organization_id", id) : Promise.resolve({ data: [] }),
  ]);
  const challengeIds = (challenges ?? []).map((challenge) => challenge.id);
  const [{ data: applications }, { data: contributions }] = user && challengeIds.length
    ? await Promise.all([
        database.from("collab_applications").select("*").in("challenge_id", challengeIds).order("submitted_at", { ascending: false }),
        database.from("collab_contributions").select("*").in("challenge_id", challengeIds).order("submitted_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  return Response.json({ organization, challenges: challenges ?? [], memberships: memberships ?? [], applications: applications ?? [], contributions: contributions ?? [] });
}
