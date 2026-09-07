import Link from "next/link";
export default function NotFound() {
  return <main className="dashboard-error"><section><span aria-hidden="true">404</span><p className="eyebrow">PAGE NOT FOUND</p><h1>This path doesn’t lead to an issue.</h1><p>Return to Gauntlet and continue from your workspace.</p><Link className="button-primary" href="/dashboard">Open workspace</Link></section></main>;
}
