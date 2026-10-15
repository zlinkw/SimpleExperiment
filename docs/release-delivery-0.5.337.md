# 0.5.337 交付记录

## 根因与版本核对

用户现场检查版本为 0.5.334。本轮源码基线、磁盘安装、发现文件和活动 `/api/v1/capabilities` 实测均为 0.5.336，完成链路仍存在同一缺陷。关键 TaskLifecycle、原生 tmux 生命周期、Agent/Scheduler 和结果收集编译文件与已安装基线一致；面板文件仅有换行字节差异，逐行内容一致。

旧链路将真实退出状态与最终清单组合成 completed，没有独立运行异常证据。ctypes 回调的 ignored exception 可不改变退出码，因此完成 300 轮并退出 0 后被计入普通成功。

## 修改文件与行为

- `src/runtime/RuntimeLogDiagnostics.ts`：原始日志增量解析、完整异常块及字节/行范围、阶段、类型、次数、摘要；内存游标、重连重读、身份隔离和重复位置去重。
- `src/features/RuntimeDiagnostics.ts`、`TaskLifecycle.ts`：分离执行、物理产物完整性和运行异常。退出码未知不推断失败；明确非零仍失败。异常与未完整核实日志均不能成为无异常成功。
- `src/clusterAgentRuntime.legacy.ts`、`src/clusterSchedulerRuntime.legacy.ts`、`src/runtime/TmuxTaskLifecycle.ts`、`TaskShellEnvironment.ts`：既有原始控制台日志身份及阶段标记、前台子命令输出分析、最终清单摘要和主动查询。精确增加日志绑定环境字段，不放开环境接口。
- `src/features/DistributedPlanQueue.ts`、`ManualJobDispatch.ts`、`PulledTaskControl.ts`：传播本轮观察，清除新命令上的旧异常证据，不将异常完成当作无异常健康样本。
- `src/extension/RuntimeLogAnalysisHost.ts`、`src/extension/legacy.ts`、`src/api/LocalApiServer.legacy.ts`、`src/cli/index.ts`、`parse.ts`、`help.ts`：共用只读历史重新分析入口 `tasks.analyze` / `simpleex task analyze`，30 秒本轮边界，不改写历史。
- `src/ui/PanelHtml.legacy.ts`：job/PLAN、计数和卡片颜色区分异常完成、未核实与无异常完成；简短异常摘要、阶段、日志位置和重新分析入口。
- `src/results/FreshResults.ts`、`LatestResultExport.ts`、`NativeResultManifest.ts`、`src/extension/ResultCollectionHost.ts`：正式表与标记明确的待复核表；完整产物的有效指标（含零）保留，不自动判无效。失败执行可只读收集完整产物，通用身份校验入口未放宽。
- package、lock、runtime manifest、生成的 dist/runtime 及相关测试同步；协议说明见 `docs/runtime-diagnostics.md`。

兼容上保留 `status=completed` 作为终态控制值，不能据此认定无异常。UI、API 的 `successful`、任务计数和正式汇总结合 `completionState`、真实退出及主动日志证据。旧 Worker 或旧任务缺少异常证据时显示未核实；历史日志仅由用户主动重新分析，不伪造旧退出码、不改写旧清单。

## 验证

- 最终 `npm run package` 成功：113 次串行单文件测试，共 737 项通过；未并行运行测试进程。
- 六种真实隔离 Linux CPU 场景通过 Agent 实际环境白名单、Scheduler 前台执行/最终清单、Agent 主动查询和 TypeScript 生命周期：正常、普通警告、ctypes 异常后退出 0、退出 7、早期异常被后续输出淹没、训练异常但测试成功。退出 7 仍失败，完整产物可只读收集。
- 分块 UTF-8、ANSI、重复异常及重连、超过 4 MiB 的全日志扫描、旧日志隔离、主动历史分析、离线与取消、零指标、非零或未知退出与正式/待复核导出覆盖。
- 完整 PLAN 卡片与原始按钮载荷执行回归；模块及 3 个真实渲染内联脚本 `vm.Script` 校验通过。包内 8 个 Python 文件 AST 校验通过。
- VSIX 496 项、367 个 dist 文件与工作区字节匹配；身份、版本、universal 平台、ZIP、运行闭包 248 个模块/2 个入口、秘密和不应打包文件排除通过。
- 最终日志位于本机临时目录 `simpleex-0.5.337-package-release.log`；不进入仓库或发行包。

## 发布、安装与待验证

- 源码修复提交：`6c07a1ceb8b3bcc04e322544b6cf14d7381aa364`，普通快进推送到 origin/master，并 fetch 核对相等。
- 稳定 Release：<https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.337>。Latest、tag、绑定提交、draft=false、prerelease=false 和两个资产均已重新读取核对。
- `simple-experiment-0.5.337.vsix`：2,923,325 字节。
- SHA256：`8e754ff0703e7f6fead9bd5386bdab37812254c92f033683604bdd5d2581a370`。同名 `.vsix.sha256` 绑定精确包名。
- 实际已安装 0.5.336 的更新解析器返回 update_available，重新下载公开 Latest 的 VSIX/校验和，与本机已验证字节一致。配套 SimpleSFTP 0.2.90 同时核对真实发行与包指纹，未修改或重复安装。
- 显式运行一次 `npm run install:latest`，未 force、未降级；已安装 0.5.337，367 个 dist 文件与该 VSIX 一致，`simpleex --help` 正常。安装后停止操作当前面板/API，等待用户 **Developer: Reload Window**。
- 未修改 MultiModal、服务器环境或现有任务，未训练、重跑、停止、删除/覆盖真实产物或自动部署远端。用户更新匹配 Agent/Scheduler 后验收新任务；旧 NWPU5 任务通过用户主动日志分析复核。实机插件入口与现有六个任务的复核仍待用户重载后执行。
