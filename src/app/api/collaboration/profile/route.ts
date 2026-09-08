import { isAvailability, isPrimaryMode } from "@/features/collaboration/constants";
import { createClient } from "@/lib/supabase/server";

const clean = (value: unknown, maximum: number) =>
  typeof value === "string" ? value.trim().slice(0, maximum) : "";

export async function PUT(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin) {
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
    const isRequestLocalhost = requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1");
    if (!(isLocalhost && isRequestLocalhost)) {
      return Response.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
    }
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 12_000) {
    return Response.json({ error: "Profile data is too large." }, { status: 413 });
  }

  const database = await createClient();
  const {
    data: { user },
  } = await database.auth.getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid profile data." }, { status: 400 });
  }

  const displayName = clean(body.displayName, 100);
  const headline = clean(body.headline, 160);
  const institution = clean(body.institution, 160);
  const primaryMode = body.primaryMode;
  const availability = body.availability;
  const skills = Array.isArray(body.skills)
    ? [...new Set(body.skills.map((value) => clean(value, 50)).filter(Boolean))].slice(0, 20)
    : [];

  if (displayName.length < 2 || !isPrimaryMode(primaryMode) || !isAvailability(availability)) {
    return Response.json({ error: "Complete the required profile fields." }, { status: 400 });
  }

  const { error } = await database.from("collab_profiles").upsert({
    id: user.id,
    display_name: displayName,
    primary_mode: primaryMode,
    headline,
    institution,
    skills,
    availability,
    discoverable: body.discoverable === true,
    onboarding_completed: true,
  });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}

