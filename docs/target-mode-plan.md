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
- [已完成] 2/5 前端：优化服务器与 GPU 卡片的状态可辨识度。
- [待做] 3/5 后端：审计 Worker 遥测与可用性派生。
- [待做] 4/5 前端：优化操作与诊断分区的反馈层级。
- [待做] 5/5 前后端：执行第二十一轮非服务器静态测试。

## 当前批次：autonomous-ui-102（已完成）
### 修复点

- GPU 状态文本在沿用缓存时追加“数据陈旧”，缓存读到的“空闲”不再与实时“空闲”同形。
- 陈旧 GPU 行加 `is-stale` 虚线边框，状态值使用独立陈旧配色。
- GPU 服务器卡头部在状态旁显示快照相对时间，陈旧时使用告警配色。
- 缺少更新时间时不渲染时间标签，避免出现无意义占位。

### 相邻回归风险

- 实时数据的状态文案必须与改动前逐字一致，只有陈旧场景追加后缀。
- 服务器卡缺少 `updatedAt` 时必须回退 `uiReceivedAt`，两者都缺失则不显示。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建和生成文件一致性。
- [已通过] Webview 定向测试 151/151。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 陈旧标记此前只在服务器 tooltip 与一个角标里，单张 GPU 的状态列仍显示为权威值。
- 快照年龄提到可扫描层后，“在线但快照 40 分钟未更新”不再与新鲜在线同形。
- 提交记录：本批使用独立 `feat` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
