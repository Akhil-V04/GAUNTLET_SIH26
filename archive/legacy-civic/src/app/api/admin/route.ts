import { apiAccess, apiError } from "@/lib/api-access";
export async function POST(request: Request) {
  try {
    const { db } = await apiAccess(request, true); const { action, ...payload } = await request.json();
    const { data, error } = await db.rpc("admin_action", { p_action: action, p_payload: payload });
    if (error) throw new Error(error.message); return Response.json(data);
  } catch (error) { return apiError(error); }
}
