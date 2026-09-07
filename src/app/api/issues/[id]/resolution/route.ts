import { apiAccess, apiError } from "@/lib/api-access";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let cleanup: (() => Promise<unknown>) | undefined;
  try {
    const { db, user, profile } = await apiAccess(request); const { id: issueId } = await params;
    if (!["officer", "solver"].includes(profile.role)) throw new Error("Officer or assigned solver access required.");
    if (!/^[0-9a-f-]{36}$/i.test(issueId)) throw new Error("Invalid issue.");
    if (profile.role === "solver") {
      const { data } = await db.from("assignments").select("id").eq("issue_id", issueId).eq("organization_id", profile.organization_id ?? "").in("status", ["assigned", "acknowledged"]).limit(1).maybeSingle();
      if (!data) throw new Error("Assigned solver access required.");
    }
    const form = await request.formData();
    const note = String(form.get("note") ?? "").trim(), photo = form.get("photo");
    if (note.length < 5 || note.length > 3000) throw new Error("Add a 5–3,000 character resolution note.");
    if (!(photo instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(photo.type) || !photo.size || photo.size > 4 * 1024 * 1024) throw new Error("Add JPG, PNG or WebP evidence up to 4 MB.");
    const resolutionId = crypto.randomUUID(), ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${issueId}/resolutions/${resolutionId}.${ext}`;
    const { error: uploadError } = await db.storage.from("evidence").upload(path, photo, { contentType: photo.type });
    if (uploadError) throw new Error("Evidence upload failed. Please retry.");
    cleanup = () => db.storage.from("evidence").remove([path]);
    const { data, error } = await db.rpc("workflow_action", { p_issue_id: issueId, p_action: "resolve", p_payload: {
      resolutionId, evidenceId: crypto.randomUUID(), note, storagePath: path, mimeType: photo.type, sizeBytes: photo.size,
      expectedStatus: String(form.get("expectedStatus") ?? ""), assignmentId: String(form.get("assignmentId") ?? ""),
    } });
    if (error) throw new Error(error.message);
    cleanup = undefined; return Response.json(data);
  } catch (error) { if (cleanup) await cleanup(); return apiError(error); }
}
