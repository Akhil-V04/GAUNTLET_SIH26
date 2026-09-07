"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function ActionForm({ url, children, success, multipart = false, defaults = {} }: { url: string; children: ReactNode; success: string; multipart?: boolean; defaults?: Record<string, string> }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [state, setState] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setState("");
    const form = event.currentTarget, data = new FormData(form);
    for (const [key, value] of Object.entries(defaults)) data.set(key, value);
    try {
      const response = await fetch(url, { method: "POST", ...(multipart ? { body: data } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Action failed.");
      setState(success); router.refresh();
    } catch (error) { setState(error instanceof Error ? error.message : "Unable to save."); }
    finally { setBusy(false); }
  }
  return <form className="action-form" onSubmit={submit}><fieldset disabled={busy}>{children}<button className="button-primary" type="submit">{busy ? "Saving…" : "Save"}</button></fieldset>{state && <p role="status">{state}</p>}</form>;
}

export function RouteIssueForm({ issueId, organizations, current, status, histories }: {
  issueId: string; organizations: { id: string; name: string; type: string }[]; current: string | null; status: string;
  histories: { id: string; version: number }[];
}) {
  return <ActionForm url={`/api/issues/${issueId}/actions`} defaults={{ action: "assign", expectedStatus: status }} success="Assigned. The selected recipient can now see this issue.">
    <label>Department or solver organisation<select name="organizationId" defaultValue={current ?? ""} required><option value="">Choose organisation</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name} · {org.type}</option>)}</select></label>
    <label>Historical report to forward<select name="historyId" defaultValue=""><option value="">None — department work only</option>{histories.map(h => <option key={h.id} value={h.id}>Report version {h.version}</option>)}</select><small>Required for external solvers. Prepare a report using the history link first.</small></label>
    <label>Assignment / modified approach<textarea name="note" minLength={5} maxLength={3000} required placeholder="Record the work scope and any changes after review."/></label>
  </ActionForm>;
}
export function EscalationForm({ issueId, status }: { issueId: string; status: string }) {
  return <ActionForm url={`/api/issues/${issueId}/actions`} defaults={{ action: "escalate", expectedStatus: status }} success="Escalated. Prepare history and select a solver organisation next.">
    <label>Assessment<select name="classification"><option value="systemic">Systemic</option><option value="recurring">Recurring</option></select></label>
    <label>Assessment notes<textarea name="note" minLength={5} maxLength={3000} required/></label>
  </ActionForm>;
}
export function ProgressForm({ issueId, status, assignmentId }: { issueId: string; status: string; assignmentId: string }) {
  return <ActionForm url={`/api/issues/${issueId}/actions`} defaults={{ action: "progress", expectedStatus: status, assignmentId }} success="Progress recorded.">
    <label>Acknowledge work / progress update<textarea name="note" minLength={5} maxLength={3000} required placeholder="What has been started or completed?"/></label>
  </ActionForm>;
}
export function ResolutionForm({ issueId, status, assignmentId }: { issueId: string; status: string; assignmentId: string }) {
  return <ActionForm url={`/api/issues/${issueId}/resolution`} defaults={{ expectedStatus: status, assignmentId }} multipart success="Resolution sent for verification.">
    <label>Resolution note<textarea name="note" minLength={5} maxLength={3000} required/></label>
    <label>Completion evidence<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required/><small>JPG, PNG or WebP · maximum 4 MB</small></label>
  </ActionForm>;
}
export function VerifyResolutionForm({ resolutionId }: { resolutionId: string }) {
  return <ActionForm url={`/api/resolutions/${resolutionId}/verify`} success="Decision saved. The issue status has been updated.">
    <label>Decision<select name="outcome"><option value="accepted">Accept resolution</option><option value="rejected">Reject resolution</option></select></label>
    <label>Reason if rejecting<textarea name="reason" maxLength={500} placeholder="Rejections require 5–500 characters explaining what remains unresolved."/></label>
  </ActionForm>;
}
