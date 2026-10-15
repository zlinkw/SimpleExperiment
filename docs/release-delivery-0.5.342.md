# 0.5.342 PLAN 源码范围与未派发任务身份

## 根因与现场边界

只读查询已重载的 0.5.341 插件，确认 late_fusion、qa_moe 均有尚未绑定 commandId 的 pending job；本轮未启动、停止、重跑、删除或部署远端任务。

- 面板公共显示转义函数会把空字符串显示为 `-`。0.5.341 的手动派发属性也使用了它，把尚未派发任务的空 commandId 写成 `-`，随后被真实身份比较拒绝。这是插件缺陷，不要求用户重跑 PLAN。
- 历史代码同步清单有 13,316 项，用户配置包含整个 experiments，使结果表等生成文件进入整体指纹。不同整体指纹不能证明本 PLAN 的代码不同。实际远端相关源码是否变化，仍需新协议主动查询，不能据此断言现场所有差异都来自产物。
- 重跑单个 job 先读后写整个旧队列，其他任务同期刷新会触发旧快照拒绝。应在原队列事务内仅修改选中任务。

## 实现与状态兼容

- `src/ui/PanelHtml.legacy.ts`：手动派发按钮和多选框的空 commandId 保持空值，显示占位符不进入操作身份。真实 commandId 变化仍拒绝旧选择。源码核实问题展示具体原因。
- `src/runtime/PlanCodeScope.ts`：Agent 只读提取当前 PLAN 入口、Python 导入、动态模块及继承配置；不导入项目模块、不运行科研代码。不相关 PLAN、结果和缓存不参与校验；无法静态确定的动态加载器保守扩大对应源码包并报告，不能静默略过。路径、链接、内容哈希、原始 PLAN revision、输入大小和依赖变化仍校验。
- `src/clusterAgentRuntime.legacy.ts`、三个 tunnel client、`src/runtime/TmuxTaskLifecycle.ts`：新增认证只读 `/api/code-sync/plan-scope` 与 `planCodeScope=1` 能力；冻结依赖及其原始哈希随现有队列和原生 tmux 启动输入传递。启动边界再次主动核实目标内容，整体指纹仍保留作身份和同步用途。
- `src/extension/PlanCodeScopeHost.ts`、`src/extension/legacy.ts`、`DistributedPlanQueue.ts`、`DistributedSchedulingPolicy.ts`：同一 PLAN 的不同整体指纹副本可以在相关源码核实一致后分配。慢 Worker 不阻塞已经核实的空闲 Worker；内存复用只用于本轮准入，实际发送再次查询。真实源码变化和查询失败均不授权启动。代码上传的写入保护保持。
- 自动运行准备在哈希和传输前排除生成结果、产物和缓存；手动同步及 Worker 间产物同步沿用自己的勾选范围。没有新增服务器结果状态文件或下载缓存。
- `PlanRunHost.ts`、`ManualDispatchHost.ts`：覆盖与重排采用冻结的 PLAN 依赖检查，本机无关产物变化不撤销确认；路径双确认及删除保护保持。`retryPulledJob` 在已有串行事务内读取最新队列，只重置选中 commandId，保留其他 job 的最新进度。

旧队列没有 executionSource 时，只能从原同步证明或实际窗口保留的冻结输入提取原始哈希，再核对当前服务器。不会把当前内容冒充原版本，不创建新 commandId 或重放历史。原始哈希缺失、真实相关源码变化均明确阻断。旧 Agent 保留原协议；无法证明范围一致时提示升级 Agent/Scheduler，不要求重建已排队 PLAN。

## 验证

实际渲染回归先重现 `['-', '-']` 身份错误，再验证两个属性均为空。新增合成 Python 回归提取函数而不加载完整 Agent/Scheduler，覆盖继承配置、静态与动态导入、Path 入口、原生准入输入、产物变化、真正源码变化、哈希篡改和越界。实际分配器验证不同整体指纹但依赖一致可以分配、负面核实不能被相同整体指纹绕过，以及慢 Worker 不阻塞空卡。重排事务回归验证其他 job 更新保留、新 commandId 不能覆盖。

只读检查消费项目的 late_fusion、qa_moe 当前依赖分别为 136、138 个文件，冻结输入约 16.8、17.0 KB，无保守包扩展；未包含 work_dirs/results/__pycache__，未读取权重或执行项目模块。该检查不等于旧远端源码已经核实一致。

既有非打包门禁 `workerCodeVersionIsolation.test.js` 的 10 处旧夹具失败已在未修改的 0.5.341 HEAD 单独复现：9 处使用已禁止的 attempts 目录，1 处依赖旧源码文本结构。本轮没有放宽正式路径保护来迁就旧夹具，也没有将该文件宣称通过；当前协议由新增源码范围回归覆盖。

完整打包、发行与安装结果在交付后记录。
