import { ApiFailure, collaborationError, requireCollaborationAccount } from "@/features/collaboration/server/api";

const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const { database, user } = await requireCollaborationAccount(request);
    const form = await request.formData();
    const problemId = String(form.get("problemId") ?? "");
    const file = form.get("file");
    if (!/^[0-9a-f-]{36}$/i.test(problemId)) throw new ApiFailure("Invalid problem ID.", 400);
    if (!(file instanceof File)) throw new ApiFailure("Choose an evidence image.", 400);
    const extension = allowedTypes[file.type];
    if (!extension) throw new ApiFailure("Evidence must be JPG, PNG or WebP.", 400);
    if (file.size < 1 || file.size > 4 * 1024 * 1024) throw new ApiFailure("Evidence must be no larger than 4 MB.", 413);

    const { data: problem } = await database.from("collab_problems").select("id,author_id").eq("id", problemId).maybeSingle();
    if (!problem || problem.author_id !== user.id) throw new ApiFailure("Only the problem author can upload evidence.", 403);

    const path = `${user.id}/problems/${problemId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await database.storage.from("collaboration").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { error: attachError } = await database.rpc("collab_command", {
      p_command: "attach_problem_evidence",
      p_payload: { problem_id: problemId, evidence_path: path },
    });
    if (attachError) {
      await database.storage.from("collaboration").remove([path]);
      throw attachError;
    }
    return Response.json({ data: { problemId, path } }, { status: 201 });
  } catch (error) {
    return collaborationError(error);
  }
}

export async function GET(request: Request) {
  try {
    const { database } = await requireCollaborationAccount(request);
    const path = new URL(request.url).searchParams.get("path") ?? "";
    if (!/^[0-9a-f-]{36}\/problems\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path) || path.length > 500) {
      throw new ApiFailure("Evidence access denied.", 403);
    }
    const { data, error } = await database.storage.from("collaboration").createSignedUrl(path, 300);
    if (error) throw error;
    return Response.json({ url: data.signedUrl, expiresIn: 300 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return collaborationError(error);
  }
}
