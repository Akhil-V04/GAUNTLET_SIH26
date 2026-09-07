import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DatasetImport } from "@/components/dataset-import";
export default async function ImportPage() {
  const db = await createClient(); const { data: { user } } = await db.auth.getUser(); if (!user) redirect("/login");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single(); if (profile?.role !== "officer") redirect("/dashboard");
  return <main className="dashboard-shell issue-detail-shell"><header className="dashboard-header"><Link className="brand" href="/dashboard">gauntlet.</Link><Link className="button-secondary" href="/dashboard">← Dashboard</Link></header><section className="history-heading"><p className="eyebrow">DATASET IMPORT</p><h1>Bring in issue history.</h1><p>One row represents one source issue occurrence. Include coordinates for the map and recorded closure details for recurrence history.</p></section><section className="dashboard-panel"><p><a className="text-link" href="/datasets/ranchi-synthetic.csv" download>Download synthetic demo CSV</a> · <a className="text-link" href="/datasets/import-template.csv" download>Download empty CSV template</a></p><p>Use only datasets you have permission to reuse. Remove names, phone numbers and exact home addresses before uploading. External schemas must be mapped to the template columns.</p><DatasetImport/></section></main>;
}
