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
- [已完成] 1/5 project-076：缓存前端分区签名行与对象映射压缩结果。
- [已完成] 2/5 project-077：缓存 Extension Host 当前 Plan 活动证据。
- [已完成] 3/5 project-078：缓存前端项目接入规则展示结果。
- [已完成] 4/5 project-079：缓存 Extension Host Plan 运行确认摘要。
- [待做] 5/5 project-080：执行第四十六轮完整非服务器静态测试。

## 当前批次：project-079（已完成）
### 修复点

- Extension Host 按 Plan 对象、显示上限和目标数组复用运行确认摘要派生结果。
- 批量确认重复读取 Plan 输出位置、Worker 目标路径与容量时避免再次归一化和去重。
- Plan、目标数组或显示上限变化后失效；缓存弱引用源并限制单 Plan 参数变体数量。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 单 Plan 与批量运行确认的文本、路径顺序、Worker/Hub 角色说明不得改变。
- 输出位置仍须优先 Plan 声明并仅在缺失时回退接入配置。
- 空目标数组、重复目标、GPU 限制和 Conda 环境摘要语义不得改变。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 输出位置与目标摘要缓存命中、参数隔离、有界淘汰、源替换失效和确认文本定向测试，5/5。
- [已通过] TypeScript 构建、Lint、Extension Host Node 语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-076 至 project-080 五批静态优化周期；project-080 再执行完整测试。
- 本批只处理 Extension Host Plan 运行确认摘要，最多修改 4 个源码、测试、构建和计划文件。
- 单 Plan、批量 Plan、Debug 和复现入口保持现有确认流程与输出语义。
- 输出位置按弱引用 Plan 和有界显示上限复用；目标数组归一化结果按弱引用源与规范化结果复用。
- 真实服务器行为保持 `needs field verification`。
