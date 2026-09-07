"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PrepareHistory({ issueId }: { issueId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function prepare() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/issues/${issueId}/history`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to prepare report.");
      setMessage(data.reused ? "The saved report already includes the latest history." : data.status === "generated" ? "Historical report prepared with cited sources." : "Factual history saved. AI summary is currently unavailable.");
      router.push(`/dashboard/history/${issueId}?version=${data.version}`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Network error. Please retry."); }
    finally { setBusy(false); }
  }
  return <div className="history-prepare"><button type="button" className="button-primary" disabled={busy} onClick={prepare}>{busy ? "Retrieving history…" : "Prepare historical report"}</button><p role="status">{message}</p></div>;
}
