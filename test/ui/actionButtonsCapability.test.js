const test = require("node:test");
const assert = require("node:assert/strict");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("action buttons are capability-driven", () => {
  const html = renderPanelHtml();
  assert.match(html, /uiCapabilityMap/);
  for (const command of ["validatePlan", "runPlan", "stopExperiment", "parseResults", "archiveArtifacts", "selfCheck", "listRemoteFiles", "downloadRemoteFile", "uploadRemoteFile"]) {
    assert.match(html, new RegExp(command), command);
  }
  assert.match(html, /需要升级 Hub Agent/);
  assert.match(html, /button\.disabled/);
});