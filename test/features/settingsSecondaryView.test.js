const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const panel = readSource("src/ui/PanelHtml.ts");

test("settings is a secondary main-column view without changing side drawers", () => {
  assert.match(panel, /body:not\(\.main-view-settings\) #mainColumn > \[data-section="settings"\] \{ display: none; \}/);
  assert.match(panel, /body\.main-view-settings #mainColumn > \[data-section\]:not\(\[data-section="settings"\]\) \{ display: none; \}/);
  assert.match(panel, /class="cardTools">\s*<button[^>]*data-main-view="workspace"[^>]*title="关闭设置，返回主界面"[^>]*>关闭设置<\/button>/);
  assert.doesNotMatch(panel, /settingsBackButton[^>]*>&#8592;<\/button>/);
  assert.match(panel, /function applyMainViewForSection\(section\)/);
  assert.match(panel, /function switchMainView\(view\)/);
  assert.match(panel, /lastWorkspaceResource = \{ section: activeResourceSection/);
  assert.match(panel, /applyMainViewForSection\(nextSection\);\s*expandResourceSection\(nextSection\);/);
});

function productionFunction(name) {
  const start = panel.indexOf(`    function ${name}(`);
  const end = panel.indexOf("\n    function ", start + 10);
  assert.ok(start >= 0 && end > start);
  return panel.slice(start, end);
}

test("settings navigation immediately renders server configuration even when the card was already expanded", () => {
  const renders = [];
  const calls = [];
  const sandbox = {
    activeResourceSection: "plans", activeResourceAnchor: "plans", lastState: { setup: { workerTunnels: [{ id: "worker-a" }] } },
    applyMainViewForSection: section => calls.push(["view", section]),
    expandResourceSection: section => calls.push(["expand", section]),
    syncPanelSectionInterest: () => calls.push(["interest"]),
    renderSectionIfVisible: (state, section, options) => renders.push({ state, section, options }),
    updateResourceTreeActiveSection() {}, resolveResourceScrollTarget: () => null, detailsOpenState: {},
    scrollToResourceTarget() {}, forceWorkbenchInspectorRender() {}, renderWorkbenchInspector() {},
  };
  vm.runInNewContext(`${productionFunction("navigateToResourceTarget")}\nnavigateToResourceTarget('settings', 'settings');`, sandbox);
  assert.equal(renders.length, 1);
  assert.equal(renders[0].section, "settings");
  assert.equal(renders[0].options.force, true);
  assert.equal(renders[0].state.setup.workerTunnels[0].id, "worker-a");
  assert.equal(sandbox.activeResourceSection, "settings");
  assert.ok(calls.some(row => row[0] === "interest"));
});

test("card decoration preserves the settings close button across full-state and layout refreshes", () => {
  const tools = { dataset: {}, innerHTML: "" };
  const card = { dataset: { section: "settings" }, classList: { contains: () => false }, querySelector: () => ({ querySelector: () => tools }) };
  const sandbox = { document: { querySelectorAll: () => [card] }, layoutEdit: false, escAttr: value => value };
  vm.runInNewContext(`${productionFunction("decorateCards")}\ndecorateCards();`, sandbox);
  assert.match(tools.innerHTML, /data-main-view="workspace"[^>]*>关闭设置/);
  assert.doesNotMatch(tools.innerHTML, /data-collapse-section/);
  tools.dataset.cardToolsSig = "";
  vm.runInNewContext("decorateCards();", sandbox);
  assert.match(tools.innerHTML, /关闭设置/);
});

test("resource tree omits settings even if saved layout order contains it", () => {
  const source = productionFunction("renderResourceTree");
  const sidebar = { innerHTML: "" };
  const sandbox = {
    currentUiLayout: { order: ["plans", "settings", "results"] }, normalizeUiLayout: value => value,
    resourceTreeNextRenderKey: value => value.join("|"), resourceTreeNeedsRerender: () => true,
    resourceTreeStaticModelCached: () => ({ plans: { label: "Plans", node: { section: "plans" } }, settings: { label: "Settings", node: { section: "settings" } }, results: { label: "Results", node: { section: "results" } } }),
    normalizeTreeTone: value => value, registerResourceTreeNodes() {}, updateResourceTreeHead() {}, resourceTreeFilter: "",
    el: id => id === "resourceTreeBody" ? sidebar : null, setHtmlIfChanged: (node, html) => { node.innerHTML = html; },
    renderResourceTreeNode: node => node.section, escAttr: value => value, updateResourceTreeActiveSection() {}, renderResourceTreeInspector() {},
    activeResourceSection: "plans", activeResourceAnchor: "plans",
  };
  vm.runInNewContext(`${source}\nrenderResourceTree({});`, sandbox);
  assert.match(sidebar.innerHTML, /plans/);
  assert.match(sidebar.innerHTML, /results/);
  assert.doesNotMatch(sidebar.innerHTML, /settings/);
});

test("settings secondary view keeps pin and three-column mechanisms intact", () => {
  assert.match(panel, /data-drawer-pin="tree"/);
  assert.match(panel, /data-drawer-pin="inspector"/);
  assert.match(panel, /body\.tree-pinned #cardDeck/);
  assert.match(panel, /body\.inspector-pinned #cardDeck/);
  assert.match(panel, /data-section-target="settings"/);
});
