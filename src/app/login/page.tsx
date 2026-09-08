import Link from "next/link";
import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">g.</span>gauntlet<span className="brand-period">.</span></Link>
        <div>
          <p className="eyebrow">THREE WAYS TO CONTRIBUTE</p>
          <h1>Report. Solve.<br />Collaborate.</h1>
          <p>Citizens report problems, organisations adopt them as challenges, students form teams and build solutions.</p>
        </div>
        <p className="auth-footnote">Your public mode shapes the experience. Organisation authority is granted separately and securely.</p>
      </section>
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-card">
          <p className="eyebrow">WELCOME TO GAUNTLET</p>
          <h2 id="auth-title">Sign in or create an account</h2>
          <p className="auth-subtitle">Choose your role and create an account, or sign in to continue.</p>
          <AuthForm />
          <Link className="back-link" href="/">← Back to home</Link>
        </div>
      </section>
    </main>
  );
}
