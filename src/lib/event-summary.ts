import type { Json } from "@/types/database";
export function eventSummary(details: Json): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  return [details.organization_name, details.note, details.reason, details.next_step].filter(v => typeof v === "string" && v.length).join(" · ");
}
