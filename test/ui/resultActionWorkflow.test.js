const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("result workflow actions and evidence summary are wired without duplicated middle-column buttons", () => {
  const extension = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  for (const action of ["parse-results", "refresh-results", "run-quality-gate", "run-statistics", "export-paper-table", "check-claim-evidence"]) {
    assert.match(extension, new RegExp(action));
  }
  assert.match(extension, /getResultsSummary/);
  assert.match(extension, /scheduleResultsSummaryRefreshFromRealtime\(state\)/);
  assert.match(extension, /state\.resultSummaryDirtySeq/);
  assert.match(extension, /refreshResultsSummaryFromRealtime/);
  assert.match(extension, /结果事件 \$\{String\(reason \|\| "realtime"\)\} 后自动刷新摘要失败/);
  assert.match(extension, /error instanceof RequestBudget_1\.RequestBudgetDeniedError/);
  assert.match(extension, /scheduleResultsSummaryBudgetRetryFromRealtime/);
  assert.match(extension, /lastResultsSummaryRefreshedDirtyKey/);
  assert.match(extension, /pendingResultsSummaryDirtyKey/);
  assert.match(extension, /lastResultsSummaryRealtimeErrorKey/);
  assert.match(extension, /resultsSummaryRefreshRetryCount/);
  assert.match(extension, /resultsSummaryRefreshInFlight/);
  assert.match(extension, /private resultsSummaryRefreshTimerGeneration = 0/);
  assert.match(extension, /if \(this\.resultsSummaryRefreshInFlight\) \{\s*this\.pendingResultsSummaryDirtyKey = this\.pendingResultsSummaryDirtyKey \|\| `manual:\$\{Date\.now\(\)\}`/);
  assert.match(extension, /this\.resultsSummaryRefreshInFlight = true/);
  assert.match(extension, /finally \{\s*if \(generation === this\.projectContextGeneration && client === this\.client\)\s*this\.resultsSummaryRefreshInFlight = false;\s*\}/);
  assert.match(extension, /if \(this\.resultsSummaryRefreshInFlight\) \{\s*this\.scheduleResultsSummaryTimer\("inflight", dirtyKey, 500 \+ Math\.floor\(Math\.random\(\) \* 500\)\);\s*return;\s*\}/);
  const timerBlock = extension.match(/scheduleResultsSummaryTimer\(reason, dirtyKey, delayMs\)[\s\S]*?resolveSelectedPlanFile/)?.[0] || "";
  assert.match(timerBlock, /const timerGeneration = \+\+this\.resultsSummaryRefreshTimerGeneration/);
  assert.match(timerBlock, /const generation = this\.projectContextGeneration/);
  assert.match(timerBlock, /const client = this\.client/);
  assert.match(timerBlock, /if \(this\.resultsSummaryRefreshTimer === timer\)\s*this\.resultsSummaryRefreshTimer = undefined/);
  assert.match(timerBlock, /timerGeneration !== this\.resultsSummaryRefreshTimerGeneration \|\| generation !== this\.projectContextGeneration \|\| client !== this\.client/);
  const resetBlock = extension.match(/private resetClient\(\)[\s\S]*?private async applyTopologyRuntimeMode/)?.[0] || "";
  assert.match(resetBlock, /this\.resultsSummaryRefreshTimerGeneration \+= 1/);
  assert.match(resetBlock, /clearTimeout\(this\.resultsSummaryRefreshTimer\)/);
  assert.match(resetBlock, /this\.resultsSummaryRefreshInFlight = false/);
  assert.match(resetBlock, /if \(this\.view\?\.visible\)\s*this\.retryPendingResultsSummaryOnVisible\(\)/);
  assert.match(extension, /async dispose\(\)[\s\S]{0,1200}this\.resultsSummaryRefreshTimerGeneration \+= 1;[\s\S]{0,120}if \(this\.statePostTimer\)/);
  assert.match(extension, /scheduleResultsSummaryFailureRetryFromRealtime/);
  assert.match(extension, /markResultsSummaryDirtyKeyRefreshed\(dirtyKey\)/);
  assert.match(extension, /dirtyKey === this\.lastResultsSummaryRefreshedDirtyKey/);
  assert.match(extension, /blockReason !== "cooldown" && blockReason !== "rate_limited"/);
  assert.match(extension, /baseDelay \+ jitter/);
  assert.match(extension, /const errorKey = \[dirtyKey, String\(reason \|\| "realtime"\), message\]\.join\("::"\)/);
  assert.match(extension, /errorKey !== this\.lastResultsSummaryRealtimeErrorKey/);
  assert.match(extension, /后续同一错误会合并显示/);
  assert.doesNotMatch(extension, /lastResultsSummaryDirtyKey/);

  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  assert.match(html, /id="resultActions"/);
  assert.match(html, /el\("resultActions"\)\.className = "actionGrid statusOnly"/);
  assert.match(html, /results: \[\["解析结果", "parseResults"\], \["刷新结果", "refreshResults"\]/);
  for (const command of ["parseResults", "refreshResults", "runQualityGate", "runStatistics", "checkClaimEvidence", "exportPaperTable"]) {
    assert.match(html, new RegExp(`"${command}"`));
  }

  assert.match(html, /id="traceTable"/);
  assert.match(html, /class="resultWorkbench"/);
  assert.match(html, /resultEvidenceWorkbench/);
  assert.match(html, /function renderResultEvidenceWorkbench/);
  assert.match(html, /pairedComparisons/);
  assert.match(html, /function pairedComparisonTitle/);
  assert.match(html, /return "缺配对结果"/);
  assert.match(html, /candidate \+ " vs " \+ baseline/);
  assert.match(html, /statisticsResultCount/);
  assert.match(html, /unsupported/);
  assert.match(html, /needs experiment/);
  assert.match(html, /function claimEvidenceStatusLabel/);
  assert.match(html, /claimDisplayStatus/);
  assert.match(html, /claimEvidenceStatus/);
  assert.match(html, /claimUnsupportedCount/);
  assert.match(html, /claimNeedsExperimentCount/);
  assert.match(html, /claimEvidencePath/);
  assert.match(html, /claimEvidenceList/);
  assert.match(html, /title="论文证据"/);
  assert.match(html, /renderClaimEvidencePreview/);
  assert.doesNotMatch(html, /论文证据明细：显示/);
  assert.doesNotMatch(html, /正式论文建议复核统计检验/);
  assert.doesNotMatch(html, /需要至少两个方法在相同/);
  assert.match(html, /id="traceDetailPane"/);
  assert.match(html, /function renderTraceCard/);
  assert.match(html, /function renderTraceDetailPane/);
  assert.match(html, /tracePath/);
  assert.match(html, /function traceActionButton/);
  assert.match(html, /function renderTraceReadiness/);
  assert.match(html, /function renderTraceTimeline/);
  assert.match(html, /data-command="' \+ escAttr\(command\) \+ '"/);
  assert.doesNotMatch(html, /data-section="traces"/);
});
