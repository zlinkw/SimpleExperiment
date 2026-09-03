import type { Section } from "./types";

/**
 * ExecutionSection - 执行进展板块
 * 提取自 PanelHtml.ts 1376-1398 section[data-section="execution"]
 */
export class ExecutionSection implements Section {
  readonly id = "execution";
  readonly title = "运行进度";
  readonly order = 5;
  renderHtml(_state?: unknown): string {
    return `
    <section class="section-card" data-section="execution" data-anchor="execution" data-title="运行进度">
      <div class="section-head">
          <div class="section-title">
            <h2>运行进度</h2>
            <div class="section-desc">调度操作与实验任务统一视图（关联字段：planFile / revision / opId）· 调度报错自动透传并转为终态</div>
          </div>
          <div class="section-head-actions">
            <span class="pill" title="原“操作进度”与“任务运行状态”已原生合并为单一卡片">已合并</span>
          </div>
      </div>
      <div id="operationList" data-anchor="execution-operations"></div>
      <div id="taskSummary" data-anchor="execution-tasks"></div>
      <div id="taskBatchActions" class="actionGrid"></div>
      <div id="taskProgressCards" data-anchor="tasks-progress"></div>
      <div class="taskWorkbench">
        <div id="taskTable" data-anchor="tasks-list"></div>
        <aside id="taskDetailPane" class="taskDetailPane" aria-live="polite"></aside>
      </div>
      <div hidden data-anchor="tasks"></div>
      <div hidden data-anchor="operations"></div>
      <div hidden data-anchor="tasks-summary"></div>
      <div hidden data-anchor="operations-list"></div>
    </section>`;
  }
  renderCss(): string {
    return `
    .taskWorkbench { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 10px; }
    .taskDetailPane { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; background: var(--vscode-editor-background); min-height: 100px; }
    .taskProgressCards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; margin: 8px 0; }
`;
  }
  renderScript(): string {
    return `
function renderExecution(state){
  var el=document.querySelector('[data-section="execution"]');
  if(!el) return;
}
`;
  }
}
export const executionSection = new ExecutionSection();
export default ExecutionSection;
