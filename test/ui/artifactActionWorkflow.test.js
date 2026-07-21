const test = require("node:test");
const assert = require("node:assert/strict");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("artifact workflow actions are available and delete uses native danger confirmation", () => {
  const html = renderPanelHtml();
  for (const command of ["archiveArtifacts", "syncArtifacts", "completeThreeWay", "deleteArtifacts", "reconcileDeletions"]) {
    assert.match(html, new RegExp(command));
  }
  assert.match(html, /data-danger="true"/);
  assert.doesNotMatch(html, /confirm\(/);
});