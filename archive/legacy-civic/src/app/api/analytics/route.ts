import { createClient } from "@/lib/supabase/server";
import { loadDashboardData } from "@/lib/dashboard-data";

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { data: profile, error } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (error || !profile || !["citizen", "officer", "solver"].includes(profile.role)) {
    return Response.json({ error: "Your role could not be verified." }, { status: 403 });
  }
  try {
    const { analytics } = await loadDashboardData(db, profile.role as "citizen" | "officer" | "solver", user.id);
    return Response.json(analytics, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Analytics are temporarily unavailable." }, { status: 500 });
  }
}
