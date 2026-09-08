import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

export type CollaborationDatabase = SupabaseClient<Database>;

export async function requireCollaborationAccount(request: Request): Promise<{
  database: CollaborationDatabase;
  user: User;
}> {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin) {
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
    const isRequestLocalhost = requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1");
    if (!(isLocalhost && isRequestLocalhost)) {
      throw new ApiFailure("Cross-site requests are not allowed.", 403);
    }
  }

  const database = await createClient();
  const { data: { user }, error } = await database.auth.getUser();
  if (error || !user) throw new ApiFailure("Sign in first.", 401);
  return { database, user };
}

export class ApiFailure extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export function collaborationError(error: unknown) {
  if (error instanceof ApiFailure) return Response.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error
    ? error.message
    : error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "Unable to complete the request.";
  const status = /access|required|cannot|only|denied/i.test(message)
    ? 403
    : /already|capacity|full|closed|deadline|locked|accepted/i.test(message)
      ? 409
      : 400;
  return Response.json({ error: message }, { status });
}

const commandFields = {
  create_organization: ["name", "organization_type", "website", "summary"],
  publish_problem: ["title", "summary", "affected_group", "current_workaround", "domain", "approximate_location", "source_url", "contact_preference", "relevant_organization", "publication_consent"],
  adopt_problem: ["problem_id", "organization_id", "title", "objective", "expected_roles", "useful_skills", "constraints", "support_offered", "deliverables", "application_mode", "minimum_team_size", "maximum_team_size", "maximum_interests", "maximum_applications", "application_deadline", "engagement_type", "evaluation_criteria", "timezone", "milestones"],
  set_interest: ["challenge_id", "note"],
  remove_interest: ["challenge_id"],
  create_team: ["challenge_id", "name"],
  invite_member: ["team_id", "student_id"],
  request_to_join: ["team_id"],
  respond_membership: ["team_id", "student_id", "decision"],
  leave_team: ["team_id"],
  submit_application: ["team_id", "proposal", "limitations", "relevant_experience", "responsibility_plan", "portfolio_url"],
  review_application: ["application_id", "decision", "review_note"],
  submit_contribution: ["team_id", "milestone_id", "summary", "output_url", "limitations"],
  review_contribution: ["contribution_id", "decision", "review_note"],
  publish_outcome: ["challenge_id", "final_deliverable_url", "handover_summary", "pilot_result", "evaluation", "implementation_responsibility"],
  verify_organization: ["organization_id", "verification_status"],
} as const;

export type CollaborationCommand = keyof typeof commandFields;
const uuidFields = new Set(["problem_id", "organization_id", "challenge_id", "team_id", "student_id", "application_id", "milestone_id", "contribution_id"]);
const urlFields = new Set(["website", "source_url", "portfolio_url", "output_url", "final_deliverable_url"]);
const numberFields = new Set(["minimum_team_size", "maximum_team_size", "maximum_interests", "maximum_applications"]);
const arrayFields = new Set(["expected_roles", "useful_skills", "milestones"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCollaborationCommand(value: unknown): value is CollaborationCommand {
  return typeof value === "string" && value in commandFields;
}

export function normalizeCommandPayload(command: CollaborationCommand, input: unknown): Record<string, Json> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiFailure("Invalid command payload.", 400);
  const source = input as Record<string, unknown>;
  const output: Record<string, Json> = {};

  for (const field of commandFields[command]) {
    const value = source[field];
    if (value === undefined || value === null) continue;
    if (field === "publication_consent") {
      output[field] = value === true;
      continue;
    }
    if (numberFields.has(field)) {
      if (value === "") continue;
      const number = Number(value);
      if (!Number.isInteger(number)) throw new ApiFailure(`${field} must be a whole number.`, 400);
      output[field] = number;
      continue;
    }
    if (arrayFields.has(field)) {
      const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,]/) : [];
      output[field] = [...new Set(values.map((item) => String(item).trim()).filter(Boolean))].slice(0, 20);
      continue;
    }
    if (typeof value !== "string") throw new ApiFailure(`${field} must be text.`, 400);
    const text = value.trim().slice(0, 5000);
    if (uuidFields.has(field) && !uuidPattern.test(text)) throw new ApiFailure(`${field} is invalid.`, 400);
    if (urlFields.has(field) && text) {
      let url: URL;
      try { url = new URL(text); } catch { throw new ApiFailure(`${field} must be a valid URL.`, 400); }
      if (!['http:', 'https:'].includes(url.protocol)) throw new ApiFailure(`${field} must use HTTP or HTTPS.`, 400);
    }
    output[field] = text;
  }
  return output;
}
