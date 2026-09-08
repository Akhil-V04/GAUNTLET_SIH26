"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChallengeClient({
  challengeId,
  isOwner,
  interestedPeople,
  availableTeams,
  viewer,
  userMode
}: {
  challengeId: string;
  isOwner: boolean;
  interestedPeople: Array<{ id: string; display_name: string; headline?: string }>;
  availableTeams: Array<{ id: string; name: string }>;
  viewer: { interest?: boolean; profile?: { display_name: string } } | null;
  userMode: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  
  // Apply Form State
  const [applyMode, setApplyMode] = useState<"solo" | "team">("solo");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [proposalFile, setProposalFile] = useState<File | null>(null);

  const isInterested = !!viewer?.interest;
  
  // They have already applied if they are part of a team that has submitted an application.
  // Wait, for simplicity, we just allow applying.

  const handleInterest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/collaboration/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "set_interest",
          payload: { challenge_id: challengeId, note: "" }
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to set interest");
      }
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let teamIdToUse = selectedTeamId;
      
      // If Solo, first create a team
      if (applyMode === "solo") {
        const teamRes = await fetch("/api/collaboration/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command: "create_team",
            payload: { challenge_id: challengeId, name: "Solo App - " + viewer?.profile?.display_name }
          })
        });
        const teamData = await teamRes.json();
        if (!teamRes.ok) throw new Error(teamData.error || "Failed to create team for solo application");
        teamIdToUse = teamData.data;
      }

      if (!proposalFile) {
        throw new Error("Please upload a proposal document.");
      }

      // Upload document
      const formData = new FormData();
      formData.append("challengeId", challengeId);
      formData.append("file", proposalFile);

      const uploadRes = await fetch("/api/collaboration/documents", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json();
        throw new Error(uploadData.error || "Failed to upload document");
      }

      const { data: documentData } = await uploadRes.json();
      const documentUrl = documentData.url;

      // Then submit the application
      const applyRes = await fetch("/api/collaboration/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "submit_application",
          payload: { 
            team_id: teamIdToUse, 
            proposal: documentUrl
          }
        })
      });

      const applyData = await applyRes.json();
      if (!applyRes.ok) throw new Error(applyData.error || "Failed to submit application");

      setShowApplyModal(false);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isOwner) {
    return null; // Owner view is handled in the page.tsx
  }

  if (userMode !== "student") {
    return (
      <div className="action-form" style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
        <p>Only students can apply for challenges.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="action-form" style={{ padding: "24px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
        <h3 style={{ marginBottom: "16px", fontSize: "18px" }}>Actions</h3>
        
        {error && <p style={{ color: "red", marginBottom: "16px", fontSize: "14px" }}>{error}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {!isInterested ? (
            <button 
              onClick={handleInterest} 
              disabled={loading}
              className="button-primary"
              style={{ width: "100%", background: "#fff", color: "#111827", border: "1px solid #d1d5db" }}
            >
              {loading ? "Processing..." : "I'm Interested"}
            </button>
          ) : (
            <div style={{ padding: "12px", background: "#e8f0fe", color: "#1a56db", borderRadius: "4px", textAlign: "center", fontSize: "14px", fontWeight: 500 }}>
              You are marked as interested!
            </div>
          )}

          <button 
            onClick={() => setShowApplyModal(true)} 
            disabled={loading}
            className="button-primary"
            style={{ width: "100%" }}
          >
            Apply Now
          </button>
        </div>
      </div>

      {interestedPeople.length > 0 && (
        <div className="detail-list" style={{ padding: "24px", background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>Interested Students</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {interestedPeople.map((p) => (
              <li key={p.id} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: "#6b7280" }}>
                  {p.display_name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>{p.display_name}</div>
                  <div style={{ color: "#6b7280", fontSize: "12px" }}>{p.headline || "Student"}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showApplyModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div className="action-form" style={{ background: "#fff", padding: "32px", borderRadius: "8px", width: "100%", maxWidth: "500px" }}>
            <h2 style={{ marginBottom: "24px" }}>Apply for Challenge</h2>
            
            <form onSubmit={handleApplySubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontWeight: 600, fontSize: "14px" }}>Application Mode</label>
                <div style={{ display: "flex", gap: "16px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input 
                      type="radio" 
                      name="mode" 
                      checked={applyMode === "solo"} 
                      onChange={() => setApplyMode("solo")} 
                    />
                    Apply Solo
                  </label>
                  {availableTeams.length > 0 && (
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input 
                        type="radio" 
                        name="mode" 
                        checked={applyMode === "team"} 
                        onChange={() => setApplyMode("team")} 
                      />
                      Join Existing Team
                    </label>
                  )}
                </div>
              </div>

              {applyMode === "team" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label htmlFor="team" style={{ fontWeight: 600, fontSize: "14px" }}>Select Team</label>
                  <select 
                    id="team" 
                    value={selectedTeamId} 
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    required
                    style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                  >
                    <option value="">-- Select a team --</option>
                    {availableTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label htmlFor="proposal" style={{ fontWeight: 600, fontSize: "14px" }}>Proposal Document (.doc, .docx, .pdf)</label>
                <input 
                  type="file"
                  id="proposal"
                  accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProposalFile(file);
                    }
                  }}
                  required
                  style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button 
                  type="button" 
                  onClick={() => setShowApplyModal(false)}
                  disabled={loading}
                  style={{ padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer", fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="button-primary"
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
