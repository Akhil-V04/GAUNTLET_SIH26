"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <main className="dashboard-shell dashboard-error">
    <section><span aria-hidden="true">!</span><p className="eyebrow">WORKSPACE UNAVAILABLE</p><h1>We couldn’t load the latest records.</h1><p>Your saved reports have not been changed. Check your connection and try again.</p><button className="button-primary" onClick={reset}>Try again</button></section>
  </main>;
}
