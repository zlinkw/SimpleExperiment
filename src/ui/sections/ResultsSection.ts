import type { Section } from "./types";

/**
 * ResultsSection - 结果归档板块
 * 提取自 PanelHtml.ts 1290-1332 section[data-section="results"]
 */
export class ResultsSection implements Section {
  readonly id = "results";
  readonly title = "结果与归档";
  readonly order = 6;
  renderHtml(_state?: unknown): string {
    return `
      <section class="section-card" data-section="results" data-anchor="results" data-title="结果与归档">
        <div class="section-head">
          <div class="section-title">
            <h2>结果与归档</h2>
            <div class="section-desc">结果、归档、绘图</div>
          </div>
        </div>
        <h3>结果操作</h3>
        <div id="pptPlotConfig" data-anchor="results-ppt-plot"></div>
        <div id="resultActions" class="actionGrid"></div>
        <h3>归档与删除</h3>
        <div id="artifactActions" class="actionGrid"></div>
        <div class="resultWorkbench">
          <div class="resultMainPane">
            <h3>结果摘要</h3>
            <div id="resultSummary" data-anchor="results-summary"></div>
            <div class="contractQuickLinks" data-anchor="results-contract">
              <a id="results-contract" class="summaryLink" href="#results-contract" title="metrics/case/env/artifact">输出契约</a>
              <a id="results-dataset" class="summaryLink" data-anchor="results-dataset" href="#results-dataset" title="CSV/split/leakage">数据集画像</a>
              <a id="results-checkpoints" class="summaryLink" data-anchor="results-checkpoints" href="#results-checkpoints" title="dry-run/retention">检查点清理预案</a>
              <a id="results-plotting" class="summaryLink" data-anchor="results-plotting" href="#results-plotting" title="registry/statistics/table">PPT 绘图契约</a>
            </div>
            <h3>实验记录</h3>
            <div id="traceTable" data-anchor="results-traces"></div>
          </div>
          <aside id="traceDetailPane" class="traceDetailPane" aria-live="polite"></aside>
        </div>
      </section>`;
  }
  renderCss(): string {
    return `
    .resultWorkbench { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 12px; }
    .traceDetailPane { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; background: var(--vscode-editor-background); min-height: 120px; }
`;
  }
  renderScript(): string {
    return `
function renderResults(state){
  var el=document.querySelector('[data-section="results"]');
  if(!el) return;
}
`;
  }
}
export const resultsSection = new ResultsSection();
export default ResultsSection;
