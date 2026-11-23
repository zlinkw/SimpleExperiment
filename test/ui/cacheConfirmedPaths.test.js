const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension/CacheCleanupPanel.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const candidate = { path: "tmp/old.log", fullPath: "/project/tmp/old.log", type: "file", bytes: 1, modifiedAt: 1, purpose: "日志", token: "token" };

test("actual atomic writer refuses publication after the lease is lost", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/state/StateStore.ts"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  let staged = false, renamed = 0, disk = "newer reservation";
  const info = { dev: 1, ino: 2, nlink: 1, isFile: () => true, isSymbolicLink: () => false };
  const fakeFs = { async mkdir() {}, async lstat() { if (!staged) throw Object.assign(Error("missing"), { code: "ENOENT" }); return info; },
    async open() { staged = true; return { async stat() { return info; }, async truncate() {}, async write(_b, _o, n) { return { bytesWritten: n }; }, async sync() {}, async close() {} }; },
    async rename() { renamed++; disk = "stale snapshot"; } };
  const module = { exports: {} };
  vm.runInNewContext(code, { require: id => id === "fs/promises" ? fakeFs : require(id), module, exports: module.exports, Buffer,
    process: { ...process, platform: "win32", pid: 42 }, setTimeout });
  await assert.rejects(module.exports.atomicWriteText("C:/fixture/state.json", "stale snapshot", { beforeRename: async () => { throw Error("lease lost"); } }), /lease lost/);
  assert.equal(renamed, 0);
  assert.equal(disk, "newer reservation");
});

test("shared operation state preserves reservations across stale hosts and rejects invalid storage", async () => {
  const legacy = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
  const cut = (a, b) => { const i = legacy.indexOf(a), j = legacy.indexOf(b, i); assert.ok(i >= 0 && j > i); return legacy.slice(i, j); };
  const helpers = cut("function normalizeLocalOperationsState(", "function normalizeLocalPlanMetadataState(");
  const method = cut("    async withLocalOperationsLease(", "    async clearCacheFromUi(");
  let disk = null, failure = null, chain = Promise.resolve(), beforePublish = null, leaseValid = true;
  const fakeFs = { async readFile() { if (failure) throw failure; if (disk === null) throw Object.assign(Error("missing"), { code: "ENOENT" }); return disk; }, async mkdir() {} };
  const box = { fs: fakeFs, path, samePath: (a, b) => a === b, PROJECT_LOCAL_OPERATIONS_PATH: "state.json", Date, Object, Error,
    async atomicWriteText(_file, data, options) { if (failure) throw failure; if (beforePublish) { const run = beforePublish; beforePublish = null; run(); } await options.beforeRename(); disk = data; } };
  vm.createContext(box);
  vm.runInContext(ts.transpileModule(helpers + "\nclass Host {\n" + method + "\n}\nthis.Host=Host; this.writeState=writeProjectLocalOperationsState; this.readState=readProjectLocalOperationsState;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, box);
  const host = () => { const h = new box.Host(); h.hostOperationLease = { async acquire() {
    const previous = chain; let release; chain = new Promise(resolve => { release = resolve; }); await previous;
    return { async assertHeld() { if (!leaseValid) throw Error("lease lost"); }, async release() { release(); } };
  } }; return h; };
  const a = host(), b = host(), root = "/fixture";
  disk = "null"; assert.equal(await box.readState(root), undefined);
  disk = JSON.stringify({ old: { status: "running" } }); assert.equal((await box.readState(root)).old.operationId, "old");
  disk = JSON.stringify({ operations: { wrapped: { status: "running" } } }); assert.equal((await box.readState(root)).wrapped.operationId, "wrapped");
  disk = "[]"; await assert.rejects(box.readState(root), /格式无效/);
  disk = JSON.stringify({ operations: {}, pendingCacheCleanups: { bad: { operationId: "bad", settled: false, root: "/other", workerId: "a", paths: ["tmp/a.log"] } } });
  await assert.rejects(box.writeState(root, {}), /清理请求状态格式无效/);
  disk = null;
  const row = { root, workerId: "a", nodeIdentity: "same-node", operationId: "original", paths: ["tmp/a.log"], settled: false };
  await a.cacheCleanupState(root, "reserve", [row]);
  await b.withLocalOperationsLease(root, lease => box.writeState(root, { stale: { operationId: "stale" } }, () => lease.assertHeld()));
  assert.equal((await b.cacheCleanupState(root, "list"))[0].operationId, "original");
  await assert.rejects(b.cacheCleanupState(root, "reserve", [{ ...row, operationId: "second" }]), /结果未知/);
  await assert.rejects(b.cacheCleanupState(root, "reserve", [{ ...row, workerId: "alias", operationId: "alias" }]), /结果未知/);
  await a.cacheCleanupState(root, "settle", [row]);
  assert.deepEqual(JSON.parse(disk).pendingCacheCleanups.original, { operationId: "original", settled: true });
  const competing = await Promise.allSettled([
    a.cacheCleanupState(root, "reserve", [{ ...row, operationId: "race-a" }]),
    b.cacheCleanupState(root, "reserve", [{ ...row, operationId: "race-b" }]),
  ]);
  assert.equal(competing.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(competing.filter(result => result.status === "rejected").length, 1);
  const newer = { operationId: "newer", root, workerId: "b", paths: ["tmp/b.log"], settled: false };
  const replacement = JSON.stringify({ operations: {}, pendingCacheCleanups: { newer } });
  beforePublish = () => { disk = replacement; leaseValid = false; };
  await assert.rejects(a.withLocalOperationsLease(root, lease => box.writeState(root, { stale: {} }, () => lease.assertHeld())), /lease lost/);
  assert.equal(disk, replacement);
  leaseValid = true;
  beforePublish = () => { disk = replacement; leaseValid = false; };
  await assert.rejects(a.cacheCleanupState(root, "reserve", [{ ...row, operationId: "lost" }]), /lease lost/);
  assert.equal(disk, replacement);
  leaseValid = true;
  beforePublish = () => { disk = replacement; leaseValid = false; };
  await assert.rejects(a.cacheCleanupState(root, "settle", [newer]), /lease lost/);
  assert.equal(disk, replacement);
  leaseValid = true;
  disk = "{";
  await assert.rejects(a.cacheCleanupState(root, "reserve", [row]));
  await assert.rejects(box.writeState(root, {}));
  failure = Object.assign(Error("denied"), { code: "EACCES" });
  await assert.rejects(a.cacheCleanupState(root, "reserve", [row]), /denied/);
});

test("reservation failure sends no preflight or delete", async () => {
  const calls = [];
  const client = { async postWorkerAction(id, action) { calls.push(action); return { status: "completed", candidates: id === "a" ? [candidate] : [] }; } };
  const panel = panelFor(client), keys = ["a|tmp/old.log"];
  panel.context.cleanupState = async () => { throw Error("storage unavailable"); };
  await panel.message({ type: "refresh" });
  calls.length = 0;
  for (const type of ["review", "confirmFirst", "confirmSecond"]) await panel.message({ type, keys });
  assert.deepEqual(calls, []);
  assert.ok(panel.messages.some(row => row.type === "error" && /storage unavailable/.test(row.message)));
});

function panelFor(client, store = new Map(), options = {}) {
  let handler;
  const messages = [];
  const webview = { set html(_value) {}, postMessage(value) { messages.push(value); return Promise.resolve(true); },
    onDidReceiveMessage(callback) { handler = callback; return { dispose() {} }; } };
  const vscode = { window: { createWebviewPanel: () => ({ webview, onDidDispose() {} }) }, ViewColumn: { Active: 1 } };
  const module = { exports: {} };
  vm.runInNewContext(compiled + (options.localRows ? "\nlocalCandidates = async () => globalThis.fakeLocalRows;" : ""), { require: id => id === "vscode" ? vscode
    : id === "../features/PluginLogRetention" ? { retentionOwnership: () => "protected", isStaleRetentionRow: () => undefined }
    : id === "node:fs/promises" ? (options.fs || { async lstat() { throw Object.assign(new Error("fake root"), { code: "ENOENT" }); } })
    : id === "node:child_process" && options.spawn ? { spawn: options.spawn } : require(id),
    module, exports: module.exports, Buffer, process, console, AbortController, fakeLocalRows: options.localRows });
  const context = { generation: 1, client, localRoot: options.root || "C:/fixture-cache", endpoints: [{ id: "a", role: "worker" }, { id: "b", role: "worker" }],
    async cleanupState(root, mode, rows = []) {
      const records = store.get(root) || new Map();
      if (mode === "reserve") {
        for (const row of rows) if ([...records.values()].some(old => !old.settled && old.workerId === row.workerId && row.paths.some(p => old.paths.includes(p)))) throw Error("原清理请求结果未知");
        for (const row of rows) records.set(row.operationId, structuredClone(row));
        store.set(root, records);
      }
      if (mode === "settle") for (const row of rows) if (records.has(row.operationId)) records.set(row.operationId, { operationId: row.operationId, settled: true });
      return [...records.values()];
    },
    retentionIndex: async () => ({}), retentionHolds: async () => ["p|held"] };
  module.exports.openCacheCleanupPanel(() => context);
  return { messages, context, message: value => handler(value) };
}

test("local preflight failure settles only when no executor started", async () => {
  const crypto = require("node:crypto"), { EventEmitter } = require("node:events");
  const root = path.resolve("C:/fixture-local"), parent = path.join(root, "tmp"), full = path.join(parent, "a.log");
  const dir = { dev: 7, isDirectory: () => true, isSymbolicLink: () => false };
  const stat = inode => ({ dev: 7n, ino: inode, size: 1n, mtimeNs: 100n, nlink: 1n, isFile: () => true, isSymbolicLink: () => false });
  const token = crypto.createHash("sha256").update("tmp/a.log|7|9|1|100|1").digest("hex");
  const row = { path: "tmp/a.log", fullPath: full, type: "file", bytes: 1, modifiedAt: 1, purpose: "日志", token };
  let fileReads = 0, spawnCalls = 0, changed = true, child;
  const fakeFs = { async lstat(p) { if (p === root || p === parent) return dir; if (p === full) return stat(changed && ++fileReads > 1 ? 10n : 9n); throw Object.assign(Error("missing"), { code: "ENOENT" }); }, async realpath(p) { return p; } };
  const spawn = () => { spawnCalls++; child = new EventEmitter(); child.stdin = new EventEmitter(); child.stdin.end = () => {}; child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); return child; };
  const store = new Map(), client = { async postWorkerAction() { return { status: "completed", candidates: [] }; } };
  const panel = panelFor(client, store, { root, fs: fakeFs, spawn, localRows: [row] }), keys = ["local|tmp/a.log"];
  await panel.message({ type: "refresh" });
  for (const type of ["review", "confirmFirst", "confirmSecond"]) await panel.message({ type, keys });
  assert.equal(spawnCalls, 0);
  assert.ok([...store.get(root).values()].every(item => item.settled && !item.paths));
  changed = false; fileReads = 0;
  await panel.message({ type: "refresh" });
  await panel.message({ type: "review", keys }); await panel.message({ type: "confirmFirst", keys });
  const pending = panel.message({ type: "confirmSecond", keys });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(spawnCalls, 1);
  assert.ok([...store.get(root).values()].some(item => !item.settled && item.paths.includes("tmp/a.log")));
  child.emit("exit", 1);
  await pending;
  assert.ok([...store.get(root).values()].every(item => item.settled && !item.paths));
});

test("two confirmations preflight every node before any delete", async () => {
  const calls = [];
  let rejectSecond = "failed";
  const client = { async postWorkerAction(id, action, body) {
    calls.push([id, action]);
    if (action === "preview-cache-cleanup") return { status: "completed", candidates: [candidate] };
    if (action === "check-confirmed-cache-candidates") {
      if (rejectSecond === "failed" && id === "b") return { status: "failed" };
      return { status: "completed", opId: body.opId, authorizationMode: "confirmed_paths", workerId: rejectSecond === "worker" && id === "b" ? "other" : id,
        root: rejectSecond === "root" && id === "b" ? "/other" : "/project", candidates: body.candidates, absent: [] };
    }
    assert.equal(action, "delete-confirmed-cache-candidates");
    return { status: "completed", workerId: id, operationId: body.operationId, deletedCount: body.candidates.length, absent: [] };
  } };
  const panel = panelFor(client), keys = ["a|tmp/old.log", "b|tmp/old.log"];
  await panel.message({ type: "refresh" });
  const rows = panel.messages.filter(m => m.type === "data").at(-1).rows;
  assert.equal(rows.length, 2);
  assert.ok(rows.every(row => !row.previewOnly && /protected/.test(row.purpose)));
  await panel.message({ type: "review", keys });
  await panel.message({ type: "confirmSecond", keys });
  assert.equal(calls.filter(row => row[1].startsWith("delete-")).length, 0);
  await panel.message({ type: "confirmFirst", keys });
  await panel.message({ type: "confirmSecond", keys });
  assert.equal(calls.filter(row => row[1].startsWith("delete-")).length, 0);
  assert.ok(panel.messages.some(row => row.type === "error" && /无法核实/.test(row.message)));
  for (const mismatch of ["worker", "root"]) {
    rejectSecond = mismatch;
    for (const type of ["review", "confirmFirst", "confirmSecond"]) await panel.message({ type, keys });
    assert.equal(calls.filter(row => row[1].startsWith("delete-")).length, 0);
  }
  rejectSecond = "";
  await panel.message({ type: "review", keys });
  await panel.message({ type: "confirmFirst", keys });
  const start = calls.length;
  await panel.message({ type: "confirmSecond", keys });
  assert.deepEqual(calls.slice(start, start + 4), [["a", "check-confirmed-cache-candidates"], ["b", "check-confirmed-cache-candidates"],
    ["a", "delete-confirmed-cache-candidates"], ["b", "delete-confirmed-cache-candidates"]]);
});

test("local preflight rejects a changed later file before invoking the executor", async () => {
  const crypto = require("node:crypto"), root = path.resolve("C:/fixture-cache"), parent = path.join(root, "tmp");
  const stat = { dev: 7n, ino: 9n, size: 1n, mtimeNs: 100n, nlink: 1n, isFile: () => true, isSymbolicLink: () => false };
  const dir = { dev: 7, isDirectory: () => true, isSymbolicLink: () => false };
  let spawns = 0;
  const fakeFs = { async realpath(value) { return value; }, async lstat(value) {
    if (value === root || value === parent) return dir;
    if (value === path.join(parent, "first.log")) return stat;
    if (value === path.join(parent, "changed.log")) return { ...stat, size: 2n };
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  } };
  const module = { exports: {} };
  vm.runInNewContext(compiled + "\nexports.testDeleteLocalCandidates = deleteLocalCandidates;", {
    require: id => id === "vscode" ? {} : id === "node:fs/promises" ? fakeFs
      : id === "node:child_process" ? { spawn() { spawns++; throw Error("unexpected executor"); } }
      : id === "../features/PluginLogRetention" ? {} : require(id),
    module, exports: module.exports, Buffer, process, console, AbortController,
  });
  const row = name => ({ path: `tmp/${name}`, fullPath: path.join(parent, name), type: "file",
    token: crypto.createHash("sha256").update(`tmp/${name}|7|9|1|100|1`).digest("hex") });
  await assert.rejects(module.exports.testDeleteLocalCandidates(root, [row("first.log"), row("changed.log")], [], "local"), /候选已变化/);
  assert.equal(spawns, 0);
});

test("local executor uses the verified parent and direct child without Force", async () => {
  const crypto = require("node:crypto"), { EventEmitter } = require("node:events");
  const root = path.resolve("C:/fixture-cache"), parent = path.join(root, "tmp"), full = path.join(parent, "a.log");
  const stat = { dev: 7n, ino: 9n, size: 1n, mtimeNs: 100n, nlink: 1n, isFile: () => true, isSymbolicLink: () => false };
  const dir = { dev: 7, isDirectory: () => true, isSymbolicLink: () => false };
  let exists = true, calls = 0;
  const fakeFs = { async realpath(value) { return value; }, async lstat(value) {
    if (value === root || value === parent) return dir;
    if (value === full && exists) return stat;
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  } };
  const spawn = (command, args) => {
    calls++;
    const script = Buffer.from(args[args.indexOf("-EncodedCommand") + 1], "base64").toString("utf16le");
    assert.equal(command, "pwsh.exe");
    assert.doesNotMatch(script, /-Force\b/);
    assert.match(script, /Set-Location -LiteralPath \$it\.parent/);
    assert.match(script, /Remove-Item -LiteralPath \('\.\/'\+\$it\.leaf\)/);
    const child = new EventEmitter();
    child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.stdin = new EventEmitter();
    child.stdin.end = value => { const batch = JSON.parse(value); assert.equal(batch.items[0].parent, parent); assert.equal(batch.items[0].leaf, "a.log");
      setImmediate(() => { exists = false; child.stdout.emit("data", "OK:0\n"); child.emit("exit", 0); }); };
    return child;
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled + "\nexports.testDeleteLocalCandidates = deleteLocalCandidates;", {
    require: id => id === "vscode" ? {} : id === "node:fs/promises" ? fakeFs : id === "node:child_process" ? { spawn }
      : id === "../features/PluginLogRetention" ? {} : require(id),
    module, exports: module.exports, Buffer, process, console, AbortController,
  });
  const token = crypto.createHash("sha256").update("tmp/a.log|7|9|1|100|1").digest("hex");
  await module.exports.testDeleteLocalCandidates(root, [{ path: "tmp/a.log", fullPath: full, type: "file", token }], [], "local");
  assert.equal(calls, 1);
});

test("unknown delete is only observed until the original request settles", async () => {
  const calls = [];
  let query = 0, operationId = "", absent = false;
  const client = { async postWorkerAction(id, action, body) {
    calls.push(action);
    if (action === "preview-cache-cleanup") return { status: "completed", candidates: id === "a" && !absent ? [candidate] : [] };
    if (action === "check-confirmed-cache-candidates") return { status: "completed", opId: body.opId, authorizationMode: "confirmed_paths", workerId: id, root: "/project", candidates: body.candidates, absent: [] };
    if (action === "delete-confirmed-cache-candidates") { operationId = body.operationId; throw new Error("connection lost"); }
    assert.equal(action, "query-confirmed-cache-cleanup");
    assert.equal(body.targetOperationId, operationId);
    query++;
    if (query === 1) throw new Error("offline");
    if (query === 2) panel.context.endpoints[1].identity = "unrelated-worker-changed";
    if (query === 3) absent = true;
    return { status: query === 2 ? "live" : "settled", workerId: id, targetOperationId: operationId };
  } };
  const store = new Map();
  let panel = panelFor(client, store); const keys = ["a|tmp/old.log"];
  await panel.message({ type: "refresh" });
  for (const type of ["review", "confirmFirst", "confirmSecond"]) await panel.message({ type, keys });
  assert.equal(calls.filter(value => value === "delete-confirmed-cache-candidates").length, 1);
  panel = panelFor(client, store);
  await panel.message({ type: "refresh" });
  for (const type of ["review", "confirmFirst", "confirmSecond"]) await panel.message({ type, keys });
  assert.equal(calls.filter(value => value === "delete-confirmed-cache-candidates").length, 1);
  panel.context.localRoot = "C:/other-project";
  await panel.message({ type: "recheckPending" });
  assert.equal(query, 0);
  panel.context.localRoot = "C:/fixture-cache";
  await panel.message({ type: "recheckPending" });
  await panel.message({ type: "recheckPending" });
  await panel.message({ type: "recheckPending" });
  assert.equal(query, 3);
  assert.ok(panel.messages.some(row => row.type === "error" && /核实失败/.test(row.message)));
  assert.ok(panel.messages.some(row => row.type === "error" && /仍在执行/.test(row.message)));
  assert.ok(panel.messages.some(row => row.type === "error" && /已结束/.test(row.message)));
  await panel.message({ type: "refresh" });
  assert.equal(panel.messages.filter(row => row.type === "data").at(-1).rows.length, 0);
  assert.equal(calls.filter(value => value === "delete-confirmed-cache-candidates").length, 1);
});

test("Agent exact-path checks validate the complete batch before the fake executor", () => {
  const { spawnSync } = require("node:child_process");
  const result = spawnSync("python", ["-B", "-X", "utf8", path.join(__dirname, "cacheConfirmedAgentFixture.py")],
    { encoding: "utf8", timeout: 10000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  assert.match(result.stdout, /extracted functions: ok/);
});

test("Windows read-only file identity agrees with Node bigint stat", { skip: process.platform !== "win32" }, () => {
  const { spawnSync } = require("node:child_process");
  const match = source.match(/const identityType = String\.raw`([\s\S]*?)`;/);
  assert.ok(match);
  const result = spawnSync("pwsh.exe", ["-NoProfile", "-NonInteractive", "-Command",
    "$ErrorActionPreference='Stop'; Add-Type -TypeDefinition $env:CACHE_IDENTITY_CODE; ([CacheFileIdentity]::Read($env:CACHE_IDENTITY_PATH)) -join ','"],
  { encoding: "utf8", timeout: 10000, windowsHide: true, env: { ...process.env, CACHE_IDENTITY_CODE: match[1], CACHE_IDENTITY_PATH: __filename } });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  const stat = fs.statSync(__filename, { bigint: true });
  assert.deepEqual(result.stdout.trim().split(",").slice(0, 5), [String(stat.dev), String(stat.ino), String(stat.nlink), String(stat.size), String(621355968000000000n + stat.mtimeNs / 100n)]);
});

test("Windows identity guard blocks changed identifiers and read failures without deleting", { skip: process.platform !== "win32" }, () => {
  const { spawnSync } = require("node:child_process");
  const identity = source.match(/const identityType = String\.raw`([\s\S]*?)`;/);
  const guard = source.match(/(\$id=\[CacheFileIdentity\]::Read\('\.\/'\+\$it\.leaf\);[\s\S]*?) Remove-Item -LiteralPath/);
  assert.ok(identity && guard);
  const stat = fs.statSync(__filename, { bigint: true });
  const expected = { leaf: path.basename(__filename), dev: String(stat.dev), ino: String(stat.ino + 1n), links: String(stat.nlink),
    size: String(stat.size), ticks: String(621355968000000000n + stat.mtimeNs / 100n) };
  const script = "$ErrorActionPreference='Stop'; Add-Type -TypeDefinition $env:CACHE_IDENTITY_CODE; Set-Location -LiteralPath $env:CACHE_IDENTITY_PARENT; [Environment]::CurrentDirectory=(Get-Location).ProviderPath; $it=ConvertFrom-Json $env:CACHE_IDENTITY_EXPECTED; try { " + guard[1] + " Write-Output 'WOULD_DELETE' } catch { Write-Output 'BLOCKED' }";
  for (const row of [expected, { ...expected, leaf: "definitely-missing-file-for-cache-identity" }, { ...expected, ino: "9007199254740993" }]) {
    const result = spawnSync("pwsh.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", timeout: 10000, windowsHide: true,
      env: { ...process.env, CACHE_IDENTITY_CODE: identity[1], CACHE_IDENTITY_PARENT: __dirname, CACHE_IDENTITY_EXPECTED: JSON.stringify(row) } });
    assert.equal(result.status, 0, result.stderr || String(result.error));
    assert.match(result.stdout, /BLOCKED/);
    assert.doesNotMatch(result.stdout, /WOULD_DELETE/);
  }
});

test("Windows executor prechecks the actual reviewed file without performing deletion", { skip: process.platform !== "win32" }, () => {
  const { spawnSync } = require("node:child_process");
  const identity = source.match(/const identityType = String\.raw`([\s\S]*?)`;/);
  const template = source.match(/const script = `([\s\S]*?)`;\s*const encoded = Buffer\.from\(script/);
  assert.ok(identity && template);
  const removal = "Remove-Item -LiteralPath ('./'+$it.leaf) -ErrorAction Stop; if (Test-Path -LiteralPath ('./'+$it.leaf)) { throw 'TARGET_REMAINS' };";
  assert.equal(template[1].split(removal).length, 2);
  const script = template[1].replace("${identityType}", identity[1]).replace(removal, "Write-Output ('WOULD_DELETE:'+$it.i);");
  assert.doesNotMatch(script, /Remove-Item|-Force\b/);
  const stat = fs.statSync(__filename, { bigint: true });
  const item = { i: 0, parent: __dirname, leaf: path.basename(__filename), dev: String(stat.dev), ino: String(stat.ino),
    links: String(stat.nlink), size: String(stat.size), ticks: String(621355968000000000n + stat.mtimeNs / 100n) };
  const root = path.resolve(__dirname, "../..");
  const result = spawnSync("pwsh.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", timeout: 10000,
    windowsHide: true, cwd: root, input: JSON.stringify({ root, items: [item] }) });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  assert.match(result.stdout, /WOULD_DELETE:0/);
  assert.match(result.stdout, /OK:0/);
});
