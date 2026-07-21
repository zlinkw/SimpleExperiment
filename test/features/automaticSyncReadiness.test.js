const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const bodyStart = panel.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function readiness(state) {
  const sandbox = {
    asArray: (value) => Array.isArray(value) ? value : [],
    hasText: (value) => Boolean(String(value || "").trim()),
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("syncStatusOk"),
    extractFunction("syncStatusFailure"),
    extractFunction("overviewSyncReadiness"),
    "this.check = overviewSyncReadiness;",
  ].join("\n"), sandbox);
  return JSON.parse(JSON.stringify(sandbox.check(state)));
}

test("pending code sync is informational because plan submission synchronizes automatically", () => {
  const setup = { workerTunnels: [{ id: "w1", enabled: true }] };
  assert.deepEqual(readiness({ setup, codeSync: { hub: "待同步", workers: "待同步" } }), {
    ready: false,
    failure: false,
    status: "运行时自动同步",
  });
  assert.deepEqual(readiness({ setup, codeSync: { hub: "running", workers: "同步中", fingerprint: "abc" } }), {
    ready: false,
    failure: false,
    status: "运行时自动同步",
  });
  assert.deepEqual(readiness({ setup, codeSync: { hub: "已同步", workers: "已同步 1 台", fingerprint: "abc" } }), {
    ready: true,
    failure: false,
    status: "已确认",
  });
  assert.deepEqual(readiness({ setup, codeSync: { hub: "failed: permission denied", workers: "待同步" } }), {
    ready: false,
    failure: true,
    status: "失败",
  });
  assert.deepEqual(readiness({ setup, codeSync: { hub: "同步失败：权限不足", workers: "待同步", fingerprint: "abc" } }), {
    ready: false,
    failure: true,
    status: "失败",
  });
});

test("overview only blocks explicit sync failures", () => {
  assert.match(panel, /runGateStatus = [^\n]+"运行时自动同步"/);
  assert.match(panel, /if \(sync\.failure\) blockers\.push\(\["代码同步失败"/);
  assert.doesNotMatch(panel, /blockers\.push\(\["代码待同步"/);
  assert.match(panel, /overviewRuntimeChip\("同步", sync\.failure \? "error" : sync\.ready \? "good" : "info", sync\.status\)/);
  assert.match(panel, /确认运行后会自动生成代码指纹，并同步 Hub 与参与 Worker/);
});
