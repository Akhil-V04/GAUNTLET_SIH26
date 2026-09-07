import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadDashboardData, type DashboardIssue } from "@/lib/dashboard-data";
import { categories } from "@/lib/categories";
import { AnalyticsOverview } from "@/components/analytics-overview";
import { LifecycleTrack } from "@/components/lifecycle-track";
import { ReportForm } from "@/components/report-form";
import { signOut } from "./actions";

const roleCopy = {
  citizen: { eyebrow: "CITIZEN WORKSPACE", title: "Your reports, clearly tracked.", text: "Follow each concern from the first report to a verified outcome." },
  officer: { eyebrow: "OFFICER CONTROL ROOM", title: "See what needs action.", text: "Prioritised issues, recurrence signals and source-labelled analytics from the records in Gauntlet." },
  solver: { eyebrow: "SOLVER WORKSPACE", title: "Assigned work, one view.", text: "Follow the issues assigned to your organisation and the recorded activity around them." },
} as const;

const categoryLabel = new Map(categories.map(category => [category.id, category.label]));
const pretty = (value: string) => value.replaceAll("_", " ");
const date = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

function IssueCard({ issue, role }: { issue: DashboardIssue; role: keyof typeof roleCopy }) {
  return <article className="issue-card">
    <div className="issue-card-top">
      <div><div className="badge-row"><span className={`status-badge status-${issue.status}`}>{pretty(issue.status)}</span><span className="source-badge">{issue.demo_source}</span>{issue.classification !== "normal" && <span className="recurrence-badge">{issue.classification}</span>}</div><h3>{issue.title}</h3><p>{issue.location_label} · {categoryLabel.get(issue.category as never) ?? pretty(issue.category)}</p></div>
      <div className="priority-orb" aria-label={`Priority ${issue.priority} out of 100`}><strong>{issue.priority}</strong><small>priority</small></div>
    </div>
    <LifecycleTrack status={issue.status}/>
    <div className="issue-card-foot"><span>{issue.unique_reporters} distinct reporter{issue.unique_reporters === 1 ? "" : "s"}</span><span>{issue.prior_verified_occurrences} prior occurrence{issue.prior_verified_occurrences === 1 ? "" : "s"}</span><span>Created {date(issue.created_at)}</span><Link href={`/dashboard/issues/${issue.id}`}>{role === "officer" ? "Manage issue" : "View issue"} →</Link></div>
  </article>;
}

export default async function DashboardPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await db.from("profiles").select("full_name,role").eq("id", user.id).single();
  if (error || !profile) throw new Error("Your workspace profile could not be loaded.");
  const role = (profile.role in roleCopy ? profile.role : "citizen") as keyof typeof roleCopy;
  const data = await loadDashboardData(db, role, user.id);
  const copy = roleCopy[role];
  const shownIssues = data.issues.slice(0, role === "officer" ? 8 : 6);

  return <main className="dashboard-shell dashboard-home">
    <header className="dashboard-header">
      <Link className="brand" href="/" aria-label="Gauntlet home"><span className="brand-mark" aria-hidden="true">g.</span>gauntlet<span className="brand-period">.</span></Link>
      <div className="dashboard-actions"><Link className="button-secondary" href="/dashboard/map">Map & issues</Link>{role === "officer" && <><Link className="button-secondary" href="/dashboard/history">History</Link><Link className="button-secondary" href="/dashboard/import">Import</Link><Link className="button-secondary" href="/dashboard/admin">Accounts</Link></>}<form action={signOut}><button className="button-secondary">Sign out</button></form></div>
    </header>
    <section className="dashboard-intro">
      <div><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.text}</p></div>
      <div className="profile-chip"><span>{profile.full_name.slice(0, 1).toUpperCase()}</span><div><strong>{profile.full_name}</strong><small>{role}</small></div></div>
    </section>
    {role === "citizen" && <ReportForm/>}
    <AnalyticsOverview analytics={data.analytics}/>

    <section className="dashboard-section">
      <div className="dashboard-section-heading"><div><p className="eyebrow">{role === "officer" ? "PRIORITY QUEUE" : role === "citizen" ? "YOUR CONNECTED ISSUES" : "ASSIGNED ISSUES"}</p><h2>{role === "officer" ? "Highest priority first" : "Latest status"}</h2></div><span>{data.issues.length} visible issue{data.issues.length === 1 ? "" : "s"}</span></div>
      {!shownIssues.length ? <div className="dashboard-empty"><span aria-hidden="true">◎</span><h3>{role === "officer" ? "The issue queue is clear" : role === "solver" ? "No work is assigned yet" : "No reports yet"}</h3><p>{role === "citizen" ? "Once you submit a report, its matched issue and progress will appear here." : "This view uses stored records only. It will update as activity is recorded."}</p></div> :
        <div className="issue-list">{shownIssues.map(issue => <IssueCard issue={issue} role={role} key={issue.id}/>)}</div>}
    </section>

    {role === "citizen" && <section className="dashboard-section">
      <div className="dashboard-section-heading"><div><p className="eyebrow">REPORT RECEIPTS</p><h2>Your recent submissions</h2></div><span>{data.reports.length} total</span></div>
      {!data.reports.length ? <p className="empty-copy">No submissions are stored for this account.</p> :
        <div className="receipt-list">{data.reports.slice(0, 8).map(report => <article key={report.id}><div><span className="status-badge">{pretty(report.processing_status)}</span><h3>{report.description.length > 90 ? report.description.slice(0, 87) + "…" : report.description}</h3><p>{report.location_label} · {date(report.created_at)}</p></div><div><strong>{report.match_outcome ? pretty(report.match_outcome) : "processing"}</strong><small>Report {report.id.slice(0, 8).toUpperCase()}</small></div></article>)}</div>}
    </section>}

    <section className="dashboard-section">
      <div className="dashboard-section-heading"><div><p className="eyebrow">ACTIVITY TIMELINE</p><h2>Recent recorded changes</h2></div></div>
      {!data.timeline.length ? <div className="dashboard-empty compact"><span aria-hidden="true">↻</span><h3>No activity events yet</h3><p>Assignments, status changes, verification and rework events will appear in chronological order.</p></div> :
        <ol className="activity-timeline">{data.timeline.map(event => <li key={event.id}><span aria-hidden="true"/><div><strong>{pretty(event.event_type)}</strong><p>{event.title}</p><time>{new Date(event.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time></div></li>)}</ol>}
    </section>
    <p className="dashboard-data-note">Counts reflect records visible to your role. Live, imported and demonstration records are labelled separately.</p>
  </main>;
}
