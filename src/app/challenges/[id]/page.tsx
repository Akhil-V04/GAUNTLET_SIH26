import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentAccount } from "@/features/collaboration/server/account";
import { AppHeader } from "@/features/collaboration/components/app-header";
import { ChallengeClient } from "./challenge-client";

export const dynamic = "force-dynamic";

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile } = await getCurrentAccount();
  
  if (!user || !profile) {
    redirect("/login");
  }

  const headersList = await headers();
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const host = headersList.get("host") || "localhost:3000";
  const cookie = headersList.get("cookie") || "";

  const res = await fetch(`${protocol}://${host}/api/collaboration/challenges/${id}`, {
    headers: { cookie }
  });

  if (!res.ok) {
    return (
      <>
        <AppHeader displayName={profile.display_name} isAdmin={false} />
        <main className="collab-page">
          <section className="workspace-empty">
            <div>
              <h2>Challenge Not Found</h2>
              <p>The challenge you are looking for does not exist or has been removed.</p>
            </div>
          </section>
        </main>
      </>
    );
  }

  const data = await res.json();
  const isOwner = data.challenge.owner_id === user.id;

  return (
    <>
      <AppHeader displayName={profile.display_name} isAdmin={false} />
      <main className="collab-page">
        <div className="issue-detail-shell">
          <div className="issue-hero">
            <p className="eyebrow">CHALLENGE DETAILS</p>
            <h1>{data.challenge.title}</h1>
            <p>{data.challenge.objective}</p>
            <div className="badge-row" style={{ marginTop: "16px" }}>
              <span className="status-badge">{data.challenge.status}</span>
              <span className="status-badge">{data.challenge.engagement_type}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px", marginTop: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="detail-list">
                <h3>Challenge Info</h3>
                <dl>
                  {data.challenge.expected_roles?.length > 0 && (
                    <>
                      <dt>Expected Roles</dt>
                      <dd>{data.challenge.expected_roles.join(", ")}</dd>
                    </>
                  )}
                  {data.challenge.useful_skills?.length > 0 && (
                    <>
                      <dt>Useful Skills</dt>
                      <dd>{data.challenge.useful_skills.join(", ")}</dd>
                    </>
                  )}
                  {data.challenge.deliverables && (
                    <>
                      <dt>Deliverables</dt>
                      <dd>{data.challenge.deliverables}</dd>
                    </>
                  )}
                </dl>
              </div>

              {isOwner && data.applications?.length > 0 && (
                <div className="detail-list">
                  <h3>Applications Received</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                    {data.applications.map((app: { id: string; team_id: string; proposal: string; status: string }) => {
                      const team = data.viewer?.teams?.find((t: { id: string; name: string }) => t.id === app.team_id);
                      const teamName = team ? team.name : `Team ID: ${app.team_id}`;
                      
                      return (
                        <div key={app.id} className="issue-card" style={{ padding: "16px", border: "1px solid #d1d5db", borderRadius: "8px" }}>
                          <strong>{teamName}</strong>
                          <p style={{ marginTop: "8px", fontSize: "14px", whiteSpace: "pre-wrap" }}>{app.proposal}</p>
                          <span className="status-badge" style={{ marginTop: "8px", display: "inline-block" }}>{app.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <ChallengeClient 
                challengeId={id} 
                isOwner={isOwner} 
                interestedPeople={data.interestedPeople}
                availableTeams={data.availableTeams}
                viewer={data.viewer}
                userMode={profile.primary_mode}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
