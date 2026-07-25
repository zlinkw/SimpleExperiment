# 目标模式当前计划：前后端静态优化周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不手工修改安装目录；仅在完成独立备份后，按用户本批明确授权通过 VS Code CLI 安装新版 VSIX；不覆盖已有 VSIX，不删除完整文件，不把未验证实验声明当作事实。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- 结果证据使用最终归档结果；`metrics_summary.csv`、PPT 和论文证据不得混入临时结果；PPT 绘图目标确认必须先于 automation 调用，且不迁移、删除或重写旧任务和结果。
- PPT 绘图链路与 realtime post gate 稳定化继续保留；GPU 历史与 Docker 兼容后续验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`。
- 连接边界：Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 新增补充任务不得破坏当前主目标；计划更新必须防止修复循环。
- 禁止“父级 evidence key 被子文件 archive 反向命中”。
- 长时间 Webview payload 预算：`schedulerStates` 与 `experimentTraces` 必须限量、压缩并保留受保护记录；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 由代码和测试覆盖。
- 当前窗口持续用于开发；禁止重载、关闭或自动操作 VS Code。
- 当前不连接服务器；只执行本地静态检查，不运行真实 Xshell、SimpleSFTP、GPU 或 Agent 联调。
- 每批最多 2 至 3 个强相关问题、8 个源码/文档/测试文件，并独立提交、推送到 `origin/master`。
- 每 5 个完成批次执行一次全量静态测试；其余批次只跑定向检查。

## 后续优先级：第二个五批周期
- [已完成] 1/5 构建：从 TypeScript 活动编译集隔离已废弃客户端兼容包装。
- [已完成] 2/5 前端：增加操作时间线状态筛选与计数联动。
- [已完成] 3/5 后端：审计面板状态签名计算与长时间运行开销。
- [待做] 4/5 前端：统一相对时间与终态时间反馈。
- [待做] 5/5 前后端：执行第二轮非服务器静态测试。

## 当前批次：autonomous-static-008（已完成）

### 范围
- 单次 realtime 回调只生成一次字段签名集合，并在 GPU 上报门禁与 Webview 门禁间复用。
- 移除已被流式 hash 替代且无调用的稳定文本序列化函数，减少恢复代码残留。
- 仅修改状态签名路径、对应静态测试、生成 JS 和本计划。

### 保护区
- 不修改服务器通信、Xshell、SimpleSFTP、GPU、Agent、归档和 PPT 行为。
- 不处理现有用户删除项、历史 VSIX 或 `zlk_cluster/ui/`。
- 不重载或关闭 VS Code，不执行真实网络联调。

### 相邻回归风险
- realtime 内容变化语义、60 秒心跳门禁和本地 GPU availability 上报条件保持不变。
- 不扩大状态遍历预算，不改变服务器轮询、推送或通信频率。

### 验证清单
- [已通过] TypeScript、Lint、生成 JS 语法检查及状态发送恢复与 realtime 门禁定向测试 6/6。
- [跳过] 全量测试；本周期第 5 批执行。

## 本批记录
- 0/5 基线：`f7db9ff`，上一目标已归档到 Git 历史。
- 1/5 完成提交：`1419226 fix: correct operation cancellation lifecycle`，已推送并确认与 `origin/master` 一致。
- 2/5 完成提交：`e94b5e8 fix: clarify initial panel state feedback`，已推送并确认与 `origin/master` 一致。
- 3/5 完成提交：`ce2bbee fix: recover failed webview state posts`，已推送并确认与 `origin/master` 一致。
- 4/5 完成提交：`dde9453 fix: clarify operation terminal outcomes`，已推送并确认与 `origin/master` 一致。
- 上一周期 5/5：`565f50d fix: complete plan archive parameter audit`，已推送并确认与 `origin/master` 一致。
- 本周期 1/5：`build: exclude deprecated tunnel wrappers`；推送后以 `origin/master` Git 历史为准。
- 本周期 2/5：`ui: add operation status filters`；推送后以 `origin/master` Git 历史为准。
- 本周期 3/5：`perf: reuse realtime state signatures`；推送后以 `origin/master` Git 历史为准。
- 下一批边界：仅统一操作时间线相对时间与终态时间反馈。
