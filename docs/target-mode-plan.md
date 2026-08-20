# 目标模式当前计划：无 Hub 人工调度周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 服务器拓扑必须支持“单 Worker”“仅多 Worker”“Hub 可用”三种模式；无 Hub 模式由各 Worker 自行调度且不尝试创建 Hub 或跨节点备份，详细契约与实施流水见 `docs/target-plans/worker-topology-modes.md`。
- 全局约束：不迁移、删除或重写旧任务和结果，不处理历史 VSIX 或 `zlk_cluster/ui/`；禁止“父级 evidence key 被子文件 archive 反向命中”。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- `metrics_summary.csv`、PPT 和论文证据只读取最终归档结果；PPT 绘图目标确认先于 automation，PPT 绘图链路与 realtime post gate 稳定化持续保留。
- GPU 历史和 Docker 兼容验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`；新增补充任务不得破坏当前主目标，计划更新必须防止修复循环。
- 长时间 Webview payload 预算：`schedulerStates`、`experimentTraces` 必须有界；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 必须保留。
- 连接边界固定为 Xshell 本地隧道 + 可选 Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。

## 后续优先级
- [已完成] 6/6 project-236：SimpleSFTP 0.2.0 暴露本机 JSON-RPC/HTTP API（默认端口 19766）、simple-sftp-api CLI、OpenAPI、参数化非交互方法与确认门禁。
- [已完成] 7/7 project-237：SimpleExperiment 0.3.0 暴露本机 JSON-RPC/HTTP API（默认端口 19765）、simple-experiment api CLI、OpenAPI、SFTP API 桥接与确认门禁。
- [已完成] 8/8 project-238：API 覆盖率补全：SimpleExperiment 配置与持久状态读写，SimpleSFTP 配置、服务器增删与目标更新。

## 当前批次：project-240（已完成）
### 边界

- SimpleSFTP `0.2.3` 为上传/下载增加 SSH `ConnectTimeout`（默认 15 秒）、整体传输超时（默认 600 秒，`0` 禁用）、可取消进度通知，以及 `transfers.list` / `transfers.cancel` API。
- 不连接真实服务器，不验证真实 Xshell/SFTP 现场操作；不覆盖历史 VSIX，不修改 `zlk_cluster/ui/`。

### 验证清单

- [已通过] SimpleSFTP `npm test` 31/31，`node --check`、`git diff --check` 通过。
- [已通过] 已打包 `simple-sftp-0.2.3.vsix`（10 files, 48.31 KB）并安装到 VS Code；当前 extension host 尚未重载，重启或 Reload Window 后才会运行 `0.2.3`。
- [已通过] SimpleSFTP 仓库 `origin/master` 已推送 `c692499`。

### 提交记录

- SimpleSFTP `c692499`：增加 SFTP 上传超时与手动停止能力。

## 当前批次：project-239（已完成）
### 边界

- SimpleExperiment `0.3.2` 新增 CLI `self-check`，修复 `simple-experiment api status` 的 `api` 后第一个参数被丢弃问题；SimpleSFTP `0.2.2` 新增 `simple-sftp-api self-check`。
- 不修改代理池或 `my_opencode_freeapi`，不覆盖历史 VSIX，不删除现有 untracked VSIX 与 `zlk_cluster/ui/`。

### 验证清单

- [已通过] SimpleExperiment `npm test` 1117/1117、lint、`node -c`、`git diff --check`；已打包 `simple-experiment-0.3.2.vsix`。
- [已通过] SimpleSFTP `npm test` 30/30、`node --check`、`git diff --check`；已打包 `simple-sftp-0.2.2.vsix`。
- [已通过] 两个新 VSIX 已安装；`simple-local-api` SKILL 与 references/agents 已同步为 `SimpleExperiment >= 0.3.2`、`SimpleSFTP >= 0.2.2` 并加入 `self-check` 启动自检。
- [已通过] 用户已手动重启 VS Code；本地复验 `simple-experiment self-check`、`simple-sftp-api self-check`、`simple-experiment api status`、`simple-sftp-api status` 全部 `ok:true`。
- [已通过] 两个 discovery 文件均存在，含 `schemaVersion`、`name`、`version`、`baseUrl`、`host`、`port`、`token`、`pid`、`startedAt`；`127.0.0.1:19765` 与 `127.0.0.1:19766` 可连通。
- [已通过] 两个插件的 `/api/v1/health`、`/api/v1/capabilities`、`/api/v1/openapi.json` 均返回正常；SimpleExperiment capabilities 19 个方法，SimpleSFTP capabilities 20 个方法。
- [已通过] 两个 discovery token 未出现在两个源码仓库中；CLI 从 discovery `baseUrl`/`token` 发起请求，无 CLI hardcode 端口。

## 当前批次：project-238（已完成）
### 边界

- SimpleExperiment `0.3.1` 新增 `config.list/get/set/reset` 与 `state.list/get/set/reset`；危险写入需要 `confirm`，secret/状态值脱敏，read-only 状态不可直接写入。
- SimpleSFTP `0.2.1` 新增 `config.list/get/set/reset`、`servers.save/delete`、`target.update`；文件/路径动作继续走 `pathConfirmed` 与共享操作租约。

### 相邻回归风险

- 不连接真实服务器，不执行真实 Xshell/SFTP/PPT；不断言实验结论，只做本地 API 与静态回归。
- 不覆盖历史 VSIX，不重载、关闭或重启当前 VS Code。

### 验证清单

- [已通过] SimpleExperiment `npm test` 1114/1114、lint、`node -c`、`git diff --check`。
- [已通过] SimpleSFTP `npm test` 28/28、`node --check`、`git diff --check`。
- [已通过] 两个插件分别打包新 VSIX，不覆盖历史 VSIX。

## 本批记录
- 当前 API 覆盖审计：所有本地 HTTP/CLI 方法经 capabilities 与 OpenAPI 自动枚举；配置修改不进入旧任务、结果或归档路径。

## 当前批次：project-236/237（已完成）
### 边界

- 只绑定 `127.0.0.1`，默认端口 `SimpleExperiment=19765`、`SimpleSFTP=19766`；实际端口以 `%APPDATA%\SimpleExperiment\api.json` 与 `%APPDATA%\SimpleSFTP\api.json` discovery 文件为准。
- SimpleSFTP 版本升至 `0.2.0`，SimpleExperiment 版本升至 `0.3.0`；逐个批次测试、提交并推送各自 `origin/master`。
- 危险 API 操作必须传 `confirm:true`；SFTP 路径动作另需 `pathConfirmed:true` 或精确匹配已有免提醒记录，缺失时返回 `CONFIRM_REQUIRED` 与目标预览。
- `project-235` 的第七十七轮完整非服务器静态测试并入本批次验证；保留既有历史批次记录、历史 VSIX 与 `zlk_cluster/ui/`，不重载、关闭或重启 VS Code。

### 验证清单

- [已通过] SimpleExperiment 的 `npm test` 1114/1114；lint、`node -c`、`git diff --check` 通过；8 个 dist Python 文件 `ast.parse` 通过。
- [已通过] 打包 `simple-experiment-0.3.0.vsix`（144 files, 977.61 KB），未覆盖历史 VSIX。
- [已通过] SimpleSFTP 的 `npm test` 27/27；extension/api-server/CLI `node --check` 与 `git diff --check` 通过。
- [已通过] SimpleSFTP `origin/master` 为 `e0fdfc1`；SimpleExperiment `origin/master` 为 `e59b011`。

### project-236 记录

- SimpleSFTP 新增本地 JSON-RPC 服务、CLI、OpenAPI、health/capabilities/SSE 和 discovery 文件。
- API 方法：`status`、`servers.list`、`servers.setActive`、`servers.importSshConfig`、`remote.listDirs`、`target.show`、`project.create`、`sync.fromRemote`、`upload.workspace`、`upload.files`、`handoff.markReady`、`ignores.configure`、`confirmations.reset`。
- 验证与提交记录：SimpleSFTP 仓库 `origin/master` 提交 `e0fdfc1`。

### project-237 记录

- SimpleExperiment 新增本机 JSON-RPC 服务、CLI 子命令、OpenAPI、health/capabilities/SSE 和 discovery 文件。
- API 方法：`status`、`state`、`actions.list`、`plans.list`、`results.list`、`tasks.list`、`operations.list`、`gpu.list`、`gpu.history`、`live.output`、`invoke(command, params)`。
- `invoke` 复用现有 webview action/safe command，`project-236` 的 SimpleSFTP API 负责文件传输桥接。
- 验证与提交记录：SimpleExperiment 仓库 `origin/master` 提交 `e59b011`。
