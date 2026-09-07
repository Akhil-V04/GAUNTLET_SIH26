import type { HistoryDocument } from "@/lib/history-core";

export function HistoryReportView({ document }: { document: HistoryDocument }) {
  const { sources } = document.snapshot;
  const labels = { current: "Current issue", linked: "Linked previous incidents", analogous: "Analogous cases · not local recurrences" };
  const highlights = document.highlights.map(id => document.facts.find(f => f.id === id)).filter(f => !!f);
  return <div className="history-document">
    <section className="history-panel">
      <p className="eyebrow">HISTORICAL BRIEF</p>
      <h2>{document.summaryMode === "ai_extract" ? "AI-prepared extract with sources" : "Retrieved factual history"}</h2>
      {document.unavailableReason && <p className="history-notice" role="status">{document.unavailableReason}</p>}
      {!!highlights.length && <ul className="history-highlights">{highlights.map(f => <li key={f.id}><span className="history-tag">{f.relationship}</span> {f.text} <a href={`#${f.anchor}`}>View source ↗</a></li>)}</ul>}
      <p className="history-muted">Linked records show recorded recurrence history. Similar cases provide context and do not increase the local recurrence count. Quotes are stored observations, not independently verified findings.</p>
    </section>
    {(["current", "linked", "analogous"] as const).map(relationship => <section className="history-section" key={relationship}>
      <h2>{labels[relationship]}</h2>
      {!sources.some(s => s.relationship === relationship) && <p className="history-muted">No {relationship === "linked" ? "linked previous incidents" : "relevant analogous history"} found.</p>}
      {sources.filter(s => s.relationship === relationship).map(source => <article className="history-panel" key={source.issue.id} id={`issue-${source.issue.id}`}>
        <div className="history-source-heading"><div><span className="history-tag">{source.issue.demo_source} record</span><h3>{source.issue.title}</h3><p>{source.issue.location_label} · {source.issue.category} · {source.issue.classification}</p></div><div className="history-score">{source.issue.priority}<small>stored priority</small></div></div>
        <dl className="history-metrics"><div><dt>Reports / distinct reporters</dt><dd>{source.report_count} / {source.issue.unique_reporters}</dd></div><div><dt>Recorded prior occurrences</dt><dd>{source.issue.prior_verified_occurrences}</dd></div><div><dt>Recorded rejected attempts</dt><dd>{source.issue.failed_attempts}</dd></div><div><dt>Status</dt><dd>{source.issue.status.replaceAll("_", " ")}</dd></div></dl>
        <p className="history-muted">Created {source.issue.created_at} · Verified closure: {source.issue.verified_at || "Not recorded"}<br/>Source issue: {source.issue.id}</p>
        <h4>Observations & dates</h4>
        {!source.reports.length && <p className="history-muted">No citizen observations recorded.</p>}
        {source.reports.map(r => <div className="history-record" id={r.id} key={r.id}><time>{r.occurrence_at}</time><p>{r.description}</p><small>Report {r.id} · {r.demo_source}</small></div>)}
        <h4>Interventions & outcomes</h4>
        {!source.resolutions.length && <p className="history-muted">No resolution actions recorded.</p>}
        {source.resolutions.map(r => <div className="history-record" id={r.id} key={r.id}><span className="history-tag">{r.outcome}</span><time>Submitted {r.created_at}</time><p>{r.note}</p>{r.outcome === "rejected" && <p><strong>Recorded rejection reason:</strong> {r.rejection_reason || "Not recorded"}</p>}<small>Decision: {r.decided_at || "Not recorded"} · Action {r.id}</small></div>)}
        <h4>Supporting evidence</h4>
        {!source.evidence.length && <p className="history-muted">No evidence files recorded.</p>}
        {source.evidence.map(e => <p className="history-record" id={e.id} key={e.id}><a href={`/api/evidence/${e.id}`} target="_blank" rel="noreferrer">View evidence ↗</a> · {e.mime_type} · {e.created_at}<br/><small>Evidence {e.id}</small></p>)}
        <h4>Department & forwarding</h4><p>{source.department || "No department assigned"}</p>
        {!source.assignments.length && <p className="history-muted">No in-app forwarding recorded.</p>}
        {source.assignments.map(a => <p className="history-record" key={a.id} id={a.id}>{a.organization} · {a.status} · {a.assigned_at}<br/><small>Acknowledged: {a.acknowledged_at || "Not recorded"}</small></p>)}
        {!!source.events.length && <details><summary>Recorded activity (latest {source.events.length})</summary>{source.events.map(e => <div className="history-record" id={e.id} key={e.id}><p>{e.event_type.replaceAll("_", " ")} · {e.created_at}</p><pre>{JSON.stringify(e.details, null, 2)}</pre></div>)}</details>}
      </article>)}
    </section>)}
    <section className="history-panel"><h2>Missing information & limits</h2><ul>{document.missing.map((item, index) => <li key={index}>{item}</li>)}</ul><p className="history-muted">Retrieval includes up to 20 linked incidents, 5 analogous cases, 20 records per evidence/action/observation type, 20 activity events and 10 assignments per issue. Semantic cases require the same embedding model. This is a saved snapshot, not a live status guarantee.</p></section>
  </div>;
}
