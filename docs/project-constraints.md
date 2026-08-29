# 项目约束（zlk-cluster-orchestrator）

本文件由 `docs/plugin-project-contract.md` 扩展，记录本插件的本地硬性约束，优先级高于通用契约。

## 禁止写死服务器名称（P0）

- **原则**：代码、配置、文档、测试、脚本中禁止出现任何写死的服务器标识，包括但不限于：主机名、IP、`workerId`/`serverId`（如 `nwpu3`）、`tmux` 会话名（如 `zlk-worker-nwpu3-agent`）、`Xshell` 会话文件名（如 `qgking.3.xsh`）、远端绝对路径（如 `/data/qgking/...`）、`conda` 环境名与用户名的硬编码组合。
- **实现要求**：
  - 所有服务器相关逻辑必须通过配置与拓扑动态获取：`setup.workerTunnels[].id`、`setup.remoteTmuxSessionPrefix`/`sessionPrefix`、`topology.workers`、`workers.json`、`assignmentById`、`tunnelPortAssignments`、`agentProjectDir` 等。
  - `tmux` 会话名统一由 `AgentTmuxPolicy.defaultAgentTmuxSessionName(role, endpointId, sessionPrefix)` 生成，形如 `${prefix}-worker-${endpointId}-agent` / `${prefix}-hub-agent` / `${prefix}_tb`，禁止在业务逻辑中拼接 `zlk-` 或具体 `nwpu3`。
  - `cluster_scheduler.py` / `cluster_agent.py` 的 `--worker-id` 默认值保持通用 `worker`，实际值必须由 `workers.json` 或 `SIMPLE_EXPERIMENT_WORKER_ID` 环境变量注入，不得在源码中默认 `nwpu3`。
  - `extension.ts` 中 `tryIds`、`abort`、`prepareAgents` 等多端点重试必须遍历 `enabledWorkerConfigs()` 或 `clients.keys()`，禁止写死 `["hub","nwpu3"]`。
  - 新增 Worker 时自动沿用 `TunnelPortAllocator` 的 `assignment`，前端 `renderTensorBoardLinkRow` 的 URL 必须由 `localForwardPort+1000` 动态生成，不得写死 `19767/19768/6006`。
  - 测试、文档、示例中的具体服务器名仅可作为 `example` 出现在注释或 `test/fixtures`，禁止作为业务分支条件。

- **校验**：`rg -n "nwpu3|qgking\.3|10\.70\.|/data/qgking" src --glob '!*.test.*'` 必须 0 命中；`rg -n "zlk-worker-" src` 仅允许在 `AgentTmuxPolicy` 的通用拼接处出现，且需以 `${prefix}` / `${endpointId}` 变量形式。

## 其他约束

- 调度器轮询下限 `pollSeconds >=5`（默认 10），`workerStatusTtl >=10`（默认 45），`local/workerPush >=5`（默认 10），`operationEventMaxDelayMs >=100`（默认 200），`workerActionMinIntervalMs >=200`（默认 500）；`CONFIG_SCHEDULER_BOUNDS` 与 `package.json` 保持一致。
- 面板与扩展的网络/轮询仅通过 `127.0.0.1` 本机转发访问远端，禁止裸 IP 直连与 `scp/rsync` 旁路。
- 日志卡片环形缓冲 50、预览 20、`max-height 120px`，通过 `showLogHistory`/`openFullLog` 查看全量，禁止无限 `append` 导致布局塌陷。
