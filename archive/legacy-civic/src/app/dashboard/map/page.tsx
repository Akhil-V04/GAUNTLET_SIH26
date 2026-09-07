import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadDashboardData } from "@/lib/dashboard-data";
import { IssueMap } from "@/components/issue-map";
import type { UserRole } from "@/lib/categories";
export default async function MapPage() {
  const db = await createClient(); const { data: { user } } = await db.auth.getUser(); if (!user) redirect("/login");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single(); if (!profile) redirect("/login");
  const data = await loadDashboardData(db, profile.role as UserRole, user.id);
  return <main className="dashboard-shell issue-detail-shell"><header className="dashboard-header"><Link className="brand" href="/dashboard">gauntlet.</Link><Link className="button-secondary" href="/dashboard">← Dashboard</Link></header><section className="history-heading"><p className="eyebrow">ISSUE MAP</p><h1>See the local picture.</h1><p>Filter the issues visible to your role, inspect their locations and open the recorded history.</p></section><IssueMap issues={data.issues}/><p className="history-muted">The officer view loads up to 1,000 issues; citizen and solver views use their permitted recent records. Markers show report locations, not verified affected boundaries.</p></main>;
}
