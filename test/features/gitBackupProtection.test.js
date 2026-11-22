const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, modules) {
  const source = fs.readFileSync(path.join(__dirname, "../..", file), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => modules[name] || require(name), Buffer, process });
  return module.exports;
}

function fakeBackup() {
  let content = "", writes = [];
  const filesystem = { readFileSync() { if (content instanceof Error) throw content; return content; },
    writeFileSync(_path, value) { writes.push(value); content = value; }, mkdirSync() {}, chmodSync() {}, existsSync() { return true; } };
  const backup = load("src/features/GitBackup.ts", { fs: filesystem, child_process: { execFileSync: () => ".git/hooks/post-commit" } });
  return { backup, set: value => { content = value; }, get: () => content, writes };
}

test("unreadable hook cannot be mistaken for a missing hook or overwritten", () => {
  const f = fakeBackup();
  f.set(Object.assign(Error("access denied"), { code: "EACCES" }));
  assert.throws(() => f.backup.installBackupHook("C:/synthetic", "origin"), /access denied/);
  assert.throws(() => f.backup.uninstallBackupHook("C:/synthetic"), /access denied/);
  assert.equal(f.writes.length, 0);
  f.set(Object.assign(Error("missing"), { code: "ENOENT" }));
  assert.equal(f.backup.installBackupHook("C:/synthetic", "origin").changed, true);
  assert.equal(f.writes.length, 1);
});

test("incomplete markers preserve all content; complete markers preserve foreign logic", () => {
  const f = fakeBackup(), begin = f.backup.HOOK_BLOCK_BEGIN, end = f.backup.HOOK_BLOCK_END;
  const broken = `#!/bin/sh\n${begin}\nunknown tail`;
  f.set(broken);
  assert.throws(() => f.backup.installBackupHook("C:/synthetic", "origin"), /标记不完整/);
  assert.throws(() => f.backup.uninstallBackupHook("C:/synthetic"), /标记不完整/);
  assert.equal(f.get(), broken);
  assert.equal(f.writes.length, 0);
  f.set(`#!/bin/sh\necho before\n${begin}\nplugin\n${end}\necho after\n`);
  assert.equal(f.backup.uninstallBackupHook("C:/synthetic").changed, true);
  assert.match(f.get(), /echo before/);
  assert.match(f.get(), /echo after/);
  assert.doesNotMatch(f.get(), /plugin/);
  f.set(`#!/bin/sh\n${begin}\nplugin\n${end}\n`);
  f.backup.uninstallBackupHook("C:/synthetic");
  assert.equal(f.get(), "#!/bin/sh\n");
});

test("automatic startup propagates inspection and installation failures for visible reporting", async () => {
  const vscode = { workspace: { workspaceFolders: [{ uri: { fsPath: "C:/synthetic" } }],
    getConfiguration: () => ({ get: (key, fallback) => key === "gitBackup.verifyRemoteAccess" ? false : fallback }) }, window: {} };
  let inspectionError = true, installed = 0;
  const backup = { inspectGitBackup() { if (inspectionError) throw Error("read denied"); return { isGitRepo: true, hookInstalled: false, hasRemote: true }; },
    installBackupHook() { installed++; throw Error("write denied"); } };
  const setup = load("src/extension/GitBackupSetup.ts", { vscode, "../features/GitBackup": backup });
  await assert.rejects(setup.maybeAutoInstallGitBackup({ subscriptions: { push() {} } }), /read denied/);
  assert.equal(installed, 0);
  inspectionError = false;
  await assert.rejects(setup.maybeAutoInstallGitBackup({ subscriptions: { push() {} } }), /write denied/);
  assert.equal(installed, 1);
});
