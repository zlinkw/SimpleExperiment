const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readSource } = require("../_helpers/sourceReader");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..", "..");

function snapshotMethods(messages) {
  const source = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8");
  const ast = ts.createSourceFile("host.ts", source, ts.ScriptTarget.Latest, true);
  const methods = new Map();
  const visit = node => {
    if (ts.isMethodDeclaration(node) && ["manualGpuSnapshot", "manualSchedulerSnapshot"].includes(node.name.getText(ast)))
      methods.set(node.name.getText(ast), node.getText(ast));
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(methods.size, 2);
  const code = ts.transpileModule(`class Host { ${[...methods.values()].join("\n")} }; Host.prototype`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(code, { vscode: { window: { showInformationMessage: message => messages.push(message) } }, errorMessage: error => error.message });
}

test("offline GPU and scheduler refreshes explain that no live query was made", async () => {
  const messages = [], methods = snapshotMethods(messages), calls = [];
  const host = { projectContextGeneration: 1, client: { getGpu: () => calls.push("gpu"), getScheduler: () => calls.push("scheduler") },
    effectiveConnectionMode: () => "offline_import", lastError: "existing", postState: () => calls.push("post") };
  await methods.manualGpuSnapshot.call(host);
  await methods.manualSchedulerSnapshot.call(host);
  assert.deepEqual(calls, []);
  assert.equal(host.lastError, "existing");
  assert.match(messages[0], /离线模式.*无法刷新.*GPU/);
  assert.match(messages[1], /离线模式.*无法刷新.*调度/);
});

test("online snapshots retain success, failure, and project-switch handling", async () => {
  const messages = [], methods = snapshotMethods(messages);
  for (const [name, api] of [["manualGpuSnapshot", "getGpu"], ["manualSchedulerSnapshot", "getScheduler"]]) {
    const calls = [];
    const host = { projectContextGeneration: 1, effectiveConnectionMode: () => "realtime", lastError: "old",
      client: { [api]: async () => calls.push(api) }, pushLocalWorkerAvailability: async () => calls.push("availability"), postState: () => calls.push("post") };
    await methods[name].call(host);
    assert.equal(host.lastError, undefined);
    assert.deepEqual(calls, api === "getGpu" ? [api, "availability", "post"] : [api, "post"]);
    host.client[api] = async () => { throw Error("live failure"); };
    await methods[name].call(host);
    assert.equal(host.lastError, "live failure");
    const before = calls.length;
    host.client[api] = async () => { host.projectContextGeneration++; };
    await methods[name].call(host);
    assert.equal(calls.length, before);
  }
  assert.deepEqual(messages, []);
});

test("manual ui snapshots call tunnel client APIs", () => {
  const source = readSource("src/extension.ts");
  assert.match(source, /case "manualGpuSnapshot":[\s\S]+manualGpuSnapshot/);
  assert.match(source, /case "manualSchedulerSnapshot":[\s\S]+manualSchedulerSnapshot/);
  assert.match(source, /case "manualTracesSnapshot":[\s\S]+manualTracesSnapshot/);
  assert.match(source, /await client\.getGpu\(\)/);
  assert.match(source, /await client\.getScheduler\(\)/);
  assert.match(source, /await client\.getTraces\(\)/);
});

test("manual ui snapshots bind completion to the initiating client", () => {
  const source = readSource("src/extension.ts");
  const methods = [
    ["manualGpuSnapshot", "loadGpuHistoryFromUi"],
    ["manualSchedulerSnapshot", "manualTracesSnapshot"],
    ["manualTracesSnapshot", "generateTunnelScript"],
  ];
  for (const [method, nextMethod] of methods) {
    const start = source.indexOf(`async ${method}()`);
    const body = source.slice(start, source.indexOf(`async ${nextMethod}(`, start));
    assert.match(body, /const client = this\.client/, method);
    assert.ok([...body.matchAll(/client !== this\.client/g)].length >= 2, method);
    assert.match(body, /client === this\.client/, method);
  }
});

test("select log run key updates selection and refreshes live output", () => {
  const source = readSource("src/extension.ts");
  assert.match(source, /case "selectLogRunKey":/);
  assert.match(source, /this\.selectedLogRunKey = stringField/);
  assert.match(source, /fetchSelectedLiveOutput\(this\.selectedLogRunKey/);
});
