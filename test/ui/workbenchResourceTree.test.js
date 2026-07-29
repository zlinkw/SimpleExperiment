const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "..");

function panelSource() {
  return fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
}

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) return "";
  const endIndex = source.indexOf(end, startIndex + start.length);
  return endIndex < 0 ? source.slice(startIndex) : source.slice(startIndex, endIndex);
}

test("panel uses draggable three column workbench with searchable resource tree", () => {
  const source = panelSource();

  assert.match(source, /<aside id="resourceTree" class="resourceTree"/);
  assert.match(source, /id="resourceTreeSearch"/);
  assert.match(source, /resourceTreeFilter/);
  assert.match(source, /data-search-text/);
  assert.match(source, /overscroll-behavior: contain/);
  assert.match(source, /scroll-snap-type: y proximity/);
  assert.match(source, /tree-empty/);
  assert.match(source, /id="resourceTreeInspector"/);
  assert.match(source, /data-section-target/);
  assert.match(source, /function renderResourceTree/);
  assert.match(source, /function setupResourceTreeObserver/);
  assert.match(source, /function updateResourceTreeActiveSection/);
  assert.match(source, /function renderResourceTreeInspector/);
  assert.match(source, /function resourceTreeNextStep/);
  assert.match(source, /\.tree-inspector-facts/);
  assert.match(source, /\.tree-group-label/);
  assert.match(source, /\.tree-child-list/);
  assert.match(source, /\.tree-object/);
  assert.match(source, /function treeChildList/);
  assert.match(source, /function treeObjectItem/);
  assert.match(source, /function serverTreeObjects/);
  assert.match(source, /function gpuTreeObjects/);
  assert.match(source, /function taskTreeObjects/);
  assert.match(source, /const groups = order\.map\(\(section\) =>/);
  assert.doesNotMatch(source, /groups\.find\(\(item\) => item\.label === entry\.label\)/);
});

test("panel exposes resizable columns, collapse controls, and persisted layout fields", () => {
  const panel = panelSource();
  const extension = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");

  assert.match(panel, /#cardDeck \{ --tree-col: 280px; --inspector-col: 360px;/);
  assert.match(panel, /grid-template-columns: var\(--tree-col\) 8px minmax\(var\(--main-min\), 1fr\) 8px var\(--inspector-col\)/);
  assert.match(panel, /class="layoutResizer left"/);
  assert.match(panel, /class="layoutResizer right"/);
  assert.match(panel, /data-resize-column="tree"/);
  assert.match(panel, /data-resize-column="inspector"/);
  assert.match(panel, /function beginLayoutResize/);
  assert.match(panel, /function updateLayoutResize/);
  assert.match(panel, /function finishLayoutResize/);
  assert.match(panel, /collapseAllSections/);
  assert.match(panel, /expandAllSections/);
  assert.match(panel, /function setAllSectionsCollapsed/);
  assert.match(panel, /function normalizeLayoutColumns/);
  assert.match(panel, /currentUiLayout\.columns/);
  assert.match(extension, /columns: \{ tree: 280, inspector: 360 \}/);
  assert.match(extension, /detailActions: \[\]/);
  assert.match(extension, /pinnedActions: \[\]/);
  assert.match(extension, /function normalizeUiLayoutColumns/);
  assert.match(extension, /function normalizeUiButtonActions/);
  assert.match(extension, /function normalizeUiButtonPayload/);
  assert.match(extension, /clampUiNumber\(record\.tree, 220, 420/);
});

test("extension reuses fixed UI layout validation sets", () => {
  const extension = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const helpers = between(extension, "function normalizeUiLayout(input)", "function clampUiNumber");

  assert.match(extension, /const UI_LAYOUT_SECTION_KEYS = new Set\(defaultUiSectionOrder\)/);
  assert.match(extension, /const PINNED_UI_COMMANDS = new Set\(/);
  assert.match(extension, /const UI_BUTTON_ACTION_COMMANDS = new Set\(/);
  assert.match(extension, /const UI_BUTTON_PAYLOAD_KEYS = new Set\(/);
  assert.match(helpers, /UI_LAYOUT_SECTION_KEYS\.has/);
  assert.match(helpers, /PINNED_UI_COMMANDS\.has/);
  assert.match(helpers, /UI_BUTTON_ACTION_COMMANDS\.has/);
  assert.match(helpers, /UI_BUTTON_PAYLOAD_KEYS\.has/);
  assert.doesNotMatch(helpers, /const (?:known|allowed) = new Set/);
});

test("right inspector supports pinned actions and publish sync command group", () => {
  const source = panelSource();

  assert.match(source, /<aside id="workbenchInspector" class="workbenchInspector"/);
  assert.match(source, /function renderWorkbenchInspector/);
  assert.match(source, /function workbenchInspectorFacts/);
  assert.match(source, /function workbenchInspectorActions/);
  assert.match(source, /function workbenchInspectorEvents/);
  assert.match(source, /function renderInspectorEvent/);
  assert.match(source, /function renderPinnedActions/);
  assert.match(source, /function inspectorActionButton/);
  assert.match(source, /\.pinnedActions/);
  assert.match(source, /data-pin-command/);
  assert.match(source, /pinnedCommandDefaults/);
  assert.match(source, /normalizePinnedCommands/);
  assert.match(source, /pinnedCommands/);
  assert.match(source, /sync: \[\["/);
  for (const command of [
    "publishGithub",
    "syncGithub",
    "overwriteGithub",
    "uploadProjectToHub",
    "uploadProjectToWorkers",
    "distributeCodeToWorkers",
    "deployLatestAgent",
    "configureSftpIgnores",
  ]) {
    assert.match(source, new RegExp(`"${command}"`));
  }
});

test("right and pinned actions enforce explicit scoped context", () => {
  const source = panelSource();
  const actionButtonBlock = between(source, "function actionButton", "function rowActionButton");
  const scopedBlock = between(source, "function scopedActionMissingContextReason", "function hasTaskObjectTarget");
  const refreshBlock = between(source, "function refreshContextualActionButtons", "function planButtonDisableReason");
  const stateSignatureBlock = between(source, "function contextActionStateSignature", "function contextRefreshPayloadFromButton");
  const auditBlock = between(source, "function auditButtonPayloadWarnings", "function genericButtonHelp");

  assert.match(source, /const taskObjectScopedCommands = new Set/);
  assert.match(source, /const taskBatchScopedCommands = new Set/);
  assert.match(source, /const endpointScopedCommands = new Set/);
  assert.match(actionButtonBlock, /actionButtonDisableReason\(command, pendingPayload, options\)/);
  assert.match(actionButtonBlock, /data-context-action="true"/);
  assert.match(scopedBlock, /storedAction && taskObjectScopedCommands\.has\(command\)/);
  assert.match(scopedBlock, /请从任务行重新加入工作详情或右侧置顶/);
  assert.match(scopedBlock, /endpointScopedCommands\.has\(command\)/);
  assert.match(scopedBlock, /explicitPlanFileCommands\.has\(command\)/);
  assert.match(refreshBlock, /button\[data-context-action="true"\], button\[data-batch-selected="true"\]/);
  assert.match(refreshBlock, /contextRefreshPayloadFromButton\(button, command, options\)/);
  assert.doesNotMatch(refreshBlock, /payloadFromButton\(button\)/);
  assert.doesNotMatch(refreshBlock, /configInputValue\(/);
  assert.doesNotMatch(refreshBlock, /plan-preview-/);
  assert.match(refreshBlock, /actionButtonDisableReason\(command, payload/);
  assert.match(stateSignatureBlock, /const hostSignature = String\(\(state && state\.contextActionSignature\) \|\| ""\)/);
  assert.match(stateSignatureBlock, /if \(hostSignature\) return hostSignature/);
  assert.doesNotMatch(stateSignatureBlock, /objectReferenceKey\(state\),/);
  for (const key of ["state.capabilities", "state.realtime", "state.selection", "state.workerProbes", "state.plans", "state.recentPlans"]) {
    assert.match(stateSignatureBlock, new RegExp(`objectReferenceKey\\(${key.replace(".", "\\.")}\\)`));
  }
  for (const key of ["state.connectionMode", "state.lastSnapshotAt", "state.debugBundlePath"]) {
    assert.match(stateSignatureBlock, new RegExp(key.replace(".", "\\.")));
  }
  assert.match(source, /function contextRefreshPayloadFromButton/);
  assert.match(source, /requiresExplicitSavedPlanPayload/);
  assert.match(auditBlock, /scopedActionMissingContextReason\(command, buttonDatasetActionPayload\(button\)/);
  assert.match(auditBlock, /closest\("\.pinnedActions"\)/);
});

test("resource tree active state does not rewrite inspector during realtime refresh", () => {
  const source = panelSource();
  const updateActive = between(source, "function updateResourceTreeActiveSection", "function renderResourceTreeInspector");
  const renderFunction = between(source, "function render(state)", "function commandNeedsLoading");
  const clickHandler = between(source, 'const treeTarget = event.target.closest("[data-section-target]");', "const collapse = event.target.closest");

  assert.doesNotMatch(updateActive, /renderWorkbenchInspector|innerHTML|renderResourceTreeInspector/);
  assert.equal((renderFunction.match(/renderWorkbenchInspector\(state\)/g) || []).length, 1);
  assert.match(clickHandler, /renderResourceTreeInspector\(activeResourceSection, activeResourceAnchor\)/);
  assert.match(clickHandler, /renderWorkbenchInspector\(lastState \|\| \{\}\)/);
  assert.match(source, /\.tree-inspector \{[^}]*height: 34px;[^}]*overflow: hidden;/);
  assert.match(source, /\.tree-inspector-facts \{ display: none;/);
  assert.match(source, /\.tree-inspector-action \{ display: none;/);
});

test("resource tree includes stable semantic sections including publish sync", () => {
  const source = panelSource();

  for (const section of ["overview", "servers", "gpu", "tasks", "plans", "results", "operations", "diagnostics", "sync"]) {
    assert.match(source, new RegExp(`item\\("${section}"`));
  }
  assert.match(source, /normalizeUiLayout\(currentUiLayout\)\.order\.concat\(\["sync"\]\)/);
  assert.match(source, /resourceTreeMeta/);
  assert.match(source, /aria-current/);
  assert.match(source, /\.tree-item\.is-current/);
});

test("resource tree search text reuses node identities and refreshes replacements", () => {
  const source = panelSource();
  const block = between(source, "function resourceTreeSearchText", "function treeAnchorId");
  const sandbox = {
    resourceTreeSearchTextCache: new WeakMap(),
    asArray(value) { return Array.isArray(value) ? value : []; },
  };
  vm.createContext(sandbox);
  vm.runInContext(block + "\nthis.searchText = resourceTreeSearchText;", sandbox);

  const child = { label: "Worker A" };
  const node = { label: "GPU", children: [child] };
  const first = sandbox.searchText(node);
  node.label = "Changed";
  child.label = "Changed child";
  assert.equal(sandbox.searchText(node), first);
  const replacement = sandbox.searchText({ label: "Changed", children: [{ label: "Changed child" }] });
  assert.match(replacement, /changed/);
  assert.match(replacement, /changed child/);
  assert.equal(sandbox.searchText('<i data-search-text="GPU Worker"></i>'), "gpu worker");
});
