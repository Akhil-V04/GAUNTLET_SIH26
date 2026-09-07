import { apiAccess, apiError } from "@/lib/api-access";
import { parseDataset } from "@/lib/dataset";
import { localEmbedding } from "@/lib/report-intelligence";
import type { CategoryId } from "@/lib/categories";
export async function POST(request: Request) {
  try {
    const { db } = await apiAccess(request, true); const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File) || file.size > 1024 * 1024) throw new Error("Choose a CSV or JSON file up to 1 MB.");
    if (!/\.(csv|json)$/i.test(file.name)) throw new Error("Only CSV or JSON files are supported.");
    const { rows, errors } = parseDataset(await file.text(), /\.json$/i.test(file.name) ? "json" : "csv");
    if (errors.length) return Response.json({ error: "Fix the dataset before importing.", errors }, { status: 400 });
    const dataset = String(form.get("dataset") ?? "").trim(), sourceUrl = String(form.get("sourceUrl") ?? "").trim(), provenance = String(form.get("provenance") ?? "");
    if (dataset.length < 3 || dataset.length > 100) throw new Error("Name this dataset in 3–100 characters.");
    if (!/^https?:\/\//.test(sourceUrl) || sourceUrl.length > 1000) throw new Error("Add the dataset source URL.");
    if (!["synthetic", "imported"].includes(provenance)) throw new Error("Choose the data provenance.");
    if (form.get("commit") !== "yes") return Response.json({ rows, total: rows.length });
    const { data, error } = await db.rpc("import_dataset", { p_dataset: dataset, p_source_url: sourceUrl, p_provenance: provenance,
      p_rows: rows.map(row => ({ ...row, embedding: `[${localEmbedding(`${row.title} ${row.description}`, row.category as CategoryId).join(",")}]` })),
    });
    if (error) throw new Error(error.message); return Response.json(data);
  } catch (error) { return apiError(error); }
}
