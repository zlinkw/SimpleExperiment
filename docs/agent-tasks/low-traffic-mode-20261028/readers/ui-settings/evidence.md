# 低流量模式 — 只读调查 B（顶部颜色条 UI + 配置持久化 + 测试模式）

## 0. 元信息

| 项 | 值 |
|---|---|
| 任务ID | low-traffic-mode-20261028 / 调查B（readers/ui-settings） |
| 文档修订 | r1（本文首版，采集即定稿） |
| 负责人实例 | scout 子代理（Pi 原生执行循环，只读阶段） |
| 采集时间 | 2026-10-28（本机 Windows） |
| 仓库 root/worktree | `D:/GitRepo/MCP/zlk-cluster-orchestrator`（原生 Windows 工作副本，无 /repos 映射） |
| 核实 HEAD | `git rev-parse HEAD` = `7a6062fa10441cc5852166a34138781a2604d9e9`；`origin/master` 与 `master` 同值（三条输出一致） |
| 脏改动 | `git status --porcelain` 行数 = 0（工作区干净） |
| 执行环境 | win32 / Git Bash（Pi host_windows 通道），只读命令 exitCode=0 |
| 本轮写入 | 仅本文件；仓库内零写入、未编译、未装依赖、未运行测试 |

关键文件 SHA256（sha256sum 采集时点，用于后续 hash 过期判定）：

```text
e2516d720612d224761a9fbee2115a76257fca95b22539d3387e63274151f751  src/ui/PanelHtml.ts
394cbfaac95a5fd9faa218441b6a79a5217ce50c956ab044830bea0508c6c5c6  src/ui/PanelHtml.legacy.ts
21237a6a847413c8e0a5a98956d992a43899f51e3d0352e4b3212eea233f590e  src/extension/legacy.ts
229716a173f2489627f59b2938c301b09f372f2c4f86f1381cd00838d5666df0  src/tunnel/TunnelGateway.ts
0866aed5a71b3010ab445bb25d5bed3c05f71d4f0adb3af477f0bfd6e80e8a4c  scripts/test-workflow.json
f9060f1d66b410ae040f1b66b3745be61d296536a98c3d9ad0e05f9950427378  package.json
657efdd353d2a4d5e9f31c4c2191f3878bbcfbfd385e1a2ec4fabff7766655de  AGENTS.md
84cf4dbc6e5a9648da4c4af557a7c2f3b4f26860efe72104f6ea55f49e352696  test/ui/panelTransientStorage.test.js
25731ef404fd2954d1e589ceec666d820365c53020c7d6fdd4440d77f962cf15  test/ui/webviewButtonsHandled.test.js
4453694b1f8cfea22664d961ab9cb00683f22b49725c9e6961eaf5b9e9c675db  test/ui/webviewActionAllowlist.test.js
a5526fe1e9c10ff9755fba50df448ed52480b53301de9b332c0e99f0283005aa  test/ui/panelInlineScriptSyntax.test.js
f03535ceabb82982d0e48334833587e29dfb061028d1c6d52715ce7716ea432b  test/features/panelWebviewScriptHealth.test.js
28c990ba9976795b1d1cedac4ca0737a93c5dbdbc88ec00c79c2730bf316e124  test/_helpers/sourceReader.js
781e50be002b69dbe59621b6fbe045e18e9b3f3ce622f36ee71d15e2af24ab2b  test/_helpers/legacyMethod.js
59980c0d69b0bab91466cd0d1280800450c33dd8bbd00ef44a0c7f0650bbe86f  scripts/test-selection.js
221285d8d1d9b59385e2f53e07b65d7794cde6479fab3a4917a1273caff7fc20  test/features/panelMessageDispatch.test.js
```

## 1. 问题与范围

用户原始需求（原样保留）：

> 目前插件还缺一个低流量模式，我的部分服务器的流量是收费的，而目前的插件完全没有为节省流量设计。需要优化出一个新版本。交给gpt规划，确保功能完整的同时，用户选择低流量模式后能正常使用。注意，默认还是正常模式，只是要加个按钮在顶部颜色条后面，点击后开启，再次点击后关闭。开启时尽可能节省和服务器间通信消耗的流量

已有证据：顶部区域真实 markup、面板→宿主消息全链路、两套持久化机制（VS Code Memento + webview setState）、面板 JS 语法门禁与按钮/命令一致性测试，均已取到原文（见 §3）。
已确认「不存在」：全仓 `src/**` 对 `lowTraffic|低流量|low-traffic` 零命中（E18），当前无任何低流量实现或残留。
仍是假设（不写成事实）：低流量具体要压低哪些请求（轮询/快照/GPU 采样/tmux 列举/同步）由 GPT 规划决定，本文只提供可挂钩点。
范围外：远端 Agent 侧改动、SimpleSFTP 配套包、发布与安装。

## 2. 背景与调用地图（边均关联 E 编号）

面板是 WebviewView（`simpleExperiment.panel`），HTML 由宿主一次性注入，之后只靠双向 postMessage。

- HTML 生成：`src/extension/legacy.ts:26910 loadPanelHtml()` → `renderPanelBootstrapDocument`（`src/ui/PanelBootstrap.ts`）→ `renderPanelHtml()`（`src/ui/PanelHtml.ts:1-45`，E01）→ 默认实际走 `src/ui/PanelHtml.legacy.ts`（19441 行；工厂路径只在 `FEATURE_FACTORY_PANEL=1` 时启用并带 vm.Script 门禁回退）。**新增按钮的真实文件是 PanelHtml.legacy.ts，不是 49 行的门面文件。**
- 顶部区域：`<header class="topbar">`（E02）内两块 —— 左 `div.statusLegend`（用户口中的「顶部颜色条」，E02/E03）；右 `div.topbar-actions`（现有按钮/徽章容器，E02/E04）。插入点在 `.topbar-actions` 内，按「在颜色条后面」的字面语义位置为 1340 与 1341 之间；也可放 `pluginVersionChip` 之前（1348 前），同一 flex 容器，样式已就绪。
- 面板 → 宿主：click 委托（E06）→ `vscode.postMessage(Object.assign({ command }, payload))` → 宿主 `onDidReceiveMessage`（E08）→ `handleMessage`（先过 `getSafeCommand` 白名单，E09）→ `handleMessageCore` 的 if/case 链。
- 宿主 → 面板：`postState()` → `flushStatePost()` → `postMessage({ type: "state", seq, state })`（E12）；面板 `handleIncomingWebviewMessage` 按 seq 收敛为 `lastState` 后 `scheduleStateRender()`（E13）。状态类型是宽松记录，新增字段无需改接口声明。
- 握手/重载恢复：面板 `requestInitialPanelState()` 发 `webviewReady`（E13），宿主收到后 `postState(true, true)` 推首帧；面板自身 UI 态另有 webview `getState/setState` 通道（E11）。
- 节流既有能力（低流量挂点）：`realtimeRefreshPolicy()`（E14a）读 `tunnelConfig.refreshProfile`；`refreshProfiles` 含 `manual_only{health:0,snapshot:0,stream:false}`（E14b）；宿主已有本地命令 `pauseAll`/`resumeNetwork`（E14c）与 `RequestBudget`（`requestBudgetConfigFromTunnel` 当前把 `maxRequestsPerMinute` 硬置 0）。

## 3. 当前相关详细源码（原文）

### E01 面板 HTML 门面默认委托 legacy
`src/ui/PanelHtml.ts` 符号 `renderPanelHtml`，行 1-45（节选，文件共 49 行；完整文件 SHA256 见 §0）。

```ts
/**
 * src/ui/PanelHtml.ts - Facade (Factory Refactor v0.4.92) - HOTFIX
 * 紧急回退：直接委托 legacy，确保握手 JS 完整
 * 工厂路径仅在显式开启时使用，待 JS 补全后再切回
 */
import { withRunConfirmation } from "./RunConfirmation";
export function renderPanelHtml(): string {
  let factoryFailure = "";
  let legacyFailure = "";
  // 工厂灰度开关：仅当环境变量或全局标记显式开启时走工厂，否则直接 legacy
  try {
    const useFactory = (typeof process !== "undefined" && process.env && process.env.FEATURE_FACTORY_PANEL === "1")
      || (typeof (globalThis as any).__panelFactoryOptIn !== "undefined" && String((globalThis as any).__panelFactoryOptIn) === "1");
    if (useFactory) {
      /* 工厂路径：需含 data-manual-dispatch / acquireVsCodeApi / requestInitialPanelState /
         handleIncomingWebviewMessage，且 new (require("vm").Script)(renderer.renderScript()) 通过才采用 */
    }
  } catch (e) {
    factoryFailure = String((e as Error)?.message || e).slice(0, 400);
    try { console.error("[PanelHtml facade] factory failed, fallback to legacy", e); } catch {}
  }
  // 默认回退 legacy - 保证 958k 完整 HTML + 831k JS + 握手
  try {
    const legacy = require("./PanelHtml.legacy");
    if (legacy && typeof legacy.renderPanelHtml === "function") {
      return withRunConfirmation(legacy.renderPanelHtml());
    }
  } catch (e) { legacyFailure = String((e as Error)?.message || e).slice(0, 400); }
```

含义：改 UI 要改 `PanelHtml.legacy.ts`；若要保持工厂灰度一致，需同步 `src/ui/sections/*`（`sections/index.ts` 的 `createAllSections` 只有 sync/plans/gpu/tmux/execution/results/diagnostics/settings 八段，topbar 不在其中）。

### E02 顶部「颜色条」与顶部按钮容器真实 markup（唯一按钮插入位置证据）
`src/ui/PanelHtml.legacy.ts` 行 1337-1351（外层是 `return ```...```` 模板字符串，落盘即最终 HTML）。

```html
  <div class="app-shell">
    <header class="topbar" aria-label="状态图例与全局快捷操作">
      <div class="statusLegend" aria-label="状态颜色图例"><span class="legendItem"><span class="legendDot good"></span>正常</span><span class="legendItem"><span class="legendDot info"></span>运行 / 信息</span><span class="legendItem"><span class="legendDot warn"></span>等待 / 注意</span><span class="legendItem"><span class="legendDot error"></span>异常 / 失败</span><span class="legendItem"><span class="legendDot mine"></span>我的任务 / 重点</span></div>
      <div class="topbar-actions">
        <button data-command="bootstrapProject" type="button" title="扫描工作区，识别 experiments/plans 下的实验计划与项目配置&amp;#10;同时检查服务器与 Agent 等前置条件&amp;#10;已有的计划与接入配置不会重复写入">识别工作区</button>
        <span class="status-chip">Xshell</span>
        <span class="status-chip">全局配置</span>
        <span class="status-chip status-completed">仅本机端口</span>
        <button data-command="verifyAgentVersion" class="secondary" type="button" title="校验 Agent 版本&amp;#10;对比本机与各服务器上的 Agent 版本&amp;#10;不一致时提示升级">校验 Agent 版本</button>
        <button data-command="clearCache" class="secondary" type="button" title="查看各 Worker 已结束任务超过 7 天的临时文件与日志，审核完整路径后才可删除">缓存回收审核</button>
        <button data-command="openSetupGuide" class="secondary" type="button" title="打开该步骤的处理说明&amp;#10;含配置步骤与常见问题排查">配置说明</button>
        <span class="status-chip pluginVersionChip" id="pluginVersionChip" title="当前插件版本">v${PLUGIN_VERSION}</span>
        <button type="button" class="secondary topbarIconButton" data-section-target="settings" data-anchor-target="settings" title="设置" aria-label="设置">&amp;#9881;</button>
      </div>
    </header>
```

结论：`statusLegend`（1339）即「顶部颜色条」；同一 `header.topbar` 内的 `.topbar-actions`（1340-1350）是唯一合适的按钮位置，1340 与 1341 之间即「颜色条后面」。

### E03 颜色条样式
`src/ui/PanelHtml.legacy.ts` 行 1035-1043。

```css
    .statusLegend { position: relative; z-index: 3; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-width: 0; flex: 1 1 auto; padding: 0; border: 0; background: transparent; backdrop-filter: none; color: #475569; box-shadow: none; }
    .legendItem { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 750; white-space: nowrap; }
    .legendDot { width: 8px; height: 8px; border-radius: 999px; background: #2563EB; box-shadow: 0 0 0 3px rgba(37, 99, 235, .10); }
    .legendDot.good { background: #16A34A; box-shadow-color: rgba(22, 163, 74, .12); }
    .legendDot.info { background: #2563EB; }
    .legendDot.warn { background: #D97706; box-shadow-color: rgba(217, 119, 6, .12); }
    .legendDot.error { background: #DC2626; box-shadow-color: rgba(220, 38, 38, .12); }
    .legendDot.mine { background: #7C3AED; box-shadow-color: rgba(124, 58, 237, .12); }
```

### E04 顶部按钮/徽章现成样式（新按钮可直接复用）
`src/ui/PanelHtml.legacy.ts` 行 122-125：

```css
    .topbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; min-width: 0; }
    .topbar-actions { margin-left: auto; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; min-width: 0; }
    .topbar-actions button { min-height: 24px; padding: 3px 8px; font-size: 12px; }
    .topbar-actions .topbarIconButton { width: 28px; height: 28px; min-width: 28px; padding: 0; font-size: 15px; }
```

行 791（徽章 `.status-chip`，可做「开启态」视觉）：

```css
    .pill, .status-chip { display: inline-flex; align-items: center; gap: 5px; min-height: 20px; border: 1px solid var(--border); border-radius: 999px; padding: 1px 7px; background: var(--subtle-bg); color: var(--muted); font-size: 12px; }
```

另：行 1036 `.topbar-actions { align-items: center; }`；行 1270 窄屏 `.topbar-actions { justify-content: flex-start; margin-left: 0; }`。

### E05 现成「顶部开关 + 状态回显」完整先例：低效果模式（宿主注入按钮）
`src/extension/legacy.ts` 行 1108、26908-26937、24540。

```ts
    private panelLowEffectsMode = false;                                   // 1108
```

```ts
        const document = renderPanelBootstrapDocument(renderPanelHtml, renderPanelRecoveryHtml);   // 26910
        const generation = ++this.panelDocumentGeneration;
        const html = this.panelLowEffectsMode && !document.recovered
            ? document.html.replace("<body>", '<body class="panel-low-effects">')
                .replace('<div class="topbar-actions">', '<div class="topbar-actions"><button data-command="reloadPanel" type="button" title="重新加载并恢复标准视觉效果">恢复标准视觉</button>')
            : document.html;
        this.view.webview.html = this.stampPanelDocument(html, generation);
```

```ts
    private reloadPanelHtml(): void | Promise<void {                        // 26928
        if (this.panelNeedsWebviewReset) return this.resetUnresponsivePanelRenderer();
        this.panelLowEffectsMode = false;
        this.loadPanelHtml();
    }
    private reloadPanelLowEffects(): void | Promise<void {                  // 26933
        if (this.panelNeedsWebviewReset) return this.resetUnresponsivePanelRenderer();
        this.panelLowEffectsMode = true;
        this.loadPanelHtml();
    }
```

状态回显（写进诊断载荷，行 24540）：`lowEffectsMode: this.panelLowEffectsMode,`
样式开关（`src/ui/PanelHtml.legacy.ts` 行 1322-1323）：`body.panel-low-effects * @{ ... }`。
注意：该先例是**不持久化的进程内字段**（`panelLowEffectsMode` 从不写 Memento），且靠宿主字符串 `replace` 注入按钮。低流量要求跨重载保持，不能照抄这一半。

### E06 面板按钮通用点击分发（新按钮无需自绑事件，只要 data-command）
`src/ui/PanelHtml.legacy.ts` 行 3717-3718、3730-3731、3797。

```js
      const button = event.target.closest("button[data-command]");
      if (button && !button.disabled) {
        /* 3720-3757：工作详情分组滚动 + 少数命令专用 payload 组装 */
        const command = button.dataset.command;
        const payload = payloadFromButton(button);
        /* 3758-3796：commandNeedsLoading(command) 决定是否登记 pending / 发 clientActionId */
          vscode.postMessage(Object.assign({ command }, payload));
        }
        return;
      }
```

要点：`button.disabled` 直接短路（禁用态只需渲染期加 `disabled`）；未被 `commandNeedsLoading` 列入的命令不发 `clientActionId`、不进 pending，适合纯本地开关。

### E07 按钮 markup / 禁用态生成器（状态回显与禁用理由的标准写法）
`src/ui/PanelHtml.legacy.ts` 行 17461-17481，符号 `actionButton`。

```js
    function actionButton(label, command, options) {
      if (["archiveArtifacts", "deleteArtifacts", "archivePlanCopy"].includes(command)) return "";
      options = options || {};
      const savedPayload = sanitizeActionPayload(options.payload || {});
      const batchPayload = options.batch ? Object.assign({ batchSelected: "true" }, selectedTaskPayloadFromState(lastState || {})) : {};
      const pendingPayload = Object.assign({}, savedPayload, batchPayload);
      const reason = options.disabledReason || actionButtonDisableReason(command, pendingPayload, options);
      const pendingKey = pendingKeyForAction(command, pendingPayload);
      const pending = pendingButtonKeys?.has(pendingKey);
      const disabled = reason || pending ? " disabled" : "";
      const titleText = reason || (pending ? "执行中" : commandHelp(command));
      const title = titleText ? ' title="' + escAttr(titleText) + '" aria-label="' + escAttr(label + "：" + titleText) + '"' : "";
      const confirmAttr = options.confirm ? ' data-confirm="true"' : "";
      const dangerAttr = options.danger ? ' data-danger="true"' : "";
      /* 17475-17480：actionId / actionSection / configScope 等 data-* 属性 */
      return '<button data-command="' + escAttr(command) + '" data-pending-key="' + escAttr(pendingKey) + '"' + buttonPayloadAttributes(savedPayload) + actionIdAttr + actionSectionAttr + ' data-context-action="true"' + disabled + title + confirmAttr + dangerAttr + batchAttr + configScopeAttr + '>' + loadingPrefix(pending) + esc(label) + '</button>';
    }
```

开关态回显的另一先例是 `aria-pressed`（行 1362 抽屉固定按钮、2138/2147/2220 tmux 筛选按钮），例如行 2138：
```js
      html += '<button type="button" class="tmuxWindowCard other' + (allActive ? ' is-active' : '') + '" data-tmux-filter="all" aria-pressed="' + (allActive ? "true" : "false") + '" title="显示 GPU 任务概览；普通会话可在下方展开"><span>GPU 总览</span><b>' + String(gpuCandidates.length) + '</b></button>';
```
顶部 topbar 目前是**静态 HTML，无任何 JS 改写 `.topbar` 的代码**；开启/关闭文案与 `aria-pressed` 需在状态渲染链上改写（落点见 E13）。

### E08 宿主接收消息与分发
`src/extension/legacy.ts` 行 5173-5181（注册处，在 `resolveWebviewView` 内，带 view/代际守卫）：

```ts
        this.viewLifetimeDisposables.push(webviewView.webview.onDidReceiveMessage((message) => {
            if (this.view !== webviewView || this.viewGeneration !== viewGeneration) return;
            void this.handleMessage(message).catch((e) => {
                if (this.view !== webviewView || this.viewGeneration !== viewGeneration) return;
                console.error("[legacy] handleMessage unhandled", e);
                try { this.recordActionError(String(e?.message || e)); } catch {}
                try { this.postState(); } catch {}
                try { const vscode = require("vscode"); vscode.window.showErrorMessage(String(e?.message || e)); } catch {}
            });
        }));
```

行 6474-6486（`handleMessage`：白名单不过 → 记录错误 + `postState()`，即错误回执形态；原文逐字）：

```ts
    async handleMessage(message) {
        console.log("[legacy] handleMessage", message?.command, message);
        console.log("[diag] handleMessage entry", { command: stringField(message, "command"), clientActionId: stringField(message, "clientActionId") });
        const rawCommand = stringField(message, "command");
        const command = getSafeCommand(message);
        const clientActionId = stringField(message, "clientActionId");
        if (rawCommand && !command) {
            const text = ```未知或未放行的前端命令：${rawCommand}```;
            if (clientActionId)
                this.postUiCommandStatus(clientActionId, "failed", rawCommand, text);
            this.recordActionError({ command: rawCommand, message: text, suggestion: "请更新插件或清除旧布局中的失效按钮。" });
            this.postState();
            return;
        }
        /* 6487-6501：commandNeedsUiStatus / hostOperationLease 包装（见 E09 提示） */
        await this.handleMessageCore(message, command);
    }
```

行 6503-6505 与 6623-6630、6758-6763（分发链与本地型命令先例）：

```ts
    async handleMessageCore(message, command = getSafeCommand(message)) {
        if (command === "answerRunConfirmation") { this.runConfirmation.answer(message); return; }
        if (command === "retryPlanSubmission") return this.resumePlanSubmission(String(message.operationId || ""));
        /* ... 6507-6513：webview* 类消息须过 isCurrentPanelDocumentMessage；reloadRequired / 生命周期门禁 ... */
            case "reloadPanel":                                     // 6623
                await this.reloadPanelHtml();
                break;
            case "reloadPanelLowEffects":                           // 6626
                await this.reloadPanelLowEffects();
                break;
            case "pauseAll":                                        // 6758
                await this.pauseAllNetworkActivity();
                break;
            case "resumeNetwork":                                   // 6761
                this.resumeNetwork();
                break;
```

错误回执第二路径：`postUiCommandStatus(clientActionId, status, command, text)` → 面板 `item.type === "uiCommandStatus"` 分支（E13，行 4407-4419）。纯本地开关若不带 `clientActionId`，只需 `postState()` 让状态字段回显。

### E09 命令白名单（新增一条消息必须同改的集合）
`src/extension/legacy.ts`：
- 行 238-297：`type WebviewActionCommand = | "validatePlan" | ... | "cleanupDrafts";`（附注释「Update commands are intentionally local-only and do not enter the remote action map.」）
- 行 560-612：`const uiActionCommands = new Set<WebviewActionCommand>([ ... ]);`
- 行 613-643：`const SAFE_WEBVIEW_COMMANDS = new Set([ ... ]);`，含本地/诊断类命令（原文片段）：

```ts
    "webviewNotice", "webviewReady", "webviewHeartbeatAck", "webviewStateRendered", "webviewSectionInterest", "webviewSectionTelemetry", "webviewLayoutEvidence", "webviewBootstrapPhase", "webviewBootstrapError", "webviewRuntimeIncident", "webviewRenderError", "webviewVisibility", "copyPanelDiagnostics", "reloadPanel", "reloadPanelLowEffects", "reloadWindow", "recallPlanToLocalQueue", "quickSetup", /* ... */ "pauseAll",
    "resumeNetwork", "snapshot", "manualGpuSnapshot", /* ... */ "saveUiLayout", "resetUiLayout",
```

- 行 31138-31141（放行函数，逐字）：

```ts
function getSafeCommand(message) {
    const command = stringField(message, "command");
    return SAFE_WEBVIEW_COMMANDS.has(command) || uiActionCommands.has(command) ? command : "";
}
```

- 行 648：`const COMMANDS_WITHOUT_UI_STATUS = new Set(["webviewNotice", "selectPlan", "selectExperiment", "selectLogRunKey", "openPlan", "status"]);`
  行 31220-31222：`function commandNeedsUiStatus(command) { return Boolean(command) && !COMMANDS_WITHOUT_UI_STATUS.has(command); }` —— 纯 UI 切换若想避免宿主弹通知/进行中态，需加入该集合。
- 行 644-647：`const API_EXECUTABLE_COMMANDS = new Set([...uiActionCommands, ...SAFE_WEBVIEW_COMMANDS].filter((command) => !API_INTERNAL_COMMANDS.has(command)));` —— 若不希望该命令被 `simpleex` CLI/API 触发，需同时进 `API_INTERNAL_COMMANDS`（成员未取原文，见 §6）。
- 行 31150-31168：`hostOperationUiCommands` / `hostOperationLeaseActionForUiCommand` / `READ_ONLY_HOST_LEASE_UI_COMMANDS`；该处注释明确「只读查看入口不得占用宿主独占租约」→ 本地开关**不要**加入 `hostOperationUiCommands`。

### E10 持久化方式一：VS Code Memento（本项目主用，键表集中）
`src/extension/legacy.ts` 行 378-399（键表，节选）：

```ts
 const keys = {
    tunnelConfig: "simpleExperiment.tunnelGatewayConfig",
    setupConfig: "simpleExperiment.xshellRealtimeTunnelConfig",
    migrationShown: "simpleExperiment.legacyRemoteMigrationShown",
    offlineBundle: "simpleExperiment.offlineBundle",
    uiLayout: "simpleExperiment.uiLayout",
    uiProjectActions: "simpleExperiment.uiProjectActions",
    uiProjectLayout: "simpleExperiment.uiProjectLayout",
    hiddenLegacyTaskUiKeys: "simpleExperiment.hiddenLegacyTaskUiKeys",
    executionHistoryCutoffs: "simpleExperiment.executionHistoryCutoffs",
    executionHistoryHiddenOperationIds: "simpleExperiment.executionHistoryHiddenOperationIds",
    retiredOperationIds: "simpleExperiment.retiredOperationIds",
    pptPlotConfig: "simpleExperiment.pptPlotConfig",
    /* ... */
    pluginUpdateStatus: "simpleExperiment.pluginUpdateStatus",
    setupConfigurationSignature: "simpleExperiment.setupConfigurationSignature",
 };
```

行 403-421（`API_STATE_KEYS`：声明每键属 global 还是 workspace，CLI 据此读写）：

```ts
 const API_STATE_KEYS = {
    tunnelConfig: { store: "global", label: "隧道网关配置", writable: true },
    setupConfig: { store: "global", label: "Xshell 会话与服务器配置", writable: true },
    pptPlotConfig: { store: "global", label: "PPT 绘图配置（项目优先）", writable: true },
    uiLayout: { store: "global", label: "SimpleExperiment 面板布局", writable: true },
    hiddenLegacyTaskUiKeys: { store: "global", label: "隐藏旧任务 UI 键", writable: true },
    offlineBundle: { store: "workspace", label: "离线导入包", writable: false },
    uiProjectLayout: { store: "workspace", label: "项目面板布局", writable: true },
    uiProjectActions: { store: "workspace", label: "项目固定操作", writable: true },
    /* ... */
 } as Record<string, { store: "global" | "workspace"; label: string; writable: boolean }>;
```

行 3211-3239（真实写路径，节选）：

```ts
    async apiStateSet(params = {}) {
        const key = stringField(params, "key");
        const meta = API_STATE_KEYS[key];
        if (!meta) throw new Error(```未知 SimpleExperiment 状态：${key}```);
        if (!meta.writable) throw new Error(```SimpleExperiment 状态 ${key} 只读，请使用对应功能入口修改。```);
        if (params.confirm !== true) throw confirmationRequired({ operation: "state.set", requires: ["confirm"], key, current: redactApiStateValue(key, this.apiStateValue(key)) });
        const value = normalizeApiStateValue(key, params.value);
        const stateKey = (keys as Record<string, string>)[key];
        if (meta.store === "global") await this.context.globalState.update(stateKey, value);
        else await this.context.workspaceState.update(stateKey, value);
        if (key === "tunnelConfig" || key === "setupConfig") {
            this.tunnelConfig = this.loadTunnelConfig();
            this.setupConfig = this.loadSetupConfig();
            this.resetClient();
        }
        this.postState();
        return { ok: true, key, store: meta.store, value: redactApiStateValue(key, this.apiStateValue(key)) };
    }
```

行 24892-24900（读取合并顺序：globalState 存储 → settings.json 显式值覆盖）：

```ts
    loadTunnelConfig() {
        const saved = this.context.globalState.get(keys.tunnelConfig) || {};
        const config = vscode.workspace.getConfiguration("simpleExperiment");
        return (0, TunnelGateway_1.normalizeTunnelGatewayConfig)({
            ...TunnelGateway_1.defaultTunnelGatewayConfig,
            ...saved,
            connectionMode: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "connectionMode", (0, TunnelGateway_1.isRealtimeConnectionMode)(saved.connectionMode) ? saved.connectionMode : TunnelGateway_1.xshellTunnelConnectionMode),
            localPort: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.localForwardPort", saved.localPort || TunnelGateway_1.defaultTunnelGatewayConfig.localPort),
            remotePort: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.remoteAgentPort", saved.remotePort || TunnelGateway_1.defaultTunnelGatewayConfig.remotePort),
```

行 1420（workspaceState 另一处直接用法）：`void this.context.workspaceState.update("simpleExperiment.localApiPort", discovery.port).then(undefined, () => undefined);`
`src/extension/ExtensionContext.ts` 行 46-47、62-84 提供 `readGlobalState/writeGlobalState/readWorkspaceState/writeWorkspaceState` 包装（工厂路径用它）。
`api.json` 只是本地 API 发现文件（`legacy.ts:376-377`：%APPDATA%/SimpleExperiment/api.json），不是 UI 状态存储。
`package.json` 的 `contributes.configuration`（行 352 起）现有项都是 `simpleExperiment.*`（`panel.retainContextWhenHidden`（default false）、`topologyMode`、`showAdvancedCommands` 等），无 refreshProfile 项。

多窗口语义（只述事实）：`globalState` 随用户 profile 全局共享；`workspaceState` 随工作区共享（同工作区多窗口读同一份）。写 Memento 不会出现「每窗口各一份」，但两窗口同时切换会后写覆盖前写，且一方切换不会自动推送给另一方面板（面板只在宿主 `postState` 时刷新）。

### E11 持久化方式二：Webview setState（面板 UI 态）
`src/ui/PanelHtml.legacy.ts` 行 15569-15585（逐字）：

```js
    function readStoredWebviewState(api) {
      try {
        const value = typeof api.getState === "function" ? api.getState() : null;
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
      } catch (_) { return {}; }
    }

    function persistWebviewState(patch) {
      if (typeof vscode.setState !== "function") return false;
      try {
        vscode.setState(Object.assign({}, readStoredWebviewState(vscode), patch || {}));
        return true;
      } catch (_) {
        // Storage failure must not abort a render/ACK or destroy in-memory edits.
        return false;
      }
    }
```

行 1945 启动读回：`const restoredWebviewState = readStoredWebviewState(vscode);`
行 15467：`function normalizeStoredPanelMap(value, nested)`（有界化 + `__proto____BT@ 防护）。
用法示例（行 4434）：`persistWebviewState({ tmuxSelectedWorkerId: tmuxSelectedWorkerId });`
另有 GPU 表格列宽直接用 `window.localStorage`（行 11092-11141、12307-12319），仅适合纯视觉偏好。
限制（据 E11 + E13 的 `transientPanelStateNeedsRestore` 逻辑）：webview setState 只在同一 Webview 文档恢复链有效；`retainContextWhenHidden` 默认 false（`package.json` 配置项 default false）时隐藏面板即释放上下文，宿主重载 HTML 不保证读得到旧值。跨重载/跨窗口的权威值必须由宿主 Memento 提供。

### E12 宿主 → 面板状态载荷形态（新增回显字段的位置）
`src/extension/legacy.ts:190`：`type WebviewClusterState = Record<string, unknown>;`（无字段表，新增字段不需改接口声明）
行 26803-26850（`postState` 节选）：

```ts
    private postState(immediate = false, bootstrap = false): void {
        if (["disposed", "maintenance", "reload_required"].includes(this.panelLifecycleState)) return;
        if (this.extensionRuntimeVersionState().reloadRequired) { this.showPanelReloadRequired(); return; }
        if (!this.view) return;
        this.syncPanelStateFlowVisibility();
        const decision = PanelStateFlowControl_1.requestPanelStateFlowPost(this.panelStateFlow, immediate, bootstrap);
        /* ... 隐藏 / awaiting-render / 背压 抑制分支 ... */
        if (!this.webviewReady) { return; }
        if (immediate) { /* 清 timer */ this.flushStatePost(true); return; }
        /* ... */
        this.statePostTimer = setTimeout(() => this.flushStatePost(false), delayMs);
        this.statePostTimer.unref?.();
    }
```

行 27381-27459（`flushStatePost` 节选，含真实消息形状与体积门禁）：

```ts
    private flushStatePost(force, bootstrap = false): void {
        /* ... 生命周期 / 可见性 / outstandingRenderSeq 门禁 ... */
        let state: WebviewClusterState;
        const buildStartedAt = Date.now();
        try {
            state = this.buildState({ panelProjection: true });
            this.lastStateBuildErrorSignature = "";
        }
        catch (error) {
            const message = errorMessage(error);
            this.lastError = ```面板状态生成失败：${message}```;
            /* recordActionError + this.buildPanelFallbackState(this.lastError) */
        }
        /* ... */
        let stateMessage = { type: "state", seq: ++this.stateSequence, state };
        let serializedMessage = JSON.stringify(stateMessage);
        let payloadBytes = Buffer.byteLength(serializedMessage, "utf8");
        if (payloadBytes > this.statePayloadSoftLimitBytes) this.recordPanelLifecycleDiagnostic("statePayloadSoftLimit");
        if (payloadBytes > this.statePayloadHardLimitBytes) { state = this.buildPanelDegradedState(state, "面板数据量过大，已进入精简模式。"); /* 重序列化，仍超限再 buildMinimalPanelDegradedState */ }
```

宿主已有「状态体积软/硬上限 + 两级降级」；`docs/plugin-stability-improvement-plan.md:308` 明确该统计是 Host→Webview，不等于隧道流量。

### E13 面板侧状态收敛/握手恢复（UI 回显与重载恢复落点）
`src/ui/PanelHtml.legacy.ts` 行 4259-4277（握手，逐字）：

```js
    function requestInitialPanelState() {
      console.log("[webview] post webviewReady");
      try { window.dispatchEvent(new Event("simple-panel-bootstrap-ready")); } catch (_) {}
      const notice = el("initialStateNotice");
      const retry = el("initialStateRetry");
      if (notice) notice.hidden = false;
      if (retry) retry.hidden = true;
      el("initialStateMessage").textContent = "正在读取本地面板状态...";
      document.body.setAttribute("aria-busy", "true");
      vscode.postMessage({ command: "webviewReady", documentGeneration: panelDocumentGeneration, extensionVersion: panelRunningVersion, documentBuildId: panelDocumentBuildId });
      if (initialStateTimer) clearTimeout(initialStateTimer);
      initialStateTimer = window.setTimeout(() => { /* 8s 未收到 → 文案改「尚未收到本地面板状态。」+ 显示「重新读取」 */ }, 8000);
    }
```

行 4220-4221：`el("initialStateRetry").addEventListener("click", requestInitialPanelState); requestInitialPanelState();`

行 4393-4412（宿主消息入口，节选）：

```js
    function handleIncomingWebviewMessage(message) {
      if (!message) return;
      if (message.type === "panelHeartbeat") { vscode.postMessage({ command: "webviewHeartbeatAck", /* ... */ }); return; }
      const messages = flattenIncomingWebviewMessages(message);
      let latestStateMessage = null;
      let latestNavigationMessage = null;
      for (const item of messages) {
        if (!item) continue;
        if (item.type === "uiCommandStatus") { /* 4407-4419：更新 planStopClear / tmux busy / handleUiCommandStatus(item); continue; */ }
        if (item.type === "gpuWindowSamples") { applyGpuWindowSamples(item); continue; }
        if (item.type === "tmuxList") { /* 4423-4447：缓存 + persistWebviewState({ tmuxSelectedWorkerId }) + 渲染 */ }
```

行 4490-4512（状态帧收敛 → 渲染；低流量按钮 UI 回显应在此链上的渲染函数改写 topbar）：

```js
      if (latestStateMessage) {
        const incomingSeq = Number(latestStateMessage.seq);
        if (Number.isSafeInteger(incomingSeq) && incomingSeq > lastReceivedStateSeq) {
          lastReceivedStateSeq = incomingSeq;
          /* ... */ completeInitialPanelState();
          const incomingState = latestStateMessage.state || {};
          if (transientPanelStateNeedsRestore && transientPlanSelectionDirty) {
            const selectedPlanFile = restoredTransientPanelState.selectedPlanFile;
            lastState = Object.assign({}, incomingState, { /* 本机未确认的选择优先 */ });
            if (selectedPlanFile !== String(incomingState.planFileInput || ((incomingState.selection || {}).selectedPlanId || ""))) {
              vscode.postMessage({ command: "selectPlan", planFile: selectedPlanFile });
            }
          } else lastState = incomingState;
          pendingRenderSeq = incomingSeq;
          pendingRenderState = lastState;
          awaitingVisibleStateRefresh = false;
          rememberGpuHistoryState(lastState.gpuHistory);
          invalidateSelectedTaskPayload();
          clearCompletedPendingButtons(lastState);
          scheduleStateRender();
```

### E14 节流既有能力（低流量模式的可复用挂点）
E14a `src/extension/legacy.ts` 行 25561-25574（逐字）：

```ts
    private realtimeRefreshPolicy() {
        const hiddenPause = this.tunnelConfig.pauseWhenWebviewHidden !== false;
        const streaming = this.tunnelConfig.allowStreaming !== false && this.tunnelConfig.refreshProfile !== "manual_only";
        return {
            ...RealtimeTunnelClient_1.defaultRealtimeRefreshPolicy,
            mode: this.tunnelConfig.refreshProfile === "manual_only" ? "manual_only" : this.tunnelConfig.refreshProfile === "balanced" ? "balanced" : "realtime",
            preferWebSocket: streaming,
            fallbackToSse: streaming,
            fallbackToPolling: this.tunnelConfig.refreshProfile !== "manual_only",
            snapshotFallbackIntervalSeconds: 5,
            pauseWhenWebviewHidden: hiddenPause,
            keepAgentStreamWhenHidden: true,
        };
    }
```

E14b `src/tunnel/TunnelGateway.ts` 行 18-59、78-83、99-105：

```ts
  healthCheckIntervalSeconds: number;
  snapshotPollIntervalSeconds: number;
  maxRequestsPerMinute: number;
  allowStreaming: boolean;
  streamingRequiresExplicitConfirm: boolean;
  pauseWhenWebviewHidden: boolean;
  pauseAllBackgroundTraffic: boolean;
  refreshProfile: RefreshProfile;
}

export interface RefreshProfileConfig { health: number; snapshot: number; stream: boolean; }

export const refreshProfiles: Record<RefreshProfile, RefreshProfileConfig> = {
  realtime: { health: 5, snapshot: 30, stream: true },
  balanced: { health: 10, snapshot: 60, stream: true },
  manual_only: { health: 0, snapshot: 0, stream: false },
};

export const defaultTunnelGatewayConfig: TunnelGatewayConfig = {
  enabled: true, connectionMode: xshellTunnelConnectionMode, provider: "xshell",
  localHost: "127.0.0.1", localPort: 18765, remoteHost: "127.0.0.1", remotePort: 18765,
  hubServerId: "", tunnelStartMode: "manual",
  healthCheckIntervalSeconds: 30, snapshotPollIntervalSeconds: 30, maxRequestsPerMinute: 0,
  allowStreaming: true, streamingRequiresExplicitConfirm: false,
  pauseWhenWebviewHidden: true, pauseAllBackgroundTraffic: false, refreshProfile: "realtime",
};
```

```ts
    refreshProfile: input.refreshProfile && refreshProfiles[input.refreshProfile] ? input.refreshProfile : defaultTunnelGatewayConfig.refreshProfile,
    allowStreaming: input.refreshProfile === "manual_only" ? false : input.allowStreaming !== false,
```

```ts
export function requestBudgetConfigFromTunnel(config: TunnelGatewayConfig): RequestBudgetConfig {
  return { ...defaultRequestBudgetConfig, maxRequestsPerMinute: 0, pauseWhenHidden: config.pauseWhenWebviewHidden };
}
```

事实：`maxRequestsPerMinute` 在此被无条件置 0，配置里的同名字段不生效 —— 低流量若要走限流必须改这里（实现面事实，非本轮结论）。

E14c `src/extension/legacy.ts` 行 6140-6157（`pauseAll`/`resumeNetwork` 的真实语义，已存在，可被低流量复用或互斥）：

```ts
        await client.disconnect("paused");
        if (generation !== this.projectContextGeneration || client !== this.client) return;
        this.lastHealth = { state: "paused", status: "paused", checkedAt: new Date().toISOString(), message: "所有网络活动已暂停。" };
        this.postState();
    }
    async resumeNetwork() {
        const generation = this.projectContextGeneration;
        await this.clearOfflineImport();
        if (generation !== this.projectContextGeneration) return;
        this.client.resume();
        void this.ensureRealtimeConnected("resume network");
        this.postState();
    }
```

### E15 可复用测试夹具与 seam（只列出，本轮未运行）
1. `test/ui/webviewButtonsHandled.test.js` —— 「面板每个 `data-command` 必须有宿主处理器」的硬门禁，**新增按钮直接被它约束**（从 `readSource("src/ui/PanelHtml.ts")` 抓命令，再与 `src/extension.ts` 的 `case "...">`、`dist/extension/legacy.js` 中 `handleMessageCore(` 的 `command === "X"`、`uiActionCommands` 取并集，缺失即 `assert.deepEqual(missing, [])` 失败）。关键原文：

```js
  const html = readSource("src/ui/PanelHtml.ts");
  const extension = readSource("src/extension.ts");
  const commands = new Set();
  for (const match of html.matchAll(/data-command="([A-Za-z][A-Za-z0-9]+)"/g)) commands.add(match[1]);
  const core = require("../_helpers/legacyMethod")(fs.readFileSync(path.join(root, "dist/extension/legacy.js"), "utf8"), "handleMessageCore(");
  for (const match of core.matchAll(/command === "([A-Za-z][A-Za-z0-9]+)"/g)) handled.add(match[1]);
  const uiActionBlock = extension.match(/const uiActionCommands = new Set<WebviewActionCommand>\(\[([\s\S]*?)\]\);/);
  assert.deepEqual(missing, []);
```
   该测试读取 `dist/`，属于「先 build 才有意义」的 seam。
2. `test/ui/webviewActionAllowlist.test.js` —— 断言 `src/extension.ts` 存在 `type WebviewActionCommand`、`const uiActionCommands = new Set<WebviewActionCommand>`、`const actionCommandMap`、`function getSafeCommand`，且源码不出现 `apiPath|shellCommand|remoteCommand`。改集合形状时不得破坏这些字面量。
3. `test/ui/panelTransientStorage.test.js` —— 用 `vm.createContext` + 从 legacy 源码切 `    function <name>(` 片段（`functions(["readStoredWebviewState","persistWebviewState"])`、`["normalizeStoredPanelMap"]`）直接执行面板函数，断言存储不可用不中断启动。**若低流量开关还要用 webview setState，这是现成模板。**
4. `test/ui/panelInlineScriptSyntax.test.js` + `test/features/panelWebviewScriptHealth.test.js` —— 面板内联脚本 `new vm.Script(script)` 语法/内容门禁；后者用 `ts.transpileModule` 直接加载源码渲染器（无需 build）并断言若干命令名与文案存在，是「新增按钮后写断言」的首选 seam。
5. `test/ui/actionButtonsCapability.test.js` —— 断言 HTML 含 `uiCapabilityMap`、`button.disabled`，并以 sandbox 注入方式单测 `disableReason` 链路（禁用态 seam）。
6. `test/features/panelMessageDispatch.test.js` —— 宿主消息分发回归（在 `test:plan-run` 域内）。
7. `test/_helpers/sourceReader.js` —— `IMPLEMENTATION_OF` 门面→legacy 映射表（含 `"src/extension.ts": "src/extension/legacy.ts"`）；新增断言请经 `readSource`，不要直接 `readFileSync` 门面路径。
8. `test/_helpers/legacyMethod.js` —— 按 TS AST 从 `RealtimeTunnelPanelProvider` 类精确取方法体，供断言 `handleMessageCore` 等。
9. `test/features/panelWebviewScriptHealth.test.js` 已在 build 域强制运行（E16），改 `PanelHtml.legacy.ts` 必然触发。

单文件直跑形状（项目规范，**未执行**）：`node --test --test-force-exit --test-timeout 20000 test/ui/<file>.test.js`。
npm script 对应关系（`package.json` 行 935-991 + `scripts/test-workflow.json`）：
- 上述 `panelInlineScriptSyntax / webviewButtonsHandled / webviewActionAllowlist / panelTransientStorage / actionButtonsCapability` **不属于任何 manifest domain**（在 `scripts/test-workflow.json` 对这些文件名零命中）→ 只能显式单文件运行；`npm test`（domain 源码 `npm run build && node --test test/*.test.js test/**/*.test.js`）会覆盖到它们。
- 已入组、含 UI 测试的现成入口：`test:multi-tunnel`（`test/ui/multiTunnelPortAssignmentsRender.test.js`、`hubWorkerTelemetryStatusRender.test.js`）、`test:latest-artifacts`（`syncScopeTree.test.js`）、`test:submission-truth`（多个 `test/ui/*`）、`test:failed-job-review`（`cacheCleanupPanel.test.js`）、`test:tmux-lifecycle`（`tmuxOtherSessionsDisclosure.test.js`）。
- **没有 `test:ui` 这个 script。**

### E16 build 门禁原文
`package.json` 行 935-961（节选）：

```json
    "build": "node scripts/test-workflow.js build",
    "compile": "node scripts/test-workflow.js compile",
    "typecheck": "node node_modules/typescript/bin/tsc -p . --pretty false",
    "test": "node scripts/test-workflow.js test",
    "package": "node scripts/test-workflow.js package",
    "package:assemble": "node scripts/test-workflow.js package:assemble",
    "verify:package-runtime": "node scripts/verify-vsix-runtime.js",
    "install:latest": "node scripts/install-latest.js",
```

`scripts/test-workflow.json` 行 16-24（`compileGates`，build/compile/package/check:full 共用）：

```json
  "compileGates": [
   "npm run compact:plan",
   "node scripts/tsc-cached.js",
   "node scripts/bundle-semver.js",
   "node scripts/write-agent-runtime.js",
   "node scripts/write-panel-build-manifest.js",
   "node -c dist/extension.js",
   "node -c dist/ui/PanelHtml.js"
  ],
```

`scripts/test-workflow.json` 行 27（build 域 `sourceScript` 头部节选）：

```text
npm run compact:plan && node scripts/tsc-cached.js --verify-only && node scripts/bundle-semver.js && node scripts/write-agent-runtime.js && node scripts/write-panel-build-manifest.js && node -c dist/extension.js && node -c dist/ui/PanelHtml.js && node --test --test-force-exit --test-timeout 20000 test/features/panelWebviewScriptHealth.test.js && ...
```

AGENTS.md 要求的第二条校验（原文摘录）：`node -e "new (require('vm').Script)(require('fs').readFileSync('dist/ui/PanelHtml.js','utf8'))"`。

### E17 AGENTS.md 红线要点（原文摘录，`AGENTS.md` SHA256 见 §0）

「P0 — 外层模板剥离坑：`src/ui/PanelHtml.ts` 的 `return <模板> 外层模板吞噬正则反斜杠」要点：

> **严禁** 在 PanelHtml.ts 最外层 return 模板字符串内部裸写任何单反斜杠转义的正则/字符串字面量（\s \d \w \. \/ \{ \} \( \) \n \t 等），**严禁** 直接写 /\s+/ 或 "\n" 这类裸反斜杠。
>
> - 现象：面板握手超时，控制台 Unexpected token 'const' / Invalid or unexpected token，26 处正则的反斜杠被外层模板层剥离后语法断裂，内层 script 直接解析失败。
> - 根因：外层是 JS 模板字符串，内层脚本中的 \s \d 等会被外层模板预解析为转义序列（\s→s、\n→真实换行），落盘后正则已损坏。
> - **正确写法（二选一，择一即合规）**：
>   1. **双写转义**：正则/字符串内的每个反斜杠都写成两个，如 /\\s+/、/\\d\\{-\\d\\{-\\d\\{-\\d\\{-\\d\\{/、"\\n"。经外层模板一层剥离后落盘恰好还原为 /\s+/。
>   2. **`String.fromCharCode` 规避**：需换行时用 `String.fromCharCode(10)` 替代换行字面量（已有先例 PanelHtml.ts:2529）。
> - **门禁（提交前必跑，双重校验缺一不可）**：
>   1. `npm run build` 已内置 `node -c dist/extension.js && node -c dist/ui/PanelHtml.js` 语法门禁（见 package.json#scripts.build），**严禁** 跳过 build 直接提交。
>   2. 额外 `vm.Script` 校验：`node -e "new (require('vm').Script)(require('fs').readFileSync('dist/ui/PanelHtml.js','utf8'))"` 或等效脚本，必须零异常；`node -c` 只查语法，`vm.Script` 进一步确保模板剥离后仍为合法 JS。
> - **自检口诀**：改 PanelHtml.ts 内层脚本前，先全局搜索外层模板内的斜杠+反斜杠与引号+反斜杠；凡见裸反斜杠即视为 P0 缺陷，批量替换为双写后再验证门禁。

（说明：AGENTS.md 写作 `PanelHtml.ts`，实际外层模板在 `src/ui/PanelHtml.legacy.ts`，E01 证明门面默认委托 legacy；改 legacy 内层脚本即受该红线约束。工厂路径另有规避工具 `src/ui/PanelTemplateEscaper.ts` 行 20-26 的 `escapeForOuterTemplate`，把反斜杠翻倍、反引号与模板插值加转义，但默认路径不使用它。）

「P0 — 禁止硬编码隧道端口/IP，隧道按每服务器用户配置动态解析」要点：

> **严禁** 在任何业务逻辑中硬编码隧道端口（如 10890）或固定假设 `127.0.0.1:18765` 为唯一可达的 Agent 地址。隧道由用户为每台服务器通过 Xshell/SSH 配置（*.xsh 会话、~/.ssh/config、settings.json 的每服务器 host/port/forward 配置）动态决定，必须在运行时从该配置解析实际 `localForwardHost/localForwardPort/remoteAgentHost/remoteAgentPort`。
>
> - 现象：10890 写死导致用户自定义隧道不可用；写死 `127.0.0.1:18765` 导致 Worker Telemetry 校验无回调、GPU tmux 无法打开、job 调度静默失败（ModuleNotFoundError: torch 等未回传到 UI）。
> - 正确做法：1) 所有探活/校验/版本比对必须读取 `TunnelEndpointConfig`/`XshellRealtimeTunnelConfig`/`TunnelEndpointPortAssignment` 中的 localForwardHost/localForwardPort 与 remoteAgentHost/remoteAgentPort，动态拼装 baseUrl，不得回退到固定端口检测；2) 展示层（PanelHtml.ts）端口输入框以配置为准，`TunnelGateway`/`XshellTunnelSetup` 不得 throw 限制只能 127.0.0.1；默认值可为 `127.0.0.1:18765` 做兼容，但校验逻辑需接受任意 host:port；3) Agent 侧兼容：/health 与 /api/health（以及 /version 与 /api/version）均为健康检查别名，worker_telemetry 模式必须放行健康与版本接口，避免前端 404 无回调。
> - 门禁：`Select-String -Pattern "10890"` 在 src/** 与 dist/** 业务逻辑中必须零命中（仅允许在 docs/ 与 AGENTS.md 约束说明中出现）；`127.0.0.1:18765` 不得作为探测硬编码，改为读取配置；`npm run build` 与 `vm.Script` 双重校验仍需通过。

对应现存回归测试（可复用为门禁）：`test/factories_integration.test.js:126-156`（遍历 src 断言 10890 零命中）、`test/factories_tunnel.test.js:43-134`（非法端口回退到默认而非 10890）。
低流量模式的直接推论：开关本身与端口/IP 无关，不得为「省流量」写任何固定 host:port 探测；节流只应改「多久问一次/问什么」，地址解析继续走 `localBaseUrl(config)`（E14b）与端点注册表。

### E18 「低流量」当前不存在（零命中证据）
`grep -rniE "lowTraffic|低流量|low-traffic" src` → No matches found（本轮实测）。

## 4. 验证（本轮不执行，逐项标注）

| 项 | 状态 | 说明 |
|---|---|---|
| `git rev-parse HEAD origin/master master` | passed（exit 0） | 三者同值 7a6062f...；日志 `D:\\OpenChamber-AgentConfig\\Pi\\host-native\\diagnostics\\host-windows\\e28c7cd9-dff1-4404-88ed-a8fab8bff375-stdout.log` |
| `git status --porcelain` | passed（exit 0） | 行数 0，工作区干净（同一日志） |
| `sha256sum`（§0 文件表） | passed（exit 0） | 日志 `...\\6cfad5f3-c895-4501-abd6-2a17349fae43-stdout.log`、`...\\24d1ed81-c4ae-4194-9136-5e1bd92ff8b3-stdout.log` |
| `npm run build` / 任何 `node --test` / `npm install` | not-run | 任务硬性禁止（只读调查） |
| AGENTS.md 要求的 `vm.Script` 校验 | not-run | 属实现/验证阶段 |

## 5. 结论：实现面清单（供 GPT 规划，不含代码）

1. 按钮插入位置：`src/ui/PanelHtml.legacy.ts:1340-1341` 之间（`.topbar-actions` 开头、紧跟 `statusLegend` 之后）。样式复用 `.topbar-actions button`（E04）；开启态用 `aria-pressed` + 文案（E07 先例）+ 可选 `.status-chip` 视觉；禁用态只需渲染期 `disabled`（E06 短路）。
2. 新增一条消息要同步改动的位置（缺一即被 E08/E09/E15 拒）：
   - `src/ui/PanelHtml.legacy.ts`：topbar markup 加 `data-command`；状态渲染处按 `state.lowTrafficMode` 改写按钮文案与 `aria-pressed`；
   - `src/extension/legacy.ts`：`SAFE_WEBVIEW_COMMANDS`（613-643）加入命令名；`handleMessageCore` 加 `case`（参考 6623-6630 的本地型命令）；若要免弹通知，加 `COMMANDS_WITHOUT_UI_STATUS`（648）；若不希望 CLI/API 可调，加 `API_INTERNAL_COMMANDS`（见 §6）；
   - `buildState()` 输出加布尔字段（`WebviewClusterState = Record<string, unknown>`，无需改类型）；
   - 生效路径：改 `realtimeRefreshPolicy()` / `resetClient()` 或 `tunnelConfig` 规范化后的派生值，不要新增独立轮询器；不要把该命令加入 `hostOperationUiCommands`；
   - 若要保持工厂灰度一致：`src/ui/sections/*`（可选，默认不启用）。
3. 推荐持久化：在 `keys`（E10）新增一个键，按 `API_STATE_KEYS` 声明 `store: "global"`。理由：与 `uiLayout` 同属跨项目用户偏好，且 `tunnelConfig/setupConfig` 同为 global，低流量与隧道配置同域；`workspaceState` 会让同一用户的其他项目各自为政。读取时机与 `loadTunnelConfig()` 一致（激活时读入内存字段，面板 `webviewReady` 后随 `postState` 回显），写入只在单个 `case` 里 `update` + `postState()`。**不要**用 webview `setState`/`localStorage` 当权威（E11：默认 `retainContextWhenHidden=false`，隐藏即释放上下文，跨重载不保证）。多窗口：后写覆盖前写、另一方 UI 不自动刷新（当前无广播机制）。
4. 可复用测试入口：显式单文件 `node --test --test-force-exit --test-timeout 20000 test/ui/webviewButtonsHandled.test.js`（须先 build）、`test/ui/webviewActionAllowlist.test.js`、`test/ui/panelInlineScriptSyntax.test.js`、`test/ui/panelTransientStorage.test.js`、`test/ui/actionButtonsCapability.test.js`、`test/features/panelWebviewScriptHealth.test.js`（build 域自动跑）；无 `test:ui` script，整组用 `npm test` 或 §E15 列出的组入口。
5. P0 注意：外层模板内新脚本禁止裸反斜杠（双写或 `String.fromCharCode(10)`），提交前 `npm run build` + `vm.Script` 双校验；不得为省流量写死端口/IP；真正改动在 `.legacy.ts` 而非 49 行门面。

## 6. 未知项 / 残余风险

- `API_INTERNAL_COMMANDS` 的定义行与成员未取原文（仅知其在 `API_EXECUTABLE_COMMANDS` 的 filter 中使用）；低流量命令是否要排除 CLI 调用需实现阶段核实。
- `buildState({ panelProjection: true })` 的完整构造未逐行读（只确认 `flushStatePost` 调用与降级分支）；新增字段是否会被 `panelProjection` 精简路径裁掉未证实。
- 是否已有 `onDidChangeWindowState` 类多窗口广播未核实；若无，多窗口会出现「一边已生效、另一边显示旧态」。
- `requestBudgetConfigFromTunnel` 强制 `maxRequestsPerMinute: 0` 的历史原因（裁定还是遗留）未查 commit/文档；改动前需核实，避免撤销既有保护。
- 用户环境是否设置过 `FEATURE_FACTORY_PANEL=1` 未验证；若为 1，工厂段缺少 topbar 会导致按钮不出现（E01）。
- 本轮只读：未编译、未运行任何测试，「测试可直接跑通」只是清单事实，不是执行结果。
