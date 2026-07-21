const assert = require("node:assert/strict");
const test = require("node:test");
const { PanelHtmlBuilder } = require("../../dist/ui/PanelHtml.js");

test("recent action errors render as compact rows", () => {
  const html = new PanelHtmlBuilder().render({
    actionErrors: [
      {
        command: "runPlan",
        message: "失败",
        timestamp: "2026-07-10T00:00:00.000Z",
        suggestion: "检查计划",
      },
    ],
  });

  assert.match(html, /errorRow/);
  assert.doesNotMatch(html, /errorCard/);
});