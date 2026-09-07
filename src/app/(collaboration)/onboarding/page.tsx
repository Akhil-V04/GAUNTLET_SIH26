import { redirect } from "next/navigation";
import { AppHeader } from "@/features/collaboration/components/app-header";
import { OnboardingForm } from "@/features/collaboration/components/onboarding-form";
import { getCurrentAccount } from "@/features/collaboration/server/account";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { user, profile } = await getCurrentAccount();
  if (!user) redirect("/login");

  const suggestedName =
    typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "";

  return (
    <>
      <AppHeader displayName={profile?.display_name} />
      <main className="collab-page onboarding-page">
        <section className="page-heading">
          <p className="eyebrow">YOUR GAUNTLET PROFILE</p>
          <h1>{profile ? "Keep your profile current." : "Choose how you will contribute."}</h1>
          <p>
            Your profile controls what others can discover. Organisation access is granted through a
            verified membership and cannot be claimed here.
          </p>
        </section>
        <section className="form-card" aria-label="Profile setup">
          <OnboardingForm email={user.email ?? ""} existingProfile={profile} suggestedName={suggestedName} />
        </section>
      </main>
    </>
  );
}

