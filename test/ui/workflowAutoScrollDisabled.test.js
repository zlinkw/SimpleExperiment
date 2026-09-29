const assert = require("node:assert/strict");
const test = require("node:test");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("workflow completion does not auto-scroll and manual navigation stays available", () => {
  const html = renderPanelHtml();
  assert.doesNotMatch(html, /maybeAutoAdvanceFromSync|lastSyncChainGreen|isSyncChainGreen/);
  assert.match(html, /function scrollMainColumnToSection\(next\)/);
  assert.match(html, /navigateToResourceTarget\(submittedTarget\.section, submittedTarget\.anchor, \{ force: true \}\)/);
});

test("completed schedule history starts collapsed with its Plan recovery controls intact", () => {
  const html = renderPanelHtml();
  assert.match(html, /<details class="executionPlanHistory"><summary>已完成 Plan 历史/);
  assert.match(html, /data-command="runPlan"/);
  assert.match(html, /data-command="recallPlanToLocalQueue"/);
  assert.match(html, /data-command="stopAndClearPlan"/);
});
