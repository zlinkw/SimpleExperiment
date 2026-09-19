const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const panel = readSource("src/ui/PanelHtml.ts");
function extract(startName, endName) {
  const start = panel.indexOf(`function ${startName}(`);
  const end = panel.indexOf(`function ${endName}(`, start + 1);
  assert.ok(start >= 0 && end > start);
  return panel.slice(start, end);
}

test("global stop targets only the active operation for the selected Plan", () => {
  let html = "";
  const sandbox = {
    operationViewModelForState: () => ({ rows: [] }),
    setHtmlIfChanged: (_id, value) => { html = value; },
    escAttr: String,
    esc: String,
  };
  vm.createContext(sandbox);
  vm.runInContext(extract("renderOperationSection", "renderTaskSection").replaceAll("\\\\", "\\") + "\nthis.render = renderOperationSection;", sandbox);
  sandbox.render({
    planFileInput: "experiments/plans/comparison/concatenation.yaml",
    operations: {
      ebmc: { operationId: "ebmc", type: "run-plan", status: "running", planFile: "experiments/plans/comparison/ebmc.yaml" },
      concat: { operationId: "concat", type: "run-plan", status: "running", planFile: "experiments/plans/comparison/concatenation.yaml" },
    },
  });
  assert.match(html, /data-command="stopExperiment" data-operation-id="concat"/);
  assert.doesNotMatch(html, /data-operation-id="ebmc"/);
});

test("running progress TensorBoard button follows GPU card switch state", () => {
  const status = { nwpu3: { running: true } };
  const sandbox = {
    lastState: { topology: { hubAllowed: false }, setup: {} },
    enabledWorkerTunnelsForState: () => [{ id: "nwpu3", name: "NWPU3" }],
    gpuTensorboardStatus: status,
    escAttr: String,
    esc: String,
  };
  vm.createContext(sandbox);
  vm.runInContext(extract("renderTensorBoardLinksForRunning", "renderSchedulerDependencyStatus") + "\nthis.render = renderTensorBoardLinksForRunning;", sandbox);
  assert.match(sandbox.render(), /data-command="stopTensorBoard"[^>]*>NWPU3 · 关闭/);
  status.nwpu3.running = false;
  assert.match(sandbox.render(), /data-command="openTensorBoard"[^>]*>NWPU3 · 开启/);
});
