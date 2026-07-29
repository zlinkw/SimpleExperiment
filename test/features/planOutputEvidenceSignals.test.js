const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
const planBuilder = fs.readFileSync(path.join(__dirname, "../../src/features/PlanBuilder.ts"), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function loadSignalFilter(source) {
  const sandbox = {
    EMPTY_OUTPUT_DERIVATION_VALUES: Object.freeze([]),
    planOutputEvidenceSignalsCache: new WeakMap(),
    asArray(value) { return Array.isArray(value) ? value : []; },
    uniqueText(values) {
      const seen = new Set();
      return values.filter((item) => {
        const key = String(item || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    uniqueStrings(values) { return [...new Set(values.filter(Boolean))]; },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction(source, "planOutputEvidenceSignals")}\nthis.filterSignals = planOutputEvidenceSignals;`, sandbox);
  return (plan) => JSON.parse(JSON.stringify(sandbox.filterSignals(plan)));
}

test("plan output evidence signals accept result dir and command param labels", () => {
  const signalPattern = /result_csv\|results_csv\|metrics_csv\|summary_csv\|标准契约\|结果文件\|结果目录\|命令参数\|文本日志\|classification_report\|stdout\|stderr\|metricRegex/;
  assert.match(extension, signalPattern);
  assert.match(panel, signalPattern);
  assert.match(planBuilder, /signals\.add\(`结果目录: \$\{dir\}`\)/);
  assert.match(planBuilder, /signals\.add\("命令参数: result_csv"\)/);

  const plan = {
    outputSignals: [
      "结果文件: metrics_summary.csv",
      "结果目录: work_dirs/demo",
      "命令参数: result_csv",
      "文本日志: stdout/stderr",
      "普通说明",
    ],
  };
  const expected = plan.outputSignals.slice(0, 4);
  assert.deepEqual(loadSignalFilter(panel)(plan), expected);
  assert.deepEqual(loadSignalFilter(extension)(plan), expected);
});
