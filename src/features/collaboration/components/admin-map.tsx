"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";

export interface DemoProblem {
  title: string;
  summary: string;
  affected_group: string;
  domain: string;
  approximate_location: string;
  latitude: number;
  longitude: number;
  severity: string;
  category: string;
  relevant_organization: string;
}

interface AdminMapProps {
  problems: DemoProblem[];
}

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case "critical":
      return "#c0392b";
    case "high":
      return "#e67e22";
    case "medium":
      return "#2980b9";
    case "low":
      return "#27ae60";
    default:
      return "#64716a";
  }
};

const LeafletMap = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { MapContainer, TileLayer, CircleMarker, Popup, useMap } = mod;

      const BoundsComponent = ({ problems }: { problems: DemoProblem[] }) => {
        const map = useMap();
        useEffect(() => {
          if (problems.length > 0) {
            import("leaflet").then((L) => {
              const bounds = L.latLngBounds(problems.map((p) => [p.latitude, p.longitude]));
              map.fitBounds(bounds, { padding: [50, 50] });
            });
          }
        }, [map, problems]);
        return null;
      };

      return function Map({ problems }: { problems: DemoProblem[] }) {
        return (
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            scrollWheelZoom={true}
            style={{ height: "500px", width: "100%", borderRadius: "8px", zIndex: 1 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <BoundsComponent problems={problems} />
            {problems.map((problem, idx) => (
              <CircleMarker
                key={idx}
                center={[problem.latitude, problem.longitude]}
                radius={10}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: getSeverityColor(problem.severity),
                  fillOpacity: 0.85,
                }}
              >
                <Popup>
                  <div style={{ padding: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>{problem.title}</h4>
                    </div>
                    <span
                        style={{
                            display: "inline-block",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: getSeverityColor(problem.severity),
                            color: "white",
                            fontSize: "12px",
                            marginBottom: "8px",
                            textTransform: "capitalize"
                        }}
                    >
                        {problem.severity}
                    </span>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Domain:</strong> {problem.domain}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Location:</strong> {problem.approximate_location}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#64716a" }}>
                      {problem.summary.length > 100 ? `${problem.summary.substring(0, 100)}...` : problem.summary}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        );
      };
    }),
  { 
    ssr: false, 
    loading: () => (
      <div style={{ height: "500px", width: "100%", backgroundColor: "#e9ecef", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
        Loading map...
      </div>
    ) 
  }
);

export function AdminMap({ problems }: AdminMapProps) {
  const [category, setCategory] = useState<string>("All");
  const [severity, setSeverity] = useState<string>("All");

  const categories = useMemo(() => {
    const cats = new Set(problems.map((p) => p.category));
    return ["All", ...Array.from(cats)].sort();
  }, [problems]);

  const severities = useMemo(() => {
    const sevs = new Set(problems.map((p) => p.severity));
    return ["All", ...Array.from(sevs)].sort();
  }, [problems]);

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      const matchCat = category === "All" || p.category === category;
      const matchSev = severity === "All" || p.severity === severity;
      return matchCat && matchSev;
    });
  }, [problems, category, severity]);

  return (
    <div className="admin-map-container" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="map-filters" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "14px", fontWeight: "bold", color: "var(--foreground)" }}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd6c7",
              backgroundColor: "white",
              fontSize: "14px",
              minWidth: "180px",
              color: "var(--foreground)"
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "14px", fontWeight: "bold", color: "var(--foreground)" }}>Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd6c7",
              backgroundColor: "white",
              fontSize: "14px",
              minWidth: "180px",
              color: "var(--foreground)"
            }}
          >
            {severities.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="issue-map" style={{ position: "relative", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
        <LeafletMap problems={filteredProblems} />
        
        <div 
          className="map-legend" 
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            backgroundColor: "white",
            padding: "12px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          <h5 style={{ margin: 0, fontSize: "14px" }}>Severity</h5>
          {["critical", "high", "medium", "low"].map((sev) => (
            <div key={sev} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div 
                style={{ 
                  width: "14px", 
                  height: "14px", 
                  borderRadius: "50%", 
                  backgroundColor: getSeverityColor(sev),
                  border: "2px solid white",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.2)"
                }} 
              />
              <span style={{ fontSize: "13px", textTransform: "capitalize" }}>{sev}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="table-scroll" style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--line)" }}>
              <th style={{ padding: "12px", color: "var(--muted)", fontWeight: "bold" }}>Problem</th>
              <th style={{ padding: "12px", color: "var(--muted)", fontWeight: "bold" }}>Location</th>
              <th style={{ padding: "12px", color: "var(--muted)", fontWeight: "bold" }}>Severity</th>
              <th style={{ padding: "12px", color: "var(--muted)", fontWeight: "bold" }}>Domain</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                  No problems found matching filters.
                </td>
              </tr>
            ) : (
              filteredProblems.map((problem, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "12px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {problem.title}
                  </td>
                  <td style={{ padding: "12px" }}>{problem.approximate_location}</td>
                  <td style={{ padding: "12px" }}>
                    <span 
                      style={{ 
                        display: "inline-block",
                        padding: "4px 8px", 
                        borderRadius: "12px", 
                        backgroundColor: `${getSeverityColor(problem.severity)}15`,
                        color: getSeverityColor(problem.severity),
                        fontWeight: "bold",
                        textTransform: "capitalize",
                        fontSize: "12px",
                        lineHeight: "1"
                      }}
                    >
                      {problem.severity}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>{problem.domain}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
