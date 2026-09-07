import type { Analytics } from "@/lib/analytics";

export function AnalyticsOverview({ analytics }: { analytics: Analytics }) {
  const cards = [
    ["Issues", analytics.totals.issues],
    ["Reports", analytics.totals.reports],
    ["Active", analytics.totals.active],
    ["Verified", analytics.totals.verified],
    ["Recurring / systemic", analytics.totals.recurring],
    ["Rejected attempts", analytics.totals.rejectedAttempts],
  ];
  return <section aria-labelledby="analytics-title">
    <div className="dashboard-section-heading"><div><p className="eyebrow">ACTUAL STORED RECORDS</p><h2 id="analytics-title">At a glance</h2></div><span>Updated {new Date(analytics.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></div>
    <div className="metric-grid">{cards.map(([label, value]) => <article className="metric-card" key={label}><strong>{value}</strong><span>{label}</span></article>)}</div>
    <div className="analytics-grid">
      <article className="dashboard-panel"><h3>Issues by category</h3>
        {!analytics.categories.length ? <p className="empty-copy">No issue history yet. Category totals will appear after the first report.</p> :
          <div className="bar-list">{analytics.categories.slice(0, 7).map(item => <div className="bar-row" key={item.id}><div><span>{item.label}</span><strong>{item.count}</strong></div><span className="bar-track"><span style={{ width: `${item.percentage}%` }} /></span></div>)}</div>}
      </article>
      <article className="dashboard-panel"><h3>Data provenance</h3>
        <div className="provenance-list"><div><span className="source-dot live"/><span>Live reports</span><strong>{analytics.provenance.live}</strong></div><div><span className="source-dot imported"/><span>Imported history</span><strong>{analytics.provenance.imported}</strong></div><div><span className="source-dot synthetic"/><span>Demonstration data</span><strong>{analytics.provenance.synthetic}</strong></div></div>
        <div className="forecast-state"><span>Forecast</span><strong>Insufficient history</strong><p>{analytics.forecast.message}</p></div>
      </article>
    </div>
  </section>;
}
