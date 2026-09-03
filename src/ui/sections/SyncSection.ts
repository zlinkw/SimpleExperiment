import type { Section } from "./types";

/**
 * SyncSection - 代码同步板块
 * 提取自 PanelHtml.ts 1319-1332 section[data-section="sync"]
 */
export class SyncSection implements Section {
  readonly id = "sync";
  readonly title = "发布与同步";
  readonly order = 5;
  renderHtml(_state?: unknown): string {
    return `
      <section class="section-card" data-section="sync" data-anchor="sync" data-title="发布与同步">
        <div class="section-head">
          <div class="section-title">
            <h2>发布与同步</h2>
            <div class="section-desc">GitHub、SFTP、Agent</div>
          </div>
        </div>
        <div class="syncPublishPanel" data-anchor="sync-publish">
          <div id="publishFlow" data-anchor="sync-flow"></div>
          <div id="publishActions" class="actionGrid"></div>
          <div id="codeSyncState" class="muted"></div>
        </div>
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
