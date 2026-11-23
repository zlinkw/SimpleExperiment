const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const ast = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.ES2022, true);
const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === "RealtimeTunnelPanelProvider");
const wanted = ["withUiCommandStatus", "handleMessageCore", "downloadDebugBundle"];
const code = cls.members.filter(n => wanted.includes(n.name?.getText(ast))).map(n => n.getText(ast)).join("\n");
class Cancelled extends Error {}
let picked, transferError, copyError, copies = 0;
const vscode = { Uri: { file: fsPath => ({ fsPath }) }, window: { showSaveDialog: async () => picked,
  showQuickPick: async () => ({ workerId: "worker" }), showErrorMessage: async () => undefined, showInformationMessage: async () => undefined } };
const context = { path, process, vscode, UiCommandCancelled: Cancelled, isUiCommandCancelled: e => e instanceof Cancelled,
  PLAN_SUBMISSION_COMMANDS: new Set(), localCommandReleasesAfterTrigger: () => false, getSafeCommand: m => m.command, booleanField: () => false,
  isUiCommandRemotePending: () => false, errorMessage: e => e.message, userFacingFileError: e => e.message,
  actionErrorSuggestion: () => "", hostOperationLeaseActionLabel: c => c, compactSensitiveText: x => x,
  OperationOutcome_1: { operationOutcomeFor: () => ({}) }, workspaceRoot: () => "C:/synthetic", findDebugBundlePath: () => undefined,
  uniqueStrings: x => [...new Set(x)], safeWorkspaceChildPath: (_root, relative) => relative, pluginCopyIncomingRelative: x => x + ".incoming",
  withPluginCopySlotLock: async (_slot, work) => work({}), admitPluginCopySlot: async () => {}, publishPluginCopySlot: async () => {},
  RESULT_ARTIFACT_MAX_BYTES: 1, fs: { mkdir: async () => {}, copyFile: async () => { if (copyError) throw Error("copy failed"); copies++; } } };
const retired = ast.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === "RETIRED_DRAFT_COMMANDS")).getText(ast);
const Host = vm.runInNewContext(ts.transpileModule(`${retired}\nclass Host {${code}}; Host`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
function fixture() {
  const h = new Host(), statuses = [];
  Object.assign(h, { projectContextGeneration: 1, captureProjectContext: () => ({ root: "C:/synthetic" }), projectContextIsCurrent: () => true, client: {}, panelLifecycleState: "ready", localOperations: {},
    extensionRuntimeVersionState: () => ({ reloadRequired: false }), beginSimpleSftpCapabilityLaunch() {},
    postUiCommandStatus: (_id, status) => statuses.push(status), finishPlanSubmissionProgress() {}, recordActionError() {}, postState() {},
    workerCodeSyncTargets: () => [{ id: "worker" }], mappedDownloadServerForSource: () => ({}),
    simpleSftpApiCall: async () => { if (transferError) throw Error("download failed"); return { fileCount: 1 }; } });
  return { h, statuses };
}
async function run(h) { await h.withUiCommandStatus("id", "downloadDebugBundle", {}, () => h.handleMessageCore({ command: "downloadDebugBundle" }, "downloadDebugBundle")); }

test("missing bundle, cancelled save, failed transfer and failed copy have accurate status", async () => {
  picked = { fsPath: "C:/synthetic/export.zip" }; transferError = false; copyError = false; copies = 0;
  let f = fixture(); await run(f.h); assert.deepEqual(f.statuses, ["running", "failed"]);
  f = fixture(); f.h.debugBundlePath = "debug/bundle.zip"; picked = undefined;
  await run(f.h); assert.deepEqual(f.statuses, ["running", "cancelled"]);
  picked = { fsPath: "C:/synthetic/export.zip" }; f = fixture(); f.h.debugBundlePath = "debug/bundle.zip"; transferError = true;
  await run(f.h); assert.deepEqual(f.statuses, ["running", "failed"]); assert.equal(copies, 0);
  transferError = false; copyError = true; f = fixture(); f.h.debugBundlePath = "debug/bundle.zip";
  await run(f.h); assert.deepEqual(f.statuses, ["running", "failed"]); assert.equal(copies, 0);
  copyError = false; f = fixture(); f.h.debugBundlePath = "debug/bundle.zip";
  await run(f.h); assert.deepEqual(f.statuses, ["running", "completed"]); assert.equal(copies, 1);
});
