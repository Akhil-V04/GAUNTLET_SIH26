import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/features/collaboration/server/account";
import { createClient } from "@/lib/supabase/server";
import { CreateChallengeForm } from "./create-challenge-form";

export default async function NewChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ problem_id?: string }>;
}) {
  const { user, profile } = await getCurrentAccount();

  if (!user || !profile) {
    redirect("/sign-in");
  }

  if (profile.primary_mode !== "organization_representative") {
    return (
      <main className="dashboard-layout">
        <div className="dashboard-content" style={{ padding: "2rem" }}>
          <h1 style={{ color: "var(--red-600)", marginBottom: "1rem" }}>Access Denied</h1>
          <p>Only organization representatives can adopt problems and create challenges.</p>
        </div>
      </main>
    );
  }

  const database = await createClient();

  // Fetch organization membership to get the organization_id for adopt_problem payload
  const { data: memberships } = await database
    .from("collab_organization_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  const organizationId = memberships?.[0]?.organization_id || profile.id;

  const { problem_id } = await searchParams;

  let problem = null;
  if (problem_id) {
    const { data } = await database
      .from("collab_problems")
      .select("*")
      .eq("id", problem_id)
      .maybeSingle();
    if (data) {
      problem = data;
    }
  }

  return (
    <main className="dashboard-layout">
      <div className="dashboard-content">
        <CreateChallengeForm
          organizationId={organizationId}
          problemId={problem?.id}
          initialTitle={problem?.title || ""}
          initialObjective={problem?.summary || ""}
        />
      </div>
    </main>
  );
}
