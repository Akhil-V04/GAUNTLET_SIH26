import { ConnectionCheck } from "@/components/connection-check";
import { categories } from "@/lib/categories";
import Link from "next/link";

const roles = [
  { number: "01", name: "Citizens", text: "Raise a concern, follow its progress, and confirm when the problem is resolved." },
  { number: "02", name: "Officers", text: "See the full picture. Review reports, recognise recurring issues, and coordinate action." },
  { number: "03", name: "Solvers", text: "Work on assigned challenges, share updates, and document the outcome." },
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Gauntlet home"><span className="brand-mark" aria-hidden="true">g.</span>gauntlet<span className="brand-period">.</span></Link>
        <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#categories">What you can report</a><Link href="/login">Sign in</Link></nav>
        <Link href="/login" className="preview-label"><span aria-hidden="true" />Enter Gauntlet</Link>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span /> BETTER NEIGHBOURHOODS, TOGETHER</p>
            <h1 id="hero-title">Every report<br />deserves a<br /><span>resolution.</span></h1>
            <p className="hero-description">Report a neighbourhood concern, connect repeat complaints, and follow the issue through prioritisation and verified resolution.</p>
            <Link className="button-primary" href="/login">Report or track an issue <span aria-hidden="true">→</span></Link>
            <p className="hero-note">Built by Team Gauntlet · SIH 2026</p>
          </div>
          <div className="workflow-card" aria-label="Illustration of the planned issue workflow">
            <div className="card-topline"><span>FROM CONCERN TO ACTION</span><span className="diagram-tag">WORKFLOW PREVIEW</span></div>
            <div className="illustration-heading">One issue.<br /><strong>The whole story.</strong></div>
            <ol className="workflow-steps">
              <li><span className="step-symbol">01</span><div><h2>Report the problem</h2><p>Your description, evidence & location</p></div></li>
              <li><span className="step-symbol">02</span><div><h2>Connect the history</h2><p>Related reports & previous occurrences</p></div></li>
              <li><span className="step-symbol">03</span><div><h2>Coordinate the response</h2><p>The responsible department or assigned solver</p></div></li>
              <li><span className="step-symbol final-step">✓</span><div><h2>Verify the resolution</h2><p>A recorded outcome, with a feedback loop</p></div></li>
            </ol>
            <div className="card-footnote">Reports stay connected. Progress stays visible.</div>
          </div>
        </section>

        <section id="how-it-works" className="roles-section" aria-labelledby="roles-title">
          <div className="section-heading"><div><p className="eyebrow">A SHARED SPACE</p><h2 id="roles-title">Three roles. One connected process.</h2></div><p>From the first report to the final verification.</p></div>
          <div className="role-grid">{roles.map((role) => <article key={role.number} className="role-card"><span className="role-number">{role.number}</span><h3>{role.name}</h3><p>{role.text}</p><span className="coming-label">Role-based workspace</span></article>)}</div>
        </section>

        <section id="categories" className="categories-section" aria-labelledby="categories-title">
          <div><p className="eyebrow">BIG OR SMALL, IT MATTERS</p><h2 id="categories-title">Your neighbourhood.<br />Your everyday concerns.</h2><p className="category-intro">Roads, water, noise, connectivity, and everything in between. Start with the concern you see.</p></div>
          <ul className="category-list">{categories.map((category) => <li key={category.id} title={category.description}>{category.label}</li>)}</ul>
        </section>

        <section className="foundation-status" aria-labelledby="foundation-title"><div><p className="eyebrow">WORKING PROTOTYPE</p><h2 id="foundation-title">Connected to live application services.</h2><p>Authentication, report processing, recurrence detection, role workspaces, historical retrieval and source-labelled analytics use the connected database.</p></div><ConnectionCheck /></section>
      </main>
      <footer><span className="footer-brand">gauntlet.</span><p>Community concerns. Shared responsibility.</p><span>SIH 2026 · Prototype</span></footer>
    </>
  );
}
