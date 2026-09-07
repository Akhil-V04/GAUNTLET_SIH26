import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const database = await createClient();
  const { data: problem, error } = await database
    .from("collab_problems")
    .select("id,author_id,title,summary,affected_group,current_workaround,domain,approximate_location,source_url,status,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!problem) return Response.json({ error: "Problem not found." }, { status: 404 });

  const { data: challenge } = await database.from("collab_challenges").select("*").eq("problem_id", id).maybeSingle();
  const { data: { user } } = await database.auth.getUser();
  let privateDetails = null;
  if (user) {
    const [{ data: fullProblem }, { data: contact }] = await Promise.all([
      database.from("collab_problems").select("evidence_path").eq("id", id).eq("author_id", user.id).maybeSingle(),
      database.from("collab_problem_contacts").select("contact_preference,relevant_organization").eq("problem_id", id).maybeSingle(),
    ]);
    if (fullProblem || contact) privateDetails = { evidencePath: fullProblem?.evidence_path ?? null, contact };
  }
  return Response.json({ problem, challenge, privateDetails });
}

