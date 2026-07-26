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
- [已完成] 3/5 后端：审计 Worker 遥测与可用性派生。
- [待做] 4/5 前端：优化操作与诊断分区的反馈层级。
- [待做] 5/5 前后端：执行第二十一轮非服务器静态测试。

## 当前批次：autonomous-fix-103（已完成）
### 修复点

- 修复 `parse_iso_epoch` 用本地时区解析 UTC 时间戳，所有时间年龄按主机时区偏移出错。
- 改用 `calendar.timegm`，Agent 运行时长、快照年龄与记录排序恢复真实值。
- Worker 可用性缓存按 TTL 过期修剪并限制 64 条，本批上报的 Worker 始终保留。
- 写入前复制缓存字典，避免后续改用缓存读取时就地污染共享对象。

### 相邻回归风险

- 时间年龄必须在东八区、西五区和 UTC 主机上一致，无效时间戳仍返回 `None`。
- 修剪不得清除本批上报的 Worker，缺少 `updatedAt` 的条目不按过期处理。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent 运行时生成与校验和一致性。
- [已通过] 全量静态测试 779/779。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 东八区主机上刚生成的时间戳被算成 28800 秒前，任何 TTL 低于 8 小时的判定都恒为过期。
- 可用性条目此前只增不删，且每批次整表写入、整表下发并整表进事件日志。
- 提交记录：本批使用独立 `fix` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
