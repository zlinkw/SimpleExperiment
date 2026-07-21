const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("result workbench uses clear Chinese entry labels while retaining source identifiers", () => {
  assert.match(panel, /<b>数据集画像<\/b><span>CSV \/ 数据划分 \/ 泄漏<\/span>/);
  assert.match(panel, /<b>检查点清理预案<\/b><span>预演 \/ 保留策略<\/span>/);
  assert.match(panel, /<b>PPT 绘图契约<\/b><span>结果索引 \/ 统计 \/ 论文表格<\/span>/);
  assert.match(panel, /treeObjectItem\("results", "数据集画像"/);
  assert.match(panel, /treeObjectItem\("results", "检查点清理预案"/);
  assert.match(panel, /pptPlotButton\("统计结果", statisticsSourcePath, "statistics"/);
  assert.match(panel, /pptPlotButton\("论文表格", paperTableSourcePath, "paper table"/);
  assert.match(panel, /pptPlotButton\("样本级结果", analysisArtifacts\.caseLevelPath, "case_level"/);
  assert.match(panel, /pptPlotButton\("异常原因", analysisArtifacts\.anomalyPath, "root cause\/storyline"/);
  assert.match(panel, /\["论文声明", String\(claimCount\)/);
  assert.doesNotMatch(panel, /<b>Dataset 画像<\/b>/);
  assert.doesNotMatch(panel, /<b>Checkpoint 预案<\/b>/);
});
