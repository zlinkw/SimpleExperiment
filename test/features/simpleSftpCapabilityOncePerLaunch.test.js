const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// 31：同一次启动上下文内所有 SimpleSFTP helper 共享一次实际能力读取；
// 新启动、失败与显式失效都必须重新取得，不建跨启动/跨运行代际的无限缓存。
const source = fs.readFileSync(require.resolve("../../src/extension/legacy.ts"), "utf8");
const ast = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.Latest, true);
function decl(name) {
  let found;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === name) found = node.getText(ast);
    else ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(found, name);
  return found;
}
const methodsSource = ts.transpileModule(
  `this.methods = { ${["beginSimpleSftpCapabilityLaunch", "invalidateSimpleSftpCapability",
    "readSimpleSftpCapabilities", "simpleSftpCapability"].map(decl).join(",")} };`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture() {
  const api = { baseUrl: "http://127.0.0.1:18765", token: "token-1" };
  const reads = { discovery: 0 };
  const fetches = [];
  const state = { failNext: false, failStatus: 0 };
  const sandbox = {
    console,
    URL,
    path: require("node:path"),
    os: { homedir: () => "C:/home" },
    fs: { readFile: async () => { reads.discovery++; return JSON.stringify(api); } },
    process: { env: { APPDATA: "C:/AppData" } },
    AbortSignal,
    fetch: async (url, init) => {
      fetches.push({ url: String(url), headers: init && init.headers });
      if (state.failNext) { state.failNext = false; throw new TypeError("ECONNREFUSED 127.0.0.1:18765"); }
      if (state.failStatus) {
        const status = state.failStatus; state.failStatus = 0;
        return { ok: false, status, json: async () => ({}) };
      }
      return {
        ok: true, status: 200,
        json: async () => ({
          methods: ["sync.projectInventory", "sync.downloadPaths", "files.cleanup.preview"],
          instanceId: "instance-" + fetches.length,
          features: { fastDelete: 1 },
          methodOptions: { "sync.projectInventory": { metadataOnly: 1 } },
        }),
      };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(methodsSource, sandbox);
  const host = Object.assign({ simpleSftpCapLaunch: 0, simpleSftpCapShared: undefined }, sandbox.methods);
  return { api, reads, fetches, state, host, sandbox };
}

test("31 same launch shares one discovery read and one capabilities request across helpers", async () => {
  const f = fixture();
  const first = await f.host.simpleSftpCapability("sync.projectInventory");
  const second = await f.host.simpleSftpCapability("sync.downloadPaths");
  const third = await f.host.simpleSftpCapability("files.cleanup.preview");
  assert.equal(f.fetches.length, 1, "同一次启动的能力 GET 必须恰好一次");
  assert.equal(f.reads.discovery, 1, "同一次启动不得重复打开 api.json 头部文件");
  assert.equal(first.instanceId, "instance-1");
  assert.equal(second.instanceId, "instance-1");
  assert.equal(third.instanceId, "instance-1");
  assert.deepEqual(JSON.parse(JSON.stringify(first.headers)), { Authorization: "Bearer token-1" });
  assert.deepEqual(JSON.parse(JSON.stringify(third.methodOptions)), { "sync.projectInventory": { metadataOnly: 1 } });
});

test("31 concurrent helpers in one launch still share a single read", async () => {
  const f = fixture();
  const results = await Promise.all([
    f.host.simpleSftpCapability("sync.projectInventory"),
    f.host.simpleSftpCapability("sync.downloadPaths"),
    f.host.simpleSftpCapability("files.cleanup.preview"),
  ]);
  assert.equal(f.fetches.length, 1);
  assert.equal(new Set(results.map((row) => row.instanceId)).size, 1);
});

test("31 unsupported method still rejects from the shared read without refetching", async () => {
  const f = fixture();
  await f.host.simpleSftpCapability("sync.projectInventory");
  await assert.rejects(() => f.host.simpleSftpCapability("files.syncTree"), /SimpleSFTP 不支持 files\.syncTree/);
  assert.equal(f.fetches.length, 1);
});

test("31 new launch refetches and picks up a replaced Scheduler endpoint and token", async () => {
  const f = fixture();
  await f.host.simpleSftpCapability("sync.projectInventory");
  assert.equal(f.fetches.length, 1);
  f.host.beginSimpleSftpCapabilityLaunch();
  f.api.baseUrl = "http://127.0.0.1:19000";
  f.api.token = "token-2";
  const second = await f.host.simpleSftpCapability("sync.projectInventory");
  assert.equal(f.fetches.length, 2, "新启动必须重新取得一次能力");
  assert.equal(second.instanceId, "instance-2");
  assert.equal(second.headers.Authorization, "Bearer token-2");
  assert.match(String(second.endpoint), /19000/);
  await f.host.simpleSftpCapability("sync.downloadPaths");
  assert.equal(f.fetches.length, 2, "同一新启动内后续 helper 不再重复读取");
});

test("31 failed read clears the single slot so the next call rediscovers", async () => {
  const f = fixture();
  f.state.failNext = true;
  await assert.rejects(() => f.host.simpleSftpCapability("sync.projectInventory"), /ECONNREFUSED/);
  assert.equal(f.host.simpleSftpCapShared, undefined, "失败后单槽必须清空，不把失败结果留给同启动后续调用");
  const ok = await f.host.simpleSftpCapability("sync.projectInventory");
  assert.equal(ok.instanceId, "instance-2");
  assert.equal(f.fetches.length, 2);
  await f.host.simpleSftpCapability("sync.downloadPaths");
  assert.equal(f.fetches.length, 2, "恢复成功后的同启动读取仍然共享");
});

test("31 auth-expired capability read retries discovery once like before", async () => {
  const f = fixture();
  f.state.failStatus = 401;
  const ok = await f.host.simpleSftpCapability("sync.projectInventory");
  assert.equal(ok.instanceId, "instance-2");
  assert.equal(f.fetches.length, 2, "仅能力 GET 重试一次，不重放任何变更请求");
  assert.equal(f.reads.discovery, 2, "重试前重新读取一次发现头部文件");
});

test("31 explicit invalidation forces the next call to rediscover", async () => {
  const f = fixture();
  await f.host.simpleSftpCapability("sync.projectInventory");
  f.host.invalidateSimpleSftpCapability();
  f.api.token = "token-rotated";
  const next = await f.host.simpleSftpCapability("sync.projectInventory");
  assert.equal(f.fetches.length, 2);
  assert.equal(next.headers.Authorization, "Bearer token-rotated");
});
