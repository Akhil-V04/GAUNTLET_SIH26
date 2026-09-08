import { redirect } from "next/navigation";
import { AppHeader } from "@/features/collaboration/components/app-header";
import { getCurrentAccount } from "@/features/collaboration/server/account";
import { createClient } from "@/lib/supabase/server";
import { ChallengesFeed } from "./challenges-feed";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const { user, profile: existingProfile } = await getCurrentAccount();
  if (!user) redirect("/login");

  const database = await createClient();

  /* Auto-create profile if none exists */
  let profile = existingProfile;
  if (!profile) {
    await database.from("collab_profiles").upsert({
      id: user.id,
      display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      primary_mode: "student",
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

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Student";

  return (
    <>
      <AppHeader displayName={displayName} isAdmin={isAdmin} />
      <main className="collab-page dashboard-shell">
        <section className="workspace-hero">
          <div>
            <p className="eyebrow">STUDENT DASHBOARD</p>
            <h1>Welcome, {displayName}.</h1>
            <p>
              Browse challenges posted by organisations, form teams with other students,
              and track your applications — all in one place.
            </p>
          </div>
        </section>

        {/* Organization Challenges Feed */}
        <ChallengesFeed />

        {/* My Teams – placeholder for future sprint */}
        <section className="workspace-empty" style={{ marginTop: "32px" }}>
          <div>
            <p className="eyebrow">MY TEAMS</p>
            <h2>No teams yet.</h2>
            <p>
              Teams you join or create will appear here.
              Once challenges are available you can form or join a team to collaborate.
            </p>
          </div>
        </section>

        {/* My Applications – placeholder for future sprint */}
        <section className="workspace-empty" style={{ marginTop: "32px" }}>
          <div>
            <p className="eyebrow">MY APPLICATIONS</p>
            <h2>No applications yet.</h2>
            <p>
              When you apply to a challenge, your application status and history
              will be tracked here.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
