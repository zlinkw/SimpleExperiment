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
- [待做] 1/5 后端：审计 Worker 遥测与可用性派生。
- [待做] 2/5 前端：审计同步与发布视图派生。
- [待做] 3/5 后端：审计操作事件写入与索引。
- [待做] 4/5 前端：审计任务日志与实时输出派生。
- [待做] 5/5 前后端：执行第二十一轮非服务器静态测试。
- [待确认] 人工清理：`docs/manual-cleanup-candidates.md` 待审核项已完成路径审核，等待用户授权执行。

## 当前批次：autonomous-static-099（已完成）
### 修复点

- 执行第二十轮全量非服务器静态测试，覆盖 780 个用例。
- 确认本轮五批改动（审计尾读、会话索引、结果候选缓存、诊断固定表）无回归。
- 未发现新的失败用例，无需修复补丁。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 抽取式测试如涉及反斜杠转义，必须从 `renderPanelHtml()` 渲染结果取源。
- 新增 Python 侧纯函数缓存必须同时保留可直接调用的 `compute_*` 入口。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent 与 Scheduler 运行时生成一致性。
- [已通过] 全量静态测试 780/780。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 第二十轮周期新增 4 个定向测试文件，全量用例数由 768 增至 780。
- 清理候选 52 条绝对路径审核完成且 0 条越界，删除执行仍待用户授权。
- 提交记录：本批使用独立 `test` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
