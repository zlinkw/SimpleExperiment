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
- [待做] 1/5 前端：优化任务与结果分区的信息密度和可读性。
- [待做] 2/5 前端：优化服务器与 GPU 卡片的状态可辨识度。
- [待做] 3/5 后端：审计 Worker 遥测与可用性派生。
- [待做] 4/5 前端：优化操作与诊断分区的反馈层级。
- [待做] 5/5 前后端：执行第二十一轮非服务器静态测试。

## 当前批次：autonomous-cleanup-100（已完成）
### 修复点

- 按用户授权执行 `docs/manual-cleanup-candidates.md` 待审核清理，共 51 项。
- 47 项由 `git rm` 删除并可从 Git 历史恢复，`dist/runtime/__pycache__/` 为可再生缓存。
- 删除前逐条校验绝对路径前缀，守卫拦截了一次 shell 转义造成的路径拼接错误。
- 历史 VSIX 与 `src/test/fakes/FakeRemoteCommandRunner.ts` 按裁决保留。

### 相邻回归风险

- `tsconfig.json` 的 `exclude` 与 `.vscodeignore` 的废弃别名规则必须保留，否则编译边界测试失败。
- `test/engineeringHardening.test.js` 仍依赖 `FakeRemoteCommandRunner` 编译产物，该源码不得删除。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent 与 Scheduler 运行时生成一致性。
- [已通过] 全量静态测试 765/765。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 用例数由 780 降至 765，差额即随 7 个废弃别名测试文件一起移除的用例。
- 目标边界更新：后续允许优化 UI，不再限于纯静态性能改动。
- 提交记录：本批使用独立 `chore` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
