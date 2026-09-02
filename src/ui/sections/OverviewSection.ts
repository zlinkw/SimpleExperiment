import type { Section } from "./types";

/**
 * OverviewSection - 运维总览板块
 * 提取自 PanelHtml.ts 1202-1213 section[data-section="overview"]
 */
export class OverviewSection implements Section {
  readonly id = "overview";
  readonly title = "运维总览";
  readonly order = 0;
  renderHtml(_state?: unknown): string {
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
  renderCss(): string { return ""; }
  renderScript(): string {
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
export const overviewSection = new OverviewSection();
export default OverviewSection;
