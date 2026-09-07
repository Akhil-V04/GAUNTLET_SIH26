import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to view evidence." }, { status: 401 });
  const { data: evidence, error } = await db.from("evidence").select("storage_path").eq("id", id).maybeSingle();
  if (error || !evidence) return Response.json({ error: "Evidence not found." }, { status: 404 });
  const { data, error: signedError } = await db.storage.from("evidence").createSignedUrl(evidence.storage_path, 60);
  if (signedError || !data) return Response.json({ error: "Evidence file is unavailable." }, { status: 404 });
  return new Response(null, { status: 302, headers: { Location: data.signedUrl, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
