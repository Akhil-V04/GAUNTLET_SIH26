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

  const accountType = user.user_metadata?.account_type || "student";
  
  let heading = "Choose how you will contribute.";
  if (accountType === 'student') {
    heading = 'Complete your student profile';
  } else if (accountType === 'organization_representative') {
    heading = 'Set up your organisation profile';
  } else if (accountType === 'community_member') {
    heading = "You're all set!";
  }

  return (
    <>
      <AppHeader displayName={profile?.display_name} />
      <main className="collab-page onboarding-page">
        <section className="page-heading">
          <p className="eyebrow">YOUR GAUNTLET PROFILE</p>
          <h1>{profile ? "Keep your profile current." : heading}</h1>
          <p>
            Your profile controls what others can discover. Organisation access is granted through a
            verified membership and cannot be claimed here.
          </p>
        </section>
        <section className="form-card" aria-label="Profile setup">
          <OnboardingForm 
            email={user.email ?? ""} 
            existingProfile={profile} 
            suggestedName={suggestedName} 
            accountType={accountType} 
          />
        </section>
      </main>
    </>
  );
}
