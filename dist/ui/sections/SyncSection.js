"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncSection = exports.SyncSection = void 0;
/**
 * SyncSection - 代码同步板块
 * 提取自 PanelHtml.ts 1319-1332 section[data-section="sync"]
 */
class SyncSection {
    id = "sync";
    title = "发布与同步";
    order = 5;
    renderHtml(_state) {
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
    renderCss() { return ""; }
    renderScript() {
        return `
function renderSync(state){
  var el=document.querySelector('[data-section="sync"]');
  if(!el) return;
}
`;
    }
}
exports.SyncSection = SyncSection;
exports.syncSection = new SyncSection();
exports.default = SyncSection;
