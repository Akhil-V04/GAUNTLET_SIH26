"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DOMAIN_OPTIONS = [
  "Technology",
  "Healthcare",
  "Education",
  "Environment",
  "Agriculture",
  "Accessibility",
  "Livelihoods",
  "Community Services",
  "Digital Access",
  "Other",
] as const;

export function PostProblemForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [affectedGroup, setAffectedGroup] = useState("");
  const [domain, setDomain] = useState("");
  const [approximateLocation, setApproximateLocation] = useState("");
  const [currentWorkaround, setCurrentWorkaround] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Image must be JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be no larger than 4 MB.");
      return;
    }

    setImageFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) {
      setError("Title and description are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      /* 1. Publish the problem via command API */
      const commandResponse = await fetch("/api/collaboration/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "publish_problem",
          payload: {
            title: title.trim(),
            summary: summary.trim(),
            affected_group: affectedGroup.trim() || undefined,
            domain: domain || undefined,
            approximate_location: approximateLocation.trim() || undefined,
            current_workaround: currentWorkaround.trim() || undefined,
            publication_consent: true,
          },
        }),
      });

      if (!commandResponse.ok) {
        const body = await commandResponse.json().catch(() => ({}));
        throw new Error(body.error || "Failed to publish problem.");
      }

      const commandData = await commandResponse.json();

      /* 2. Upload evidence image if selected */
      if (imageFile && commandData.data) {
        const problemId =
          typeof commandData.data === "string"
            ? commandData.data
            : commandData.data.id ?? commandData.data;

        const formData = new FormData();
        formData.append("problemId", problemId);
        formData.append("file", imageFile);

        const uploadResponse = await fetch("/api/collaboration/evidence", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          /* Problem was created but image failed — still a partial success */
          const uploadBody = await uploadResponse.json().catch(() => ({}));
          setSuccess(
            "Problem published! However, the image could not be uploaded: " +
              (uploadBody.error || "unknown error")
          );
          router.refresh();
          return;
        }
      }

      setSuccess("Problem published successfully!");
      setTitle("");
      setSummary("");
      setAffectedGroup("");
      setDomain("");
      setApproximateLocation("");
      setCurrentWorkaround("");
      removeImage();
      router.refresh();
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
          <span /> REPORT A PROBLEM
        </p>
        <h2>Share an issue with the community.</h2>
        <p>
          Describe a real-world problem you&apos;ve observed. Organisations can
          adopt your report and turn it into a scoped challenge for student
          teams.
        </p>
        <div className="privacy-note">
          <strong>🔒 Privacy</strong>
          <span>
            Your report is reviewed before it becomes public. Personal details
            are never shared without your consent.
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="report-form">
        <label className="field-wide">
          Title
          <input
            type="text"
            placeholder="e.g. Broken footpaths near the bus stop"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </label>

        <label className="field-wide">
          Description
          <span>What is the problem and how does it affect people?</span>
          <textarea
            placeholder="Describe the problem in detail…"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={2000}
            required
          />
        </label>

        <label>
          Affected Group
          <span>Who is most impacted?</span>
          <input
            type="text"
            placeholder="e.g. Senior citizens, students"
            value={affectedGroup}
            onChange={(e) => setAffectedGroup(e.target.value)}
            maxLength={200}
          />
        </label>

        <label>
          Domain
          <select value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option value="">Select a domain…</option>
            {DOMAIN_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Approximate Location</span>
            <button 
              type="button" 
              onClick={() => {
                if ('geolocation' in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    async (position) => {
                      const { latitude, longitude } = position.coords;
                      try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await response.json();
                        if (data && data.display_name) {
                          setApproximateLocation(data.display_name);
                        } else {
                          setApproximateLocation(`${latitude}, ${longitude}`);
                        }
                      } catch (error) {
                        setApproximateLocation(`${latitude}, ${longitude}`);
                      }
                    },
                    (error) => {
                      setError("Unable to retrieve your location.");
                    }
                  );
                } else {
                  setError("Geolocation is not supported by your browser.");
                }
              }}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #cdd8c9',
                background: '#f0f4e9',
                color: 'var(--green)',
                cursor: 'pointer'
              }}
            >
              📍 Add my location
            </button>
          </div>
          <input
            type="text"
            placeholder="e.g. MG Road, Bengaluru"
            value={approximateLocation}
            onChange={(e) => setApproximateLocation(e.target.value)}
            maxLength={200}
          />
        </label>

        <label>
          Current Workaround
          <span>How are people coping today?</span>
          <input
            type="text"
            placeholder="e.g. Walking on the road instead"
            value={currentWorkaround}
            onChange={(e) => setCurrentWorkaround(e.target.value)}
            maxLength={500}
          />
        </label>

        <div className="field-wide">
          <label>
            Evidence Image
            <span>JPG, PNG, or WebP — max 4 MB</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              style={{ padding: "10px", border: "1px dashed #94a88e", borderRadius: "7px", background: "#f5f7ef" }}
            />
          </label>
          {imagePreview && (
            <div style={{ marginTop: "10px", position: "relative", display: "inline-block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Evidence preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "180px",
                  borderRadius: "8px",
                  border: "1px solid #d5dfce",
                }}
              />
              <button
                type="button"
                onClick={removeImage}
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "6px",
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  border: "0",
                  background: "#fff",
                  color: "#9c372d",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="field-wide report-submit">
          <button
            type="submit"
            disabled={submitting}
            className="button-primary"
          >
            {submitting ? "Publishing…" : "Publish Problem →"}
          </button>
          <p>
            {error && <span className="form-error">{error}</span>}
            {success && <span className="form-success">{success}</span>}
            {!error && !success && (
              <span>
                By submitting you confirm that the information is accurate to
                the best of your knowledge.
              </span>
            )}
          </p>
        </div>
      </form>
    </section>
  );
}
