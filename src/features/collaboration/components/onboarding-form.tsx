"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { CollaborationProfile, PrimaryMode } from "../types";

type OnboardingFormProps = {
  email: string;
  existingProfile: CollaborationProfile | null;
  suggestedName: string;
  accountType: string;
};

const domainOptions = [
  "Technology",
  "Healthcare",
  "Education",
  "Environment",
  "Agriculture",
  "Accessibility",
  "Livelihoods",
  "Community Services",
  "Digital Access",
  "Other"
];

const orgTypeOptions = [
  "University",
  "NGO",
  "Startup",
  "Industry Partner",
  "Expert Group",
  "Service Provider"
];

export function OnboardingForm({ email, existingProfile, suggestedName, accountType }: OnboardingFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    
    let finalInstitution = "";
    let finalHeadline = "";
    let finalSkills: string[] = [];
    let finalMode: PrimaryMode = "student";

    if (accountType === "community_member") {
      finalMode = "community_contributor";
    } else if (accountType === "student") {
      finalMode = "student";
      const college = String(form.get("college") ?? "");
      const degree = String(form.get("degree") ?? "");
      finalInstitution = degree ? `${college}, ${degree}` : college;
      finalHeadline = String(form.get("headline") ?? "");
      
      const domains = form.getAll("domains").map(String);
      const skillsInput = String(form.get("skills") ?? "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
      
      finalSkills = Array.from(new Set([...domains, ...skillsInput]));
    } else if (accountType === "organization_representative") {
      finalMode = "organization_representative";
      const orgName = String(form.get("orgName") ?? "");
      const designation = String(form.get("designation") ?? "");
      finalInstitution = designation ? `${orgName} - ${designation}` : orgName;
      
      const focus = String(form.get("focus") ?? "");
      const website = String(form.get("website") ?? "");
      const orgType = String(form.get("orgType") ?? "");
      finalHeadline = [orgType, focus, website].filter(Boolean).join(" | ");
    }

    const payload = {
      displayName: String(form.get("displayName") ?? ""),
      primaryMode: finalMode,
      headline: finalHeadline,
      institution: finalInstitution,
      skills: finalSkills,
      availability: "open", // Simplified, as it wasn't requested for new forms
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

  if (accountType === "community_member") {
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
        <div className="form-footer">
          <button className="button-primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Continue to workspace"}
            <span aria-hidden="true">→</span>
          </button>
          <p className="form-message" role="status">{message}</p>
        </div>
      </form>
    );
  }

  if (accountType === "organization_representative") {
    return (
      <form className="onboarding-form" onSubmit={submit}>
        <div className="field-row">
          <label>
            Representative name
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

        <div className="field-row">
          <label>
            Organisation name
            <input name="orgName" required />
          </label>
          <label>
            Organisation type
            <select name="orgType">
              {orgTypeOptions.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label>
            Contact person designation
            <input name="designation" placeholder="e.g. Director, HR" />
          </label>
          <label>
            Website URL (optional)
            <input name="website" type="url" placeholder="https://" />
          </label>
        </div>

        <label>
          Area of focus / description
          <textarea
            name="focus"
            rows={3}
            maxLength={300}
            style={{ width: '100%', padding: '12px', border: '1px solid #cbd6c7', borderRadius: '8px', marginTop: '4px' }}
            placeholder="Describe your organisation's focus..."
          />
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

  // Default to student
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

      <div className="field-row">
        <label>
          College/University name
          <input name="college" required />
        </label>
        <label>
          Degree & Year
          <input name="degree" placeholder="e.g. B.Tech CSE, 3rd Year" />
        </label>
      </div>

      <fieldset style={{ border: 'none', padding: 0, margin: '16px 0' }}>
        <legend style={{ fontWeight: 'bold', marginBottom: '8px' }}>Domain interests</legend>
        <div className="domain-grid">
          {domainOptions.map(d => (
            <label key={d}>
              <input type="checkbox" name="domains" value={d} />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        Skills
        <input
          name="skills"
          defaultValue={existingProfile?.skills?.join(", ") ?? ""}
          maxLength={1000}
          placeholder="Research, design, React, outreach"
        />
        <small>Separate skills with commas. Add up to 20.</small>
      </label>

      <label>
        Short bio / headline
        <input
          name="headline"
          defaultValue={existingProfile?.headline ?? ""}
          maxLength={160}
          placeholder="What do you care about or contribute?"
        />
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
