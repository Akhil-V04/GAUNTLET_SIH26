import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/features/collaboration/components/app-header";
import { modeLabels } from "@/features/collaboration/constants";
import { getCurrentAccount } from "@/features/collaboration/server/account";
import type { PrimaryMode } from "@/features/collaboration/types";

export const dynamic = "force-dynamic";

const nextSteps: Record<PrimaryMode, Array<{ title: string; text: string; phase: string }>> = {
  student: [
    { title: "Discover a real challenge", text: "Review the owner, support, constraints and expected contribution before joining.", phase: "Phase 2–3" },
    { title: "Meet potential teammates", text: "Opt into an interest directory without exposing your private contact details.", phase: "Phase 3" },
    { title: "Build reviewed proof", text: "Selected teams submit individual contributions against agreed milestones.", phase: "Phase 5–6" },
  ],
  community_contributor: [
    { title: "Describe the need", text: "Publish context, the affected group and current workaround with explicit consent.", phase: "Phase 2" },
    { title: "Await an accountable owner", text: "A university, NGO, startup or industry partner may adopt it as a scoped challenge.", phase: "Phase 2" },
    { title: "Follow the recorded outcome", text: "See the challenge, contributions and owner-recorded handover or pilot result.", phase: "Phase 5–6" },
  ],
  organization_representative: [
    { title: "Establish organisation membership", text: "Organisation authority comes from a stored membership, never a profile selection.", phase: "Phase 2" },
    { title: "Adopt and scope a problem", text: "Define support, roles, constraints, deliverables, limits and evaluation criteria.", phase: "Phase 2" },
    { title: "Review work responsibly", text: "Select one team, review individual evidence and record an honest final outcome.", phase: "Phase 5–6" },
  ],
};

export default async function WorkspacePage() {
  const { user, profile } = await getCurrentAccount();
  if (!user) redirect("/login");
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const mode = profile.primary_mode as PrimaryMode;

  return (
    <>
      <AppHeader displayName={profile.display_name} />
      <main className="collab-page workspace-page">
        <section className="workspace-hero">
          <div>
            <p className="eyebrow">{modeLabels[mode].toUpperCase()} WORKSPACE</p>
            <h1>Welcome, {profile.display_name}.</h1>
            <p>
              Your collaboration identity is ready. The next build phases connect public problems,
              organisation-owned challenges and reviewed student work.
            </p>
          </div>
          <div className="foundation-badge"><span /> Phase 1 foundation ready</div>
        </section>

        <section className="next-step-grid" aria-label="Upcoming workflow">
          {nextSteps[mode].map((step, index) => (
            <article key={step.title}>
              <div><span>0{index + 1}</span><small>{step.phase}</small></div>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </article>
          ))}
        </section>

        <section className="workspace-empty">
          <div>
            <p className="eyebrow">CLEAR STARTING STATE</p>
            <h2>No fictional challenges or activity.</h2>
            <p>Real records will appear here as the problem and challenge workflow is implemented.</p>
          </div>
          <Link className="button-secondary" href="/onboarding">Edit profile</Link>
        </section>
      </main>
    </>
  );
}

