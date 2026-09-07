import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { categories } from "@/lib/categories";
import { buildAnalytics, type Analytics, type AnalyticsIssue, type AnalyticsResolution } from "@/lib/analytics";

export type DashboardIssue = AnalyticsIssue & {
  title: string; location_label: string; severity: string; unique_reporters: number;
  prior_verified_occurrences: number;
  latitude: number; longitude: number;
};
export type DashboardReport = {
  id: string; issue_id: string | null; description: string; selected_category: string | null;
  location_label: string; created_at: string; processing_status: string; match_outcome: string | null; demo_source: string;
};
export type TimelineItem = { id: string; issue_id: string; event_type: string; created_at: string; title: string };
export type DashboardData = { analytics: Analytics; issues: DashboardIssue[]; reports: DashboardReport[]; timeline: TimelineItem[] };

const issueFields = "id,title,category,status,classification,demo_source,created_at,priority,location_label,severity,unique_reporters,prior_verified_occurrences,latitude,longitude";
const reportFields = "id,issue_id,description,selected_category,location_label,created_at,processing_status,match_outcome,demo_source";
const labels = Object.fromEntries(categories.map(category => [category.id, category.label]));

export async function loadDashboardData(db: SupabaseClient<Database>, role: Analytics["scope"], userId: string): Promise<DashboardData> {
  let reports: DashboardReport[] = [];
  let issues: DashboardIssue[] = [];
  let resolutions: AnalyticsResolution[] = [];
  let issueIds: string[] = [];

  if (role === "citizen") {
    const { data, error } = await db.from("reports").select(reportFields).eq("reporter_id", userId).order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error("Citizen reports could not be loaded.");
    reports = (data ?? []) as DashboardReport[];
    issueIds = [...new Set(reports.flatMap(report => report.issue_id ? [report.issue_id] : []))];
  } else if (role === "solver") {
    const { data, error } = await db.from("assignments").select("issue_id").in("status", ["assigned", "acknowledged", "completed"]).limit(500);
    if (error) throw new Error("Assignments could not be loaded.");
    issueIds = [...new Set((data ?? []).map(item => item.issue_id))];
  }

  if (role === "officer") {
    const [issueResult, reportResult, resolutionResult] = await Promise.all([
      db.from("issues").select(issueFields).order("priority", { ascending: false }).order("created_at", { ascending: true }).limit(1000),
      db.from("reports").select(reportFields).order("created_at", { ascending: false }).limit(2000),
      db.from("resolution_attempts").select("outcome").limit(2000),
    ]);
    if (issueResult.error || reportResult.error || resolutionResult.error) throw new Error("Officer analytics could not be loaded.");
    issues = (issueResult.data ?? []) as DashboardIssue[];
    reports = (reportResult.data ?? []) as DashboardReport[];
    resolutions = (resolutionResult.data ?? []) as AnalyticsResolution[];
  } else if (issueIds.length) {
    const [issueResult, resolutionResult, solverReports] = await Promise.all([
      db.from("issues").select(issueFields).in("id", issueIds).order("created_at", { ascending: false }),
      db.from("resolution_attempts").select("outcome").in("issue_id", issueIds),
      role === "solver" ? db.from("reports").select(reportFields).in("issue_id", issueIds).order("created_at", { ascending: false }).limit(1000) : Promise.resolve({ data: null, error: null }),
    ]);
    if (issueResult.error || solverReports.error) throw new Error("Issue status could not be loaded.");
    issues = (issueResult.data ?? []) as DashboardIssue[];
    resolutions = (resolutionResult.data ?? []) as AnalyticsResolution[];
    if (role === "solver") reports = (solverReports.data ?? []) as DashboardReport[];
  }

  let timeline: TimelineItem[] = [];
  if (issueIds.length || role === "officer") {
    let query = db.from("issue_events").select("id,issue_id,event_type,created_at").order("created_at", { ascending: false }).limit(12);
    if (role !== "officer") query = query.in("issue_id", issueIds);
    const { data } = await query;
    const titleById = new Map(issues.map(issue => [issue.id, issue.title]));
    timeline = (data ?? []).map(item => ({ ...item, title: titleById.get(item.issue_id) ?? "Issue update" }));
  }

  return {
    analytics: buildAnalytics(role, issues, reports, resolutions, labels),
    issues,
    reports,
    timeline,
  };
}
