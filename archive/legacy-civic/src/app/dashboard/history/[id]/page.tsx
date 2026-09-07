import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readHistoryDocument } from "@/lib/history-core";
import { PrepareHistory } from "@/components/prepare-history";
import { HistoryReportView } from "@/components/history-report-view";

export default async function IssueHistoryPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ version?: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["officer", "solver"].includes(profile.role)) redirect("/dashboard");
  const [{ data: issue, error: issueError }, { data: versions, error: historyError }] = await Promise.all([
    db.from("issues").select("id,title,location_label,classification").eq("id", id).maybeSingle(),
    db.from("historical_reports").select("id,version,created_at,generation_status").eq("issue_id", id).order("version", { ascending: false }).limit(20),
  ]);
  if (issueError || historyError) throw new Error("Unable to load historical reports. Please retry.");
  if (!issue) notFound();
  const requested = Number((await searchParams).version);
  const version = Number.isInteger(requested) && requested > 0 ? requested : versions?.[0]?.version;
  const { data: saved, error: savedError } = version ? await db.from("historical_reports").select("*").eq("issue_id", id).eq("version", version).maybeSingle() : { data: null, error: null };
  if (savedError) throw new Error("Unable to load this report version.");
  if (version && !saved) notFound();
  const document = readHistoryDocument(saved?.summary);
  return <main className="dashboard-shell history-shell">
    <header className="dashboard-header"><Link className="brand" href="/dashboard"><span className="brand-mark">g.</span>gauntlet.</Link><Link className="button-secondary" href={`/dashboard/issues/${id}`}>← Issue actions</Link></header>
    <section className="history-heading"><p className="eyebrow">{profile.role.toUpperCase()} · {issue.classification.toUpperCase()}</p><h1>Follow the history.</h1><p>{issue.title} · {issue.location_label}</p>{profile.role === "officer" && <PrepareHistory issueId={id}/>}</section>
    {!!versions?.length && <nav className="history-versions" aria-label="Report versions">{versions.map(v => <Link key={v.id} aria-current={v.version === version ? "page" : undefined} href={`?version=${v.version}`}>Version {v.version}</Link>)}</nav>}
    {saved && <p className="history-muted">Version {saved.version} · Prepared {document?.preparedAt || saved.created_at} · {saved.generation_status === "generated" ? "AI-prepared extract" : "AI summary unavailable"}{saved.model ? " · Model: " + saved.model : ""}</p>}
    {document ? <HistoryReportView document={document}/> : <section className="history-panel"><h2>{saved ? "Report format unavailable" : "Prepare the first historical report"}</h2><p>Retrieve linked incidents and relevant verified cases, including recorded actions, evidence and outcomes. Preparing a report saves a new version when source records change.</p></section>}
  </main>;
}
