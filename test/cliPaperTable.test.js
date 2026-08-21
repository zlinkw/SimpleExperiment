const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

function record(method, final = false) {
  return {
    schemaVersion: 1,
    resultId: method,
    experimentId: method,
    runKey: method,
    suite: "classification",
    experimentName: method,
    status: "parsed",
    sourceFiles: [],
    metrics: { AUC: { value: method === "final" ? 0.9 : 0.7 } },
    dimensions: { dataset: "VinDr", method },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    provenance: {},
    eligibleForFinalAnalysis: final,
    finalEvidenceState: final ? "archived" : "pending_review",
  };
}

test("cli results paper-table uses final records only", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-paper-"));
  const draftPath = path.join(dir, "draft.json");
  const summaryPath = path.join(dir, "summary.json");
  fs.writeFileSync(draftPath, JSON.stringify([record("draft", false)], null, 2), "utf8");
  fs.writeFileSync(summaryPath, JSON.stringify({ schemaVersion: 1, finalResults: [record("final", true), record("draft", false)] }, null, 2), "utf8");

  const draft = spawnSync(process.execPath, [path.join(root, "dist", "cli.js"), "results", "paper-table", "--file", draftPath], { encoding: "utf8" });
  const final = spawnSync(process.execPath, [path.join(root, "dist", "cli.js"), "results", "paper-table", "--file", summaryPath], { encoding: "utf8" });
  assert.equal(draft.status, 0, draft.stderr);
  assert.equal(final.status, 0, final.stderr);
  assert.doesNotMatch(draft.stdout, /draft/);
  assert.doesNotMatch(final.stdout, /draft/);
  assert.match(final.stdout, /classification \| VinDr/);
});
