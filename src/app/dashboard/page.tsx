import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const accountType = user.user_metadata?.account_type as string | undefined;

  switch (accountType) {
    case "student":
      redirect("/dashboard/student");
    case "organization_representative":
      redirect("/dashboard/organization");
    case "community_member":
    case "community_contributor":
      redirect("/dashboard/citizen");
    default:
      redirect("/dashboard/citizen");
  }
}
