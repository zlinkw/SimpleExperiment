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
- [已完成] 1/5 project-216：为设置页建立专用有界渲染模型，避免对完整 Webview state 哈希。
- [已完成] 2/5 project-217：合并主面板布局顺序成员检查。
- [已完成] 3/5 project-218：复用单次读取的结果 CSV 目录配置，减少状态与动作路径重复配置解析。
- [待处理] 4/5 project-219：审计下一组前后端高频派生热点并实施一个有证据的有界优化。
- [待处理] 5/5 project-220：执行第七十四轮完整非服务器静态测试。

## 当前批次：project-218（已完成）
### 修复点

- 在 Provider 内保存已规范化的项目结果 CSV 目录，状态构建、动作提交和引导式 Plan 复用同一值。
- 配置修改、设置页保存和工作区切换时立即刷新缓存，保持资源级配置隔离。
- 保持目录校验、已有 Plan 显式结果路径优先、Agent 与 scheduler 参数透传行为不变。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 缓存必须随 `zlkCluster.resultCsvDir` 和工作区切换失效，不得把一个项目的目录带入另一个项目。
- 设置页保存后立即构建的状态必须看到新值，不能依赖异步配置事件时序。
- 测试生成物不得混入提交；仅提交扩展源码、对应生成文件、定向测试和计划记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 结果目录配置、工作区隔离、Plan 模式和面板脚本定向测试，31/31。
- [已通过] `npm run build`、`npm run lint` 与生成 JavaScript 语法检查。
- [已通过] `git diff --check` 与提交范围检查；仅有既有 Windows 行尾提示。

## 本批记录
- 基线为 `f3c4677`，本地 `HEAD` 与 `origin/master` 一致。
- 本批限制为 `src/extension.ts`、对应生成文件、一个既有定向测试及本计划文档。
- 结果目录只在 Provider 初始化、目标配置变化或工作区切换时重新读取并规范化；设置页保存后同步更新缓存。
