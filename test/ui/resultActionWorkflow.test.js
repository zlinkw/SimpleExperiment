const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readSource } = require("../_helpers/sourceReader");

const root = path.resolve(__dirname, "..", "..");

test("result workflow actions and evidence summary are wired without duplicated middle-column buttons", async () => {
  const extension = readSource("src/extension.ts");
  for (const action of ["parse-results", "refresh-results", "run-quality-gate", "run-statistics", "export-paper-table", "check-claim-evidence"]) {
    assert.match(extension, new RegExp(action));
  }
  assert.match(extension, /getResultsSummary/);
  assert.match(extension, /state\.resultSummaryDirtyKey/);
  const realtimeRefreshBlock = extension.match(/scheduleResultsSummaryRefreshFromRealtime\(state\)[\s\S]*?scheduleResultsSummaryBudgetRetryFromRealtime/)?.[0] || "";
  assert.match(realtimeRefreshBlock, /void state/);
  assert.doesNotMatch(realtimeRefreshBlock, /getResultsSummary|scheduleResultsSummaryTimer/);
  const manualRefreshBlock = extension.match(/async refreshResultsSummary\(planHint = "", manualRetry = false\)[\s\S]*?scheduleResultsSummaryRefreshFromRealtime/)?.[0] || "";
  assert.match(manualRefreshBlock, /resultCollectionHost\(this\)\.update\(\)/);
  const collector = fs.readFileSync(path.join(root, 'src/extension/ResultCollectionHost.ts'), 'utf8');
  // Verify same-scope sharing and post-settlement release through update().
  const { ResultCollectionHost } = require('../../dist/extension/ResultCollectionHost.js');
  const service = new ResultCollectionHost({ captureProjectContext: () => ({root:'fixture',generation:1}) });
  const pending=[];service.collect=()=>new Promise(resolve=>pending.push(resolve));
  const first=service.update(),second=service.update(),sharedReads=pending.length;
  const report={current:true};pending.forEach(resolve=>resolve(report));
  assert.deepEqual(await Promise.all([first,second]),[report,report]);assert.equal(sharedReads,1,'same-scope callers share one query');
  const next=service.update(),totalReads=pending.length;pending.at(-1)(report);await next;
  assert.equal(totalReads,2,'a completed request is released before a later query');
  assert.match(collector, /context = h\.captureProjectContext\(\)/);
  assert.match(collector, /h\.projectContextIsCurrent\(context\) && key\(\) === binding/);
  // The current collector reads server declarations. This existing fixture rejects
  // queue, sync-ledger and registry reads instead of treating them as live results.
  require('../_helpers/registerTsRequire');
  const fresh = require('../_helpers/freshResultHost').fixture();
  assert.equal((await fresh.service.update()).current,true);
  const timerBlock = extension.match(/scheduleResultsSummaryTimer\(reason, dirtyKey, delayMs\)[\s\S]*?resolveSelectedPlanFile/)?.[0] || "";
  assert.match(timerBlock, /const timerGeneration = \+\+this\.resultsSummaryRefreshTimerGeneration/);
  assert.match(timerBlock, /const generation = this\.projectContextGeneration/);
  assert.match(timerBlock, /const client = this\.client/);
  assert.match(timerBlock, /if \(!String\(reason \|\| ""\)\.startsWith\("manual"\)\) return/);
  assert.match(timerBlock, /this\.resultsSummaryRefreshRetryCount >= 3/);
  assert.match(timerBlock, /if \(this\.resultsSummaryRefreshTimer === timer\)\s*this\.resultsSummaryRefreshTimer = undefined/);
  assert.match(timerBlock, /timerGeneration !== this\.resultsSummaryRefreshTimerGeneration \|\| generation !== this\.projectContextGeneration \|\| client !== this\.client/);
  const resetBlock = extension.match(/private resetClient\(\)[\s\S]*?private async applyTopologyRuntimeMode/)?.[0] || "";
  assert.match(resetBlock, /this\.resultsSummaryRefreshTimerGeneration \+= 1/);
  assert.match(resetBlock, /clearTimeout\(this\.resultsSummaryRefreshTimer\)/);
  assert.match(resetBlock, /this\.resultsSummaryRefreshInFlight = false/);
  assert.match(extension, /async dispose\(\)[\s\S]*?this\.resultsSummaryRefreshTimerGeneration \+= 1;\s*if \(this\.statePostTimer\)/);
  assert.doesNotMatch(extension, /lastResultsSummaryDirtyKey/);

  const html = readSource("src/ui/PanelHtml.ts");
  assert.doesNotMatch(html, /id="resultActions"/);
  assert.doesNotMatch(html, /id="artifactActions"/);
  assert.match(html, /results: \[\["更新全部 PLAN 结果", "syncPendingPlanArtifacts"\]/);
  for (const command of ["syncPendingPlanArtifacts", "runQualityGate", "runStatistics", "checkClaimEvidence", "exportPaperTable"]) {
    assert.match(html, new RegExp(`"${command}"`));
  }

  assert.match(html, /id="resultSummary"/);
  assert.doesNotMatch(html, /id="traceTable"/);
  assert.doesNotMatch(html, /class="resultWorkbench"/);
  assert.match(html, /resultEvidenceWorkbench/);
  assert.match(html, /function renderResultEvidenceWorkbench/);
  assert.match(html, /本项目全部 PLAN · 全部启用 Worker/);
  assert.match(html, /PLAN 上下文：/);
  assert.match(html, /对本项目全部 PLAN 生效/);
  assert.doesNotMatch(html, /data-command="(?:parseResults|refreshResults|syncAllResultArtifacts)"/);
  assert.match(html, /pairedComparisons/);
  assert.match(html, /function pairedComparisonTitle/);
  assert.match(html, /return "缺配对结果"/);
  assert.match(html, /candidate \+ " vs " \+ baseline/);
  assert.match(html, /statisticsResultCount/);
  assert.match(html, /unsupported/);
  assert.match(html, /needsExperiment/);
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
  assert.doesNotMatch(html, /id="traceDetailPane"/);
  assert.match(html, /function renderTraceCard/);
  assert.match(html, /function renderTraceDetailPane/);
  assert.match(html, /tracePath/);
  assert.match(html, /function traceActionButton/);
  assert.match(html, /function renderTraceReadiness/);
  assert.match(html, /function renderTraceTimeline/);
  assert.match(html, /data-command="' \+ escAttr\(command\) \+ '"/);
  assert.doesNotMatch(html, /data-section="traces"/);
});
