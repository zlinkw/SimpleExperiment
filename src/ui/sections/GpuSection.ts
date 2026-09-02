// @ts-nocheck
import type { Section } from "./types";

/**
 * GpuSection - GPU 状态板块
 * 提取自 PanelHtml.ts 1333-1343 section[data-section="gpu"]
 */
export class GpuSection implements Section {
  readonly id = "gpu";
  readonly title = "GPU 状态";
  readonly order = 5;
  renderHtml(_state?: unknown): string {
    return `
    <section class="section-card" data-section="gpu" data-anchor="gpu" data-title="GPU 状态">
      <div class="section-head">
        <div class="section-title">
          <h2>GPU 状态</h2>
          <div class="section-desc">显存、利用率、温度、进程</div>
        </div>
      </div>
      <div id="gpuHistoryOverview" data-anchor="gpu-history-overview"></div>
      <div id="gpuSummary" data-anchor="gpu-summary"></div>
      <div id="gpuGrid" class="gpuServerStack" data-anchor="gpu-grid"></div>
    </section>`;
  }
  renderCss(): string {
    return `
    .gpuServerStack { display: grid; gap: 10px; }
    .gpuCard { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; background: var(--subtle-bg); }
`;
  }
  renderScript(): string {
    return `
function renderGpu(state){
  var el=document.querySelector('[data-section="gpu"]');
  if(!el) return;
}
`;
  }
}
export const gpuSection = new GpuSection();
export default GpuSection;
