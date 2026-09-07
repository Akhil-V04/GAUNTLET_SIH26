import Link from "next/link";
import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">g.</span>gauntlet<span className="brand-period">.</span></Link>
        <div>
          <p className="eyebrow">ONE ACCOUNT, MANY WAYS TO CONTRIBUTE</p>
          <h1>Bring real work<br />into the <span>open.</span></h1>
          <p>Share a societal need, own a challenge or build a student team around meaningful work.</p>
        </div>
        <p className="auth-footnote">Your public mode shapes the experience. Organisation authority is granted separately and securely.</p>
      </section>
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-card">
          <p className="eyebrow">WELCOME TO GAUNTLET</p>
          <h2 id="auth-title">Sign in or create an account</h2>
          <p className="auth-subtitle">Use your email, then complete your collaboration profile.</p>
          <AuthForm />
          <Link className="back-link" href="/">← Back to home</Link>
        </div>
      </section>
    </main>
  );
}
