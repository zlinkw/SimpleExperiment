const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function labelStatus(value) {
  const start = panel.indexOf("function labelStatus(");
  assert.ok(start >= 0, "missing labelStatus");
  const bodyStart = panel.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) {
      const sandbox = {};
      vm.createContext(sandbox);
      vm.runInContext(`${panel.slice(start, index + 1)}\nthis.labelStatus = labelStatus;`, sandbox);
      return sandbox.labelStatus(value);
    }
  }
  throw new Error("unterminated labelStatus");
}

test("connection and sync statuses use clear Chinese labels", () => {
  assert.equal(labelStatus("running"), "运行中");
  assert.equal(labelStatus("connected"), "已连接");
  assert.equal(labelStatus("syncing"), "同步中");
  assert.equal(labelStatus("failed: permission denied"), "失败：permission denied");
  assert.equal(labelStatus("completed_with_errors"), "部分失败");
});

test("unknown status remains available for compatibility diagnostics", () => {
  assert.equal(labelStatus("agent_future_state"), "agent_future_state");
  assert.equal(labelStatus("同步完成 2 台"), "同步完成 2 台");
});

test("sync surfaces render labels while retaining raw status in titles", () => {
  assert.match(panel, /Hub 原始状态：/);
  assert.match(panel, /Worker 原始状态：/);
  assert.match(panel, /labelStatus\(sync\.hub \|\| "待同步"\)/);
  assert.match(panel, /labelStatus\(sync\.workers \|\| "待同步"\)/);
});
