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
- [已完成] 1/5 project-141：复用前端 Plan payload 命令集合。
- [已完成] 2/5 project-142：复用前端 Hub 健康状态集合。
- [已完成] 3/5 project-143：复用后端 Worker 产物命令集合。
- [已完成] 4/5 project-144：复用后端布尔与 JSON 类型集合。
- [待处理] 5/5 project-145：执行第五十九轮完整非服务器静态测试。

## 当前批次：project-144（已完成）
### 修复点

- 将布尔真值文本和 JSON 原始类型提升为后端固定集合。
- 复用布尔字段解析和 JSON 配置数组判定中的固定集合。
- 同步 JSON 配置测试沙箱并增加集合组成回归。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 布尔值与数字输入语义保持不变，文本真值仍仅接受 `1`、`true`、`yes`、`on`。
- JSON 数组仍接受 `null` 与字符串、数字、布尔值，不得将对象误判为原始数组。
- 定向测试必须使用回收站保护预加载；失败时不得提交或推送成功记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 后端类型集合与 JSON 配置定向 Node 测试，4/4。
- [已通过] `git diff --check`。

## 本批记录
- 本轮建立 project-141 至 project-145 五批静态优化周期；project-145 再执行完整测试。
- project-143 已由提交 `7c1682b` 同步至 `origin/master`。
- 本批仅处理后端布尔与 JSON 类型固定集合、对应测试和计划文档；无视觉变化，不调用截图。
- project-144 构建与 4/4 定向测试通过；下一批执行第五十九轮完整非服务器静态测试。
