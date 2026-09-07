import { ApiFailure, collaborationError, requireCollaborationAccount } from "@/features/collaboration/server/api";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const { database } = await requireCollaborationAccount(request);
    const body = (await request.json()) as { action?: unknown; organizationId?: unknown; userId?: unknown; role?: unknown };
    if (body.action !== "invite" && body.action !== "respond") throw new ApiFailure("Invalid membership action.", 400);
    if (typeof body.organizationId !== "string" || !uuidPattern.test(body.organizationId)) throw new ApiFailure("Invalid organisation ID.", 400);
    if (body.action === "invite" && (typeof body.userId !== "string" || !uuidPattern.test(body.userId))) throw new ApiFailure("Invalid user ID.", 400);
    if (typeof body.role !== "string") throw new ApiFailure("Choose a membership role or response.", 400);
    const { data, error } = await database.rpc("collab_organization_membership_command", {
      p_action: body.action,
      p_organization_id: body.organizationId,
      p_user_id: body.action === "invite" ? body.userId as string : undefined,
      p_role: body.role,
    });
    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    return collaborationError(error);
  }
}
