import Link from "next/link";

const participants = [
  { number: "01", name: "Communities", text: "Publish a clear, consented description of a societal need and keep the original context visible." },
  { number: "02", name: "Universities & NGOs", text: "Adopt a problem, define a feasible challenge and take responsibility for support and review." },
  { number: "03", name: "Students", text: "Find real work, form a team, contribute evidence and build a portfolio of reviewed outcomes." },
];

const workflow = [
  ["01", "A real problem is shared", "Context, affected group, current workaround and publication consent."],
  ["02", "An organisation owns the challenge", "A named partner sets scope, support, roles, limits and deliverables."],
  ["03", "Students form the right team", "Interested contributors discover peers and submit one clear application."],
  ["04", "Work becomes verified proof", "Owners review individual contributions and record the demonstrated outcome."],
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Gauntlet home">
          <span className="brand-mark" aria-hidden="true">g.</span>
          gauntlet<span className="brand-period">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#workflow">How it works</a>
          <a href="#participants">Who contributes</a>
          <Link href="/login">Sign in</Link>
        </nav>
        <Link href="/login" className="preview-label"><span aria-hidden="true" />Join Gauntlet</Link>
      </header>

      <main id="main">
        <section className="hero collab-home-hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span /> REAL PROBLEMS. ACCOUNTABLE COLLABORATION.</p>
            <h1 id="hero-title">Turn public needs<br />into student<br /><span>opportunity.</span></h1>
            <p className="hero-description">
              Gauntlet helps communities share societal problems, organisations turn them into
              practical challenges, and students build teams around work that matters.
            </p>
            <div className="hero-actions">
              <Link className="button-primary" href="/login">Create your profile <span aria-hidden="true">→</span></Link>
              <a className="button-secondary" href="#workflow">See the process</a>
            </div>
            <p className="hero-note">Built by Team Gauntlet · SIH 2026</p>
          </div>

          <div className="collab-promise-card" aria-label="Gauntlet value exchange">
            <div className="card-topline"><span>THE VALUE EXCHANGE</span><span className="diagram-tag">NO FICTIONAL IMPACT</span></div>
            <p className="promise-question">What does each side receive?</p>
            <dl>
              <div><dt>Problem owners</dt><dd>A structured path to capable partners and visible progress.</dd></div>
              <div><dt>Organisations</dt><dd>A clear way to sponsor, mentor and review focused social-impact work.</dd></div>
              <div><dt>Students</dt><dd>Real briefs, teammates, feedback and proof of individual contribution.</dd></div>
            </dl>
            <p className="promise-note">The challenge owner records what was demonstrated. Gauntlet never claims that publishing an idea solved the original problem.</p>
          </div>
        </section>

        <section id="workflow" className="collab-flow-section" aria-labelledby="workflow-title">
          <div className="section-heading">
            <div><p className="eyebrow">FROM NEED TO REVIEWED WORK</p><h2 id="workflow-title">One accountable path.</h2></div>
            <p>Ownership is visible at every stage.</p>
          </div>
          <ol className="collab-flow-grid">
            {workflow.map(([number, title, text]) => (
              <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>
            ))}
          </ol>
        </section>

        <section id="participants" className="roles-section" aria-labelledby="participants-title">
          <div className="section-heading">
            <div><p className="eyebrow">BUILT FOR PARTICIPATION</p><h2 id="participants-title">A reason to contribute.</h2></div>
            <p>Each participant gives and receives something concrete.</p>
          </div>
          <div className="role-grid">
            {participants.map((participant) => (
              <article key={participant.number} className="role-card">
                <span className="role-number">{participant.number}</span>
                <h3>{participant.name}</h3>
                <p>{participant.text}</p>
                <span className="coming-label">Connected by a shared challenge</span>
              </article>
            ))}
          </div>
        </section>

        <section className="foundation-status collaboration-status" aria-labelledby="foundation-title">
          <div>
            <p className="eyebrow">PHASE 1 FOUNDATION</p>
            <h2 id="foundation-title">The collaboration identity and access model is live.</h2>
            <p>New accounts can complete a role-aware profile. Organisation authority remains separately controlled in the database.</p>
          </div>
          <Link className="button-primary" href="/login">Enter workspace <span aria-hidden="true">→</span></Link>
        </section>
      </main>

      <footer>
        <span className="footer-brand">gauntlet.</span>
        <p>Societal needs. Accountable challenges. Reviewed contributions.</p>
        <span>SIH 2026 · Prototype</span>
      </footer>
    </>
  );
}
