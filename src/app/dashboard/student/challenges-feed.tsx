"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Challenge = {
  id: string;
  title: string;
  objective: string;
  expected_roles: string[];
  useful_skills: string[];
  application_deadline: string | null;
  engagement_type: string;
  organization_id: string;
  status: string;
  created_at: string;
};

type ExploreResponse = {
  challenges: Challenge[];
};

export function ChallengesFeed() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChallenges() {
      try {
        const response = await fetch("/api/collaboration/explore");
        if (!response.ok) throw new Error("Failed to load challenges");
        const data: ExploreResponse = await response.json();
        const open = data.challenges.filter(c => c.status === "open" || c.status === "active");
        setChallenges(open);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchChallenges();
  }, []);

  if (loading) {
    return (
      <section className="workspace-empty">
        <div>
          <p className="eyebrow">ORGANIZATION CHALLENGES</p>
          <h2>Loading challenges…</h2>
          <p>Fetching the latest challenges posted by organisations.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="workspace-empty">
        <div>
          <p className="eyebrow">ORGANIZATION CHALLENGES</p>
          <h2>Unable to load challenges.</h2>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (challenges.length === 0) {
    return (
      <section className="workspace-empty">
        <div>
          <p className="eyebrow">ORGANIZATION CHALLENGES</p>
          <h2>No challenges available yet.</h2>
          <p>
            Challenges posted by organisations will appear here.
            Check back soon or explore problems in the community.
          </p>
        </div>
        <Link className="button-primary" href="/workspace">
          Go to Workspace →
        </Link>
      </section>
    );
  }

  return (
    <section>
      <p className="eyebrow">ORGANIZATION CHALLENGES</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
        {challenges.map(challenge => (
          <article key={challenge.id} className="issue-card">
            <div className="issue-card-top">
              <div>
                <div className="badge-row">
                  <span className="status-badge">{challenge.status}</span>
                  <span className="status-badge">{challenge.engagement_type}</span>
                </div>
                <h3>{challenge.title}</h3>
                <p>{challenge.objective}</p>
              </div>
            </div>

            {(challenge.expected_roles.length > 0 || challenge.useful_skills.length > 0) && (
              <div className="badge-row" style={{ marginTop: "12px", flexWrap: "wrap" }}>
                {challenge.expected_roles.map(role => (
                  <span key={role} className="status-badge" style={{ background: "#e8f0fe", color: "#1a56db" }}>
                    {role}
                  </span>
                ))}
                {challenge.useful_skills.map(skill => (
                  <span key={skill} className="status-badge" style={{ background: "#eef1e9" }}>
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <div className="issue-card-foot">
              {challenge.application_deadline && (
                <span>
                  Deadline: {new Date(challenge.application_deadline).toLocaleDateString()}
                </span>
              )}
              <span>
                Posted {new Date(challenge.created_at).toLocaleDateString()}
              </span>
              <Link href={`/challenges/${challenge.id}`}>
                View Details →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
