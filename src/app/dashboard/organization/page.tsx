import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/features/collaboration/components/app-header";
import { getCurrentAccount } from "@/features/collaboration/server/account";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrganizationDashboardPage() {
  const { user, profile: existingProfile } = await getCurrentAccount();
  if (!user) redirect("/login");

  const database = await createClient();

  /* ── Auto-create profile if missing ─────────────────────────── */
  let profile = existingProfile;
  if (!profile) {
    await database.from("collab_profiles").upsert({
      id: user.id,
      display_name:
        user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      primary_mode: "organization_representative",
      headline: "",
      institution: user.user_metadata?.organization_name || "",
      skills: [],
      availability: "open",
      discoverable: true,
      onboarding_completed: true,
    });

    const { data: freshProfile } = await database
      .from("collab_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    profile = freshProfile;
  }

  const displayName =
    profile?.display_name || user.email?.split("@")[0] || "User";

  /* ── Admin check ────────────────────────────────────────────── */
  const { data: roles } = await database
    .from("collab_platform_roles")
    .select("platform_role")
    .eq("user_id", user.id);

  const isAdmin = roles?.some((r) => r.platform_role === "admin") || false;

  /* ── Fetch citizen problems (published / adopted) ───────────── */
  const { data: problems } = await database
    .from("collab_problems")
    .select(
      "id,author_id,title,summary,affected_group,current_workaround,domain,approximate_location,status,created_at"
    )
    .in("status", ["published", "adopted"])
    .order("created_at", { ascending: false })
    .limit(20);

  /* ── Fetch org's own challenges ─────────────────────────────── */
  const { data: myChallenges } = await database
    .from("collab_challenges")
    .select("id,title,objective,status,created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <>
      <AppHeader displayName={displayName} isAdmin={isAdmin} />
      <main className="collab-page dashboard-shell">
        {/* ── Welcome hero ─────────────────────────────────── */}
        <section className="workspace-hero">
          <div>
            <p className="eyebrow">ORGANISATION DASHBOARD</p>
            <h1>Welcome, {displayName}.</h1>
            <p>
              Browse citizen-reported problems and adopt them as scoped
              challenges for student teams to solve.
            </p>
          </div>
        </section>

        {/* ── Citizen Problems Feed ────────────────────────── */}
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">CITIZEN PROBLEMS FEED</p>
            <h2>Community-reported problems</h2>
          </div>
          <span>
            {problems?.length ?? 0} problem{problems?.length !== 1 ? "s" : ""}
          </span>
        </div>

        {problems && problems.length > 0 ? (
          <div className="issue-list">
            {problems.map((problem) => (
              <article key={problem.id} className="issue-card">
                <div className="issue-card-top">
                  <div>
                    <div className="badge-row">
                      {problem.domain && (
                        <span className="source-badge">{problem.domain}</span>
                      )}
                      <span
                        className={`status-badge status-${problem.status}`}
                      >
                        {problem.status}
                      </span>
                    </div>
                    <h3>{problem.title}</h3>
                    <p>{problem.summary}</p>
                  </div>
                </div>

                <div className="issue-card-foot">
                  {problem.affected_group && (
                    <span>Affected: {problem.affected_group}</span>
                  )}
                  {problem.approximate_location && (
                    <span>📍 {problem.approximate_location}</span>
                  )}
                  <span>
                    {new Date(problem.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: "12px", alignItems: "center" }}>
                    <Link href={`/problems/${problem.id}`} style={{ fontWeight: "normal", color: "var(--muted)" }}>View details</Link>
                    <Link href={`/challenges/new?problem_id=${problem.id}`} className="button-primary" style={{ padding: "8px 12px", fontSize: "12px" }}>Take up problem</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <span>📋</span>
            <h3>No citizen problems yet</h3>
            <p>
              Problems reported by community members will appear here once they
              are published.
            </p>
          </div>
        )}

        {/* ── My Challenges ────────────────────────────────── */}
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">MY CHALLENGES</p>
            <h2>Challenges you&apos;ve posted</h2>
          </div>
          <Link className="button-primary" href="/challenges/new">
            + New Challenge
          </Link>
        </div>

        {myChallenges && myChallenges.length > 0 ? (
          <div className="issue-list">
            {myChallenges.map((challenge) => (
              <article key={challenge.id} className="issue-card">
                <div className="issue-card-top">
                  <div>
                    <div className="badge-row">
                      <span
                        className={`status-badge status-${challenge.status}`}
                      >
                        {challenge.status}
                      </span>
                    </div>
                    <h3>{challenge.title}</h3>
                    {challenge.objective && <p>{challenge.objective}</p>}
                  </div>
                </div>
                <div className="issue-card-foot">
                  <span>
                    Created{" "}
                    {new Date(challenge.created_at).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </span>
                  <Link href={`/challenges/${challenge.id}`}>
                    Manage challenge →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <span>🏢</span>
            <h3>No challenges posted yet</h3>
            <p>
              Adopt a citizen problem above or create a new challenge for
              student teams to work on.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
