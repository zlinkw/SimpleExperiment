# 目标模式当前计划：服务器拓扑纠偏周期
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
- [已完成] 1/5 project-226：隔离无 Hub 模式的历史 Hub 状态提示。
- [已完成] 2/5 project-227：审计 Worker 状态失效与手动转移后的结果归属。
- [已完成] 3/5 project-228：审计 Xshell 会话、端口和端点注册表的显示一致性。
- [待处理] 4/5 project-229：优化服务器状态页的模式化操作提示。
- [待处理] 5/5 project-230：执行第七十六轮完整非服务器静态测试。

## 当前批次：project-228（已完成）
### 修复点

- 无 Hub 模式的端点注册表、诊断和“显示注册表”只展示当前 Worker 端点。
- Hub 配置仍保留在设置与恢复路径中，但不伪装为当前活动端点。
- Xshell 会话和端口状态继续使用当前拓扑成员集合。
- 保持真实服务器行为为 `needs field verification`，不连接服务器。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 完整测试不得触发真实 Xshell 隧道、服务器连接、VS Code 重载或 VSIX 安装。
- 测试生成物不得混入提交；仅提交计划记录及必要修复。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 端点注册表、端口缓存和拓扑 UI 定向测试，14/14。
- [已通过] `npm run build`、`npm run lint` 与生成 JavaScript 语法检查。
- [已通过] `git diff --check` 与提交范围检查；仅有既有 Windows 行尾提示。

## 本批记录
- 基线为 `d58e0fa`，本地 `HEAD` 与 `origin/master` 一致。
- 静态审计确认三种拓扑已存在；当前明确缺陷是 Hub 保留端口规则未随拓扑变化，以及端点缓存未包含拓扑成员。
- 无 Hub 时本机 `18765` 可由一个 Worker 使用；不同本机端口映射到各服务器相同远端 `18765` 不再产生静态冲突。
- project-222 增加服务器页“停用 Hub”“恢复 Hub”按钮，按钮仍调用项目拓扑保存和强确认流程。
- project-228 在无 Hub 模式从活动端点注册表中移除 Hub，但设置页仍保留原 Hub 配置供恢复。
