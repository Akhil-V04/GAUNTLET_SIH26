import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "officer") redirect("/dashboard");
  const { data: issues, error } = await db.from("issues").select("id,title,classification,location_label,priority,status,demo_source")
    .order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(100);
  return <main className="dashboard-shell history-shell">
    <header className="dashboard-header"><Link className="brand" href="/dashboard"><span className="brand-mark">g.</span>gauntlet.</Link><Link className="button-secondary" href="/dashboard">Workspace</Link></header>
    <section className="history-heading"><p className="eyebrow">OFFICER · ISSUE INTELLIGENCE</p><h1>History before action.</h1><p>Trace previous incidents, recorded interventions and verified outcomes. Prepare a factual report with sources.</p></section>
    {error ? <p role="alert" className="history-notice">The issue list could not be loaded. Refresh to retry.</p> :
      !issues?.length ? <section className="history-panel"><h2>No issues yet</h2><p>Historical reports become available once real or clearly labelled imported issues are saved. No example activity has been added to your database.</p></section> :
      <div className="history-queue">{issues.map(i => <Link className="history-queue-item" key={i.id} href={`/dashboard/history/${i.id}`}>
        <div><span className="history-tag">{i.classification}</span><h2>{i.title}</h2><p>{i.location_label} · {i.status.replaceAll("_", " ")} · {i.demo_source}</p></div><span className="history-score">{i.priority}<small>priority</small></span>
      </Link>)}</div>}
    {!!issues?.length && <p className="history-muted">Showing up to 100 issues, ordered by stored priority.</p>}
  </main>;
}
