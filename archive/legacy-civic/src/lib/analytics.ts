import type { CategoryId } from "@/lib/categories";

export type AnalyticsIssue = {
  id: string; category: string; status: string; classification: string;
  demo_source: string; created_at: string; priority: number;
};
export type AnalyticsReport = { issue_id: string | null; demo_source: string };
export type AnalyticsResolution = { outcome: string };

export type Analytics = {
  scope: "citizen" | "officer" | "solver";
  generatedAt: string;
  totals: {
    issues: number; reports: number; active: number; verified: number;
    recurring: number; rejectedAttempts: number;
  };
  provenance: { live: number; imported: number; synthetic: number };
  categories: { id: string; label: string; count: number; percentage: number }[];
  forecast: { status: "insufficient_history"; message: string };
};

const activeStatuses = new Set(["open", "review_pending", "assigned", "in_progress", "awaiting_verification", "rework_required", "escalation_review", "escalated", "manual_review"]);

export function buildAnalytics(
  scope: Analytics["scope"],
  issues: AnalyticsIssue[],
  reports: AnalyticsReport[],
  resolutions: AnalyticsResolution[],
  categoryLabels: Record<string, string>,
): Analytics {
  const categoryCounts = new Map<string, number>();
  const provenance = { live: 0, imported: 0, synthetic: 0 };
  for (const issue of issues) {
    categoryCounts.set(issue.category, (categoryCounts.get(issue.category) ?? 0) + 1);
    if (issue.demo_source in provenance) provenance[issue.demo_source as keyof typeof provenance]++;
  }
  const maximum = Math.max(1, ...categoryCounts.values());
  return {
    scope,
    generatedAt: new Date().toISOString(),
    totals: {
      issues: issues.length,
      reports: reports.length,
      active: issues.filter(issue => activeStatuses.has(issue.status)).length,
      verified: issues.filter(issue => issue.status === "verified").length,
      recurring: issues.filter(issue => issue.classification === "recurring" || issue.classification === "systemic").length,
      rejectedAttempts: resolutions.filter(item => item.outcome === "rejected").length,
    },
    provenance,
    categories: [...categoryCounts].map(([id, count]) => ({
      id: id as CategoryId,
      label: categoryLabels[id] ?? id.replaceAll("_", " "),
      count,
      percentage: Math.round((count / maximum) * 100),
    })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    forecast: {
      status: "insufficient_history",
      message: issues.length < 30 || issues.filter(issue => issue.status === "verified").length < 10
        ? "More verified issue history is needed before forecasting would be meaningful."
        : "Forecasting remains disabled in this MVP until a reviewed time-series model is available.",
    },
  };
}
