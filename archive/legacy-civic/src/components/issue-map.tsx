"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { categories } from "@/lib/categories";
import type { DashboardIssue } from "@/lib/dashboard-data";

export function IssueMap({ issues }: { issues: DashboardIssue[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState("all"), [status, setStatus] = useState("all"), [source, setSource] = useState("all"), [warning, setWarning] = useState("");
  const visible = useMemo(() => issues.filter(i => (category === "all" || i.category === category) && (status === "all" || (status === "active" ? i.status !== "verified" : i.status === status)) && (source === "all" || i.demo_source === source)), [issues, category, status, source]);
  useEffect(() => {
    let disposed = false; let map: import("leaflet").Map | undefined;
    import("leaflet").then(L => {
      if (disposed || !host.current) return;
      map = L.map(host.current, { scrollWheelZoom: false }).setView([23.3441, 85.3096], 12);
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
      tiles.on("tileerror", () => { if (!disposed) setWarning("Base map unavailable. Check your connection; issue coordinates and the list remain available."); });
      tiles.on("load", () => { if (!disposed) setWarning(""); });
      const points: [number, number][] = [];
      for (const issue of visible) {
        if (!Number.isFinite(issue.latitude) || !Number.isFinite(issue.longitude)) continue;
        const point: [number, number] = [issue.latitude, issue.longitude]; points.push(point);
        const popup = document.createElement("div"), title = document.createElement("strong"), detail = document.createElement("p"), link = document.createElement("a");
        title.textContent = issue.title; detail.textContent = `${issue.status.replaceAll("_", " ")} · priority ${issue.priority} · ${issue.demo_source}`;
        link.textContent = "Open issue →"; link.href = `/dashboard/issues/${issue.id}`; popup.append(title, detail, link);
        L.circleMarker(point, { radius: 8, weight: 2, color: issue.status === "verified" ? "#317b49" : issue.classification === "normal" ? "#244b6e" : "#b85724", fillOpacity: .8 }).addTo(map).bindPopup(popup);
      }
      if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 16 });
    }).catch(() => { if (!disposed) setWarning("Map could not load. Use the issue list below."); });
    return () => { disposed = true; map?.remove(); };
  }, [visible]);
  return <section><div className="map-filters"><label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="verified">Verified</option><option value="manual_review">Manual review</option></select></label><label>Source<select value={source} onChange={e => setSource(e.target.value)}><option value="all">All sources</option><option value="live">Live</option><option value="imported">Imported</option><option value="synthetic">Synthetic</option></select></label></div>
    <p>{visible.length} visible issues · Blue: normal · Orange: recurring/systemic · Green: verified</p>{warning && <p role="status">{warning}</p>}<div ref={host} className="issue-map" aria-label="Issue location map"/>
    {!visible.length && <p>No matching issues. Create reports or import the labelled demo dataset to add markers. The empty map starts at Ranchi as a demonstration reference.</p>}
    <div className="table-scroll"><table className="data-table"><thead><tr><th>Issue</th><th>Location</th><th>Status</th><th>Priority</th><th>Source</th></tr></thead><tbody>{visible.map(issue => <tr key={issue.id}><td><Link href={`/dashboard/issues/${issue.id}`}>{issue.title}</Link></td><td>{issue.location_label}<br/><small>{issue.latitude}, {issue.longitude}</small></td><td>{issue.status.replaceAll("_", " ")}</td><td>{issue.priority}</td><td>{issue.demo_source}</td></tr>)}</tbody></table></div>
  </section>;
}
