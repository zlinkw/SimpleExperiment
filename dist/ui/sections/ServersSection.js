"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serversSection = exports.ServersSection = void 0;
/**
 * ServersSection - 服务器/隧道板块
 * 提取自 PanelHtml.ts 1214-1223 section[data-section="servers"]
 */
class ServersSection {
    id = "servers";
    title = "服务器管理";
    order = 1;
    renderHtml(_state) {
        return `
    <section class="section-card" data-section="servers" data-anchor="servers" data-title="服务器管理">
      <div class="section-head">
        <div class="section-title">
          <h2>服务器管理</h2>
          <div class="section-desc">Xshell、端口、项目父目录</div>
        </div>
      </div>
      <div id="serverCards" data-anchor="servers-list"></div>
    </section>`;
    }
    renderCss() { return ""; }
    renderScript() {
        return `
function renderServers(state){
  var el=document.querySelector('[data-section="servers"]');
  if(!el) return;
  var c=document.getElementById('serverCards');
  if(c && state && state.servers) c.textContent=JSON.stringify(state.servers).slice(0,400);
}
`;
    }
}
exports.ServersSection = ServersSection;
exports.serversSection = new ServersSection();
exports.default = ServersSection;
