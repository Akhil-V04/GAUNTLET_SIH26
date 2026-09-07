export const dynamic = "force-dynamic";

// Liveness only: this does not imply database or AI readiness.
export async function GET() {
  return Response.json(
    { status: "ok", service: "gauntlet", version: "0.1.0", timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
