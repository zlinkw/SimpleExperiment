"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gpuSection = exports.GpuSection = void 0;
/**
 * GpuSection - GPU 状态板块
 * 提取自 PanelHtml.ts 1333-1343 section[data-section="gpu"]
 */
class GpuSection {
    id = "gpu";
    title = "GPU 状态";
    order = 5;
    renderHtml(_state) {
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
    renderCss() {
        return `
    .gpuServerStack { display: grid; gap: 10px; }
    .gpuCard { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; background: var(--subtle-bg); }
`;
    }
    renderScript() {
        return `
function renderGpu(state){
  var el=document.querySelector('[data-section="gpu"]');
  if(!el) return;
}
`;
    }
}
exports.GpuSection = GpuSection;
exports.gpuSection = new GpuSection();
exports.default = GpuSection;
