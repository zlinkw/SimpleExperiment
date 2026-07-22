const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("extension compacts experiment trace payload for all-day webview runs", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const buildState = source.match(/private buildState\(\): WebviewClusterState[\s\S]*?return \{/)?.[0] || "";
  const compact = source.match(/function compactExperimentTraces[\s\S]*?const schedulerBucketKeys/)?.[0] || "";

  assert.match(source, /const EXPERIMENT_TRACE_RECORD_LIMIT = 240/);
  assert.match(source, /const EXPERIMENT_TRACE_ATTENTION_LIMIT = 120/);
  assert.match(buildState, /const experimentTraces = compactExperimentTraces\(/);
  assert.match(buildState, /this\.traceProtectedKeys\(\)/);
  assert.match(compact, /experimentTraceMatchesProtectedKey/);
  assert.match(compact, /experimentTraceNeedsAttention/);
  assert.match(compact, /sortExperimentTraces\(input\)\.forEach\(add\)/);
  assert.match(source, /experimentTracePayloadBudget: EXPERIMENT_TRACE_RECORD_LIMIT/);
});

test("target mode plan records experiment trace payload budget", () => {
  const plan = fs.readFileSync(path.join(root, "docs", "target-mode-plan.md"), "utf8");
  assert.match(plan, /长时间 Webview payload 预算/);
  assert.match(plan, /`experimentTraces`/);
});
