# 目标模式当前计划：前后端静态优化周期
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
- [已完成] 1/5 project-046：缓存前端配置参数结构差异。
- [已完成] 2/5 project-047：缓存 Extension Host 的 SimpleSFTP ABI 就绪派生。
- [已完成] 3/5 project-048：缓存本地 Plan Webview 压缩结果。
- [已完成] 4/5 project-049：优化 Scheduler 大批量待运行队列。
- [已完成] 5/5 project-050：执行第四十轮完整非服务器静态测试。

## 当前批次：project-050（已完成）
### 修复点

- 在安全删除拦截 preload 下执行完整 `npm test`，覆盖本轮五批静态优化及全部历史回归。
- 补充执行 Lint、Node/Python 语法和工作树差异检查。
- 本批不新增功能，不生成或安装 VSIX，不连接真实服务器。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 完整测试不得触发真实服务器连接、VS Code 重载、插件安装或项目文件永久删除。
- 测试生成物不得污染提交；历史 VSIX 与 `zlk_cluster/ui/` 继续保持未跟踪保护状态。
- 任一完整测试失败均阻止本批提交和推送，失败项必须进入后续修复批次。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 安全 preload 下完整 `npm test`，923/923。
- [已通过] Lint、Node/Python 语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-046 至 project-050 五批静态优化周期；project-050 再执行完整测试。
- 本批只记录完整静态回归结果，预期仅修改目标计划文档。
- 完整测试未产生源码或构建差异，历史 VSIX 与 `zlk_cluster/ui/` 保持未跟踪保护状态。
- 真实服务器行为保持 `needs field verification`。
