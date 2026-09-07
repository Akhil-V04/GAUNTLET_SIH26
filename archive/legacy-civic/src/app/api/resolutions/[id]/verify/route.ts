import { apiAccess, apiError } from "@/lib/api-access";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db } = await apiAccess(request); const { id } = await params;
    const { data: resolution } = await db.from("resolution_attempts").select("issue_id").eq("id", id).maybeSingle();
    if (!resolution) throw new Error("Resolution not found.");
    const body = await request.json();
    const { data, error } = await db.rpc("workflow_action", { p_issue_id: resolution.issue_id, p_action: "verify", p_payload: { resolutionId: id, outcome: body.outcome, note: body.reason ?? "" } });
    if (error) throw new Error(error.message); return Response.json(data);
  } catch (error) { return apiError(error); }
}
