import { createClient } from "@/lib/supabase/server";
import { generateHistoricalReport, historyFingerprint } from "@/lib/historical-report";
import { readHistoryDocument, type HistorySnapshot } from "@/lib/history-core";
import type { Json } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) return reply({ error: "Invalid issue ID." }, 400);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Invalid request origin." }, 403);
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return reply({ error: "Please sign in." }, 401);
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profileError || profile?.role !== "officer") return reply({ error: "Only officers can prepare historical reports." }, 403);
  const { data: snapshotData, error } = await db.rpc("retrieve_issue_history", { p_issue_id: id });
  if (error) return reply({ error: error.code === "P0002" ? "Issue not found." : "Could not retrieve issue history. Try again." }, error.code === "P0002" ? 404 : 500);
  const snapshot = snapshotData as unknown as HistorySnapshot;
  if (!snapshot?.sources?.some(s => s.relationship === "current" && s.issue.id === id)) return reply({ error: "History retrieval was incomplete." }, 500);
  const { data: latest, error: latestError } = await db.from("historical_reports").select("*").eq("issue_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
  if (latestError) return reply({ error: "Could not read saved report versions." }, 500);
  const previous = readHistoryDocument(latest?.summary);
  if (previous?.fingerprint === historyFingerprint(snapshot) && (latest?.generation_status === "generated" || !process.env.OPENAI_API_KEY?.trim())) {
    return reply({ id: latest!.id, status: latest!.generation_status, version: latest!.version, reused: true });
  }
  // A brief cooldown prevents repeated paid generation from accidental clicks.
  if (latest && Date.now() - new Date(latest.created_at).getTime() < 15000) {
    return reply({ error: "Please wait 15 seconds before preparing another version." }, 429);
  }
  const result = await generateHistoricalReport(snapshot);
  const version = (latest?.version ?? 0) + 1;
  const { data: saved, error: saveError } = await db.from("historical_reports").insert({
    issue_id: id, created_by: user.id, source_issue_ids: snapshot.sources.map(s => s.issue.id),
    summary: result.document as unknown as Json, generation_status: result.status, model: result.model, version,
  }).select("id,version,generation_status").single();
  if (saveError?.code === "23505") return reply({ error: "Another report version was just prepared. Refresh to view it." }, 409);
  if (saveError || !saved) return reply({ error: "History was retrieved but the report could not be saved. Please retry." }, 500);
  return reply({ id: saved.id, status: saved.generation_status, version: saved.version, reused: false }, 201);
}
