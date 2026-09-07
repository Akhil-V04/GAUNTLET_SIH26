"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ImportRow } from "@/lib/dataset";

export function DatasetImport() {
  const form = useRef<HTMLFormElement>(null); const router = useRouter();
  const [preview, setPreview] = useState<ImportRow[] | null>(null), [busy, setBusy] = useState(false), [state, setState] = useState("");
  async function run(commit: boolean) {
    if (!form.current?.reportValidity() || busy) return;
    setBusy(true); setState("");
    try {
      const data = new FormData(form.current); data.set("commit", commit ? "yes" : "no");
      const response = await fetch("/api/import", { method: "POST", body: data }); const result = await response.json();
      if (!response.ok) throw new Error([result.error, ...(result.errors ?? [])].join("\n"));
      if (commit) { setPreview(null); setState(`Imported ${result.inserted} records; skipped ${result.skipped} existing source IDs.`); router.refresh(); }
      else { setPreview(result.rows); setState(`${result.total} valid rows. Review these before importing.`); }
    } catch (error) { setPreview(null); setState(error instanceof Error ? error.message : "Import failed."); }
    finally { setBusy(false); }
  }
  return <><form className="action-form" ref={form} onChange={() => { setPreview(null); setState(""); }} onSubmit={event => { event.preventDefault(); run(false); }}><fieldset disabled={busy}>
    <label>Dataset name<input name="dataset" required minLength={3} maxLength={100} placeholder="ranchi-demo-v1"/></label>
    <label>Source URL<input name="sourceUrl" required type="url" placeholder="URL of the original dataset or local fixture"/></label>
    <label>Data provenance<select name="provenance"><option value="synthetic">Synthetic demonstration records</option><option value="imported">Real external dataset — imported records</option></select></label>
    <label>CSV or JSON file<input type="file" name="file" accept=".csv,.json" required/><small>Maximum 1 MB and 200 rows. Re-uploading the same dataset/source IDs skips existing records.</small></label>
    <button className="button-primary" type="submit">{busy ? "Processing…" : "Validate and preview"}</button>
  </fieldset></form>{state && <p className="import-status" role="status">{state}</p>}{preview && <><div className="table-scroll"><table className="data-table"><thead><tr><th>Source ID</th><th>Title</th><th>Category</th><th>Coordinates</th><th>Status</th><th>Predecessor</th></tr></thead><tbody>{preview.map(row => <tr key={row.source_id}><td>{row.source_id}</td><td>{row.title}</td><td>{row.category}</td><td>{row.latitude}, {row.longitude}</td><td>{row.status}</td><td>{row.predecessor_source_id ?? "—"}</td></tr>)}</tbody></table></div><button className="button-primary" disabled={busy} onClick={() => run(true)}>Import {preview.length} records</button></>}</>;
}
