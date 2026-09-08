"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateChallengeForm({
  organizationId,
  problemId,
  initialTitle,
  initialObjective,
}: {
  organizationId: string;
  problemId?: string;
  initialTitle: string;
  initialObjective: string;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [objective, setObjective] = useState(initialObjective);
  const [expectedRoles, setExpectedRoles] = useState("");
  const [usefulSkills, setUsefulSkills] = useState("");
  const [applicationMode, setApplicationMode] = useState("open");
  const [engagementType, setEngagementType] = useState("team");
  const [maximumApplications, setMaximumApplications] = useState("");
  const [minimumTeamSize, setMinimumTeamSize] = useState("2");
  const [maximumTeamSize, setMaximumTeamSize] = useState("5");
  const [deliverables, setDeliverables] = useState(
    "A basic document in .doc format explaining a basic solution for the problem description."
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !objective.trim()) {
      setError("Title and objective are required.");
      return;
    }

    if (!problemId) {
      setError("A problem must be selected first to create a challenge.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, unknown> = {
        problem_id: problemId,
        organization_id: organizationId,
        title: title.trim(),
        objective: objective.trim(),
        application_mode: applicationMode,
        engagement_type: engagementType,
        deliverables: deliverables.trim(),
      };

      if (maximumApplications.trim()) {
        payload.maximum_applications = parseInt(maximumApplications);
      }

      if (expectedRoles.trim()) {
        payload.expected_roles = expectedRoles
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      if (usefulSkills.trim()) {
        payload.useful_skills = usefulSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      if (engagementType === "team" || engagementType === "both") {
        if (minimumTeamSize) payload.minimum_team_size = parseInt(minimumTeamSize);
        if (maximumTeamSize) payload.maximum_team_size = parseInt(maximumTeamSize);
      }

      const commandResponse = await fetch("/api/collaboration/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "adopt_problem",
          payload,
        }),
      });

      if (!commandResponse.ok) {
        const body = await commandResponse.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create challenge.");
      }

      setSuccess("Challenge created successfully!");
      // Briefly show success before navigating
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="report-composer">
      <div className="report-composer-intro">
        <p className="eyebrow">
          <span /> CREATE A CHALLENGE
        </p>
        <h2>Adopt a problem.</h2>
        <p>
          Turn a community reported problem into a structured challenge. Review the details,
          set constraints, and publish it for students to take up.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="report-form">
        {!problemId && (
          <div style={{ color: "var(--red-600)", padding: "1rem", background: "var(--red-50)" }}>
            Error: No problem selected. You must adopt an existing problem.
          </div>
        )}

        <label className="field-wide">
          Challenge Title
          <input
            type="text"
            placeholder="e.g. Design accessible footpaths"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </label>

        <label className="field-wide">
          Objective
          <span>What is the goal of this challenge?</span>
          <textarea
            placeholder="Describe the objective in detail…"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            maxLength={2000}
            required
          />
        </label>

        <label>
          Expected Roles
          <span>(Comma separated) e.g. Designer, Developer</span>
          <input
            type="text"
            placeholder="Designer, Developer"
            value={expectedRoles}
            onChange={(e) => setExpectedRoles(e.target.value)}
            maxLength={200}
          />
        </label>

        <label>
          Useful Skills
          <span>(Comma separated) e.g. React, Figma</span>
          <input
            type="text"
            placeholder="React, Figma"
            value={usefulSkills}
            onChange={(e) => setUsefulSkills(e.target.value)}
            maxLength={200}
          />
        </label>

        <label>
          Application Mode
          <select value={applicationMode} onChange={(e) => setApplicationMode(e.target.value)}>
            <option value="open">Open (Anyone can apply)</option>
            <option value="invite_only">Invite Only</option>
          </select>
        </label>

        <label>
          Engagement Type
          <select value={engagementType} onChange={(e) => setEngagementType(e.target.value)}>
            <option value="solo">Solo</option>
            <option value="team">Team</option>
            <option value="both">Both</option>
          </select>
        </label>

        {(engagementType === "team" || engagementType === "both") && (
          <>
            <label>
              Minimum Team Size
              <input
                type="number"
                min="1"
                max="20"
                value={minimumTeamSize}
                onChange={(e) => setMinimumTeamSize(e.target.value)}
              />
            </label>

            <label>
              Maximum Team Size
              <input
                type="number"
                min="1"
                max="20"
                value={maximumTeamSize}
                onChange={(e) => setMaximumTeamSize(e.target.value)}
              />
            </label>
          </>
        )}

        <label>
          Maximum Applications (Submission Limit)
          <input
            type="number"
            min="1"
            placeholder="Leave blank for no limit"
            value={maximumApplications}
            onChange={(e) => setMaximumApplications(e.target.value)}
          />
        </label>

        <label className="field-wide">
          Deliverables (Requirements)
          <span>What should the students submit?</span>
          <textarea
            placeholder="e.g. A basic document in .doc format explaining a basic solution"
            value={deliverables}
            onChange={(e) => setDeliverables(e.target.value)}
            maxLength={2000}
          />
        </label>

        {error && <div className="error-message" style={{ color: "var(--red-600)" }}>{error}</div>}
        {success && <div className="success-message" style={{ color: "var(--green-700)" }}>{success}</div>}

        <button type="submit" className="button-primary" disabled={submitting || !problemId}>
          {submitting ? "Publishing..." : "Publish Challenge"}
        </button>
      </form>
    </section>
  );
}
