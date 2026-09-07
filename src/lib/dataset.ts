import { categories } from "./categories.ts";

export type ImportRow = {
  source_id: string; title: string; description: string; category: string;
  latitude: number; longitude: number; location_label: string; occurrence_at: string;
  status: "open" | "verified"; verified_at: string | null; resolution_note: string | null;
  predecessor_source_id: string | null; provider_or_asset: string | null;
};
export const importColumns = ["source_id", "title", "description", "category", "latitude", "longitude", "location_label", "occurrence_at", "status", "verified_at", "resolution_note", "predecessor_source_id", "provider_or_asset"];

// RFC-style quoted fields, escaped quotes, BOM, CRLF and embedded newlines.
export function readCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false, closed = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"' && field === "" && !closed) quoted = true;
    else if (c === "," || c === "\n" || c === "\r") {
      row.push(field); field = ""; closed = false;
      if (c !== ",") { if (row.some(v => v.trim())) rows.push(row); row = []; if (c === "\r" && input[i + 1] === "\n") i++; }
    } else { if (closed || c === '"') throw new Error("Malformed CSV quoting."); field += c; }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  const headers = rows.shift()?.map(v => v.trim()) ?? [];
  if (!headers.length || new Set(headers).size !== headers.length) throw new Error("CSV needs unique column headers.");
  return rows.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`CSV row ${i + 2} has ${values.length} fields; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((name, j) => [name, values[j]]));
  });
}

export function parseDataset(text: string, format: string): { rows: ImportRow[]; errors: string[] } {
  const input: unknown = format === "json" ? JSON.parse(text) : readCsv(text);
  if (!Array.isArray(input) || input.length < 1 || input.length > 200) throw new Error("Upload 1–200 rows per batch.");
  const errors: string[] = [], rows: ImportRow[] = []; const seen = new Set<string>();
  const ids = new Set<string>(categories.map(c => c.id));
  for (const [i, value] of input.entries()) {
    try {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a row object.");
      const record = value as Record<string, unknown>;
      const field = (key: string, min = 0, max = 3000) => {
        const v = typeof record[key] === "string" ? record[key].trim() : record[key] == null ? "" : String(record[key]);
        if (v.length < min || v.length > max) throw new Error(`${key} must contain ${min}–${max} characters.`);
        return v;
      };
      const timestamp = (key: string, required = true) => {
        const v = field(key); if (!v && !required) return null;
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v))) throw new Error(`${key} needs an ISO timestamp with timezone, e.g. 2026-08-01T10:00:00Z.`);
        if (Date.parse(v) > Date.now()) throw new Error(`${key} cannot be in the future.`);
        return new Date(v).toISOString();
      };
      const source_id = field("source_id", 1, 100);
      if (seen.has(source_id)) throw new Error("Duplicate source_id in this file."); seen.add(source_id);
      const category = field("category"); if (!ids.has(category)) throw new Error("Unknown category; use a category ID from the template.");
      const latitude = Number(field("latitude", 1)), longitude = Number(field("longitude", 1));
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("Invalid latitude/longitude.");
      const status = field("status") || "open";
      if (status !== "open" && status !== "verified") throw new Error("Only open or verified source records may be imported.");
      const occurrence_at = timestamp("occurrence_at")!, verified_at = timestamp("verified_at", false);
      const resolution_note = field("resolution_note") || null;
      if (status === "verified" && (!verified_at || !resolution_note || resolution_note.length < 5 || Date.parse(verified_at) <= Date.parse(occurrence_at))) throw new Error("Verified rows require a closure date after occurrence and a recorded resolution note.");
      if (status === "open" && (verified_at || resolution_note)) throw new Error("Open rows cannot claim verified closure or a resolution note.");
      const predecessor_source_id = field("predecessor_source_id", 0, 100) || null;
      if (predecessor_source_id === source_id) throw new Error("A row cannot be its own predecessor.");
      rows.push({ source_id, title: field("title", 3, 160), description: field("description", 10), category,
        latitude, longitude, location_label: field("location_label", 2, 240), occurrence_at, status, verified_at,
        resolution_note, predecessor_source_id, provider_or_asset: field("provider_or_asset", 0, 240) || null });
    } catch (error) { errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Invalid row"}`); }
  }
  // Parent before child for transactional recurrence validation. Existing parents may be from earlier batches.
  rows.sort((a, b) => Date.parse(a.occurrence_at) - Date.parse(b.occurrence_at));
  const byId = new Map(rows.map(r => [r.source_id, r]));
  for (const row of rows) {
    const parent = row.predecessor_source_id ? byId.get(row.predecessor_source_id) : null;
    if (parent && (parent.status !== "verified" || !parent.verified_at || Date.parse(parent.verified_at) >= Date.parse(row.occurrence_at) || parent.category !== row.category)) errors.push(`${row.source_id}: predecessor must be a previously verified occurrence in the same category.`);
  }
  return { rows, errors };
}
