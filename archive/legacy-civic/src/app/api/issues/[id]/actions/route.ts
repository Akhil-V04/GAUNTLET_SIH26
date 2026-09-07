import { apiAccess, apiError } from "@/lib/api-access";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db } = await apiAccess(request); const { id } = await params;
    const { action, ...payload } = await request.json();
    if (!["assign", "escalate", "progress"].includes(action)) throw new Error("Unknown action.");
    const { data, error } = await db.rpc("workflow_action", { p_issue_id: id, p_action: action, p_payload: payload });
    if (error) throw new Error(error.message); return Response.json(data);
  } catch (error) { return apiError(error); }
}
