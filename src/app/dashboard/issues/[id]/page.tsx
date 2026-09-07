import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LifecycleTrack } from "@/components/lifecycle-track";
import { EscalationForm, ProgressForm, ResolutionForm, RouteIssueForm, VerifyResolutionForm } from "@/components/issue-actions";
import { eventSummary } from "@/lib/event-summary";

const pretty = (value: string) => value.replaceAll("_", " ");
const date = (value: string) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function IssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: issue }] = await Promise.all([
    db.from("profiles").select("role,organization_id").eq("id", user.id).single(),
    db.from("issues").select("*").eq("id", id).maybeSingle(),
  ]);
  if (!profile || !issue) notFound();
  const [reportsResult, assignmentsResult, resolutionsResult, evidenceResult, eventsResult, organizationsResult, historiesResult] = await Promise.all([
    db.from("reports").select("id,description,reporter_id,created_at").eq("issue_id", id).order("created_at", { ascending: false }),
    db.from("assignments").select("id,organization_id,status,assigned_at,historical_report_id").eq("issue_id", id).order("assigned_at", { ascending: false }),
    db.from("resolution_attempts").select("id,note,outcome,rejection_reason,verifier_id,submitted_by,created_at,decided_at").eq("issue_id", id).order("created_at", { ascending: false }),
    db.from("evidence").select("id,resolution_attempt_id,mime_type,created_at").eq("issue_id", id).order("created_at", { ascending: false }),
    db.from("issue_events").select("id,event_type,details,created_at").eq("issue_id", id).order("created_at", { ascending: false }),
    db.from("organizations").select("id,name,type").eq("active", true).order("name"),
    db.from("historical_reports").select("id,version").eq("issue_id", id).order("version", { ascending: false }).limit(20),
  ]);
  const reports = reportsResult.data ?? [], assignments = assignmentsResult.data ?? [];
  const allowed = profile.role === "officer" || issue.created_by === user.id || issue.verifier_id === user.id || reports.length > 0 || (profile.role === "solver" && assignments.length > 0);
  if (!allowed) notFound();
  const resolutions = resolutionsResult.data ?? [], evidence = evidenceResult.data ?? [], events = eventsResult.data ?? [];
  if ([reportsResult, assignmentsResult, resolutionsResult, evidenceResult, eventsResult, organizationsResult, historiesResult].some(result => result.error)) throw new Error("Issue details could not be loaded. Please retry.");
  const currentAssignment = assignments.find(item => ["assigned", "acknowledged"].includes(item.status));
  const pending = resolutions.find(item => item.outcome === "pending" && (item.verifier_id === user.id || profile.role === "officer") && (item.submitted_by !== user.id || issue.demo_source !== "live"));
  const canWork = !!currentAssignment && ["assigned", "in_progress", "rework_required"].includes(issue.status) && (profile.role === "officer" || (profile.role === "solver" && profile.organization_id === currentAssignment.organization_id));
  const canRoute = profile.role === "officer" && !["verified", "awaiting_verification"].includes(issue.status);

  return <main className="dashboard-shell issue-detail-shell">
    <header className="dashboard-header"><Link className="brand" href="/dashboard"><span className="brand-mark">g.</span>gauntlet<span className="brand-period">.</span></Link><Link className="button-secondary" href="/dashboard">← Dashboard</Link></header>
    <section className="issue-hero"><div><p className="eyebrow">ISSUE {issue.id.slice(0, 8).toUpperCase()}</p><h1>{issue.title}</h1><p>{issue.location_label} · {pretty(issue.category)}</p></div><div className="priority-orb"><strong>{issue.priority}</strong><small>priority</small></div></section>
    <LifecycleTrack status={issue.status}/>
    <div className="issue-detail-grid"><section className="dashboard-panel"><p className="eyebrow">CURRENT RECORD</p><dl className="detail-list"><div><dt>Status</dt><dd>{pretty(issue.status)}</dd></div><div><dt>Class</dt><dd>{pretty(issue.classification)}</dd></div><div><dt>Distinct reporters</dt><dd>{issue.unique_reporters}</dd></div><div><dt>Failed attempts</dt><dd>{issue.failed_attempts}</dd></div><div><dt>Created</dt><dd>{date(issue.created_at)}</dd></div></dl>{profile.role === "officer" && <Link className="text-link" href={`/dashboard/history/${id}`}>Open RAG history report →</Link>}</section>
      {canRoute && <section className="dashboard-panel"><p className="eyebrow">ROUTING / MANUAL REVIEW</p><h2>Assign or change recipient</h2>{issue.status === "manual_review" && <p>Review the rejected attempt below. Record the revised approach and assign a solver to resume work.</p>}<RouteIssueForm issueId={id} organizations={organizationsResult.data ?? []} current={currentAssignment?.organization_id ?? issue.department_id} status={issue.status} histories={historiesResult.data ?? []}/></section>}
      {canRoute && <section className="dashboard-panel"><p className="eyebrow">OFFICER ASSESSMENT</p><h2>Escalate a recurring or systemic issue</h2><EscalationForm issueId={id} status={issue.status}/></section>}
      {canWork && currentAssignment && <><section className="dashboard-panel"><p className="eyebrow">WORK PROGRESS</p><h2>Acknowledge and update</h2><ProgressForm issueId={id} status={issue.status} assignmentId={currentAssignment.id}/>{currentAssignment.historical_report_id && <Link className="text-link" href={`/dashboard/history/${id}`}>Open forwarded historical report →</Link>}</section><section className="dashboard-panel"><p className="eyebrow">RESOLUTION</p><h2>Record completed work</h2><ResolutionForm issueId={id} status={issue.status} assignmentId={currentAssignment.id}/></section></>}
      {pending && <section className="dashboard-panel verification-panel"><p className="eyebrow">CITIZEN VERIFICATION</p><h2>Was this issue resolved?</h2><p>{pending.note}</p>{evidence.filter(item => item.resolution_attempt_id === pending.id).map(item => <a className="evidence-link" href={`/api/evidence/${item.id}`} target="_blank" rel="noreferrer" key={item.id}>View completion evidence ↗</a>)}<VerifyResolutionForm resolutionId={pending.id}/></section>}
    </div>
    <section className="dashboard-section"><h2>Supporting reports</h2>{reports.map(report => <article className="history-record" key={report.id}><p>{report.description}</p><time>{date(report.created_at)}</time></article>)}{evidence.filter(item => !item.resolution_attempt_id).map(item => <p key={item.id}><a className="text-link" href={`/api/evidence/${item.id}`} target="_blank" rel="noreferrer">View report photo ↗</a></p>)}</section>
    <section className="dashboard-section"><div className="dashboard-section-heading"><div><p className="eyebrow">RESOLUTION ATTEMPTS</p><h2>Evidence and decisions</h2></div></div>{!resolutions.length ? <p className="empty-copy">No resolution has been submitted yet.</p> : <div className="attempt-list">{resolutions.map(item => <article className="dashboard-panel" key={item.id}><span className={`status-badge status-${item.outcome}`}>{item.outcome}</span><h3>{item.note}</h3><p>{date(item.created_at)}</p>{item.rejection_reason && <p className="rejection-copy">Rejection: {item.rejection_reason}</p>}{evidence.filter(file => file.resolution_attempt_id === item.id).map(file => <a className="text-link" href={`/api/evidence/${file.id}`} target="_blank" rel="noreferrer" key={file.id}>View evidence ↗</a>)}</article>)}</div>}</section>
    <section className="dashboard-section"><div className="dashboard-section-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Recorded activity</h2></div></div><ol className="activity-timeline">{events.map(event => <li key={event.id}><span/><div><strong>{pretty(event.event_type)}</strong><p>{eventSummary(event.details)}</p><time>{date(event.created_at)}</time></div></li>)}</ol></section>
  </main>;
}
