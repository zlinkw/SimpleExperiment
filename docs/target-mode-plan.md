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
- [已完成] 1/5 project-066：缓存前后端 Plan 结果预览作用域派生。
- [已完成] 2/5 project-067：缓存实时诊断 Webview 与 post gate 压缩结果。
- [已完成] 3/5 project-068：缓存 Hub 与 Worker 状态摘要。
- [已完成] 4/5 project-069：缓存前端项目结果位置派生。
- [待做] 5/5 project-070：执行第四十四轮完整非服务器静态测试。

## 当前批次：project-069（已完成）
### 修复点

- 前端按当前 Plan、接入规则、输出契约文件和已发现结果引用缓存项目结果位置。
- 仅外层项目或元数据包装对象替换时复用派生结果，避免重复合并和过滤候选路径。
- 任一实际候选来源替换后失效，Plan、接入规则、已发现结果的优先级保持不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 当前 Plan 候选替换后必须优先展示新 Plan 结果位置。
- 接入规则、输出契约文件或已发现结果替换后必须立即失效。
- 元数据占位文件继续排除，不得重新虚构 `metrics_summary.csv`。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 项目结果位置缓存命中、包装对象复用、候选来源失效和优先级定向测试，9/9。
- [已通过] TypeScript 构建、Lint、2 个前端 Node 文件语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-066 至 project-070 五批静态优化周期；project-070 再执行完整测试。
- 本批只处理前端项目结果位置派生，最多修改 4 个源码、测试、构建和计划文件。
- 缓存以 Plan 弱引用为入口并比较三个实际候选来源，不延长已替换 Plan 生命周期。
- 定向回归保留结果位置、接入门禁和打开文件入口；本批无可见布局变化，无需截图。
