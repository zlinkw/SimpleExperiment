const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

test("history reports unreadable or malformed sources and still permits missing paths", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/cli/commands/result.ts"), "utf8");
  const ast = ts.createSourceFile("result.ts", source, ts.ScriptTarget.ES2022, true);
  const names = ["loadResults", "extractRecords", "readHistoryRegistry", "parseLocalResultFiles"];
  const code = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text))
    .map(n => n.getText(ast).replace(/^export /, "")).join("\n");
  const missing = () => Object.assign(Error("missing"), { code: "ENOENT" });
  const denied = () => Object.assign(Error("denied"), { code: "EACCES" });
  const files = new Map(), dirs = new Map();
  let remoteCalls = 0;
  const fakeFs = { readFileSync(file) { const v = files.get(file); if (v === undefined) throw missing(); if (v instanceof Error) throw v; return v; },
    readdirSync(dir) { const v = dirs.get(dir); if (v === undefined) throw missing(); if (v instanceof Error) throw v; return v; } };
  const registry = path.join("synthetic", "registry.json"), local = path.join("synthetic", "registry.local.json");
  const experiments = path.join("synthetic", "experiments", "results"), results = path.join("synthetic", "simple_cluster", "results");
  const file = path.join(experiments, "ok.csv");
  const context = { fs: fakeFs, path, Error, process: { stderr: { write() {} } }, RESULT_REGISTRY_REL: "registry.json", RESULT_REGISTRY_LOCAL_REL: "registry.local.json",
    LATEST_RESULT_FILE: "latest.csv", resolveProjectPath: (...parts) => path.join("synthetic", ...parts), businessError: message => Error(message),
    selectResultPreset: () => ({}), parseResultFile: text => { if (text === "{") throw Error("invalid JSON"); return [{ resultId: "ok", experimentId: "ok", runKey: "ok", metrics: { score: { value: 0 } }, sourceFiles: [] }]; },
    isDiagnosticWorkerResult: () => false, checkpointRecordsFromManifest: () => [], callApi: () => { remoteCalls++; throw Error("unexpected API"); } };
  const run = vm.runInNewContext(ts.transpileModule(code + "\nloadResults", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  assert.equal((await run({ history: true })).length, 0);
  files.set(registry, "{");
  await assert.rejects(run({ history: true }), /历史结果索引读取失败.*registry\.json/);
  files.set(registry, denied());
  await assert.rejects(run({ history: true }), /registry\.json.*denied/);
  files.set(registry, '{"records":[]}'); files.set(local, "{");
  await assert.rejects(run({ history: true }), /registry\.local\.json/);
  files.set(local, '{"records":[]}');
  dirs.set(experiments, denied());
  await assert.rejects(run({ history: true }), /历史结果目录读取失败.*denied/);
  dirs.set(experiments, ["ok.csv"]); dirs.set(results, []); files.set(file, denied());
  await assert.rejects(run({ history: true }), /历史结果文件读取或解析失败.*ok\.csv.*denied/);
  files.set(file, "{");
  await assert.rejects(run({ history: true }), /ok\.csv.*invalid JSON/);
  files.set(file, "run_key,score\nr,0\n");
  const rows = await run({ history: true });
  assert.equal(rows.length, 1); assert.equal(rows[0].metrics.score, 0); assert.equal(rows[0].current, false);
  assert.equal(remoteCalls, 0);
});
