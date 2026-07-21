const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("result facts explain claim evidence states while retaining compatibility labels", () => {
  assert.match(panel, /"缺少本地证据的论文声明数量（unsupported）"/);
  assert.match(panel, /"仍需实验验证的论文声明数量（needs experiment）"/);
  assert.match(panel, /\["claimUnsupportedCount", "claim_unsupported_count"\]/);
  assert.match(panel, /\["claimNeedsExperimentCount", "claim_needs_experiment_count"\]/);
  assert.doesNotMatch(panel, /"unsupported claim 数量"/);
  assert.doesNotMatch(panel, /"needs experiment claim 数量"/);
});
