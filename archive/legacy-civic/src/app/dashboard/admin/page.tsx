import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/issue-actions";

export default async function AdminPage() {
  const db = await createClient(); const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "officer") redirect("/dashboard");
  const [profiles, organizations] = await Promise.all([db.from("profiles").select("id,full_name,role,organization_id").order("full_name").limit(500), db.from("organizations").select("id,name,type").eq("active", true).order("name")]);
  if (profiles.error || organizations.error) throw new Error("Account administration could not load.");
  return <main className="dashboard-shell issue-detail-shell"><header className="dashboard-header"><Link className="brand" href="/dashboard">gauntlet.</Link><Link href="/dashboard" className="button-secondary">← Dashboard</Link></header>
    <section className="history-heading"><p className="eyebrow">OFFICER ADMINISTRATION</p><h1>People and organisations.</h1><p>Accounts register through the sign-in page. Officers assign trusted roles and organisation membership here.</p></section>
    <div className="issue-detail-grid"><section className="dashboard-panel"><h2>Change account role</h2><ActionForm url="/api/admin" defaults={{ action: "role" }} success="Role updated. The user should refresh their dashboard.">
      <label>Registered account<select name="userId" required defaultValue=""><option value="">Choose account</option>{profiles.data.filter(p => p.id !== user.id).map(p => <option key={p.id} value={p.id}>{p.full_name} · {p.role} · {p.id.slice(0, 8)}</option>)}</select></label>
      <label>Role<select name="role"><option value="citizen">Citizen</option><option value="officer">Officer / administrator</option><option value="solver">Solver</option></select></label>
      <label>Solver organisation<select name="organizationId"><option value="">None</option>{organizations.data.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
      <p>Your own role cannot be changed here. A solver must belong to an organisation.</p>
    </ActionForm></section><section className="dashboard-panel"><h2>Create organisation</h2><ActionForm url="/api/admin" defaults={{ action: "organization" }} success="Organisation created.">
      <label>Name<input name="name" required minLength={2} maxLength={120}/></label><label>Type<select name="type">{["department", "provider", "university", "industry", "ngo", "expert"].map(type => <option key={type}>{type}</option>)}</select></label>
    </ActionForm></section></div>
    <section className="dashboard-section"><h2>Registered accounts</h2><div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Role</th><th>Organisation</th><th>Account ID</th></tr></thead><tbody>{profiles.data.map(p => <tr key={p.id}><td>{p.full_name}</td><td>{p.role}</td><td>{organizations.data.find(org => org.id === p.organization_id)?.name ?? "—"}</td><td>{p.id}</td></tr>)}</tbody></table></div></section>
  </main>;
}
