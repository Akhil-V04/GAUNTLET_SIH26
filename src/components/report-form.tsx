"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { categories } from "@/lib/categories";

type SubmitResult = { issue_id: string; report_id: string; match_outcome: string; priority: number; analysisEngine: string; evidenceWarning?: string };
const outcomeText: Record<string, string> = {
  new_issue: "A new issue was created.",
  active_match: "Your report joined an active nearby issue.",
  resolved_match: "A possible recurrence was linked to verified history.",
};

export function ReportForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  function locate() {
    setLocating(true); setError("");
    if (!navigator.geolocation) { setError("Location access is unavailable. Enter latitude and longitude manually."); setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(position => {
      const form = formRef.current;
      if (form) {
        (form.elements.namedItem("latitude") as HTMLInputElement).value = position.coords.latitude.toFixed(6);
        (form.elements.namedItem("longitude") as HTMLInputElement).value = position.coords.longitude.toFixed(6);
      }
      setMessage("Coordinates added. Enter a nearby landmark or address.");
      setLocating(false);
    }, () => {
      setError("Location permission was denied. Enter the coordinates manually; your report text is still here.");
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = event.currentTarget;
    const photo = (form.elements.namedItem("photo") as HTMLInputElement).files?.[0];
    if (photo && photo.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB."); setBusy(false); return;
    }
    const data = new FormData(form);
    data.set("idempotencyKey", idempotencyKey);
    try {
      const response = await fetch("/api/reports", { method: "POST", body: data });
      const result = await response.json() as SubmitResult & { error?: string };
      if (!response.ok) throw new Error(result.error || "The report could not be submitted.");
      setMessage(`${outcomeText[result.match_outcome] ?? "Report saved."} Priority ${result.priority}/100. Receipt ${result.report_id.slice(0, 8).toUpperCase()}.${result.evidenceWarning ? " " + result.evidenceWarning : ""}`);
      form.reset();
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Network error. Your entries remain available; please retry.");
    } finally { setBusy(false); }
  }

  return <section className="report-composer" aria-labelledby="report-title">
    <div className="report-composer-intro"><p className="eyebrow">NEW REPORT</p><h2 id="report-title">What needs attention?</h2><p>Describe what you observed and where. A photo helps, but it is optional.</p><div className="privacy-note"><strong>Before submitting</strong><span>Avoid faces, vehicle numbers, house interiors, phone numbers, or other personal information in the description or photo.</span></div></div>
    <form ref={formRef} className="report-form" onSubmit={submit}>
      <label>Category<select name="category" defaultValue="" required><option value="" disabled>Choose a category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
      <label className="field-wide">Describe the issue<textarea name="description" minLength={10} maxLength={3000} required placeholder="What happened? Include useful timing or asset details."/></label>
      <label className="field-wide">Location or nearby landmark<input name="locationLabel" minLength={2} maxLength={240} required placeholder="Example: Main Road, near the bus stand"/></label>
      <label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" required placeholder="23.344100"/></label>
      <label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" required placeholder="85.309600"/></label>
      <button className="location-button field-wide" type="button" onClick={locate} disabled={locating}>{locating ? "Finding your location…" : "Use my current location"}</button>
      <details className="field-wide report-details"><summary>Add optional context</summary><div>
        <label>When did you notice it?<input name="occurrenceAt" type="datetime-local"/></label>
        <label>How long has it continued?<input name="duration" maxLength={100} placeholder="Example: 3 days"/></label>
        <label className="field-wide">Provider, pole or asset number<input name="provider" maxLength={160} placeholder="Useful for electricity or internet issues"/></label>
      </div></details>
      <label className="field-wide">Photo evidence <span>Optional · JPG, PNG or WebP · max 5 MB</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"/></label>
      <div className="field-wide report-submit"><button className="button-primary" type="submit" disabled={busy}>{busy ? "Checking nearby history…" : "Submit report →"}</button><p className={error ? "form-error" : "form-success"} role={error ? "alert" : "status"}>{error || message}</p></div>
    </form>
  </section>;
}
