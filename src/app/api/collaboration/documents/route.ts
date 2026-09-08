import { ApiFailure, collaborationError, requireCollaborationAccount } from "@/features/collaboration/server/api";


const allowedTypes: Record<string, string> = {
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/pdf": "pdf",
};

export async function POST(request: Request) {
  try {
    const { database, user } = await requireCollaborationAccount(request);
    const form = await request.formData();
    const challengeId = String(form.get("challengeId") ?? "");
    const file = form.get("file");
    
    if (!/^[0-9a-f-]{36}$/i.test(challengeId)) throw new ApiFailure("Invalid challenge ID.", 400);
    if (!(file instanceof File)) throw new ApiFailure("Choose a document to upload.", 400);
    
    const extension = allowedTypes[file.type] || file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ["doc", "docx", "pdf"];
    if (!extension || !validExtensions.includes(extension)) {
      throw new ApiFailure("Document must be DOC, DOCX, or PDF.", 400);
    }
    
    if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new ApiFailure("Document must be no larger than 5 MB.", 413);

    const path = `${user.id}/applications/${challengeId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await database.storage.from("collaboration").upload(path, file, { contentType: file.type, upsert: false });
    
    if (uploadError) throw uploadError;

    const { data: signedData } = await database.storage.from("collaboration").createSignedUrl(path, 60 * 60 * 24 * 365);
    
    return Response.json({ data: { path, url: signedData?.signedUrl || path } }, { status: 201 });
  } catch (error) {
    return collaborationError(error);
  }
}
