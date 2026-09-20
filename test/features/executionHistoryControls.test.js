const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.resolve(__dirname, "../../dist/extension/legacy.js"), "utf8");
const start = source.indexOf("async clearOperationHistoryFromUi(message) {");
const end = source.indexOf("async downloadDebugBundle() {", start);
assert.ok(start >= 0 && end > start);

function methods(answer, saved = {}) {
  let stored = saved;
  const context = {
    keys: { executionHistoryCutoffs: "cutoffs" },
    workspaceRoot: () => "D:/project",
    stringField: (message, key) => String(message[key] || ""),
    normalizePlanSelectionKey: (value) => String(value).replaceAll("\\", "/"),
    operationResultPlanFile: (row) => row.planFile,
    errorMessage: (error) => String(error.message || error),
    vscode: { window: {
      showWarningMessage: async () => answer,
      showInformationMessage: () => undefined,
      showErrorMessage: () => undefined,
    } },
  };
  vm.createContext(context);
  const code = source.slice(start, end).replace("    async stopAllPlansFromUi()", "    , async stopAllPlansFromUi()");
  vm.runInContext(`this.methods = ({ ${code} });`, context);
  return {
    context,
    provider: {
      context: { workspaceState: {
        get: () => stored,
        update: async (_key, value) => { stored = value; },
      } },
      postState: () => undefined,
    },
    getStored: () => stored,
  };
}

test("clearing one Plan persists only that Plan cutoff", async () => {
  const fixture = methods("清除历史");
  await fixture.context.methods.clearOperationHistoryFromUi.call(fixture.provider, { planFile: "plans\\bus.yaml" });
  assert.ok(Date.parse(fixture.getStored()["plans/bus.yaml"]) > 0);
  assert.equal(fixture.getStored().all, undefined);
});

test("stop all routes each active Plan through the manual stop path", async () => {
  const fixture = methods("中止所有 Plan");
  const routed = [];
  fixture.provider.longRunningPlanRunOperations = () => [
    { operationId: "run-a", planFile: "plans/a.yaml", workerId: "nwpu3" },
    { operationId: "run-b", planFile: "plans/b.yaml", workerId: "nwpu3" },
  ];
  fixture.provider.runOperationWorkerId = (row) => row.workerId;
  fixture.provider.stopExperimentRouted = async (body) => { routed.push(body); };
  await fixture.context.methods.stopAllPlansFromUi.call(fixture.provider);
  assert.equal(routed.length, 2);
  assert.deepEqual(routed.map((row) => row.operationId), ["run-a", "run-b"]);
  assert.ok(routed.every((row) => row.manualStopType === "scheduler_aborted"));
});
