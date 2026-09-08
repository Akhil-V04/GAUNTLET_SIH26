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

type Organization = {
  id: string;
  name: string;
  organization_type: string;
  summary: string;
};

type ExploreResponse = {
  challenges: Challenge[];
  organizations: Organization[];
};

export function OrgFeed() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [orgMap, setOrgMap] = useState<Record<string, Organization>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFeed() {
      try {
        const response = await fetch("/api/collaboration/explore");
        if (!response.ok) throw new Error("Failed to load organisation posts");
        const data: ExploreResponse = await response.json();

        const open = data.challenges.filter(
          (c) => c.status === "open" || c.status === "active"
        );
        setChallenges(open);

        const map: Record<string, Organization> = {};
        for (const org of data.organizations ?? []) {
          map[org.id] = org;
        }
        setOrgMap(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchFeed();
  }, []);

  if (loading) {
    return (
      <section className="workspace-empty">
        <div>
          <p className="eyebrow">ORGANISATION POSTS</p>
          <h2>Loading challenges…</h2>
          <p>Fetching the latest posts from organisations.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="workspace-empty">
        <div>
          <p className="eyebrow">ORGANISATION POSTS</p>
          <h2>Unable to load posts.</h2>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (challenges.length === 0) {
    return (
      <section className="workspace-empty">
        <div>
          <p className="eyebrow">ORGANISATION POSTS</p>
          <h2>No organisation posts yet.</h2>
          <p>
            Challenges and initiatives posted by organisations will appear here.
            Check back soon — organisations are actively reviewing community
            problems.
          </p>
        </div>
        <Link className="button-primary" href="/workspace">
          Explore Workspace →
        </Link>
      </section>
    );
  }

  return (
    <section>
      <p className="eyebrow">ORGANISATION POSTS</p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        {challenges.map((challenge) => {
          const org = orgMap[challenge.organization_id];
          return (
            <article key={challenge.id} className="issue-card">
              <div className="issue-card-top">
                <div>
                  <div className="badge-row">
                    <span className="status-badge">{challenge.status}</span>
                    <span className="status-badge">
                      {challenge.engagement_type}
                    </span>
                  </div>
                  <h3>{challenge.title}</h3>
                  <p>{challenge.objective}</p>
                </div>
              </div>

              {org && (
                <div
                  style={{
                    marginTop: "10px",
                    fontSize: "13px",
                    color: "var(--muted)",
                  }}
                >
                  <strong style={{ color: "var(--green)" }}>{org.name}</strong>
                  {org.organization_type && (
                    <span> · {org.organization_type}</span>
                  )}
                </div>
              )}

              {(challenge.expected_roles.length > 0 ||
                challenge.useful_skills.length > 0) && (
                <div
                  className="badge-row"
                  style={{ marginTop: "12px", flexWrap: "wrap" }}
                >
                  {challenge.expected_roles.map((role) => (
                    <span
                      key={role}
                      className="status-badge"
                      style={{ background: "#e8f0fe", color: "#1a56db" }}
                    >
                      {role}
                    </span>
                  ))}
                  {challenge.useful_skills.map((skill) => (
                    <span
                      key={skill}
                      className="status-badge"
                      style={{ background: "#eef1e9" }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="issue-card-foot">
                {challenge.application_deadline && (
                  <span>
                    Deadline:{" "}
                    {new Date(
                      challenge.application_deadline
                    ).toLocaleDateString()}
                  </span>
                )}
                <span>
                  Posted{" "}
                  {new Date(challenge.created_at).toLocaleDateString()}
                </span>
                <Link href={`/challenges/${challenge.id}`}>
                  View Details →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
