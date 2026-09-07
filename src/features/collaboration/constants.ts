import type { Availability, PrimaryMode } from "./types";

export const primaryModes: ReadonlyArray<{
  value: PrimaryMode;
  label: string;
  description: string;
}> = [
  {
    value: "student",
    label: "Student",
    description: "Discover challenges, find teammates and build a reviewed contribution record.",
  },
  {
    value: "community_contributor",
    label: "Community contributor",
    description: "Share a well-described societal problem and follow what happens next.",
  },
  {
    value: "organization_representative",
    label: "Organisation representative",
    description: "Represent a university, NGO, startup or industry partner after membership is verified.",
  },
];

export const availabilityOptions: ReadonlyArray<{ value: Availability; label: string }> = [
  { value: "open", label: "Open to collaborate" },
  { value: "limited", label: "Limited availability" },
  { value: "unavailable", label: "Not available currently" },
];

export const modeLabels: Record<PrimaryMode, string> = {
  student: "Student",
  community_contributor: "Community contributor",
  organization_representative: "Organisation representative",
};

export function isPrimaryMode(value: unknown): value is PrimaryMode {
  return primaryModes.some((mode) => mode.value === value);
}

export function isAvailability(value: unknown): value is Availability {
  return availabilityOptions.some((option) => option.value === value);
}

