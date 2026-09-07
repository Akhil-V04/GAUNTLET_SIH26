import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAnalytics } from "../src/lib/analytics.ts";

const issues = [
  { id: "1", category: "roads", status: "open", classification: "normal", demo_source: "live", created_at: "2026-01-01", priority: 40 },
  { id: "2", category: "roads", status: "verified", classification: "recurring", demo_source: "synthetic", created_at: "2026-01-02", priority: 65 },
  { id: "3", category: "water", status: "rework_required", classification: "systemic", demo_source: "imported", created_at: "2026-01-03", priority: 80 },
];
const reports = [{ issue_id: "1", demo_source: "live" }, { issue_id: "2", demo_source: "synthetic" }];
const resolutions = [{ outcome: "accepted" }, { outcome: "rejected" }];
const labels = { roads: "Roads & footpaths", water: "Drinking water" };

test("analytics use stored rows and preserve provenance", () => {
  const result = buildAnalytics("officer", issues, reports, resolutions, labels);
  assert.deepEqual(result.totals, { issues: 3, reports: 2, active: 2, verified: 1, recurring: 2, rejectedAttempts: 1 });
  assert.deepEqual(result.provenance, { live: 1, imported: 1, synthetic: 1 });
  assert.deepEqual(result.categories.map(item => [item.id, item.count]), [["roads", 2], ["water", 1]]);
  assert.equal(result.categories[0].percentage, 100);
  assert.equal(result.categories[1].percentage, 50);
});

test("empty analytics stay honest", () => {
  const result = buildAnalytics("citizen", [], [], [], labels);
  assert.equal(result.totals.issues, 0);
  assert.deepEqual(result.categories, []);
  assert.equal(result.forecast.status, "insufficient_history");
  assert.match(result.forecast.message, /More verified issue history/);
});

test("forecast remains disabled even with a larger fixture", () => {
  const larger = Array.from({ length: 30 }, (_, index) => ({ ...issues[1], id: String(index) }));
  const result = buildAnalytics("officer", larger, [], [], labels);
  assert.match(result.forecast.message, /remains disabled/);
});
