import { createClient } from "@/lib/supabase/server";
export async function apiAccess(request: Request, officerOnly = false) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("Cross-site requests are not allowed.");
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const { data: profile } = await db.from("profiles").select("role,organization_id").eq("id", user.id).single();
  if (!profile || (officerOnly && profile.role !== "officer")) throw new Error("Officer access required.");
  return { db, user, profile };
}
export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to complete the action.";
  return Response.json({ error: message }, { status: /Sign in/.test(message) ? 401 : /access required|not allowed/.test(message) ? 403 : /changed|already decided/.test(message) ? 409 : 400 });
}
