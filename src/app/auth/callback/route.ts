import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getDashboardUrl(accountType: string | undefined): string {
  switch (accountType) {
    case "student":
      return "/dashboard/student";
    case "organization_representative":
      return "/dashboard/organization";
    case "community_member":
    case "community_contributor":
      return "/dashboard/citizen";
    default:
      return "/dashboard/citizen";
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.user_metadata?.account_type as string | undefined;
      return NextResponse.redirect(new URL(getDashboardUrl(role), url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
}
