import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/features/collaboration/server/account";
import { AdminMap } from "@/features/collaboration/components/admin-map";
import { AppHeader } from "@/features/collaboration/components/app-header";
import demoProblems from "../../../../data/demo-problems.json";

export default async function AdminPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  // Count severities for the metrics grid
  const severities = demoProblems.reduce((acc: Record<string, number>, problem: { severity: string }) => {
    acc[problem.severity] = (acc[problem.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="collab-page">
      <AppHeader displayName={account.profile?.display_name || "Admin"} />

      <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
        <header className="page-heading">
          <p style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: "13px", fontWeight: "bold", letterSpacing: "1px", marginBottom: "8px" }}>
            ADMIN PANEL
          </p>
          <h1 style={{ fontSize: "32px", color: "var(--foreground)", margin: "0 0 8px 0" }}>
            Control centre.
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "16px", margin: 0 }}>
            Monitor reported problems, manage users and review platform activity.
          </p>
        </header>

        <section>
          <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div className="metric-card" style={{ padding: "24px", backgroundColor: "white", borderRadius: "12px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ color: "var(--muted)", fontSize: "14px", fontWeight: "bold" }}>Total Problems</span>
              <span style={{ fontSize: "32px", color: "var(--foreground)", fontWeight: "bold" }}>{demoProblems.length}</span>
            </div>
            
            <div className="metric-card" style={{ padding: "24px", backgroundColor: "white", borderRadius: "12px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ color: "var(--muted)", fontSize: "14px", fontWeight: "bold" }}>Critical</span>
              <span style={{ fontSize: "32px", color: "#c0392b", fontWeight: "bold" }}>{severities["critical"] || 0}</span>
            </div>
            
            <div className="metric-card" style={{ padding: "24px", backgroundColor: "white", borderRadius: "12px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ color: "var(--muted)", fontSize: "14px", fontWeight: "bold" }}>High</span>
              <span style={{ fontSize: "32px", color: "#e67e22", fontWeight: "bold" }}>{severities["high"] || 0}</span>
            </div>

            <div className="metric-card" style={{ padding: "24px", backgroundColor: "white", borderRadius: "12px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ color: "var(--muted)", fontSize: "14px", fontWeight: "bold" }}>Medium</span>
              <span style={{ fontSize: "32px", color: "#2980b9", fontWeight: "bold" }}>{severities["medium"] || 0}</span>
            </div>
          </div>

          <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid var(--line)", padding: "24px" }}>
            <AdminMap problems={demoProblems} />
          </div>
        </section>

        <section style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid var(--line)", padding: "24px" }}>
          <h2 style={{ fontSize: "20px", marginTop: 0, marginBottom: "16px" }}>User Management</h2>
          <div style={{ padding: "32px", textAlign: "center", backgroundColor: "var(--background)", borderRadius: "8px", color: "var(--muted)" }}>
            User accounts and role management will appear here.
          </div>
        </section>
      </main>
    </div>
  );
}
