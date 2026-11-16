"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resultsSection = exports.ResultsSection = void 0;
/**
 * ResultsSection - 结果文件板块
 * 提取自 PanelHtml.ts 1290-1332 section[data-section="results"]
 */
class ResultsSection {
    id = "results";
    title = "结果文件";
    order = 6;
    renderHtml(_state) {
        return `
      <section class="section-card" data-section="results" data-anchor="results" data-title="结果文件">
        <div class="section-head">
          <div class="section-title">
            <h2>结果文件</h2>
            <div class="section-desc">按数据集浏览总表、方法结果与原始文件</div>
          </div>
        </div>
        <div class="resultMainPane">
          <div id="resultCommandPhaseLine" class="commandPhaseLine muted" role="status" aria-live="polite"></div>
          <div id="resultSummary" data-anchor="results-summary"></div>
        </div>
      </section>`;
    }
    renderCss() { return ""; }
    renderScript() {
        return `
function renderResults(state){
  var el=document.querySelector('[data-section="results"]');
  if(!el) return;
}
`;
    }
}
exports.ResultsSection = ResultsSection;
exports.resultsSection = new ResultsSection();
exports.default = ResultsSection;
