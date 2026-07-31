const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = panel.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function trackedBoxes(rows) {
  let iterations = 0;
  return {
    rows: {
      [Symbol.iterator]() {
        iterations += 1;
        return rows[Symbol.iterator]();
      },
    },
    iterations: () => iterations,
  };
}

function loadCollector() {
  const sandbox = {
    cleanSelectionValue(value) {
      const text = String(value || "").trim();
      return text && text !== "-" ? text : "";
    },
    usableTaskKey(value) {
      const text = String(value || "").trim();
      return Boolean(text && text !== "-");
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("selectedTaskBoxFields")}\nthis.collect = selectedTaskBoxFields;`, sandbox);
  return sandbox;
}

test("selected task boxes derive payload fields in one traversal", () => {
  const sandbox = loadCollector();
  const boxes = trackedBoxes([
    { checked: false, dataset: { actionKey: "ignored", taskUiKey: "ignored" } },
    { checked: true, dataset: { actionKey: "run-a", experimentId: "exp-a", archiveKey: "arc-a", workerId: "worker-a", taskUiKey: "ui-a", planFile: "plans/a.yaml", planRevision: "r1", debugMode: "true" } },
    { checked: true, dataset: { runKey: "run-b", experimentId: "exp-b", taskUiKey: "ui-b", planFile: "plans/b.yaml", planRevision: "r2" } },
    { checked: true, dataset: { planFile: "plans/only.yaml", planRevision: "r3", debugMode: "true" } },
  ]);
  const fields = sandbox.collect(boxes.rows);

  assert.equal(boxes.iterations(), 1);
  assert.equal(fields.checkedCount, 3);
  assert.deepEqual(Array.from(fields.runKeys), ["run-a", "run-b", undefined]);
  assert.deepEqual(Array.from(fields.planFiles), ["plans/a.yaml", "plans/b.yaml", "plans/only.yaml"]);
  assert.deepEqual(Array.from(fields.planRevisions), ["r1", "r2", "r3"]);
  assert.deepEqual(Array.from(fields.legacyTaskUiKeys), ["ui-b", undefined]);
  assert.equal(fields.targets.length, 2);
  assert.deepEqual(Array.from(fields.targets, (target) => target.runKey), ["run-a", "run-b"]);
  assert.equal(fields.debugMode, true);
});

test("selected task payload consumes collector output without rescanning boxes", () => {
  const collector = extractFunction("selectedTaskBoxFields");
  const payload = extractFunction("selectedTaskPayload");
  assert.doesNotMatch(collector, /boxes\.(?:map|filter|some)\(/);
  assert.match(payload, /selectedTaskBoxFields\(document\.querySelectorAll/);
  assert.doesNotMatch(payload, /boxes\.(?:map|filter|some)\(/);
  assert.match(payload, /debugMode: fields\.debugMode/);
});

test("selected task state classifies action and legacy keys in one traversal", () => {
  let actionReads = 0;
  const sandbox = {
    asArray(value) { return Array.isArray(value) ? value : []; },
    taskActionKey(row) { actionReads += 1; return row.runKey; },
    usableTaskKey(value) { return Boolean(String(value || "").trim()); },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("selectedTaskActionFields")}\nthis.collect = selectedTaskActionFields;`, sandbox);
  const fields = sandbox.collect([
    { runKey: "run-a", uiKey: "ui-a" },
    { runKey: "", uiKey: "legacy-b" },
    { runKey: "run-c", uiKey: "ui-c" },
  ]);
  assert.equal(actionReads, 3);
  assert.deepEqual(Array.from(fields.runKeys), ["run-a", "", "run-c"]);
  assert.deepEqual(Array.from(fields.legacyUiKeys), ["legacy-b"]);

  const payload = extractFunction("selectedTaskPayloadFromState");
  assert.match(payload, /const taskActionFields = selectedTaskActionFields\(rows\)/);
  assert.doesNotMatch(payload, /rows\.filter\(\(row\) => !usableTaskKey\(taskActionKey\(row\)\)\)/);
});
