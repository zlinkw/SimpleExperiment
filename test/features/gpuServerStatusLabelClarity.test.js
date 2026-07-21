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

function labelStatus(value) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("labelStatus")}\nthis.labelStatus = labelStatus;`, sandbox);
  return sandbox.labelStatus(value);
}

test("GPU server statuses use clear Chinese labels", () => {
  assert.equal(labelStatus("online"), "在线");
  assert.equal(labelStatus("offline"), "离线");
  assert.equal(labelStatus("stale"), "已过期");
  assert.equal(labelStatus("degraded"), "降级");
});

test("unknown GPU server status remains available for compatibility", () => {
  assert.equal(labelStatus("future_gpu_state"), "future_gpu_state");
});

test("GPU server card keeps raw status in the tooltip", () => {
  assert.match(panel, /const statusText = labelStatus\(server\.status \|\| "未知"\)/);
  assert.match(panel, /原始服务器状态：/);
  assert.match(panel, /gpuServerStatusClass\(server\.status\)/);
});
