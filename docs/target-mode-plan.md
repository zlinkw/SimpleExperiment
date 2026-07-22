# 目标模式当前计划：恢复 SimpleExperiment 可构建基线

## 当前目标

- 批次：`recovery-build-021`。
- 只审计 `zlk-cluster-orchestrator` 与 `simple-sftp`。
- 以本机已安装的 `SimpleExperiment 0.2.0` 和删除前会话记录为运行时证据，逐批恢复可构建源码基线。
- 在 `npm run typecheck`、全量测试、lint 和 acceptance 恢复通过前暂停新功能开发。

## 范围与保护

- 范围：manifest、源码、测试、文档、`dist`、runtime、模板、构建和打包配置。
- 保护：不修改安装目录，不覆盖或安装 VSIX，不覆盖现有恢复副本，不删除任何文件。
- 新包只写入独立审计目录；比较时忽略 ZIP 时间戳和安装时生成的 `__metadata`。
- 不审计、不修改、不恢复 MCP 下其他项目或文件。
- 真实 SFTP、服务器和 PPT 行为均为 `needs field verification`。

## 当前状态

- [已完成] 创建独立私有仓库 `zlinkw/SimpleExperiment` 与 `zlinkw/SimpleSFTP`，本地 `master` 已推送并与 `origin/master` 对齐。
- [已完成] SimpleSFTP 运行文件与安装版一致；`package.json` 仅多末尾换行，测试 `2/2` 通过。
- [已完成] `recovery-build-001`：恢复 Xshell 配置主实现、隧道动作类型、实时事件基础契约和文件传输类型；定向检查通过。
- [已完成] 修复 VSIX 排除规则；新包文件集合与安装版对齐，无恢复副产物、源码测试或运行时临时文件。
- [已完成] `recovery-build-002`：修复文件浏览返回契约、文件状态规范字段、完整隧道动作集合和动作参数异步拒绝契约；不处理实时 reducer、隧道策略、端口冲突、Extension 或 UI。
- [已完成] `recovery-build-003`：修复实时 worker task 状态类型、隧道模式策略和端口冲突类型；不处理 Extension、UI 或新功能。
- [已完成] `recovery-build-003a`：补齐旧 MobaXterm 配置迁移提示兼容契约及批次记录；不修改其他行为。
- [已完成] `recovery-build-004`：修复 `OperationQueue` coalesce key 类型收窄，不改变队列行为。
- [已完成] `recovery-build-005`：恢复 Extension 的隧道类型导入、连接启动、操作计时器、本地 SSH 配置选择和 Worker 隧道构造；不处理实验结果、runtime、scenario 或 UI 重构。
- [已完成] `recovery-build-006`：恢复计划摘要、控制台指标解析、实验记录 manifest 和测试场景运行类型契约；不处理 runtime manifest 或实时 reducer。
- [已完成] `recovery-build-007`：收敛 runtime manifest 哈希校验类型并补充回归测试；不处理实时 reducer 或 UI。
- [已完成] `recovery-build-008`：让多端点实时状态合并使用已恢复的 authority 策略，隔离过期 Worker telemetry，并恢复 Worker task/health 事件；不处理 Extension/UI 大范围恢复。
- [待处理] 继续修复 Extension 缺失导入/成员、结果与计划导出、实时 authority 合并和剩余类型契约。

## 验证清单

- JavaScript、JSON、Python、PowerShell、TypeScript 可解析性。
- SimpleSFTP 全量测试；SimpleExperiment 全量测试、lint、acceptance。
- TypeScript 独立输出目录构建，不覆盖当前 `dist`。
- 两个 VSIX 输出到独立审计目录，解包后与安装目录规范化 SHA256 比较。

## 批次完成条件

- 记录差异、修复、验证、剩余风险和包 SHA256。
- 若恢复 Git 成功，每个修复批次单独提交并快进推送 `origin/master`。
- 若 Git 仍缺失，停止代码修复并明确记录阻塞，不伪造历史或远程。

## Git 同步规则

- 此后每个已验证批次都必须同时提交本地仓库并普通快进推送至该插件独立 GitHub 仓库的 `origin/master`。
- 推送后必须执行 `git fetch origin master`，确认本地 `HEAD` 与 `origin/master` 完全一致，才视为批次完成。
- 若插件尚无远程仓库，先在当前 GitHub 账号下创建该插件独立的私有仓库并配置 `origin`；不与其他插件共用仓库。
- 禁止强制推送、改写历史，或把一个插件的提交推送到另一个插件仓库。

## 本批记录

- SimpleSFTP 审计包 SHA256：`AE3EF1CC1049ACCFABB5CDF200E0E8187DBC138DE2B65017D0A3FB5E637454D0`；4 个运行文件逐字节一致，manifest 仅安装元数据不同。
- SimpleExperiment 审计包 SHA256：`B64B0071E99B5FFA141B710BC01AD9EF611481CBF0F3DD9DCB548C5B4EF9E9E2`；文件集合与安装版一致，但 106 个文件内容不同，不能视为最新版等价包。
- SimpleExperiment `dist` JavaScript 102/102、runtime Python 2/2、JSON 125/125 语法通过；恢复源码 TypeScript 构建失败，不能从当前源码安全重建安装版。
- `recovery-build-001`：依据已安装 `dist` 和会话历史恢复 Xshell 配置实现，解除 Xshell/MobaXterm 配置循环引用；补齐隧道动作、operation 查询、隐藏状态、worker 事件和文件传输类型契约。
- 定向 TypeScript 编译通过；Xshell、端点、命令与文件传输相关测试 `16/16` 通过。
- 全量 `npm run typecheck` 仍失败，剩余错误已收敛到 Extension、实验配置/结果、runtime、scenario、authority merge、RemoteFileBrowser、HubControlApi、TunnelOnlyPolicy 和端口冲突类型；后续批次继续处理。
- 下一批边界：只处理实时 reducer、隧道策略和端口冲突类型，不扩展到 Extension、UI 或新功能。
- `recovery-build-002` 影响区域：`FileTransferClient`、`RemoteFileBrowser`、`TunnelClient` 及对应 `dist`；回归检查为定向 TypeScript 编译、文件列表/状态契约测试和 TunnelClient 测试。
- `recovery-build-002` 验证：定向 TypeScript 编译通过；3 个测试文件共 `4/4` 通过；3 个对应 `dist` 文件 JavaScript 语法通过。
- `recovery-build-002` 提交记录：`fix: restore tunnel client contracts`，普通快进推送至 `origin/master`，以推送后 SHA 对齐检查为完成门槛。
- `recovery-build-002` 推送核验：`833cd7278a416a76e1a424d0695df3897c6e73bf`，本地 `HEAD` 与 `origin/master` 一致。
- `recovery-build-003` 影响区域：`RealtimeEventReducer`、`TunnelOnlyPolicy`、`TunnelPortConflict` 及必要对应 `dist`；回归检查为定向 TypeScript 编译、隧道策略、端口冲突和实时事件测试。
- `recovery-build-003` 验证：定向 TypeScript 编译通过；隧道策略与端口冲突测试 `4/4` 通过；对应 JavaScript 语法通过。`realtimeStateBudget.test.js` 依赖当前 `dist` 尚未提供的运行时导出，延期到实时 reducer 运行时恢复批次。
- `recovery-build-003` 提交记录：`fix: restore remaining tunnel type contracts`，普通快进推送至 `origin/master`；下一批只处理 Extension 缺失导入/成员，不扩展到 UI 或新功能。
- `recovery-build-003` 推送核验：`3dd537f99087567840a02a7db7f1c44617668551`，本地 `HEAD` 与 `origin/master` 一致。
- `recovery-build-003a` 影响区域：`TunnelOnlyPolicy` 及对应 `dist`、本计划；回归检查为定向 TypeScript 编译、隧道策略与旧配置迁移测试。
- `recovery-build-003a` 验证：定向 TypeScript 编译通过；4 个测试共 `4/4` 通过；对应 JavaScript 语法通过。
- `recovery-build-003a` 提交记录：`fix: clarify legacy tunnel migration warning`，普通快进推送至 `origin/master`；下一批只处理 Extension 缺失导入/成员。
- `recovery-build-004` 影响区域：`OperationQueue` 及对应 `dist`、本计划；回归检查为全量 TypeScript 错误收敛、队列测试、lint 和 JavaScript 语法。
- `recovery-build-004` 验证：全量 `typecheck` 已移除 `OperationQueue` 错误，但仍被 Extension、features、runtime 和 scenario 既有错误阻断；隧道操作队列测试 `1/1` 通过，lint 与对应 JavaScript 语法通过。
- `recovery-build-004` 提交记录：`fix: narrow operation queue coalesce key`，已普通快进推送至 `origin/master`；下一批只处理 Extension 缺失导入/成员。
- `recovery-build-004` 推送核验：`a9c739cea214819c30ac2db51c4ceaae20851851`，本地 `HEAD` 与 `origin/master` 一致。
- `recovery-build-005` 影响区域：`src/extension.ts`、`dist/extension.js` 及本计划；回归检查为全量 TypeScript 错误收敛、Extension 隧道相关测试和 JavaScript 语法检查。
- `recovery-build-005` 验证：`src/extension.ts` 的 TypeScript 错误清零；全量 `typecheck` 仍被 `ExperimentConfigRecovery`、`ExperimentRunner`、`PlanBuilder`、`RuntimeManifest` 和 `ScenarioRunner` 的既有错误阻断。Extension 自动连接与 Xshell 隧道定向测试 `17/17` 通过，lint、`dist/extension.js` 语法和 `git diff --check` 通过。`multiWorkerReconnectIsolation.test.js` 的实时 reducer 失败不属于本批，延期到对应恢复批次。
- `recovery-build-005` 提交记录：`fix: restore extension tunnel baseline`，已普通快进推送至 `origin/master`。
- `recovery-build-005` 推送核验：`fcb2434c98a4e264f293eec8c7e4f75c32f78621`，本地 `HEAD` 与 `origin/master` 一致。
- `recovery-build-006` 影响区域：`PlanBuilder`、`Results`、`ExperimentConfigRecovery`、`ExperimentRunner`、`FakeClusterRuntime`、`ScenarioRunner` 及必要对应 `dist`；回归检查为全量 TypeScript 错误收敛、evidence tooling、实验平台和场景测试。
- `recovery-build-006` 验证：上述模块 TypeScript 错误清零，全量 `typecheck` 仅剩 `RuntimeManifest` 一个类型错误；计划、结果证据和场景定向测试 `11/11` 通过，lint、对应 JavaScript 语法和 `git diff --check` 通过。
- `recovery-build-006` 提交记录：`fix: restore experiment evidence contracts`，已普通快进推送至 `origin/master`。
- `recovery-build-006` 推送核验：`a878b55d5bf758c6c0062bb4c1a32526beabea7c`，本地 `HEAD` 与 `origin/master` 一致。
- `recovery-build-007` 影响区域：`RuntimeManifest`、对应 `dist`、回归测试和本计划；回归检查为全量 TypeScript、runtime manifest 测试、lint 和 JavaScript 语法。
- `recovery-build-007` 验证：`npm run typecheck` 全部通过；runtime manifest 测试 `1/1`、lint、对应 JavaScript 语法和 `git diff --check` 通过。279 个测试文件的全量 Node 测试运行超过 180 秒未结束，未将其标记为通过，需后续定位长驻测试或测试资源泄漏。
- `recovery-build-007` 提交记录：`fix: narrow runtime verification statuses`，已普通快进推送至 `origin/master`。
- `recovery-build-007` 推送核验：`cd37dec01ff163a696a496838e82a1d94bffbe7d`，本地 `HEAD` 与 `origin/master` 一致。
- `recovery-build-008` 影响区域：`MultiEndpointRealtimeClient`、`RealtimeEventReducer`、对应 `dist` 和本计划；回归检查为实时 authority、Worker telemetry 与端点合并测试。
- `recovery-build-008` 验证：全量 `typecheck`、lint 和对应 JavaScript 语法通过；实时 authority、Worker telemetry、端点配置测试 `5/5` 通过。全量测试分组显示 Extension/UI 大范围恢复仍存在大量契约失败，继续作为后续边界，不在本批扩大范围。
- `recovery-build-008` 提交记录：`fix: apply realtime authority merge`，已普通快进推送至 `origin/master`。
- `recovery-build-008` 推送核验：`0ca6cfc9d2fb1975e78a9254e736b915e77ea3c6`，本地 `HEAD` 与 `origin/master` 一致。
- `recovery-build-009` 目标：以本机已安装的 `SimpleExperiment 0.2.0` 运行时证据恢复 `src/ui/PanelHtml.ts` 的三列工作台、资源树、Inspector、固定操作和布局调整契约；不修改安装目录，不处理 `SimpleSFTP` 或其他项目。
- `recovery-build-009` 影响区域：`src/ui/PanelHtml.ts`、对应 `dist/ui/PanelHtml.js` 和本计划；回归检查为资源树、布局、置顶操作和面板内联脚本测试，以及全量 `typecheck`、lint、JavaScript 语法和 `git diff --check`。
- `recovery-build-009` 验证：以已安装 `SimpleExperiment 0.2.0` 的 `dist/ui/PanelHtml.js` 为运行时对照恢复面板源码；`npm run typecheck`、`npm run lint`、`node -c dist/ui/PanelHtml.js` 和 `git diff --check` 通过。UI 相关定向回归 `18/18` 通过，资源树、Inspector、工作台和发布同步契约定向回归 `3/3` 通过。
- `recovery-build-009` 未完成项：全量 UI 测试仍受 Extension/UI 其他恢复缺口阻断；全量测试未标记通过。`workbenchResourceTree.test.js` 的两个上下文测试引用未定义的 `between` 辅助函数，属于测试自身阻断，延期修复测试契约；不扩大本批源码范围。
- `recovery-build-009` 提交记录：`fix: restore workbench panel UI baseline`，已普通快进推送至 `origin/master`。
- `recovery-build-009` 推送核验：`1888f776badd78f6d2c4bf38feaf05aef65df6bc`，本地 `HEAD` 与 `origin/master` 一致。
- `recovery-build-009a` 目标：建立人工待删除候选清单；不删除、不移动、不暂存删除任何文件。
- `recovery-build-009a` 影响区域：`docs/manual-cleanup-candidates.md` 与本计划；验证为路径存在性复核和 `git diff --check`。
- `recovery-build-009a` 验证：清单中的 11 个准确路径均存在，`git diff --check` 通过；未删除、移动或暂存删除任何文件。
- `recovery-build-009a` 提交记录：`docs: add manual cleanup candidate register`，已普通快进推送至 `origin/master`。
- `recovery-build-009a` 推送核验：`b34ddf6081c5f056a70aa98f225fa78203739985`，本地 `HEAD` 与 `origin/master` 一致。
- `recovery-build-010` 目标：以已安装 `SimpleExperiment 0.2.0` 的 `dist/extension.js` 为运行时对照，恢复 Extension 的 UI 布局持久化、Webview 状态合并、实时内容门禁和晚到终态观察；不修改安装目录。
- `recovery-build-010` 影响区域：`src/extension.ts`、`dist/extension.js`、`src/ui/PanelHtml.ts`、`dist/ui/PanelHtml.js`、`test/ui/workbenchResourceTree.test.js` 和本计划；回归检查为布局状态、Webview state post、realtime gate、操作终态、资源树、全量 TypeScript、lint、JavaScript 语法和 `git diff --check`。
- `recovery-build-010` 验证：`npm run typecheck`、`npm run lint`、两个变更后 JavaScript 文件语法和 `git diff --check` 通过；布局状态、Webview state post、realtime gate、晚到操作终态与资源树定向测试 `12/12` 通过。构建后的 `dist/extension.js` 与已安装版仅有 `6` 行新增、`5` 行删除，差异限于模块标记、PanelHtml 调用形式、恢复后的默认列宽与可见状态刷新语句。
- `recovery-build-010` 剩余风险：`src/extension.ts` 是从已安装运行文件恢复的可构建 TypeScript 过渡基线，保留 `@ts-nocheck`，尚未恢复原始强类型源码。UI 分组测试 `38/72` 通过、features 分组测试 `221/298` 通过；失败主要来自其他未恢复源码契约及源码结构断言，不将全量测试标记为通过。
- `recovery-build-010` 提交记录：`fix: restore extension runtime baseline`，提交 `abe6d73f06726d2a0a10ffb244f608ec2122ed0c`，已普通快进推送至 `origin/master`；推送后本地 `HEAD` 与 `origin/master` 一致。
- `recovery-build-010` 状态：已完成；下一批从失败契约中选择最多 2 至 3 个强相关问题，不在本批扩大范围。

## 当前恢复批次

- 批次：`recovery-build-011`。
- 目标：补齐操作记录容量与终态契约的源码声明，并修正不再存在的 `PanelHtmlBuilder` 测试接口；不改变远端操作协议，不处理其他 UI 结构失败。
- 影响区域：`src/extension.ts`、`dist/extension.js`、`test/ui/actionLifecycle.test.js`、`test/ui/actionErrorRows.test.js` 和本计划。
- 保护区域：已安装扩展、SimpleSFTP、其他项目、归档数据和删除候选清单。
- 回归检查：操作生命周期与错误测试、`npm run typecheck`、lint、JavaScript 语法和 `git diff --check`。
- 验证：`npm run typecheck`、`npm run lint`、`node -c dist/extension.js` 和 `git diff --check` 通过；操作生命周期、错误类型与错误行定向测试 `8/8` 通过。
- 说明：操作状态上限恢复为 `120`，其中保留最多 `80` 条普通终态，并始终优先保留活动与异常记录；`actionErrorRows` 改为校验当前 `renderPanelHtml` 接口，不再依赖仓库和安装版均不存在的 `PanelHtmlBuilder`。
- 提交记录：`fix: restore operation status contracts`，提交 `f092728c17cf7bce40210120372905d497e0f92c`，已普通快进推送至 `origin/master`；推送后本地 `HEAD` 与 `origin/master` 一致。
- 状态：已完成；其他 UI 与 features 分组失败延期到后续批次。

### recovery-build-012

- 目标：恢复 Webview 字段级数据源选择，实时字段为空时按最近快照、离线快照顺序回退；不修改 Extension 实时合并策略。
- 影响区域：`src/ui/WebviewRenderState.ts`、`dist/ui/WebviewRenderState.js` 和本计划。
- 回归检查：离线快照回退测试、`npm run typecheck`、lint、JavaScript 语法和 `git diff --check`。
- 验证：离线快照与最近快照优先级测试 `2/2`、`npm run typecheck`、`npm run lint`、`node -c dist/ui/WebviewRenderState.js` 和 `git diff --check` 通过。
- 提交记录：`fix: restore webview snapshot fallback`，提交 `15da3e95cd59a1cec2266fd3943b4fb49a751b89`，已普通快进推送至 `origin/master`；推送后本地 `HEAD` 与 `origin/master` 一致。
- 状态：已完成；Extension 内部合并与 payload 预算不在本批修改。

### recovery-build-013

- 目标：恢复一整天性能与自动化持续优化所需的长时间状态预算；只处理 `schedulerStates` 与 `experimentTraces`。
- 影响区域：`src/extension.ts`、`dist/extension.js` 和本计划。
- Batch 74：scheduler state payload 预算。schedulerStates 长时间累积必须受调度状态 payload 预算约束，并优先保留活动、异常和当前选择记录。
- Batch 75：experiment trace payload 预算。experimentTraces 长时间累积必须受限；实验记录 `experimentTraces` 长时间运行必须有 payload 预算，并优先保留当前选择与需关注记录。
- 回归检查：scheduler state 与 experiment trace 预算测试、`npm run typecheck`、lint、JavaScript 语法和 `git diff --check`。
- 验证：scheduler state 与 experiment trace 预算测试 `4/4`、`npm run typecheck`、`npm run lint`、`node -c dist/extension.js` 和 `git diff --check` 通过。
- 提交记录：`fix: restore long-running state budgets`，提交 `3209d143487ec69f8ce41408633d00364330de73`，已普通快进推送至 `origin/master`；推送后本地 `HEAD` 与 `origin/master` 一致。
- 状态：已完成；其他 Webview 与 UI 失败延期到后续批次。

### recovery-build-014

- 目标：恢复 Webview state 的源码类型边界与 compact helper 声明，并依据已安装版和现行文件传输测试移除过时的面板传输队列断言。
- 影响区域：`src/extension.ts`、`test/ui/webviewStateShape.test.js` 和本计划；类型恢复不改变生成后的 `dist/extension.js` runtime。
- 保护区域：不重新引入已由 SimpleSFTP 承担的面板传输队列，不修改实时数据内容与远端协议。
- 回归检查：Webview state shape、文件传输渲染边界、`npm run typecheck`、lint、JavaScript 语法和 `git diff --check`。
- 验证：Webview state shape 与文件传输渲染边界测试 `5/5`、`npm run typecheck`、`npm run lint`、`node -c dist/extension.js` 和 `git diff --check` 通过。
- 说明：已安装版和现行测试均证明独立传输队列、日志选择器与日志面板已从主面板移除；实时日志继续在任务卡内显示，文件传输由 SimpleSFTP 承担。
- 提交记录：`fix: restore webview state source contracts`，提交 `5a084b9929ff04fbde66819484eda7396ee4dcd6`，已普通快进推送至 `origin/master`；推送后本地 `HEAD` 与 `origin/master` 一致。
- 状态：已完成；其他 UI 失败延期到后续批次。

### recovery-build-015

- 目标：依据 Git、已安装版与现行 SimpleSFTP 职责边界，校正已移除的面板远端文件浏览和远端文件选择测试，并恢复 Webview action allowlist 的源码类型声明；不重新引入面板上传或远端目录浏览。
- 影响区域：`src/extension.ts`、远端文件浏览/选择状态/Webview 命令白名单相关测试和本计划。
- 保护区域：不修改运行时远端协议，不修改 SimpleSFTP，不恢复 `selectedRemoteFile`、`selectRemoteFileFromUi`、`listRemoteFiles` 或 `uploadFileToCurrentRemoteDir` 面板入口。
- 回归检查：相关 UI 与 feature 定向测试、`npm run typecheck`、lint、JavaScript 语法和 `git diff --check`。
- 验证：远端文件职责、选择状态、Webview action allowlist、可见按钮处理与命令白名单一致性定向测试 `6/6` 通过；`npm run typecheck`、`npm run lint`、`node -c dist/extension.js` 和 `git diff --check` 通过。类型声明编译后不改变 `dist/extension.js` runtime。
- 说明：面板上传继续由 SimpleSFTP 命令承担；SimpleExperiment 只保留当前 Plan 不可解析轻量结果的受限只读下载。任务卡日志选择保留，远端浏览器选择态不恢复。
- 提交记录：`fix: align webview file ownership contracts`，提交 `b67c65bb853ef9a901919c1306911b58e776eada`，已普通快进推送至 `origin/master`；推送后本地 `HEAD` 与 `origin/master` 一致。
- 状态：已完成；UI 分组测试提升到 `56/72`，其他失败延期到后续批次。

### recovery-build-016

- 目标：校正 capability 与调试包测试中残留的旧远端文件浏览器断言；保持调试包专用下载和 SimpleSFTP 上传职责。
- 影响区域：`test/ui/actionButtonsCapability.test.js`、`test/ui/debugBundleWorkflow.test.js` 和本计划。
- 保护区域：不修改 Panel 或 Extension runtime，不恢复通用远端列表、上传、下载或选择入口。
- 回归检查：capability、调试包、远端结果查看定向测试，UI 分组测试，`git diff --check`。
- 验证：capability 与调试包定向测试 `2/2` 通过，UI 分组提升到 `58/72`；`git diff --check` 通过。远端结果查看 feature 测试仍有既有契约失败，延期至后续结果查看安全批次。
- 提交记录：`test: align file capability workflows`，提交 `fbad7dfa63328dc8b95ae4d8d58ede2d40a3e183`，已普通快进推送至 `origin/master`；推送后本地 `HEAD` 与 `origin/master` 一致。
- 状态：已完成；远端结果查看 feature 测试延期至后续结果查看安全批次。

### recovery-build-016a

- 目标：收窄人工待删除清单范围，仅登记需要用户整体删除的完整文件或目录；局部代码、配置和文档内容由正常编辑流程处理。
- 影响区域：`docs/manual-cleanup-candidates.md` 和本计划。
- 保护区域：不删除、移动、清空或暂存删除任何文件；局部修改不得把文件截断为空。
- 回归检查：清单现有候选类型复核和 `git diff --check`。
- 验证：现有 `11` 条候选全部是完整文件路径，没有局部内容候选；`git diff --check` 通过。
- 提交记录：`docs: clarify manual cleanup scope`，提交 `cec7fef4872edf927840c80e01f78fb0c8d2af4d`，已普通快进推送至 `origin/master`；推送后本地 `HEAD` 与 `origin/master` 一致。
- 状态：已完成。

### recovery-build-017

- 目标：从本机已安装 `SimpleExperiment 0.2.0` 与当前完整 `dist/runtime/cluster_agent.py` 恢复被截断的 `src/clusterAgentRuntime.ts`，使源码可重新生成完整 Hub Agent runtime。
- 影响区域：`src/clusterAgentRuntime.ts`、对应生成的 `dist/clusterAgentRuntime.js`、两个 Hub Agent 结果动作回归测试和本计划。
- 保护区域：不修改已安装扩展，不覆盖 `dist/runtime/cluster_agent.py`，不处理 FileTransferClient 或 UI 失败。
- 回归检查：编译后导出的 `CLUSTER_AGENT_RUNTIME` 与当前 Python runtime 逐字节一致，Agent/runtime 定向测试、`npm run typecheck`、lint、JavaScript 与 Python 语法、`git diff --check`。
- 验证：`npm run typecheck`、`npm run lint`、`node -c dist/clusterAgentRuntime.js`、Python AST 解析和 `git diff --check` 通过；全部 `test/agent/*.test.js` 回归 `7/7` 通过。
- Runtime 一致性：编译导出的 `CLUSTER_AGENT_RUNTIME` 与 `dist/runtime/cluster_agent.py` 逐字节一致，字符数 `382096`、UTF-8 字节数 `386901`、SHA256 `a4c067a5d5009f19e58afdfa51a105e1802e3d81ddd8463528717fe6a49329ba`。
- 安装版对照：当前 `dist/clusterAgentRuntime.js` 与本机已安装 `SimpleExperiment 0.2.0` 仅相差 TypeScript CommonJS 导出的 `2` 行包装声明，内嵌 Python runtime 内容一致；未修改安装目录。
- 测试契约修复：异常诊断产物按稳定 `resultId` 命名，测试改为校验动作返回路径；统计、论文表和最终 CSV 测试先归档结果，再验证 `archived_only` 数据链，不放宽正式结果门禁。
- 延期项：`test/clusterRuntime.test.js` 仍期待 scheduler 旧错误文本；`test/tunnel/agentTmuxPolicy.test.js` 仍期待旧 `pgrep -f` 实现，而当前命令使用 `ps`、`awk` 与监听端口联合定位进程。两项不属于 Hub Agent runtime 源码恢复，后续分别核对 scheduler 与隧道契约。
- 提交记录：`fix: restore hub agent runtime source`，提交 `ab76781fe1d56cd410e94b988cd36f817bd071a7`，已普通快进推送至 `origin/master`；推送后本地 `HEAD` 与 `origin/master` 一致。
- 状态：已完成；下一批处理远端结果只读下载的路径白名单、大小上限和 HTTP 413 契约。

### recovery-build-018

- 目标：恢复远端结果只读下载的路径白名单与客户端大小上限，使 Extension 的 `5 MB` 检查同时由客户端和 Hub Agent 强制执行。
- 影响区域：`src/tunnel/FileTransferTypes.ts`、`src/tunnel/FileTransferClient.ts`、两个 realtime client 的下载参数透传、对应生成的 `dist` 和本计划。
- 保护区域：不恢复主面板通用远端浏览、上传或任意文件下载；不修改 SimpleSFTP、已安装扩展和 Hub Agent runtime。
- 回归检查：远端结果查看 workflow、文件 API 安全路径、文件传输定向测试、`npm run typecheck`、lint、JavaScript 语法和 `git diff --check`。
- 验证：远端结果查看与大小上限测试、文件 API 安全路径、下载、上传、范围下载、校验和无 SSH/SCP/rsync 定向测试共 `24/24` 通过；`npm run typecheck`、`npm run lint`、4 个变更后 JavaScript 语法和 `git diff --check` 通过。
- 安全行为：`DownloadOptions.maxBytes` 已从 realtime client 透传至 Hub file API；客户端先检查 `content-length`，Hub 超限继续返回并保留 `HTTP 413`；远端路径恢复根结果文件白名单、扩展结果目录白名单和私钥文件拒绝规则。
- 测试契约修复：结果查看测试按当前 TypeScript 下载参数签名校验；无 SSH/SCP/rsync 测试改用允许的结果子路径；上传测试按当前 binary chunk 协议校验，不把二进制 chunk 当 JSON 解析。
- 提交记录：`fix: enforce remote result download limits`，提交 `27fb235d85d09166f7f4220b349d82d5a9152100`，已普通快进推送至 `origin/master`；推送后本地 `HEAD` 与 `origin/master` 一致。
- 状态：已完成；下一批处理结果 UI 契约，保持只读结果职责边界。

### recovery-build-019

- 目标：校正结果摘要恢复后的源码测试契约，并把占空间的结果契约卡片收敛为紧凑行内入口。
- 影响区域：`src/ui/PanelHtml.ts`、两个结果 UI 回归测试、对应生成的 `dist/ui/PanelHtml.js` 和本计划。
- 保护区域：不改变结果归档、统计、论文表、PPT 或 realtime 刷新行为；不修改 Extension runtime。
- 回归检查：结果 action workflow、结果契约紧凑布局、Panel inline script、UI 分组、`npm run typecheck`、lint、JavaScript 语法和 `git diff --check`。
- 验证：结果 action workflow、结果契约紧凑布局与 Panel inline script `3/3` 通过；UI 分组由 `58/72` 提升到 `60/72`。`npm run typecheck`、`npm run lint`、`node -c dist/ui/PanelHtml.js` 和 `git diff --check` 通过。
- 说明：输出契约、数据集画像、检查点清理预案和 PPT 绘图契约由四个占高卡片改为紧凑行内入口；结果刷新测试按已安装版一致的恢复源码校验命名空间异常类型和 generation guard，不改变 runtime。
- 延期项：剩余 `12` 个 UI 失败属于任务行、GPU、Hub/Worker 状态、端口冲突、操作时间线、Plan action、服务器 tooltip、同步发布、target mode 计划压缩与任务紧凑布局，后续按强相关小批处理。
- 提交记录：`ui: compact result contract links`，提交 `7cc4d32919406ffc4121b0d7c396f20013c0ba7d`，已普通快进推送至 `origin/master`；推送后本地 `HEAD` 与 `origin/master` 一致。
- 状态：已完成；下一批优先处理任务行与任务紧凑布局契约。

### recovery-build-020

- 目标：修复任务行中文操作契约，并压缩任务区重复进度卡、密集元数据网格和无选择状态说明。
- 影响区域：`src/ui/PanelHtml.ts`、`test/ui/experimentRowActions.test.js`、`test/ui/taskCompact.test.js`、对应生成的 `dist/ui/PanelHtml.js` 和本计划。
- 保护区域：不改变任务操作命令、远端协议、Plan/任务元数据内容或日志行为；不修改 Extension runtime、SimpleSFTP 和已安装扩展。
- 回归检查：任务行操作、任务紧凑布局、Panel inline script、UI 分组、`npm run typecheck`、lint、JavaScript 语法和 `git diff --check`。
- 验证：任务行操作、任务紧凑布局与 Panel inline script `3/3` 通过；UI 分组由 `60/72` 提升到 `62/72`。`npm run typecheck`、`npm run lint`、`node -c dist/ui/PanelHtml.js` 和 `git diff --check` 通过。
- 说明：任务操作保持中文标签和原命令映射；移除重复活动任务进度卡、旧任务长说明和无选择批量提示；任务卡元数据改由悬停标题保留，Plan 元数据改为紧凑 flex 布局。
- 延期项：剩余 `10` 个 UI 失败属于 GPU、Hub/Worker 状态、端口冲突、操作时间线、Plan action、服务器命令/tooltip、同步发布与 target mode 计划压缩，后续按强相关小批处理。
- 提交记录：`ui: compact task status section`，提交 `52b36cddef9853acc51ddc7addf29c2885fa547c`，已普通快进推送至 `origin/master`；推送后该提交与 `origin/master` 一致。
- 状态：已完成；下一批优先处理 GPU 紧凑布局契约。

### recovery-build-021

- 目标：压缩 GPU 与发布同步区域，移除重复说明、进程明细和嵌套卡片，同时保留 GPU 状态指标、归属判断、同步流程和全部操作入口。
- 影响区域：`src/ui/PanelHtml.ts`、`test/ui/gpuCompact.test.js`、`test/ui/syncPublishCompact.test.js`、对应生成的 `dist/ui/PanelHtml.js` 和本计划。
- 保护区域：不改变 GPU 数据规范化、归属判断、告警阈值、同步命令或 Extension handler；不修改 SimpleSFTP 和已安装扩展。
- 回归检查：GPU 紧凑布局、单列 GPU、发布同步紧凑布局、Panel inline script、UI 分组、`npm run typecheck`、lint、JavaScript 语法和 `git diff --check`。
- 验证：GPU 紧凑布局、单列布局、字段规范化、发布同步紧凑布局与 Panel inline script `6/6` 通过；UI 分组由 `62/72` 提升到 `64/72`。`npm run typecheck`、`npm run lint`、`node -c dist/ui/PanelHtml.js` 和 `git diff --check` 通过。
- 说明：GPU 摘要移除配置教学文本，服务器元数据和 GPU 关键指标保留在悬停标题；进程明细不再逐项展开但进程计数和归属判断保留。发布同步移除嵌套卡片与重复标题，流程、状态和操作入口不变。
- 延期项：剩余 `8` 个 UI 失败属于 Hub/Worker 状态、端口冲突、操作时间线、Plan action、服务器命令/tooltip 与 target mode 计划压缩，后续按强相关小批处理。
- 提交记录：`ui: compact GPU and sync panels`，提交 `e75bbf6b59a6f781dd3cd59e8e8923555f3e0bd0`，已普通快进推送至 `origin/master`；推送后该提交与 `origin/master` 一致。
- 状态：已完成；下一批优先处理 Hub/Worker 状态与端口冲突契约。
