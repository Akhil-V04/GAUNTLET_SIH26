import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import * as core from "../src/lib/history-core.ts";

const require = createRequire(import.meta.url);
function loadTypescript(path, dependencies = {}, environment = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, process: { env: environment }, require: id => id === "server-only" ? {} : dependencies[id] ?? require(id) });
  return exports;
}
const snapshot = {
  sources: [{
    relationship: "current", similarity: null,
    issue: { id: "current", title: "<script>alert(1)</script>", location_label: "Ranchi", category: "drainage", status: "open", classification: "normal", severity: "medium", priority: 20, unique_reporters: 0, prior_verified_occurrences: 0, failed_attempts: 0, created_at: "2026-01-01T00:00:00Z", verified_at: null, demo_source: "synthetic", embedding_model: "local-hash-v1" },
    report_count: 0, reports: [], resolution_count: 0, resolutions: [], evidence_count: 0, evidence: [], events: [], department: null, assignments: [],
  }], limits: { linked: 20, analogous: 5, records_per_type: 20 },
};
function generator(env, create) {
  class FakeOpenAI { responses = { create }; }
  return loadTypescript("../src/lib/historical-report.ts", { "./history-core": core, openai: FakeOpenAI }, env);
}

test("no API key saves factual fallback without calling paid API", async () => {
  const { generateHistoricalReport } = generator({}, () => { throw new Error("Must not call API"); });
  const result = await generateHistoricalReport(snapshot);
  assert.equal(result.status, "unavailable");
  assert.equal(result.model, null);
  assert.equal(result.document.summaryMode, "factual");
  assert.match(result.document.unavailableReason, /not configured/);
  assert.equal(result.document.snapshot, snapshot);
});
test("valid AI extracts render only existing source facts", async () => {
  const { generateHistoricalReport } = generator({ OPENAI_API_KEY: "test-only" }, async request => {
    assert.equal(request.store, false);
    assert.ok(request.instructions.includes("untrusted"));
    assert.ok(!request.input.includes("storage_path"));
    return { status: "completed", output_text: JSON.stringify({ fact_ids: ["current", "current-metrics"] }) };
  });
  const result = await generateHistoricalReport(snapshot);
  assert.equal(result.status, "generated");
  assert.equal(result.document.highlights.length, 2);
  assert.equal(result.document.unavailableReason, null);
});
test("invalid citations, refusals and API failure preserve factual history", async () => {
  for (const create of [
    async () => ({ status: "completed", output_text: '{"fact_ids":["invented"]}' }),
    async () => ({ status: "incomplete", output_text: "" }),
    async () => { throw new Error("Quota exhausted"); },
  ]) {
    const result = await generator({ OPENAI_API_KEY: "test-only" }, create).generateHistoricalReport(snapshot);
    assert.equal(result.status, "unavailable");
    assert.equal(result.document.summaryMode, "factual");
    assert.equal(result.document.facts.length, 2);
    assert.match(result.document.unavailableReason, /failed or returned invalid/);
  }
});
test("source fingerprint changes when outcomes change", () => {
  const { historyFingerprint } = generator({}, () => {});
  const changed = structuredClone(snapshot);
  changed.sources[0].issue.failed_attempts = 1;
  assert.notEqual(historyFingerprint(snapshot), historyFingerprint(changed));
  assert.equal(historyFingerprint(snapshot), historyFingerprint(structuredClone(snapshot)));
});
test("history UI escapes source text and resolves citation anchors", async () => {
  const result = await generator({ OPENAI_API_KEY: "test-only" }, async () => ({ status: "completed", output_text: '{"fact_ids":["current"]}' })).generateHistoricalReport(snapshot);
  const { HistoryReportView } = loadTypescript("../src/components/history-report-view.tsx");
  const html = renderToStaticMarkup(createElement(HistoryReportView, { document: result.document }));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes('href="#issue-current"'));
  assert.ok(html.includes('id="issue-current"'));
  assert.ok(html.includes("No linked previous incidents found."));
});
