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
- [已完成] 1/5 后端：为每条 SSE 事件长连接分配独立有界游标，减少空闲日志重复读取。
- [已完成] 2/5 前端：复用布局、按钮审计与 SimpleSFTP 门禁的固定命令集合。
- [待做] 3/5 后端：审计剩余 Agent 长循环和快照热点。
- [待做] 4/5 前端：审计剩余面板签名与视图模型热点。
- [待做] 5/5 前后端：执行第十四轮非服务器静态测试。

## 当前批次：autonomous-static-066（已完成）
### 修复点

- 将资源树 section、固定命令、行级动作和 SimpleSFTP 门禁集合提升为 Webview 常量。
- 布局归一化、DOM 按钮审计和动作可用性检查不再为每次调用创建相同 `Set`。
- 保持现有命令白名单和门禁范围不变。

### 相邻回归风险

- 固定集合不能遗漏现有命令，也不能扩大可执行命令范围。
- 资源树与固定动作持久化顺序保持不变。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 固定集合声明、调用复用和既有布局/按钮门禁测试 12/12。
- [已通过] TypeScript、Lint、Panel 脚本语法和 `git diff --check`。

## 本批记录
- `simpleSftpCommandDisableReason` 会按每个动作按钮调用；布局归一化也会重复构造相同白名单。
- 四个固定集合在 Webview 生命周期内仅创建一次，现有命令成员保持不变。
- 浏览器视觉和交互状态仍由用户后续人工确认。
