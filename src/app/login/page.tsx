import Link from "next/link";
import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">g.</span>gauntlet<span className="brand-period">.</span></Link>
        <div>
          <p className="eyebrow">ONE ACCOUNT, ONE SHARED PROCESS</p>
          <h1>Turn a concern<br />into <span>action.</span></h1>
          <p>Citizens report and verify. Officers coordinate. Solvers document the outcome.</p>
        </div>
        <p className="auth-footnote">New accounts start as citizens. Officer and solver access is assigned securely.</p>
      </section>
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-card">
          <p className="eyebrow">WELCOME TO GAUNTLET</p>
          <h2 id="auth-title">Sign in or create an account</h2>
          <p className="auth-subtitle">Use your email to enter the community workspace.</p>
          <AuthForm />
          <Link className="back-link" href="/">← Back to home</Link>
        </div>
      </section>
    </main>
  );
}
