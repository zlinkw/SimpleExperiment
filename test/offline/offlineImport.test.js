const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { importOfflineBundle } = require("../../dist/tunnel/OfflineImport.js");

test("the Windows UI selects either a JSON file or a directory, never both picker modes", async () => {
  const vm = require("node:vm"), ts = require("typescript");
  const legacyMethod = require("../_helpers/legacyMethod"), { readSource } = require("../_helpers/sourceReader");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "offline-picker-"));
  const file = path.join(root, "cluster_snapshot.json");
  await fs.writeFile(file, JSON.stringify({ schemaVersion: 1, schedulerStates: [] }), "utf8");
  for (const kind of ["file", "directory"]) {
    let shown = 0, imported = 0;
    const sandbox = { workspaceRoot: () => root, keys: { offlineBundle: "offline" },
      OfflineImport_1: { importOfflineBundle: async source => { imported++; return importOfflineBundle(source); } },
      vscode: { window: {
        showQuickPick: async choices => choices.find(choice => choice.kind === kind),
        showOpenDialog: async options => {
          shown++;
          assert.equal(options.canSelectFiles, kind === "file");
          assert.equal(options.canSelectFolders, kind === "directory");
          return [{ fsPath: kind === "file" ? file : root }];
        }, showErrorMessage: message => assert.fail(message),
      } } };
    vm.runInNewContext(ts.transpileModule("globalThis.api = {" + legacyMethod(readSource("src/extension/legacy.ts"), "importOffline()") + "};", {
      compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
    const host = { projectContextGeneration: 1, pauseRealtimeStream: async () => undefined,
      refreshExperimentTracesProjectionForCurrentInterest() {}, mergeRecentPlansFromRuntime() {}, applyOfflineResultsSummaryFromBundle() {},
      persistProjectOfflineBundleState: async () => undefined, context: { workspaceState: { update: async () => undefined } }, resetClient() {}, postState() {} };
    await sandbox.api.importOffline.call(host);
    assert.equal(shown, 1); assert.equal(imported, 1); assert.equal(host.offlineBundle.schemaVersion, 1);
  }
});

test("offline import reads json bundle without network", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "simple-offline-"));
  const file = path.join(dir, "bundle.json");
  await fs.writeFile(file, JSON.stringify({ schemaVersion: 1, snapshot: { schedulerStates: [] } }), "utf8");
  const result = await importOfflineBundle(file);
  assert.equal(result.ok, true);
  assert.equal(result.bundle.schemaVersion, 1);
  assert.ok(result.bundle.lastImportedAt);
});

test("offline import reads exported directory", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "simple-offline-dir-"));
  await fs.writeFile(path.join(dir, "cluster_snapshot.json"), JSON.stringify({ schemaVersion: 2, schedulerStates: [{ id: 1 }] }), "utf8");
  await fs.writeFile(path.join(dir, "diagnostics.json"), JSON.stringify({ ok: true }), "utf8");
  const result = await importOfflineBundle(dir);
  assert.equal(result.ok, true);
  assert.equal(result.bundle.schemaVersion, 2);
  assert.deepEqual(result.bundle.diagnostics, { ok: true });
});
