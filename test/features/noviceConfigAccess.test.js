const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadLayoutHelpers() {
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  const defaultUiSectionOrderStart = source.indexOf("const defaultUiSectionOrder");
  const defaultUiSectionOrderEnd = source.indexOf("const defaultUiLayout =");
  const defaultStart = source.indexOf("const defaultUiLayout =");
  const defaultEnd = source.indexOf("const uiActionCommands");
  const normalizeStart = source.indexOf("function normalizeUiLayout(input)");
  const clampEnd = source.indexOf("function arrayFromRecord");
  const uiActionStart = source.indexOf("const uiActionCommands");
  const uiActionEnd = source.indexOf("const actionCommandMap");
  const prelude = [
    source.slice(defaultUiSectionOrderStart, defaultUiSectionOrderEnd),
    source.slice(defaultStart, defaultEnd),
    source.slice(uiActionStart, uiActionEnd),
    source.slice(normalizeStart, clampEnd),
  ].join("\n");
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(prelude + "\nthis.exports = { defaultUiLayout, defaultUiSectionOrder, normalizeUiLayout };", sandbox);
  return sandbox.exports;
}

test("servers config stays expanded near primary workflow by default", () => {
  const helpers = loadLayoutHelpers();
  assert.equal(helpers.defaultUiSectionOrder[0], "plans");
  assert.equal(helpers.defaultUiSectionOrder[1], "results");
  assert.equal(helpers.defaultUiSectionOrder[2], "tasks");
  assert.equal(helpers.defaultUiSectionOrder[3], "servers");
  assert.equal(helpers.defaultUiLayout.collapsed.servers, false);
  assert.equal(helpers.defaultUiLayout.collapsed.operations, true);
  assert.equal(helpers.defaultUiLayout.collapsed.diagnostics, true);
});

test("topbar keeps tunnel/network actions for novice recovery", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
  // start/test 全局动作在分区卡片里渲染（overview/ servers-sessions）。
  assert.match(source, /data-command="startAllConnections"/);
  assert.match(source, /data-command="testAll"/);
  // topbar 提供网络与布局恢复入口。
  assert.match(source, /class="topbar-actions"/);
  assert.match(source, /data-command="pauseAll"/);
  assert.match(source, /data-command="resumeNetwork"/);
  assert.match(source, /data-command="resetUiLayout"/);
  assert.match(source, /全局配置/);
});
