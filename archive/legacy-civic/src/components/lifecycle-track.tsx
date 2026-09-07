const stages = [
  { key: "open", label: "Reported" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In progress" },
  { key: "awaiting_verification", label: "Verification" },
  { key: "verified", label: "Verified" },
];

export function LifecycleTrack({ status }: { status: string }) {
  const aliases: Record<string, number> = {
    review_pending: 0, escalation_review: 1, escalated: 1, rework_required: 2, manual_review: 2,
  };
  const current = aliases[status] ?? Math.max(0, stages.findIndex(stage => stage.key === status));
  return <ol className="lifecycle-track" aria-label={`Issue status: ${status.replaceAll("_", " ")}`}>
    {stages.map((stage, index) => <li key={stage.key} className={index < current ? "complete" : index === current ? "current" : ""}>
      <span aria-hidden="true">{index < current ? "✓" : index + 1}</span><small>{stage.label}</small>
    </li>)}
  </ol>;
}
