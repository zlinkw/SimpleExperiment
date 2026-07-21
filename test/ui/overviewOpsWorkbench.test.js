const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");

function panelSource() {
  return fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
}

test("visible UI source does not contain common replacement characters", () => {
  const files = [
    path.join(root, "src", "ui", "PanelHtml.ts"),
    path.join(root, "README.md"),
    path.join(root, "package.json"),
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.equal(source.includes("\uFFFD"), false, `${path.relative(root, file)} contains replacement characters`);
  }
});

test("middle column overview renders compact status cards and communication risk matrix", () => {
  const source = panelSource();

  assert.match(source, /function renderOverviewOpsWorkbench/);
  assert.match(source, /\.overviewOpsWorkbench/);
  assert.match(source, /\.overviewStatusGrid/);
  assert.match(source, /\.overviewStatusCard/);
  assert.match(source, /data-overview-card/);
  assert.match(source, /function overviewStatusCard/);
  assert.match(source, /function overviewMini/);
  assert.match(source, /function renderCommunicationMatrix/);
  assert.match(source, /\.communicationMatrixGrid/);
  assert.match(source, /overviewLegacyRows/);
});

test("top command center is compact status path and leaves actions to right inspector", () => {
  const source = panelSource();

  assert.match(source, /id="workbenchCommandCenter"/);
  assert.match(source, /function renderCommandCenter/);
  assert.match(source, /function renderWorkbenchObjectStrip/);
  assert.match(source, /function renderWorkflowStageRail/);
  assert.match(source, /function renderWorkflowBlockerBar/);
  assert.match(source, /function objectTile/);
  assert.match(source, /data-command="pauseAll"/);
  assert.match(source, /data-command="resumeNetwork"/);
  assert.match(source, /statusLegend/);
  assert.match(source, /legendDot good/);
  assert.match(source, /\.commandCenter/);
  assert.match(source, /\.commandCenterGrid \{ display: none; \}/);
  assert.match(source, /\.objectStrip/);
  assert.match(source, /\.workflowStageRail/);
  assert.match(source, /\.workflowBlockerBar/);
  assert.match(source, /\.objectTile/);
  assert.match(source, /renderPinnedActions/);
  assert.match(source, /inspectorActionButton/);

  const renderCommandCenter = source.match(/function renderCommandCenter[\s\S]*?function renderWorkflowStageRail/)?.[0] || "";
  assert.doesNotMatch(renderCommandCenter, /workflowCard\(/);
  assert.doesNotMatch(renderCommandCenter, /actionButton\(/);

  assert.match(source, /el\("publishActions"\)\.className = "publishActionDeck"/);
  assert.match(source, /workbenchInspectorActions\("sync"\)\.map/);
  for (const id of ["experimentActions", "resultActions", "artifactActions", "diagnosticActions"]) {
    assert.match(source, new RegExp(`el\\("${id}"\\)\\.className = "actionGrid statusOnly"`));
  }
});

test("non graded cards default to neutral gray instead of attention colors", () => {
  const source = panelSource();

  assert.match(source, /\.workflowStage \{[\s\S]*border-left: 4px solid #CBD5E1;/);
  assert.match(source, /\.workflowCard \{[\s\S]*border-left: 4px solid #CBD5E1;/);
  assert.match(source, /\.communicationPathCard \{[\s\S]*border-left: 4px solid #CBD5E1;/);
  assert.match(source, /\.featureReadinessCard \{[\s\S]*border-left: 4px solid #CBD5E1;/);
  assert.match(source, /\.targetMatrixCard \{[\s\S]*border-left: 4px solid #CBD5E1;/);
  assert.match(source, /\.topologyNode\.local, \.topologyNode\.hub, \.topologyNode\.worker, \.topologyNode\.sftp \{ border-left-color: #CBD5E1;/);
  assert.match(source, /function workflowStage[\s\S]*tone \|\| ""/);
  assert.match(source, /function workflowCard[\s\S]*tone \|\| ""/);
  assert.match(source, /function overviewStatusCard[\s\S]*tone \|\| ""/);
  assert.doesNotMatch(source, /\.workflowStage \{[^}]*border-left: 4px solid #2563EB;/);
  assert.doesNotMatch(source, /\.workflowCard \{[^}]*border-left: 4px solid #2563EB;/);
});

test("scheduler strategy card keeps glossary and direct configuration hints", () => {
  const source = panelSource();

  assert.match(source, /function renderSchedulerGlossary/);
  assert.match(source, /\.schedulerGlossary/);
  assert.match(source, /operationEventMaxDelayMs/);
  assert.match(source, /workerActionMinIntervalMs/);
  assert.match(source, /workerActionMaxConcurrent/);
  assert.match(source, /pollSeconds/);
  assert.match(source, /jitterSeconds/);
  assert.match(source, /workerStatusTtlSeconds/);
});

test("narrow width guards prevent Chinese labels and buttons from overlapping", () => {
  const source = panelSource();

  assert.match(source, /button, input, select, textarea \{ max-width: 100%; min-width: 0; box-sizing: border-box; \}/);
  assert.match(source, /button \{ white-space: normal; overflow-wrap: anywhere; line-height: 1\.25; \}/);
  assert.match(source, /\.resourceTree \*, \.mainColumn \*, \.workbenchInspector \* \{ min-width: 0; \}/);
  assert.match(source, /input, select, textarea, pre, code, \.pill, \.status-chip, \.summaryLine, \.muted, \.detail, \.subtle, \.tree-text, \.tree-title, \.tree-subtitle \{ overflow-wrap: anywhere; \}/);
  assert.match(source, /@media \(max-width: 760px\)[\s\S]*\.toolbar, \.workflowActions, \.actionGrid, \.publishActionDeck, \.serverBadges \{ grid-template-columns: 1fr; justify-content: stretch; \}/);
  assert.match(source, /@media \(max-width: 760px\)[\s\S]*\.toolbar > \*, \.workflowActions > \*, \.actionGrid > \*, \.publishActionDeck > \*, \.serverBadges > \* \{ width: 100%; \}/);
});