
Path
----
D:\GitRepo\MCP\zlk-cluster-orchestrator

## 展示规范

- 对用户展示会话名称（title/slug），agent 间仍用 ses_... ID 精准拉取（捕获-转发-校验：从 Task 工具返回 JSON 的 SubtaskPart.sessionID/Message.id 原样转发，校验 ses_[a-zA-Z0-9]{20,}/msg_...，NotFound 回报“会话引用失效，请重试”）
- 主调度总结：首段 1 句人话结论 + 3-5 bullets（改了什么/为何/下一步），文件:行号仅放附录；对外展示不影响内部 handoff 仍为可执行 session.messages
- 共享上下文包引用优先级高于 caveman 精简，Batch complete 与 Final-Only 不得覆盖“一次读取、全员共用”硬门控

## 红线约束（严禁再犯）

### 删除路径安全（最高优先级，P0）

所有本机与 Worker 的文件或目录删除，包括批量删除、同步覆盖清理、rsync 空目录清理和临时目录清理，均须先将目标安全根目录和目标父目录解析为规范路径，确认父目录在安全根目录内，并成功 `cd` 到目标的直接父目录；随后核实当前物理工作目录就是该父目录。项目文件以项目根目录为安全根，插件暂存文件以经验证的系统暂存目录为安全根。任一检查或 `cd` 失败必须停止，提示 `PARENT_CD_FAILED`，不得执行删除。

- 删除目标参数只能是直接子项的最短相对路径 `./<名称>`，严禁在删除命令中使用绝对路径、父目录、`..`、通配符或拼接后的长路径。不得删除项目根目录、机器状态或符号链接。
- 目录若采用空目录 `rsync --delete`，空目录须在已验证的父目录内创建；rsync 目标、目录移除、临时目录清理均只能使用当前目录下的最短相对路径。失败不得视为删除完成。
- 用户必须在可完整查看目标路径的页面两次确认后，插件才能执行删除。速度优化和并行执行不得绕过上述检查。此约束优先于本项目其他实现与性能要求。

### 禁止阻塞测试（P0）

#### P0 — 禁止会挂起的测试进程

生产代码 `dist/runtime/cluster_scheduler.py` 与 `src/clusterSchedulerRuntime.legacy.ts` 的 `wait_for_plan_queue()` 在前序 Plan 未完成时执行 `while True`，并调用全局 `time.sleep(5)`。只替换 `scheduler.time.sleep` 不能打断它。

编写或修改会启动 Python 的 `node:test` 时：

- 禁止用 `python -c` 执行长脚本；写入临时 `.py` 后运行，测试结束删除。
- 禁止 import 或 exec 完整 `cluster_agent.py`、`cluster_scheduler.py`。只提取被测函数及其 import。
- 调用 `wait_for_plan_queue` 前，前序 Plan 必须已经完成；不得进入 sleep 循环。
- `spawnSync` 必须设置 `timeout <= 10000`、`windowsHide: true`，并断言 `status === 0`。
- Windows 上 `os.kill(pid, 0)` 对存活进程也会抛错，进程存活判断必须可注入测试替身。

运行测试时：

- 先单独运行目标测试文件，禁止一开始执行 `npm test` 或 `node --test test/**/*.test.js`。
- 同一时间只允许一个 node/python 测试进程，禁止并行工具调用。
- 使用 `node --test --test-force-exit --test-timeout 20000 <单个文件>`。
- 20 秒未退出即停止，不重试，不修改生产代码来“修测试”。

### P0 — 外层模板剥离坑：`src/ui/PanelHtml.ts` 的 `return `...<script>...`` 外层模板吞噬正则 `\`

**严禁** 在 `PanelHtml.ts` 最外层 `return `...<script>...</script>`` 模板字符串内部裸写任何单反斜杠转义的正则/字符串字面量（`\s` `\d` `\w` `\.` `\/` `\{` `\}` `\(` `\)` `\n` `\t` 等），**严禁** 直接写 `/\s+/` `/\d+/` `"\n"` 这类裸 `\`。

- **现象**：面板握手超时，控制台 `Unexpected token 'const'` / `Invalid or unexpected token`，26 处正则的 `\` 被外层模板层吞噬后语法断裂，内层 `<script>` 直接解析失败。
- **根因**：外层是 JS 模板字符串，内层脚本中的 `\s` `\d` 等会被外层模板预解析为转义序列（`\s`→`s`、`\n`→真实换行），落盘后正则已损坏。
- **正确写法（二选一，择一即合规）**：
  1. **双写转义**：正则/字符串内的每个 `\` 都写成 `\\`，如 `/\\s+/` `/\\d{4}-\\d{2}-\\d{2}/` `"\\n"`。经外层模板一层剥离后落盘恰好还原为 `/\s+/`。
  2. **`String.fromCharCode` 规避**：需换行时用 `String.fromCharCode(10)` 替代 `"\n"`（已有先例 `PanelHtml.ts:2529`）。
- **门禁（提交前必跑，双重校验缺一不可）**：
  1. `npm run build` 已内置 `node -c dist/extension.js && node -c dist/ui/PanelHtml.js` 语法门禁（见 `package.json#scripts.build`），**严禁** 跳过 build 直接提交。
  2. 额外 `vm.Script` 校验：`node -e "new (require('vm').Script)(require('fs').readFileSync('dist/ui/PanelHtml.js','utf8'))"` 或等效脚本，必须零异常；`node -c` 只查语法，`vm.Script` 进一步确保模板剥离后仍为合法 JS。
- **自检口诀**：改 `PanelHtml.ts` 内层脚本前，先全局搜索外层模板内的 `/\` 与 `"\`；凡见裸 `\` 即视为 P0 缺陷，批量替换为 `\\` 后再验证门禁。
- 详见 `docs/troubleshooting.md#外层模板剥离坑-P0` 与 `docs/bash-lc-pitfalls.md` 交叉引用。

### P0 — 禁止硬编码隧道端口/IP，隧道按每服务器用户配置动态解析

**严禁** 在任何业务逻辑中硬编码隧道端口（如 `10890`）或固定假设 `127.0.0.1:18765` 为唯一可达的 Agent 地址。隧道由用户为每台服务器通过 Xshell/SSH 配置（`*.xsh` 会话、`~/.ssh/config`、`settings.json` 的每服务器 `host/port/forward` 配置）动态决定，必须在运行时从该配置解析实际 `localForwardHost/localForwardPort/remoteAgentHost/remoteAgentPort`。

- **现象**：`10890` 写死导致用户自定义隧道不可用；写死 `127.0.0.1:18765` 导致 Worker Telemetry 校验无回调、GPU tmux 无法打开、job 调度静默失败（`ModuleNotFoundError: torch` 等未回传到 UI）。
- **正确做法**：
  1. 所有探活/校验/版本比对必须读取 `TunnelEndpointConfig`/`XshellRealtimeTunnelConfig`/`TunnelEndpointPortAssignment` 中的 `localForwardHost/localForwardPort` 与 `remoteAgentHost/remoteAgentPort`，动态拼装 `baseUrl`（如 `http://${host}:${port}`），不得回退到固定端口检测。
  2. 展示层（`PanelHtml.ts`）的端口输入框以配置为准，`TunnelGateway`/`XshellTunnelSetup` 不得 `throw` 限制只能 `127.0.0.1`；默认值可为 `127.0.0.1:18765` 做兼容，但校验逻辑需接受用户配置的任意 `host:port`。
  3. Agent 侧兼容：`/health` 与 `/api/health`（以及 `/version` 与 `/api/version`）均为健康检查别名，`worker_telemetry` 模式必须放行健康与版本接口，避免前端 404 无回调。
- **门禁**：`Select-String -Pattern "10890"` 在 `src/**`/`dist/**` 业务逻辑中必须零命中（仅允许在 `docs/`/`AGENTS.md` 约束说明中出现）；`127.0.0.1:18765` 不得作为探测硬编码，改为读取配置；`npm run build` 与 `vm.Script` 双重校验仍需通过。
- 详见 `docs/troubleshooting.md#禁止硬编码隧道端口-P0` 与 `docs/adr/003-tunnel-dynamic-endpoint.md`。

## 版本与安装

### 科研环境边界

- Conda 环境由用户和消费项目管理。插件只传递所选环境并启动实际命令，不自动检查科研依赖、导入 torch、安装包、修复环境或修改全局 shell。
- Agent 准备、旧归属迁移、健康探测及实际作业调度不得将辅助 Agent 的 Python 与科研 Conda 解释器相同作为门禁。Conda 配置变化或科研环境尚不存在不能否定已经证明的 Agent 进程归属。
- 保留启动身份、UID、项目、Worker、监听 socket、容器、状态锁、版本、代码来源哈希、显式 checkpoint 和目录单写者。科研数据及科研规则由消费项目管理；插件不得自动执行 adapter.resultPathValidator、数据集全量哈希、患者/标签/污染/协议或论文结论检查。实际命令错误须如实回传。
- 自动同步、静态入口命令探针、全部已启用 Worker 就绪检查和正式输出目录创建必须保留；优化只合并重复工作，不缩减范围。完整校验包含同步写入，不得标为零写入。科研分析旧入口保留为用户主动调用，收集和汇总不得隐式调用。
- Worker 间默认同步范围必须包含整个 work_dirs（兼容项目使用 work_dir），不能沿用本机代码同步的产物排除规则。每个 job 完成后，仅把该 job 最新产物与用户当前勾选范围的交集同步到全部已启用 Worker；用户明确取消的范围不自动补回。tmp/result 是合法声明结果路径，不属于机器临时状态。不同步原始指标到本机磁盘。
- 未执行的环境检查须明确标记未检查，不得冒充通过。历史显式只读诊断入口仅由用户主动调用，不从准备、健康刷新、校验、预演或 Worker 启动自动触发。

### Agent 重启边界

- 活动、排队、终止中、未知或陈旧任务登记永远不能阻断辅助 Agent 的准备、迁移、升级、停止或重启。任务队列及其游标只作诊断，不能作为重启门禁，也不能因重启清空、改写或重复派发任务。
- Agent 前台运行在用户配置的专用 tmux 会话/窗口。停止、迁移、升级和重启直接关闭该精确窗口，不管理 PID，不使用 pidfd、os.kill 或进程扫描作为停止门禁。禁止关闭整个 tmux 会话/server、GPU 或科研窗口、sshd、平台入口及容器。HTTP 不健康不阻断关闭指定窗口。
- Xshell 受管理登录启动段必须静默，不向登录终端打印 lifecycle JSON、探测详情或插件诊断。Agent 输出留在指定 tmux 窗口；准备、健康与失败回执通过插件 API 回传面板。只抑制受管理启动段，保留用户原登录命令及其输出；不得关闭 API 的结构化回执。
- 其他已明确绑定到用户指定 tmux 窗口的服务或任务也优先关闭对应窗口；先核对服务器、配置目标和精确 windowId，保留相应任务归属校验。不通过方法名前缀批量关闭窗口，不把未知进程补成 PID 停止流程。
- 迁移确认绑定稳定的服务器、项目、runtime、状态根和指定 tmux 窗口；活动任务数及遥测文件变化不能使辅助服务确认失效。准备不逐个核验历史日志或科研产物。保留独占服务锁、来源哈希与实际运行版本核验；这类保护不得伪装为任务活动阻断。
- 已发生兼容性错误：`AGENT_PIDFD_REQUIRED`。根因是错误地将新 Python 的 pidfd API 作为所有服务器部署必需条件，并绕开既定 tmux 管理约定。不得重新引入此门禁或退化为按 PID/端口杀进程。

### Scheduler、tmux 与最终产物生命周期

- 新正式作业统一采用协议 2：本机管理启动/停止意图，独立 tmux Scheduler 管理已接收队列，任务窗口管理执行，最终 artifact manifest 确认产物。UI/API/CLI 共用主动查询归并，不依赖推送、事件或启动/停止接收回执。
- 已派到服务器的队列不随 Agent 或 VS Code 退出；未派任务在本机暂停。Scheduler 重启从现存窗口属性重建，不读旧队列 JSON 重放执行。新任务不创建 attempt、正式目录文件锁或额外运行状态文件。
- 任务以前台进程树运行，使用 remain-on-exit、pane_dead 和退出码；禁止任务结束后 exec bash、后台脱离 tmux，以及 PID/pidfd 或退出码文件兜底。停止精确绑定窗口不要求旧 revision/完整历史快照一致。
- 旧快照、owner、claim、预约、操作历史只作历史证据，不能当作活动依据或阻断重启/精确窗口停止。归属不明的旧窗口由用户选择精确 windowId；不得按名称前缀批量关闭。
- 清理依据 PLAN 精确声明和真实产物清单；SimpleSFTP 受管清理以实际 tmux 与文件系统主动查询核实。没有历史删除回执也可确认目标不存在；不能因查询失败留下永久 executing/OPERATION_BUSY。查询失败结束本轮等待并允许重查；不确认旧执行器结束时不得重复执行破坏性操作。
- 清理确认绑定精确节点、路径、类型、指纹和声明，不绑定无关任务队列、历史操作或遥测时间。本批自身完成目标不使剩余冻结目标失效。保留永久删除双确认、安全根、直接父目录及 ./直接子项保护；独立文件操作默认边界不变。
- 用户已明确决定永久删除按本人确认的路径执行。两个审核页和覆盖清理使用 confirmed_paths：任务状态、PLAN/revision、归属清单、代码/配置来源、共享引用、旧操作及资源登记只作提示，不能阻断用户确认的精确删除批次。不得扫描 PID/句柄或要求停止登记。保留路径/节点真实性、固定类型、链接/越界防护、安全根、直接父目录、同批路径两次确认和目标实际变化后的重新确认；不授权自动扩大目标或删除真实文件。普通移走/恢复及其他独立文件接口保留原规则。

### 用户任务停止边界

- 开始与停止意图以本机为准；运行状态以服务器为准。普通停止/终止并清理不要求历史 PLAN revision、代码哈希、指标路径、科研环境、attempt 或完整终态快照一致，也不以扩展/Agent 版本号相同作为停止门禁。
- 本机保留原 commandId、所属服务器/项目/工作流及未确认停止意图；服务器按稳定 commandId 和实际 tmux 窗口绑定关闭精确标签页。不得按方法、PLAN 文件名或 GPU 会话前缀关闭整个会话，不发 PID 信号。真实连接失败或目标属于其他任务时保留停止意图，可重试同一任务。
- 停止前在 Scheduler 窗口记录原命令取消围栏，防止晚到启动和重新派发。其他任务、结果、日志、checkpoint 和归属审计保留，不删除整个状态目录。成功依据为主动查询确认窗口消失及 Scheduler 已撤出，不再等待缓存解除回执或叠加全身份快照门禁。
- 清除历史卡片不能抹去产物归属证据。覆盖通过 PLAN 声明和真实产物清单建立只读候选，不要求旧“已停止正式 job 登记”；产物删除继续走精确路径预览、双确认、指纹和直接父目录保护。

- 阶段 1：修改完成并通过验证后递增一个补丁版本，同步 `package.json`、`package-lock.json` 与 runtime 版本，再运行 `npm run package`。该命令只构建和生成 VSIX，不得改变当前 VS Code 安装状态。
- 阶段 2：全部修改与打包验证结束、准备交给用户重载时，显式运行一次 `npm run install:latest`。同版本必须跳过，禁止默认 `--force`、禁止降级；每个目标版本最多安装一次。
- 安装后立即核对 VS Code 已安装版本与 `simpleex` 入口，并停止操作当前 SimpleExperiment 面板。用户执行 **Developer: Reload Window** 后再进行 UI 验收。
- P0：禁止 `package` 生命周期自动 live install 正在运行的扩展；禁止对同一版本连续执行 `code --install-extension ... --force`。若磁盘版本与 Extension Host 运行版本不一致，预期显示“需要重载窗口”专页。

## GitHub 更新源发布（交付硬门禁）

- 用户已授权今后将经过验证、交付所必需的插件安装包发布到当前项目既有 GitHub 更新源。常规发布无需重复询问；该授权不包含新仓库、其他账号/平台、覆盖历史资产、连接训练服务器写入或自动更新远端 Agent。
- 源码 push、本机生成 VSIX、本机安装和远端 Release 发布是四个独立状态。插件或配套运行协议发生变更时，不能仅完成前三项便宣布交付完成。
- 每次运行版本交付必须先通过相关回归、build、VSIX 身份/版本/平台/运行闭包与秘密排除检查；提交并普通 fast-forward push 到既有 `origin/master`，fetch 确认 HEAD 一致，然后发布绑定该已验证提交和版本的稳定 Release。
- 发布目标必须从当前更新客户端及各仓库 origin 核对。Windows 当前读取 SimpleExperiment 与 SimpleSFTP 各自的公开 `/releases/latest`；上传到普通分支、只推 tag、draft、prerelease 或另一个平台的索引均不算可更新交付。
- Release 必须包含与本次打包验证、本机安装字节一致的 `.vsix` 和逐包 `.vsix.sha256`。SHA256 清单必须绑定精确文件名。配套依赖或协议需要新 SimpleSFTP 时，必须同时确认其所需版本已在自己的更新源可取得；未修改且已有一致包可复用，不得为凑批次降级或伪造版本。
- tag 和同名发布资产不可覆盖。已有同版本同提交、同指纹资产可幂等跳过；提交、字节、平台或版本不同立即阻断。远端已有更高稳定版本时，不得降级 Latest；禁止 force tag、覆写/删除历史 Release 和资产。
- 上传成功后重新读取真实 Latest Release，核对 repo、tag、绑定提交、`draft=false`、`prerelease=false`、资产名、大小及 SHA256；通过实际更新解析逻辑确认匹配平台的旧版本能看到更新。需要时将精确发布包读取到隔离验证目录再核验，不能用 mock JSON 或源码 push 代替远端发行验收。
- 权限、网络、上传、配套包、校验或 Latest 可见性任一失败，记录“源码已推送，远端发行未完成”及具体阻断，不得报告“已发布/全部完成”，不得跳过完整性门禁或偷偷更换发行源。
- `npm run package` 继续只构建/打包，不自动上传 Release 或安装。源提交、远端发行、本机安装均显式执行；本机每版本最多安装一次，重载及远端 Agent 更新仍按原规则办理。
- 纯文档/约束变更无需递增运行版本、重打 VSIX、重复安装或发布空版本；仍须完成适用检查并提交、推送。开发发布详见 [docs/release-delivery.md](docs/release-delivery.md)。最终说明源码提交、发行链接/资产/指纹、安装/重载和远端部署的真实状态。
