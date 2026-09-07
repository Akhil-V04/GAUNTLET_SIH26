export type HistorySource = {
  relationship: "current" | "linked" | "analogous";
  similarity: number | null;
  issue: {
    id: string; title: string; category: string; classification: string; location_label: string;
    status: string; severity: string; priority: number; unique_reporters: number;
    prior_verified_occurrences: number; failed_attempts: number; created_at: string;
    verified_at: string | null; demo_source: string; embedding_model: string | null;
  };
  report_count: number;
  reports: { id: string; description: string; occurrence_at: string; created_at: string; demo_source: string }[];
  resolution_count: number;
  resolutions: { id: string; note: string; outcome: string; rejection_reason: string | null; created_at: string; decided_at: string | null }[];
  evidence_count: number;
  evidence: { id: string; report_id: string | null; resolution_attempt_id: string | null; mime_type: string; created_at: string }[];
  events: { id: string; event_type: string; created_at: string; details: unknown }[];
  department: string | null;
  assignments: { id: string; organization: string; status: string; assigned_at: string; acknowledged_at: string | null }[];
};
export type HistorySnapshot = { sources: HistorySource[]; limits: { linked: number; analogous: number; records_per_type: number } };
export type HistoryFact = { id: string; issueId: string; relationship: HistorySource["relationship"]; text: string; anchor: string };
export type HistoryDocument = {
  schemaVersion: 1; fingerprint: string; preparedAt: string; snapshot: HistorySnapshot;
  facts: HistoryFact[]; highlights: string[]; missing: string[];
  summaryMode: "ai_extract" | "factual"; unavailableReason: string | null;
};

const date = (value: string) => new Date(value).toISOString().slice(0, 10);
const excerpt = (text: string, limit = 600) => text.length > limit ? text.slice(0, limit) + "… [excerpt]" : text;

export function buildFacts(snapshot: HistorySnapshot) {
  const facts: HistoryFact[] = [];
  for (const source of snapshot.sources) {
    const i = source.issue;
    const add = (id: string, text: string, anchor = id) => facts.push({ id, text, anchor, issueId: i.id, relationship: source.relationship });
    add(i.id, `Recorded issue “${i.title}” at ${i.location_label}; category ${i.category}; status ${i.status}; created ${date(i.created_at)}. Source: ${i.demo_source}.`, "issue-" + i.id);
    add(i.id + "-metrics", `${source.report_count} reports from ${i.unique_reporters} distinct reporters. Stored priority ${i.priority}/100; severity ${i.severity}. Recorded prior verified occurrences: ${i.prior_verified_occurrences}; rejected attempts: ${i.failed_attempts}.`, "issue-" + i.id);
    if (i.verified_at) add(i.id + "-closure", `Verified closure recorded on ${date(i.verified_at)}.`, "issue-" + i.id);
    for (const r of source.resolutions) {
      add(r.id, `Resolution submitted ${date(r.created_at)}; outcome ${r.outcome}${r.decided_at ? " on " + date(r.decided_at) : ""}. Recorded note: “${excerpt(r.note)}”.`);
      if (r.outcome === "rejected") add(r.id + "-rejection", `Rejection reason recorded: “${excerpt(r.rejection_reason || "No reason recorded")}”.`, r.id);
    }
    for (const r of source.reports) add(r.id, `Citizen observation dated ${date(r.occurrence_at)}: “${excerpt(r.description)}”. This is a reported observation.`);
    for (const e of source.evidence) add(e.id, `Evidence file recorded on ${date(e.created_at)} (${e.mime_type}); its content is not independently verified by this report.`);
    for (const a of source.assignments) add(a.id, `Assigned in Gauntlet to ${a.organization} on ${date(a.assigned_at)}; assignment status ${a.status}${a.acknowledged_at ? "; acknowledged " + date(a.acknowledged_at) : ""}.`);
  }
  return facts;
}

export function missingInformation(snapshot: HistorySnapshot) {
  const current = snapshot.sources.find(s => s.relationship === "current");
  if (!current) throw new Error("Current issue missing from history");
  const missing: string[] = [];
  const linked = snapshot.sources.filter(s => s.relationship === "linked");
  const analogous = snapshot.sources.filter(s => s.relationship === "analogous");
  if (!linked.length) missing.push("No linked previous incidents were found.");
  if (!analogous.length) missing.push("No relevant analogous verified issues were found.");
  if (!current.issue.embedding_model) missing.push("Semantic retrieval is unavailable because the current issue has no embedding model.");
  if (!current.evidence_count) missing.push("No supporting evidence files are recorded for the current issue.");
  if (!current.department) missing.push("No department is assigned.");
  if (!current.assignments.length) missing.push("No in-app solver forwarding is recorded.");
  if (linked.length >= snapshot.limits.linked) missing.push("Linked history reached the retrieval limit; older incidents may be omitted.");
  for (const s of snapshot.sources) {
    if (s.report_count > s.reports.length || s.resolution_count > s.resolutions.length || s.evidence_count > s.evidence.length) {
      missing.push(`“${s.issue.title}”: only the most recent records in each section are included. Totals include all stored records.`);
    }
    if (s.relationship === "linked" && !s.resolutions.length) missing.push(`“${s.issue.title}”: no resolution actions are recorded.`);
    if (s.issue.status === "verified" && !s.issue.verified_at) missing.push(`“${s.issue.title}”: verified status has no closure timestamp.`);
  }
  missing.push("These records do not establish the cause of recurrence or prove that a past intervention caused a later failure.");
  return missing;
}

// Only stored fact IDs can appear in the extract. Model-authored factual text is never rendered.
export function validateHighlights(value: unknown, facts: HistoryFact[]): string[] {
  if (!value || typeof value !== "object" || !("fact_ids" in value)) throw new Error("Invalid summary");
  const ids = (value as { fact_ids: unknown }).fact_ids;
  const allowed = new Set(facts.map(f => f.id));
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 16 || ids.some(id => typeof id !== "string" || !allowed.has(id))) {
    throw new Error("Summary contains unsupported source references");
  }
  return [...new Set(ids)] as string[];
}

export function readHistoryDocument(value: unknown): HistoryDocument | null {
  if (!value || typeof value !== "object") return null;
  const d = value as Partial<HistoryDocument>;
  return d.schemaVersion === 1 && !!d.snapshot && Array.isArray(d.snapshot.sources) &&
    Array.isArray(d.facts) && Array.isArray(d.highlights) && Array.isArray(d.missing) ? d as HistoryDocument : null;
}
