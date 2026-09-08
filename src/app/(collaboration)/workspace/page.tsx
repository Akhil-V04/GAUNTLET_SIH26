import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/features/collaboration/components/app-header";
import { modeLabels } from "@/features/collaboration/constants";
import { getCurrentAccount } from "@/features/collaboration/server/account";
import { createClient } from "@/lib/supabase/server";
import type { PrimaryMode } from "@/features/collaboration/types";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const { user, profile } = await getCurrentAccount();
  if (!user) redirect("/login");
  if (!profile) redirect("/onboarding");

  const database = await createClient();
  const { data: roles } = await database
    .from("collab_platform_roles")
    .select("platform_role")
    .eq("user_id", user.id);
  
  const isAdmin = roles?.some(r => r.platform_role === "admin") || false;

  const mode = profile.primary_mode as PrimaryMode;
  const isProfileComplete = profile.onboarding_completed;

  return (
    <>
      <AppHeader displayName={profile.display_name} isAdmin={isAdmin} />
      <main className="collab-page workspace-page">
        <section className="workspace-hero">
          <div>
            <p className="eyebrow">
              {(modeLabels[mode] || mode).toUpperCase()} WORKSPACE
            </p>
            <h1>Welcome, {profile.display_name}.</h1>
            <p>
              Your collaboration identity is ready. The next build phases connect public problems,
              organisation-owned challenges and reviewed student work.
            </p>
          </div>
          <div className="foundation-badge">
            <span /> Phase 1 foundation ready
          </div>
        </section>

        {mode === "student" && !isProfileComplete && (
          <div className="profile-banner">
            <span>Complete your profile to apply for challenges</span>
            <Link href="/onboarding" className="button-primary" style={{ padding: "8px 16px", fontSize: "12px" }}>
              Complete Profile
            </Link>
          </div>
        )}

        {mode === "organization_representative" && !isProfileComplete && (
          <div className="profile-banner">
            <span>Complete your organisation profile to take up problems</span>
            <Link href="/onboarding" className="button-primary" style={{ padding: "8px 16px", fontSize: "12px" }}>
              Complete Profile
            </Link>
          </div>
        )}

        {mode === "community_contributor" && (
          <>
            <section className="workspace-empty" style={{ marginBottom: "24px" }}>
              <div>
                <p className="eyebrow">REPORT A PROBLEM</p>
                <h2>Share an issue with the community.</h2>
                <p>Help identify problems that need solving.</p>
              </div>
              <Link className="button-primary" href="/problems/new">Submit a Problem →</Link>
            </section>

            <section className="workspace-empty">
              <div>
                <p className="eyebrow">YOUR REPORTS</p>
                <h2>No reports yet.</h2>
                <p>Problems you submit will appear here as they are reviewed and adopted by organisations.</p>
              </div>
            </section>
          </>
        )}

        {mode === "student" && (
          <>
            <section className="workspace-empty" style={{ marginBottom: "24px", marginTop: isProfileComplete ? "34px" : "0" }}>
              <div>
                <p className="eyebrow">AVAILABLE CHALLENGES</p>
                <h2>No challenges available.</h2>
                <p>Challenges posted by organisations will appear here. Apply or form a team to contribute.</p>
              </div>
            </section>

            <section className="workspace-empty">
              <div>
                <p className="eyebrow">YOUR TEAMS</p>
                <h2>No teams yet.</h2>
                <p>Teams you join or create will be tracked here.</p>
              </div>
            </section>
          </>
        )}

        {mode === "organization_representative" && (
          <>
            <section className="workspace-empty" style={{ marginBottom: "24px", marginTop: isProfileComplete ? "34px" : "0" }}>
              <div>
                <p className="eyebrow">COMMUNITY PROBLEMS</p>
                <h2>No community problems yet.</h2>
                <p>Problems reported by citizens will appear here. Adopt them as scoped challenges.</p>
              </div>
            </section>

            <section className="workspace-empty">
              <div>
                <p className="eyebrow">YOUR CHALLENGES</p>
                <h2>No challenges posted.</h2>
                <p>Challenges you post and their student applications will be tracked here.</p>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}

