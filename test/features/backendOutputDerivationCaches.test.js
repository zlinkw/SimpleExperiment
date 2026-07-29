const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function extractFunction(name) {
  const start = extension.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = extension.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < extension.length; index += 1) {
    if (extension[index] === "{") depth += 1;
    if (extension[index] === "}") depth -= 1;
    if (depth === 0) return extension.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function loadOutputDerivations() {
  const sandbox = {
    EMPTY_OUTPUT_DERIVATION_VALUES: Object.freeze([]),
    planOutputCandidatesCache: new WeakMap(),
    planOutputEvidenceCandidatesCache: new WeakMap(),
    planOutputEvidenceSignalsCache: new WeakMap(),
    adapterRuleResultCandidatesCache: new WeakMap(),
    uniqueCalls: 0,
    parseCalls: 0,
    arrayFromRecord(record, key) {
      const value = (record || {})[key];
      return Array.isArray(value) ? value : [];
    },
    uniqueStrings(values) {
      sandbox.uniqueCalls += 1;
      const seen = new Set();
      return values.filter((item) => {
        const key = String(item || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    isParseableResultCandidate(value) {
      sandbox.parseCalls += 1;
      const text = String(value || "").trim().replace(/\\/g, "/");
      const lower = (text.split("/").pop() || "").toLowerCase();
      return Boolean(text)
        && !["jobs.csv", "status.json", "artifact_manifest.json"].includes(lower)
        && /\.(csv|json|txt|log|out)$/i.test(text);
    },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("adapterRuleResultCandidates"),
    extractFunction("planOutputCandidates"),
    extractFunction("planOutputEvidenceCandidates"),
    extractFunction("planOutputEvidenceSignals"),
    "this.ruleCandidates = adapterRuleResultCandidates;",
    "this.planCandidates = planOutputCandidates;",
    "this.planEvidence = planOutputEvidenceCandidates;",
    "this.planSignals = planOutputEvidenceSignals;",
  ].join("\n"), sandbox);
  return sandbox;
}

test("backend Plan output derivations reuse one immutable Plan and invalidate on replacement", () => {
  const sandbox = loadOutputDerivations();
  const plan = {
    outputCandidates: ["jobs.csv", "runs/metrics.csv", "RUNS/METRICS.CSV", "runs/stdout.log"],
    outputSignals: ["结果目录: runs", "命令参数: result_csv", "普通说明"],
  };

  const candidates = sandbox.planCandidates(plan);
  const evidence = sandbox.planEvidence(plan);
  const signals = sandbox.planSignals(plan);
  const firstCounts = { unique: sandbox.uniqueCalls, parse: sandbox.parseCalls };

  assert.deepEqual(JSON.parse(JSON.stringify(candidates)), ["jobs.csv", "runs/metrics.csv", "runs/stdout.log"]);
  assert.deepEqual(JSON.parse(JSON.stringify(evidence)), ["runs/metrics.csv", "runs/stdout.log"]);
  assert.deepEqual(JSON.parse(JSON.stringify(signals)), ["结果目录: runs", "命令参数: result_csv"]);
  assert.strictEqual(sandbox.planCandidates(plan), candidates);
  assert.strictEqual(sandbox.planEvidence(plan), evidence);
  assert.strictEqual(sandbox.planSignals(plan), signals);
  assert.deepEqual({ unique: sandbox.uniqueCalls, parse: sandbox.parseCalls }, firstCounts);

  const replacement = { outputCandidates: [...plan.outputCandidates], outputSignals: [...plan.outputSignals] };
  assert.notStrictEqual(sandbox.planCandidates(replacement), candidates);
  assert.notStrictEqual(sandbox.planEvidence(replacement), evidence);
  assert.notStrictEqual(sandbox.planSignals(replacement), signals);
  assert.ok(sandbox.uniqueCalls > firstCounts.unique);
  assert.ok(sandbox.parseCalls > firstCounts.parse);
});

test("backend adapter rule candidates reuse one rules object and preserve metadata exclusion", () => {
  const sandbox = loadOutputDerivations();
  const rules = {
    candidateCsv: ["jobs.csv", "metrics_summary.csv"],
    candidateJson: ["artifact_manifest.json", "metrics.json"],
    consoleLogs: ["stdout.log"],
    textLogs: ["summary.txt"],
  };

  const first = sandbox.ruleCandidates(rules);
  const parseCalls = sandbox.parseCalls;
  assert.deepEqual(JSON.parse(JSON.stringify(first)), ["metrics_summary.csv", "metrics.json", "stdout.log", "summary.txt"]);
  assert.strictEqual(sandbox.ruleCandidates(rules), first);
  assert.equal(sandbox.parseCalls, parseCalls);

  const replacement = Object.fromEntries(Object.entries(rules).map(([key, value]) => [key, [...value]]));
  assert.notStrictEqual(sandbox.ruleCandidates(replacement), first);
  assert.ok(sandbox.parseCalls > parseCalls);
});

test("backend output derivation caches are weak and share empty results for invalid input", () => {
  const sandbox = loadOutputDerivations();
  assert.match(extension, /const planOutputCandidatesCache = new WeakMap\(\)/);
  assert.match(extension, /const planOutputEvidenceCandidatesCache = new WeakMap\(\)/);
  assert.match(extension, /const planOutputEvidenceSignalsCache = new WeakMap\(\)/);
  assert.match(extension, /const adapterRuleResultCandidatesCache = new WeakMap\(\)/);
  assert.strictEqual(sandbox.planCandidates(null), sandbox.EMPTY_OUTPUT_DERIVATION_VALUES);
  assert.strictEqual(sandbox.planEvidence([]), sandbox.EMPTY_OUTPUT_DERIVATION_VALUES);
  assert.strictEqual(sandbox.planSignals(""), sandbox.EMPTY_OUTPUT_DERIVATION_VALUES);
  assert.strictEqual(sandbox.ruleCandidates(null), sandbox.EMPTY_OUTPUT_DERIVATION_VALUES);
});
