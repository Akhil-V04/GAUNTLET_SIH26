import type { Tables } from "@/types/database";

export type CollaborationProfile = Tables<"collab_profiles">;

export type PrimaryMode =
  | "student"
  | "community_contributor"
  | "organization_representative";

export type Availability = "open" | "limited" | "unavailable";

