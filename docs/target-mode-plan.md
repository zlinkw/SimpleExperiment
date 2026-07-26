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
- [已完成] 3/5 后端：让 CLI 事件跟随器按文件游标续读，并处理日志替换和截断。
- [已完成] 4/5 前端：复用 Webview 命令帮助表，避免按钮装饰阶段重复创建大对象。
- [待做] 5/5 前后端：执行第十四轮非服务器静态测试。

## 当前批次：autonomous-static-068（已完成）
### 修复点

- 将命令帮助映射提升为 Webview 生命周期内的只读常量。
- 按钮提示装饰、DOM 审计和动态动作渲染复用同一映射。
- 保持全部中文帮助文本和端点上下文前缀不变。

### 相邻回归风险

- 命令帮助常量不能遗漏现有可见命令或改变提示文案。
- 带 `endpointId` 的按钮仍必须显示端点前缀。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 命令帮助常量复用、文案完整性和端点前缀回归测试 8/8。
- [已通过] TypeScript、Lint、Panel 脚本语法和 `git diff --check`。

## 本批记录
- `commandHelp` 会在按钮装饰和多处动态渲染中高频调用，原实现每次创建完整帮助对象。
- 新批次仅调整映射生命周期，不修改命令白名单、动作路由或交互布局。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 浏览器视觉和交互状态仍由用户后续人工确认。
