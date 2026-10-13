# 独立 Agent 服务与准备

SimpleExperiment 0.5.297 / SimpleSFTP 0.2.73 使用独立辅助服务协议 1。平台主服务、sshd、容器启动入口和用户训练保持独立；准备不再要求覆盖 Xshell 的自定义登录命令。所有地址、SSH 身份、端口、项目父目录、项目目录、环境和 runtime 根均从当前服务器配置读取。

## 入口与状态

“准备 Agent”、`project.prepare`、`project.bootstrap`、单端点启动、runtime 部署及自动升级共用 SimpleSFTP 的受限 `agents.lifecycle` 控制器。准备先只读核对所有所选端点，再上传缺少或不匹配的两个 runtime 小文件；健康且身份、环境、版本和 SHA256 一致时复用，不上传、不重启。只部署到磁盘不能报告运行升级成功，必须核对运行进程的版本和身份回执。活动任务阻断升级，失败或超时必须明确报告；传输/启动回执不确定时不得重复启动。

SimpleExperiment API 示例（使用 live discovery 的实际方法和配置，不套用示例服务器路径）：

```json
{"method":"project.prepare","params":{"serverIds":["<已配置 Worker ID>"],"applyTopology":false,"applyXshell":false,"startSessions":true,"autoTest":true,"confirm":true}}
{"method":"agents.lifecycle","params":{"serverIds":["<已配置 Worker ID>"],"action":"inspect"}}
{"method":"agents.lifecycle","params":{"serverIds":["<已配置 Worker ID>"],"action":"stop","confirm":true}}
{"method":"agents.lifecycle","params":{"serverIds":["<已配置 Worker ID>"],"action":"restart","confirm":true}}
```

执行前用户核对本次预览中的服务器、SSH 端口、项目和 runtime 精确路径，再传确认。`inspect` 零写入；`ensure` 缺失时启动；`restart` 仅允许停止已核实的辅助进程后启动；`stop` 不删除状态。SimpleSFTP 同名方法的底层参数还包括配置解析得到的 `server/projectDir/installDir/workerId/mode/host/port/condaEnv`，启动须绑定版本和两个文件 SHA256；禁止任意 command、环境字典或信号参数。

## 登录行为及迁移

默认 `agentLoginPolicy=preserve`，原登录命令完全保留，辅助 Agent 通过 SimpleSFTP 独立启动。用户主动选择“写入 Agent 自启动命令”并确认精确会话后，可启用 `managed`；原登录命令保存于版本化启动段，启动段在子 shell 内运行，之后执行原登录行为。更新只替换同一个段，原始 `.simple-backup` 仅创建一次。其他 Host、User、X11 和转发设置保持原样。损坏或人工改动的受管段拒绝静默覆盖。

既有插件自启动命令迁移到非破坏性的 `lifecycle ensure`，不再使用端口/命令片段扫描后 kill 或 tmux kill-session。后续协议 1 更新保持 owner 和 process 记录，核实后才升级。旧状态先返回只读迁移证据；不具备完整证明时保持阻断。0.5.296 的准备/部署入口提供独立归属迁移确认，列出主机、端口、项目、runtime、状态目录、旧 PID 和冻结指纹；拒绝或取消时不上传 runtime。不自动收养、清空或强制停止未知进程。

旧配置中的 `sshConfigAlias` 可能只是 Xshell 会话标题。0.5.295 对 `ssh -G` 未映射 HostName 的此类标题保留已配置的直接 Host/User/Port；真正映射的 OpenSSH 别名仍须三者完全匹配后才使用，错误配置或解析失败继续阻断，不改写用户配置。H20 的 `jqg_gpu_zlk` 有真实 HostName 映射，继续使用其密钥和端口。

SimpleSFTP 0.2.71 的只读 `inspect` 在旧状态缺少 owner 记录时返回结构化 `evidence`：三份固定小型元数据的路径、大小、SHA256 与允许字段，以及旧服务的健康信息。该回执不落盘、不迁移、不写归属，也不授权停止旧进程。SimpleExperiment API 保留这些诊断字段，后续迁移必须单独核实。

SimpleSFTP 0.2.72 的 `migrate` 必须绑定 `inspect` 的 `evidence.migration.digest`。旧服务核对完整 argv、所选 Python/Conda、UID、PID 启动身份、PID/挂载 namespace、真实监听 socket、健康回执及旧 session。无运行服务时保留旧历史并核验当前容器 GPU、Worker 和状态路径证据。活动作业及未消费 command/cursor 均阻断；迁移只停止已验证辅助 PID，并以独占创建写入 `agent.owner.json`，不更改旧任务、日志、权重或结果。磁盘 runtime 之后部署，运行版本仍须另行验收。后台自动升级不自动确认旧归属。

API 调用 `agents.lifecycle` 的 `action: migrate` 先不传确认取得完整预览，再传 `confirm:true` 和逐服务器 `migrationDigests`。`project.prepare` 可传本轮 `legacyMigrationDigests`；指纹变化即拒绝。API 和 UI 使用同一受限控制器。多节点失败会留下明确的未处理节点；已经迁移的节点保留 owner，下一次准备重新核验，不重复停止。

0.5.297 / 0.2.73 同时读取真实持久化的 `workers` 字典和 API 历史列表，拒绝字典键与 Worker ID 不一致。标准 `actions/cluster_scheduler/live_output` 目录进行有界递归身份检查，保留全部历史；只读取活动队列的有界 JSON（最多 16 MiB），不读取大型来源缓存内容。GPU 绑定同时核对实际 index 和 UUID。无法证明时回执显示具体阻断码及错误类型；owner/process/lock 文件从状态清理候选中排除。

## 归属保护与边界

项目状态保留现有项目 namespace。首次写入前，Agent 取得持有整个生命周期的独占 owner 锁并绑定 Worker、项目、模式、Conda、用户、物理 runtime 根和容器/挂载/可见 GPU 身份。不同容器共享 NFS 状态时返回 `AGENT_STATE_OWNER_CONFLICT`；重复 Worker ID 指向不同配置时直接阻断。不会迁移其他服务器状态。

停止使用健康实例 nonce、PID 启动身份、UID、解释器和完整 argv 共同核验，并用 Linux pidfd 固定目标，只发送该进程 SIGTERM。不会停止进程组、sshd、tmux、平台或训练子进程。缺少 pidfd、状态不明、活动任务或无法确认退出时阻断，禁止扩大 kill 范围。

本地回归使用轻量 CPU/HTTP 辅助探针和独立平台进程，验证首次启动、重复复用、运行版本拒绝、状态冲突、活动任务阻断、精确停止/重启及原登录段更新；不运行 train.py/test.py。H20 的真实 SSH/SFTP/Conda/GPU 与实际插件 API 验收须在安装后用户重载窗口，再仅针对已配置的 H20 执行。其他服务器保留。

## 已结束 PLAN 历史

完成记录的旧 Worker 快照过期，以及仅校验失败而从未生成 job，允许两次明确确认后只清除本机历史/队列登记。原日志、权重、结果和远端窗口保留，不宣称窗口已关闭。新出现的活动回执恢复显示；实际远端停止仍保留完整身份门禁。没有执行 MultiModal 文件清理。
