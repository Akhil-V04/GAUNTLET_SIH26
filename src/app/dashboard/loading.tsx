export default function DashboardLoading() {
  return <main className="dashboard-shell dashboard-home" aria-busy="true">
    <header className="dashboard-header"><span className="brand"><span className="brand-mark">g.</span>gauntlet.</span></header>
    <section className="dashboard-intro"><div><div className="skeleton short"/><div className="skeleton title"/><div className="skeleton line"/></div></section>
    <div className="metric-grid">{Array.from({ length: 6 }, (_, index) => <div className="metric-card skeleton-card" key={index}/>)}</div>
    <p role="status" className="sr-only">Loading your workspace</p>
  </main>;
}
