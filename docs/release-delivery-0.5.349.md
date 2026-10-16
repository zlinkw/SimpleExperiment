# 0.5.349 补齐批量运行中的旧任务停止核实

## 现场

当前 discovery、capabilities 与只读 state 证实 Extension Host 和四台 Worker Agent 均为 0.5.348。批量完成 3/4，第四项 `experiments/plans/comparison/tmdc.yaml` 报“任务状态查询超时”，未进入代码同步、校验或新队列提交。前三项已处理，不自动回滚或重发。

旧 TMDC 为 `distributed-plan-1792113525435-qrzgr7`：索引 0–3 显示 cancelled，索引 4–5 仍 unknown/missing，均保留原 commandId。该错误字串来自 `PulledTaskControl.queryTask`，此阶段唯一调用链为 NativePlanRetry → stopPulledTask → queryTask。上一版只优化了提交前的空选择窗口查询，遗漏带 commandId 的停止核实；用户已更新远端，并非未部署新版。

## 修改

停止核实显式使用 executionOnly 加精确原任务选择，只读取本轮 tmux 执行绑定与 Scheduler 原生取消围栏。查询成功且取消围栏为真、实际标签页已消失，才确认停止；围栏读取失败、外项目/Worker 身份冲突、残留原生或旧标记窗口都不能认定已停止。超时提示携带 Worker 和 commandId。普通结果、日志异常分析仍走完整观察，不因轻量控制查询声称产物完整或无异常。

Agent 的轻量查询支持精确任务选择，并覆盖原生窗口、旧受管窗口、已消失任务和真实取消标记，不读取日志、指标、权重或源码分块。拒绝混合产物/发现请求。0.5.348 对带选择的轻量请求会明确拒绝，新客户端仅在这个明确拒绝上兼容退回完整只读查询，不重复停止 POST；未更新的服务器仍可能较慢。

Scheduler 的启动身份集合、重复接收检查、取消检查和占卡计算改读已发布窗口身份头，避免处理一个原 commandId 时反复读取所有任务的源码载荷。正式派发仍对真正待启动的 queued job 读取完整、校验哈希和身份的启动输入，保留显存比例策略、Conda 参数和源码保护。任务执行、产物、指标、窗口归属及完成判定规则不变。

## 验证

回归先复现真实批量入口：前三 PLAN 已接收，第四个有六条旧的缺失输入；停止核实进入无关历史查询即超时。修复后整批完成，仅对这六个原 commandId 建立停止围栏，保留其他活动 PLAN，前三项只提交一次。

合成 180 个 pane 验证一次当前列表查询识别本项目 179 项；选定任务查询不读取源码载荷、产物或日志；缺失任务必须查询真实取消标记；取消标记不能掩盖仍存在的旧窗口。另从真实 Agent HTTP 处理器提取对应 AST 分支，验证带选择的轻量请求与混合请求拒绝。没有 import 或 exec 完整 Agent/Scheduler 模块。

已单独验证 stop query 默认完整查询、轻量停止核实、明确旧端点拒绝的只读兼容、丢失停止回执、查询失败与身份冲突；真实隔离 tmux 的队列、启动、停止与结果链路通过。

最终 `npm run package` 完成 116 次串行单文件执行，785 项通过、零失败，日志为临时目录 `simpleex-0349-package.log`。TypeScript/build、vm.Script 模块和 3 段真实渲染脚本、8 个 Python AST、运行闭包、ZIP、身份/版本/universal 平台、370 个 dist 文件逐字节核对及秘密排除通过。

本轮仅通过插件 API 读取实际状态；未停止、重跑、清理或部署远端任务，未修改 MultiModal、环境、模型、数据、指标、日志或权重。

## 交付

已验证包 `simple-experiment-0.5.349.vsix` 为 2,991,117 字节；SHA256 为 `cc1e867a34cc1aeced5f74c7806c0e955cd61a2ad182d88cd9e3bc62d2372edc`，同名 `.vsix.sha256` 绑定精确文件名。源码推送、稳定发行实际下载验收和一次安装完成后补记。包内本文为发行前快照，真实入口待用户重载和远端更新后验收。
