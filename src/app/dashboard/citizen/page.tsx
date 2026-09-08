import { redirect } from "next/navigation";
import { AppHeader } from "@/features/collaboration/components/app-header";
import { getCurrentAccount } from "@/features/collaboration/server/account";
import { createClient } from "@/lib/supabase/server";
import { PostProblemForm } from "./post-problem-form";
import { OrgFeed } from "./org-feed";

export const dynamic = "force-dynamic";

export default async function CitizenDashboardPage() {
  const { user, profile: existingProfile } = await getCurrentAccount();
  if (!user) redirect("/login");

  const database = await createClient();

  /* Auto-create profile if none exists */
  let profile = existingProfile;
  if (!profile) {
    await database.from("collab_profiles").upsert({
      id: user.id,
      display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      primary_mode: "community_contributor",
      headline: "",
      institution: "",
      skills: [],
      availability: "open",
      discoverable: true,
      onboarding_completed: true,
    });
    const { data: created } = await database
      .from("collab_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = created;
  }

  /* Admin check */
  const { data: roles } = await database
    .from("collab_platform_roles")
    .select("platform_role")
    .eq("user_id", user.id);
  const isAdmin = roles?.some(r => r.platform_role === "admin") || false;

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Citizen";

  return (
    <>
      <AppHeader displayName={displayName} isAdmin={isAdmin} />
      <main className="collab-page dashboard-shell">
        <section className="workspace-hero">
          <div>
            <p className="eyebrow">
              <span /> CITIZEN DASHBOARD
            </p>
            <h1>Welcome, {displayName}.</h1>
            <p>
              Report problems you observe in your community. Organisations review
              and adopt reports, turning them into scoped challenges for student
              teams to solve.
            </p>
          </div>
        </section>

        {/* Post a Problem – inline form */}
        <PostProblemForm />

        {/* Organisation Posts Feed */}
        <div style={{ marginTop: "40px" }}>
          <OrgFeed />
        </div>

        {/* My Reports – placeholder for future sprint */}
        <section className="workspace-empty" style={{ marginTop: "32px" }}>
          <div>
            <p className="eyebrow">MY REPORTS</p>
            <h2>No reports yet.</h2>
            <p>
              Problems you submit will appear here as they are reviewed and
              adopted by organisations.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
