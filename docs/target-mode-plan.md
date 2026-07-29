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
- [已完成] 1/5 project-061：缓存前端项目结果输出门禁诊断。
- [待做] 2/5 project-062：缓存能力与集成报告 Webview 压缩结果。
- [待做] 3/5 project-063：缓存隧道端点注册表状态。
- [待做] 4/5 project-064：缓存端点与实时策略 Webview 压缩结果。
- [待做] 5/5 project-065：执行第四十三轮完整非服务器静态测试。

## 当前批次：project-061（已完成）
### 修复点

- 前端按项目、Plan、有效接入规则、配置、结果契约和解析预览引用缓存结果输出门禁诊断。
- 同一状态渲染内概览、项目快捷入口和运行前检查复用同一诊断结果，避免重复筛选候选结果与解析预览。
- 输入对象或影响门禁的标量替换后失效，门禁通过条件和修复文案保持不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Plan 强契约、配置文件、接入规则、标准结果契约和解析预览七项门禁不得改变。
- 缓存必须在项目、Plan、规则、配置、契约、预览或关键标量变化时失效。
- 缓存变体必须有界，不得随长期切换 Plan 无限增长。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 输出门禁缓存命中、失效、变体上限和原有门禁语义定向测试，21/21。
- [已通过] TypeScript、Lint、4 个 Node 入口语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-061 至 project-065 五批静态优化周期；project-065 再执行完整测试。
- 本批只处理前端项目结果输出门禁诊断，最多修改 4 个源码、测试、构建和计划文件。
- 缓存按项目弱引用保存有界变体，不持有已替换项目状态。
- 真实服务器行为保持 `needs field verification`。
