import type { Section } from "./types";

/**
 * SyncSection - 运行环境准备板块（目标序第1位）
 * 运行时顺序以 legacy RESOURCE 为准
 */
export class SyncSection implements Section {
  readonly id = "sync";
  readonly title = "运行环境准备";
  readonly order = 1;
  renderHtml(_state?: unknown): string {
    return `
    <section class="section-card" data-section="sync" data-anchor="sync" data-title="运行环境准备">
      <div class="section-head">
        <div class="section-title">
          <h2>运行环境准备</h2>
        </div>
      </div>
      <div id="syncChainOverview" data-anchor="settings-chain-overview"></div>
      <div id="syncServerOverview" data-anchor="sync-servers"></div>
    </section>`;
  }
  renderCss(): string { return ""; }
  renderScript(): string {
    return `
function renderSync(state){
  var el=document.querySelector('[data-section="sync"]');
  if(!el) return;
}
`;
  }
}
export const syncSection = new SyncSection();
export default SyncSection;
