import { ApiFailure, collaborationError, isCollaborationCommand, normalizeCommandPayload, requireCollaborationAccount } from "@/features/collaboration/server/api";

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > 40_000) throw new ApiFailure("Command data is too large.", 413);
    const { database } = await requireCollaborationAccount(request);
    const body = (await request.json()) as { command?: unknown; payload?: unknown };
    if (!isCollaborationCommand(body.command)) throw new ApiFailure("Unknown collaboration command.", 400);
    const payload = normalizeCommandPayload(body.command, body.payload);
    const { data, error } = await database.rpc("collab_command", { p_command: body.command, p_payload: payload });
    if (error) throw error;
    const created = ["create_organization", "publish_problem", "adopt_problem", "create_team", "submit_application", "submit_contribution"].includes(body.command);
    return Response.json({ data }, { status: created ? 201 : 200 });
  } catch (error) {
    return collaborationError(error);
  }
}
