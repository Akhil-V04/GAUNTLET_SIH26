import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 80).replace(/[%_]/g, "");
  const domain = (url.searchParams.get("domain") ?? "").trim().slice(0, 80);
  const database = await createClient();

  let problemsQuery = database
    .from("collab_problems")
    .select("id,author_id,title,summary,affected_group,current_workaround,domain,approximate_location,source_url,status,created_at,updated_at")
    .in("status", ["published", "adopted"])
    .order("created_at", { ascending: false })
    .limit(50);
  let challengesQuery = database
    .from("collab_challenges")
    .select("id,problem_id,organization_id,owner_id,title,objective,expected_roles,useful_skills,constraints,support_offered,deliverables,application_mode,engagement_type,minimum_team_size,maximum_team_size,maximum_interests,maximum_applications,application_deadline,evaluation_criteria,timezone,status,created_at")
    .in("status", ["open", "active", "completed", "closed"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    problemsQuery = problemsQuery.ilike("title", `%${search}%`);
    challengesQuery = challengesQuery.ilike("title", `%${search}%`);
  }
  if (domain) problemsQuery = problemsQuery.eq("domain", domain);

  const [{ data: problems, error: problemsError }, { data: challenges, error: challengesError }, { data: organizations, error: organizationsError }] = await Promise.all([
    problemsQuery,
    challengesQuery,
    database.from("collab_organizations").select("id,name,organization_type,website,summary,verification_status,created_at,updated_at").neq("verification_status", "rejected").order("name").limit(100),
  ]);

  const error = problemsError ?? challengesError ?? organizationsError;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ problems: problems ?? [], challenges: challenges ?? [], organizations: organizations ?? [] }, { headers: { "Cache-Control": "public, max-age=30" } });
}

