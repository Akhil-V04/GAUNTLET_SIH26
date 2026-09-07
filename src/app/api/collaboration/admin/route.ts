import { ApiFailure, collaborationError, requireCollaborationAccount } from "@/features/collaboration/server/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { database, user } = await requireCollaborationAccount(request);
    const { data: platformRole } = await database.from("collab_platform_roles").select("platform_role").eq("user_id", user.id).maybeSingle();
    if (platformRole?.platform_role !== "administrator") throw new ApiFailure("Platform administrator access required.", 403);
    const [{ data: organizations }, { data: memberships }] = await Promise.all([
      database.from("collab_organizations").select("*").order("created_at", { ascending: false }),
      database.from("collab_organization_memberships").select("*").order("created_at", { ascending: false }),
    ]);
    return Response.json({ organizations: organizations ?? [], memberships: memberships ?? [] });
  } catch (error) {
    return collaborationError(error);
  }
}
