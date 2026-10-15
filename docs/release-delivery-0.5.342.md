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

最终 `npm run package` 的 116 次串行单文件执行共 768 项通过，零失败。日志为本机临时目录 `simpleex-0.5.342-package-verified2.log`。此前打包在三个提取式夹具缺少新增 Host 依赖时停止，补齐实际依赖后逐文件重验并完成整套门禁，没有更改生产逻辑来迁就夹具。

TypeScript、实际渲染脚本、额外 vm.Script、8 个 Python AST、VSIX ZIP/身份/版本/universal 平台、370 个 dist 文件逐字节比对、250 个本地模块运行闭包和秘密排除通过。打包不安装扩展。包中交付文档是发行前快照；本记录的最终发行结果由随后文档提交补齐，包字节未重新生成。

## 交付

- 修复提交 `7456bf080dc7af1dbce37fcfadefd8ed44655e53` 已普通快进推送 origin/master，并 fetch 核对一致。
- 稳定 Release：<https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.342>。重新读取真实 Latest，核对该 tag 和提交、draft=false、prerelease=false 及两个资产。
- `simple-experiment-0.5.342.vsix`：2,961,760 字节；SHA256 `ef08860e2f316f737de9a0d67ba652fbaaf4cf9540f5e184cf5415f193a005c2`。同名 `.vsix.sha256` 绑定精确文件名。
- 实际已安装 0.5.341 更新客户端识别 update_available，下载公开包与校验和，逐字节匹配本机已验证包；SimpleSFTP 0.2.90 同时核对一致，未修改或安装配套版本。验证文件保留于临时目录 `simpleex-0342-release-verify-WpOxIO`。
- 显式执行一次 `npm run install:latest` 安装 0.5.342，无 force、无降级。已安装的 370 个 dist 文件与发布包一致，VS Code 版本及 `simpleex --help` 通过。安装后停止访问当前 SimpleExperiment 面板与 API。

等待用户执行 Developer: Reload Window，再由插件更新对应 Agent/Scheduler，使 `planCodeScope=1` 生效。远端未部署、未修改环境，现有任务未被启动、停止、重跑或清理。尚未实机验证截图中的 pending job 在新远端协议下实际接收；合成分配通过不代表科研任务已经启动，不要求重建这些排队 PLAN。
