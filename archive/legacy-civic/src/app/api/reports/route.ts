import { NextResponse } from "next/server";
import { categories, type CategoryId } from "@/lib/categories";
import { analyseReport } from "@/lib/report-intelligence";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const allowedImages = new Set(["image/jpeg", "image/png", "image/webp"]);
const categoryIds = new Set<string>(categories.map((item) => item.id));

function textField(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in to submit a report." }, { status: 401 });

  try {
    const form = await request.formData();
    const description = textField(form, "description");
    const selectedCategory = textField(form, "category");
    const locationLabel = textField(form, "locationLabel");
    const latitude = Number(textField(form, "latitude"));
    const longitude = Number(textField(form, "longitude"));
    const photoValue = form.get("photo");
    const photo = photoValue instanceof File && photoValue.size ? photoValue : undefined;

    if (description.length < 10 || description.length > 3000) throw new Error("Describe the issue in 10 to 3,000 characters.");
    if (!categoryIds.has(selectedCategory)) throw new Error("Choose a valid category.");
    if (locationLabel.length < 2 || locationLabel.length > 240) throw new Error("Add a clear location.");
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("Add valid map coordinates.");
    if (photo && (!allowedImages.has(photo.type) || photo.size > 5 * 1024 * 1024)) throw new Error("Photo must be JPG, PNG or WebP and no larger than 5 MB.");

    const analysis = await analyseReport(description, selectedCategory as CategoryId, photo);
    const idempotencyKey = textField(form, "idempotencyKey") || crypto.randomUUID();
    const occurrence = textField(form, "occurrenceAt");
    const { data, error } = await supabase.rpc("submit_report", {
      p_description: description,
      p_category: analysis.category,
      p_title: analysis.title,
      p_severity: analysis.severity,
      p_occurrence_at: occurrence ? new Date(occurrence).toISOString() : new Date().toISOString(),
      p_latitude: latitude,
      p_longitude: longitude,
      p_location_label: locationLabel,
      p_duration_text: textField(form, "duration"),
      p_provider_or_asset: textField(form, "provider"),
      p_embedding: `[${analysis.embedding.join(",")}]`,
      p_embedding_model: analysis.embeddingModel,
      p_extraction: { title: analysis.title, summary: analysis.summary, observations: analysis.observations, engine: analysis.engine },
      p_idempotency_key: idempotencyKey,
    });
    if (error || !data?.[0]) throw new Error(error?.message || "The report could not be saved.");
    const result = data[0];
    let evidenceWarning: string | undefined;

    if (photo) {
      const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const storagePath = `${user.id}/${result.report_id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("evidence").upload(storagePath, photo, { contentType: photo.type, upsert: false });
      if (uploadError) evidenceWarning = "Report saved, but the photo upload failed.";
      else {
        const { error: evidenceError } = await supabase.from("evidence").insert({ report_id: result.report_id, issue_id: result.issue_id, storage_path: storagePath, uploader_id: user.id, mime_type: photo.type, size_bytes: photo.size });
        if (evidenceError) evidenceWarning = "Report saved, but the photo record could not be linked.";
      }
    }

    return NextResponse.json({ ...result, analysisEngine: analysis.engine, evidenceWarning });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process this report.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
