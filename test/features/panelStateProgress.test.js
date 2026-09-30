const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../../src/features/PanelStateProgress.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = { exports: {} };
vm.runInNewContext(code, { exports: loaded.exports, module: loaded });

test("heartbeats with an unchanged rendered sequence eventually detect a stalled UI", () => {
  let stalled = 0;
  for (let ack = 0; ack < 2; ack++) {
    const result = loaded.exports.observeStateRenderProgress(20, 18, stalled, 3);
    stalled = result.consecutiveStalledAcks;
    assert.equal(result.unhealthy, false);
  }
  const third = loaded.exports.observeStateRenderProgress(20, 18, stalled, 3);
  assert.equal(third.unhealthy, true);
  assert.equal(loaded.exports.observeStateRenderProgress(20, 20, third.consecutiveStalledAcks, 3).consecutiveStalledAcks, 0);
});
