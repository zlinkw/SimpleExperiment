const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
const plan = fs.readFileSync(path.join(__dirname, "../../docs/target-mode-plan.md"), "utf8");
const bridge = fs.readFileSync(path.join(__dirname, "../../src/PptPlotBridge.ts"), "utf8");

function loadHelpers() {
  const start = source.indexOf("const PROJECT_PPT_PATH_CONFIRMATIONS_PATH");
  const end = source.indexOf("const PROJECT_UI_LAYOUT_PATH", start);
  assert.ok(start > 0 && end > start, "PPT path confirmation helpers missing");
  const sandbox = {
    fs: {
      readFile: fs.promises.readFile,
      writeFile: fs.promises.writeFile,
      mkdir: fs.promises.mkdir,
      unlink: fs.promises.unlink,
    },
    path,
    process,
    uniqueStrings(values) { return [...new Set(values.filter(Boolean))]; },
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start, end) + "\nthis.api = { PROJECT_PPT_PATH_CONFIRMATIONS_PATH, PPT_PLOT_REQUEST_AUDIT_DIR, normalizePptPathConfirmationTarget, mergePptPathConfirmations, pptPathTargetConfirmed, pptPlotConfirmationDetail, pptPlotAuditRelativePath, readProjectPptPathConfirmationsState, writeProjectPptPathConfirmationsState };", sandbox);
  return sandbox.api;
}

test("PPT target confirmations are project-local, path-specific, and resettable", async () => {
  const helpers = loadHelpers();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-ppt-confirm-"));
  const first = helpers.normalizePptPathConfirmationTarget("slides/results.pptx", root);
  const same = helpers.normalizePptPathConfirmationTarget("slides/results.pptx", root);
  const changed = helpers.normalizePptPathConfirmationTarget("slides/other.pptx", root);
  assert.equal(helpers.PROJECT_PPT_PATH_CONFIRMATIONS_PATH, "zlk_cluster/ui/ppt_path_confirmations.json");
  assert.equal(helpers.PPT_PLOT_REQUEST_AUDIT_DIR, "zlk_cluster/results/ppt_plot_requests");
  assert.equal(first.key, same.key);
  assert.notEqual(first.key, changed.key);
  assert.equal(helpers.pptPathTargetConfirmed([first], same), true);
  assert.equal(helpers.pptPathTargetConfirmed([first], changed), false);

  await helpers.writeProjectPptPathConfirmationsState(root, [{ ...first, confirmedAt: "2026-07-19T00:00:00.000Z" }]);
  const file = path.join(root, "zlk_cluster", "ui", "ppt_path_confirmations.json");
  assert.equal(fs.existsSync(file), true);
  const loaded = await helpers.readProjectPptPathConfirmationsState(root);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].key, first.key);
  await helpers.writeProjectPptPathConfirmationsState(root, []);
  assert.equal(fs.existsSync(file), false);
});

test("PPT confirmation shows plan revision, final sources, contract, and target", () => {
  const helpers = loadHelpers();
  const detail = helpers.pptPlotConfirmationDetail({
    projectRoot: "D:/projects/demo",
    planFile: "experiments/plans/smoke.yaml",
    planRevision: "rev-7",
    sourcePaths: ["zlk_cluster/results/by_plan/smoke/statistics.json"],
    plottingContractPath: "zlk_cluster/results/by_plan/smoke/plotting_contract.json",
    chartType: "meanStdErrorBar",
    styleMode: "activePpt",
  }, helpers.normalizePptPathConfirmationTarget("D:/slides/results.pptx", "D:/projects/demo"));
  assert.match(detail, /【强制确认】绘图到 PPT/);
  assert.match(detail, /当前 Plan：experiments\/plans\/smoke\.yaml/);
  assert.match(detail, /Plan revision：rev-7/);
  assert.match(detail, /zlk_cluster\/results\/by_plan\/smoke\/statistics\.json/);
  assert.match(detail, /PPT 绘图契约：zlk_cluster\/results\/by_plan\/smoke\/plotting_contract\.json/);
  assert.match(detail, /目标 PPT：/);
  assert.match(detail, /本地请求审计目录：.*zlk_cluster[\\/]results[\\/]ppt_plot_requests/);
  assert.match(detail, /执行绘图请求时会在上述目录写入轻量 JSON 请求和响应审计/);
  assert.match(detail, /取消不会创建请求审计或调用 PPT 插件/);
  assert.match(detail, /误差图/);
  assert.match(bridge, /safeProjectPath\(projectRoot, "zlk_cluster\/results\/ppt_plot_requests"\)/);
});

test("PPT success audit paths stay inside the current project", () => {
  const helpers = loadHelpers();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-ppt-audit-"));
  const request = path.join(root, "zlk_cluster", "results", "ppt_plot_requests", "ppt-1.json");
  assert.equal(helpers.pptPlotAuditRelativePath(root, request), "zlk_cluster/results/ppt_plot_requests/ppt-1.json");
  assert.throws(() => helpers.pptPlotAuditRelativePath(root, path.join(root, "..", "outside.json")), /不在当前项目内/);
});

test("plotting confirmation precedes PPT automation and keeps Debug blocked", () => {
  const handler = source.slice(source.indexOf("async confirmPptPlotTarget"), source.indexOf("async saveProjectAdapterRulesFromUi"));
  assert.ok(handler.indexOf("confirmPptPlotTarget(input)") < handler.indexOf("new PptPlotBridge_1.PptPlotBridge().plot(input)"));
  assert.match(handler, /if \(target\.presentationPath\)\s*input\.presentationPath = target\.presentationPath/);
  assert.match(handler, /未调用 PPT 插件，也未写入绘图请求审计/);
  assert.match(handler, /打开请求审计/);
  assert.match(handler, /打开响应审计/);
  assert.match(handler, /pptPlotAuditRelativePath\(root, result\.requestPath\)/);
  assert.match(handler, /pptPlotAuditRelativePath\(root, result\.responsePath\)/);
  assert.match(handler, /openWorkspaceFile\(auditPath\)/);
  assert.match(source, /pptPathConfirmations: \{\s*count: this\.confirmedPptPaths\.length/);
  assert.match(source, /case "resetPptPathConfirmations":\s*await this\.resetPptPathConfirmationsFromUi\(\)/);
  assert.match(panel, /data-command="resetPptPathConfirmations"/);
  assert.match(panel, /section === "servers" \|\| section === "settings"[\s\S]*data\.remotePathConfirmations[\s\S]*data\.pptPathConfirmations/);
  assert.match(panel, /function debugModeBlockedUiCommand\(command\)[\s\S]*plotResultsToPpt/);
  assert.match(plan, /PPT 绘图目标确认/);
  assert.match(plan, /不迁移、删除或重写旧任务和结果/);
});
