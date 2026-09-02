"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overviewSection = exports.OverviewSection = void 0;
/**
 * OverviewSection - 运维总览板块
 * 提取自 PanelHtml.ts 1202-1213 section[data-section="overview"]
 */
class OverviewSection {
    id = "overview";
    title = "运维总览";
    order = 0;
    renderHtml(_state) {
        return `
    <section class="section-card" data-section="overview" data-anchor="overview" data-title="运维总览">
      <div class="section-head">
        <div class="section-title">
          <h2>运维总览</h2>
          <div class="section-desc">连接、实时流、错误</div>
        </div>
      </div>
      <div id="summary" class="workbench-summary" data-anchor="overview-status"></div>
      <div id="opsFlow" class="ops-flow" data-anchor="overview-flow"></div>
      <div class="muted">Xshell 本地隧道 · 127.0.0.1 · 全局服务器配置</div>
    </section>`;
    }
    renderCss() { return ""; }
    renderScript() {
        return `
function renderOverview(state){
  var el=document.querySelector('[data-section="overview"]');
  if(!el) return;
  var s=document.getElementById('summary');
  if(s && state && state.summary) s.textContent=String(state.summary);
}
`;
    }
}
exports.OverviewSection = OverviewSection;
exports.overviewSection = new OverviewSection();
exports.default = OverviewSection;
