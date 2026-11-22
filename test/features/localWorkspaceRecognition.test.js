const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const text = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const ast = ts.createSourceFile("legacy.ts", text, ts.ScriptTarget.ES2022, true);
const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === "RealtimeTunnelPanelProvider");
const code = cls.members.find(n => n.name?.getText(ast) === "bootstrapProjectFromUi").getText(ast);
class Cancelled extends Error {}
let choice = "继续", root = "C:/synthetic", single = true;
const vscode = { window: { showInformationMessage: async () => choice } };
const Host = vm.runInNewContext(ts.transpileModule(`class Host {${code}}; Host`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
  { vscode, UiCommandCancelled: Cancelled, projectOnboardingRoot: () => single ? root : undefined,
    assertSingleProjectWorkspace: () => { if (!single) throw Error("multiple roots"); }, samePlanSelection: (a, b) => a === b });

function host() {
  const events = [], h = new Host();
  Object.assign(h, { localPlanMetadata: { plans: [{ planFile: "p.yaml", planId: "p", jobCount: 0 }] },
    captureProjectContext: () => ({ root }), projectContextIsCurrent: () => true,
    refreshLocalPlanMetadata: async () => {}, pickProjectBootstrapPlan: async plans => plans[0],
    persistProjectPlanSelectionState: async () => { events.push("save"); }, markProjectOnboardingComplete: async () => { events.push("recognized"); },
    refreshExperimentTracesProjectionForCurrentInterest() {}, postState: () => events.push("render"),
    queueSelectedPlanResultParse() {}, openPanelAt: async () => events.push("navigation"),
    openWorkspaceFolderForContinuation: async () => events.push("choose workspace") });
  return { h, events };
}

test("local recognition persists and renders an empty-job Plan without a Worker", async () => {
  root = "C:/synthetic"; single = true; choice = "继续";
  const { h, events } = host();
  await h.bootstrapProjectFromUi();
  assert.deepEqual(events, ["save", "recognized", "render"]);
});

test("cancellation, missing selection, read and save errors never mark recognition", async () => {
  root = "C:/synthetic"; single = true;
  for (const scenario of ["cancel", "selection", "read", "save", "multiple", "missing"]) {
    choice = scenario === "cancel" ? undefined : "继续"; single = scenario !== "multiple";
    const { h, events } = host();
    if (scenario === "selection") h.pickProjectBootstrapPlan = async () => undefined;
    if (scenario === "read") h.refreshLocalPlanMetadata = async () => { throw Error("read failed"); };
    if (scenario === "save") h.persistProjectPlanSelectionState = async () => { throw Error("save failed"); };
    if (scenario === "missing") root = undefined;
    if (scenario === "missing") await h.bootstrapProjectFromUi();
    else await assert.rejects(h.bootstrapProjectFromUi());
    assert.equal(events.includes("recognized"), false, scenario);
    root = "C:/synthetic";
  }
});
