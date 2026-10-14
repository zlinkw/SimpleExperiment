# Worker 统一与手动派发实施记录

目标：移除 Hub 执行流程，一台或多台 Worker 使用同一套路径；实现已确认的 1A2A3B4A5A6B7A8A9A10B 手动派发规则。

保护范围：用户配置、历史文件、科研产物和权重；不部署远端、不运行训练、不清理真实文件。保留自动同步、静态入口探针、全部 Worker 就绪检查、目录创建和指标内存读取。

批次与状态：

1. Worker 模式统一、取消旧 Hub 自动目标、前后端路由和部署退役：已实现并通过单文件回归；全局 Scheduler 旧入口另外完成退出回归。
2. SimpleSFTP 精确目标检查及诊断：build 通过，源码提交并推送 `1e1ef7a266c672b6e4a3ef37ad5bc9f22fe36272`。
3. 手动派发服务、远端同卡准入、卡片/API/CLI：已实现并通过单文件及真实隔离 tmux 回归。
4. 0.5.309 / 0.2.83 构建打包及字节验收通过；发行及安装结果在本记录补齐。

验收：零/单/多 Worker 及数量变化；旧 Hub 字段不触发请求；精确路径审核；单/批量忙卡派发、同卡并发、优先级及自动共存；停止后重新执行；发送前离线回到自动队列，发送后未知不重复提交；重载恢复；当前发布源及安装字节核验。

已知失败证据：0.5.308 清理发现会因旧顶层会话和目录字段加入 Hub；SimpleSFTP 随后将同一服务器的 NWPU213 与 10.216.241.213 按字符串不同拒绝。修复必须贯通发现和全部文件操作，不只隐藏错误。

本记录随每批补充实际测试、提交及未执行的验收项。实现只修改真实源码，再生成 dist。

## 主要修改与验证对应

| 范围 | 实现 | 验证 |
|---|---|---|
| 模式和旧配置 | TopologyMode、ApiWorkflow、TunnelEndpointRegistry、端口分配及 Host：仅明确 Worker 产生执行目标 | workerOnlyTopology、topologyMode、workerRouting；零/单/多及数量变化，旧 Hub 字段不变且不进入目标 |
| 状态来源 | MultiEndpointRealtimeClient、AuthorityMergePolicy：直接合并各 Worker 的 Scheduler、操作、GPU、任务和结果 | workerOnlyStateMerge：旧 Hub 状态不覆盖 Worker；保留各 Worker 操作来源 |
| Hub 退役 | Agent 能力、serve 模式及辅助服务仅 Worker；Scheduler 保留结构检查/预演/run-job，旧全局循环不可启动 | hubRetirement：提取真实入口函数执行，拒绝 Hub API 和全局调度 |
| 文件目标 | SimpleSFTP cleanupFileTransport 共用完整显式节点，不查询重复 profile | cleanupExplicitTarget 先失败后通过；真实 transport 闭包，非法主机仍拒绝；未连接生产服务器 |
| 手动服务 | ManualJobDispatch、ManualDispatchHost：先保留本机意图，再同步/停止/审核/发送 | manualJobDispatch：整批取消、旧 Worker、停止后重跑、三模式、checkpoint 声明、响应丢失、重载序列化、离线回自动队列 |
| 远端准入 | TmuxTaskLifecycle：手动优先，固定可见 GPU、可同卡并行；自动仅统计自动独占并检查实际资源 | manualTmuxAdmission：实际 Host 启动消息→提取的真实 Agent 入口→真实回环通道→隔离 tmux Scheduler/runner；轻量 CPU 执行器和合成 GPU |
| 卡片与 CLI | 单个/批量选择，显示指定目标；tasks.dispatch 与 CLI 共用服务 | panelWebviewScriptHealth 实际点击处理器、manualDispatch CLI 参数；面板脚本解析 |

实际 tmux 验证使用本机 WSL 的 tmux 3.4。两个手动 CPU 探针在同一合成忙卡同时启动，自动队列不阻挡它们；合成资源释放后自动任务与手动任务共存。CPU 探针验证 CUDA_VISIBLE_DEVICES，未调用 train.py/test.py。

测试曾暴露真实启动消息缺少顶层 commandId，现显式随 opId/operationId/runKey 一并传递。测试夹具重复解析大型 runtime 曾触发 10 秒子进程上限，改为复用已解析 AST；没有放宽生产超时或测试上限。初期旧 Hub 路由、旧静态断言和抽取 UI 测试缺少新全局选择集合均记录为失败后修正；最终构建结果单独记录，不把早期失败算通过。

## 使用及部署边界

- API：`tasks.dispatch({workflowId, indices, workerId, gpuId, confirm:true, stopRunning:true})`。命令、模式、正式路径和 checkpoint 从原任务取得，API 不能替换任意命令。
- CLI：`simpleex task dispatch --workflow ID --jobs 0,2 --worker ID --gpu 0 --confirm --stop-running`。
- 原始指标仍只临时读入内存。本机可保存生成的汇总；自动同步、静态入口探针、全部启用 Worker 就绪检查和正式输出目录创建保留。
- 原任务接收情况不明时不改派；主动查询失败结束本轮，保留原 commandId。显式重新执行才产生新 commandId；同一次请求、重载和重连不产生新任务。
- 完成任务使用原重跑入口；手动重新执行按 PLAN 原 train/test/train_test 模式。运行中原任务先退出精确窗口，产物需要删除时仍显示整批完整路径并确认两次。
- 插件重载后更新所有需要手动派发的 Worker Agent/Scheduler 至 0.5.309；能力字段为 taskLifecycle=2、manualDispatch=1。旧 Worker 在提交前提示升级，停止原窗口不要求版本一致。
- Mac 仓库未修改。旧 Hub 配置、历史文件和旧服务不自动迁移、连接、停止或清理。
- 未执行：重载后实际插件 UI、H20/NWPU 等生产 Worker 更新、真实产物覆盖和实际科研任务。安装之后必须由用户重载，再按授权验收；磁盘版本不代表远端运行版本。

## 最终本机验证

- SimpleExperiment：`npm run package` 完成；包含完整 build、逐文件串行测试、Windows 流程及清理/结果/停止回归。最终日志 399 条通过记录、零失败、零跳过，包含构建和打包阶段的同文件复跑，不作为独立测试数量。
- SimpleSFTP：`npm run package` 完成；包含 build、安全删除、受管 tmux 清理、生命周期和显式节点 transport 回归。发行源码为 `4d54d3204da80657bb36f0f75a75ab94a05a0c00`，此前功能批次为 `1e1ef7a`，均普通推送并核对 upstream。
- 最后增加真实 tmux 精确关窗断言并单文件通过：同卡任务并发后关闭其中一个窗口，另一个继续执行，自动任务仍可按合成资源阈值加入。测试约 6.94 秒；这是本地 CPU 夹具耗时，不是生产预检性能。
- `verify-delivery-artifacts.py`：SimpleExperiment 233 项运行文件/身份哈希，SimpleSFTP 22 项；包内 Python AST、秘密/缓存排除检查通过。编译后的 PanelHtml 与 legacy 模块通过 vm.Script；渲染后的内层脚本由面板回归另外解析。
- SimpleExperiment VSIX：2,754,605 字节，SHA256 `a7e0a57db63178519fd28f6faaf852b8de03aef0ca3c3cc24b12b16d3aff9470`。
- SimpleSFTP VSIX：162,975 字节，SHA256 `2167ee8b3a5aa7403936ae44a6559dc3db1c70f13f97d67554b6546f7d5c0b6d`。
- 补充审核：默认会话配置的编辑保护/保存已贯通；缺失或非法 CLI job 选择不再默认成 index0；不存在 Worker 或不可见 GPU 在停止原任务前拒绝；离线且从未发送的任务直接回到自动队列，不进行远端文件审核。

GitHub 稳定发行、旧版本更新客户端校验和本机一次安装将在完成后追加；当前不把这些步骤标记为已完成。
