"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { availabilityOptions, primaryModes } from "../constants";
import type { CollaborationProfile, PrimaryMode } from "../types";

type OnboardingFormProps = {
  email: string;
  existingProfile: CollaborationProfile | null;
  suggestedName: string;
};

export function OnboardingForm({ email, existingProfile, suggestedName }: OnboardingFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<PrimaryMode>(
    (existingProfile?.primary_mode as PrimaryMode | undefined) ?? "student",
  );
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const payload = {
      displayName: String(form.get("displayName") ?? ""),
      primaryMode: mode,
      headline: String(form.get("headline") ?? ""),
      institution: String(form.get("institution") ?? ""),
      skills: String(form.get("skills") ?? "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      availability: String(form.get("availability") ?? "open"),
      discoverable: form.get("discoverable") === "on",
    };

    const response = await fetch("/api/collaboration/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(result.error ?? "Unable to save your profile.");
      setPending(false);
      return;
    }

    router.push("/workspace");
    router.refresh();
  }

  return (
    <form className="onboarding-form" onSubmit={submit}>
      <div className="field-row">
        <label>
          Display name
          <input
            name="displayName"
            defaultValue={existingProfile?.display_name ?? suggestedName}
            minLength={2}
            maxLength={100}
            autoComplete="name"
            required
          />
        </label>
        <label>
          Account email
          <input value={email} disabled aria-describedby="email-note" />
          <small id="email-note">Your email stays private.</small>
        </label>
      </div>

      <fieldset className="mode-picker">
        <legend>How do you want to begin?</legend>
        <p>You can still submit problems in any mode. Organisation permissions require an approved membership.</p>
        <div>
          {primaryModes.map((option) => (
            <label key={option.value} className={mode === option.value ? "selected" : ""}>
              <input
                type="radio"
                name="primaryMode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
              />
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field-row">
        <label>
          Institution or affiliation
          <input
            name="institution"
            defaultValue={existingProfile?.institution ?? ""}
            maxLength={160}
            placeholder="University, NGO, community group…"
          />
        </label>
        <label>
          Availability
          <select name="availability" defaultValue={existingProfile?.availability ?? "open"}>
            {availabilityOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Short introduction
        <input
          name="headline"
          defaultValue={existingProfile?.headline ?? ""}
          maxLength={160}
          placeholder="What do you care about or contribute?"
        />
      </label>

      <label>
        Skills
        <input
          name="skills"
          defaultValue={existingProfile?.skills.join(", ") ?? ""}
          maxLength={1000}
          placeholder="Research, design, React, outreach"
        />
        <small>Separate skills with commas. Add up to 20.</small>
      </label>

      <label className="consent-row">
        <input
          type="checkbox"
          name="discoverable"
          defaultChecked={existingProfile?.discoverable ?? true}
        />
        <span>Allow my display name, introduction, affiliation and skills to appear in public discovery.</span>
      </label>

      <div className="form-footer">
        <button className="button-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : existingProfile ? "Save profile" : "Create my workspace"}
          <span aria-hidden="true">→</span>
        </button>
        <p className="form-message" role="status">{message}</p>
      </div>
    </form>
  );
}

