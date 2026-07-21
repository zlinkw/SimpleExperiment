const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("plan output evidence signals accept result dir and command param labels", () => {
  const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
  assert.match(extension, /function planOutputEvidenceSignals/);
  assert.match(extension, /结果目录/);
  assert.match(extension, /命令参数/);
  assert.match(
    extension,
    /result_csv\|results_csv\|metrics_csv\|summary_csv\|标准契约\|结果文件\|结果目录\|命令参数\|文本日志\|classification_report\|stdout\|stderr\|metricRegex/
  );
  // 7c23e89 基线面板 planOutputEvidenceSignals 用较窄候选正则。
  assert.match(panel, /function planOutputEvidenceSignals/);
  assert.match(
    panel,
    /result_csv\|results_csv\|metrics_csv\|summary_csv\|标准契约\|结果文件\|文本日志\|classification_report\|stdout\|stderr\|metricRegex/
  );
  const planBuilder = fs.readFileSync(path.join(__dirname, "../../src/features/PlanBuilder.ts"), "utf8");
  assert.match(planBuilder, /signals\.add\(`结果目录: \$\{dir\}`\)/);
  assert.match(planBuilder, /signals\.add\("命令参数: result_csv"\)/);
});
