# 目标模式当前计划：前后端静态优化周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不迁移、删除或重写旧任务和结果，不处理历史 VSIX 或 `zlk_cluster/ui/`；禁止“父级 evidence key 被子文件 archive 反向命中”。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- `metrics_summary.csv`、PPT 和论文证据只读取最终归档结果；PPT 绘图目标确认先于 automation，PPT 绘图链路与 realtime post gate 稳定化持续保留。
- GPU 历史和 Docker 兼容验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`；新增补充任务不得破坏当前主目标，计划更新必须防止修复循环。
- 长时间 Webview payload 预算：`schedulerStates`、`experimentTraces` 必须有界；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 必须保留。
- 连接边界固定为 Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 当前不连接服务器，只执行本地静态检查且不重载、关闭 VS Code；每批最多 8 个源码/文档/测试文件并推送 `origin/master`，每 5 批执行一次全量静态测试。

## 后续优先级
- [已完成] 1/5 前端：优化任务与结果分区的信息密度和可读性。
- [待做] 2/5 前端：优化服务器与 GPU 卡片的状态可辨识度。
- [待做] 3/5 后端：审计 Worker 遥测与可用性派生。
- [待做] 4/5 前端：优化操作与诊断分区的反馈层级。
- [待做] 5/5 前后端：执行第二十一轮非服务器静态测试。

## 当前批次：autonomous-ui-101（已完成）
### 修复点

- 运行中与测试中的任务卡新增进度、Worker、GPU 三个内联标签，终态与排队卡保持原有紧凑度。
- 调度器未上报的字段不生成标签，不引入任何网格布局。
- 任务折叠提示补充折叠顺序说明，并说明折叠任务仍参与计数与批量操作。
- 新增运行态标签样式，与时间标签在视觉上可区分。

### 相邻回归风险

- 终态、排队和未知状态任务卡不得新增标签，紧凑约定必须保持。
- 不得恢复已废弃的 `taskMetaGrid` 密集网格与独立进度卡片分区。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建和生成文件一致性。
- [已通过] Webview 与功能定向测试 477/477。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 目标边界更新：后续允许优化 UI，不再限于纯静态性能改动。
- 运行中任务此前只能靠悬停 tooltip 才能看到进度与放置位置，本批把这两项提到可扫描层。
- 提交记录：本批使用独立 `feat` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
