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
- [已完成] 1/5 authority-001：阻止旧拓扑或旧连接的端点检测结果回写当前运行态。
- [待做] 2/5 authority-002：隔离 GPU 历史缓存 reset 前后的异步加载结果。
- [待做] 3/5 authority-003：绑定手动 scheduler 与 trace 快照到发起请求的实时客户端。
- [待做] 4/5 authority-004：审计 Webview 状态摘要截断与有效变更遗漏边界。
- [待做] 5/5 authority-005：执行第二十七轮完整非服务器静态测试并修正新增回归。

## 当前批次：authority-001（已完成）
### 修复点

- 普通端点检测和 Hub 真实对接检测必须绑定发起时的客户端权威版本。
- 检测期间切换拓扑或连接配置后，旧 probe、health 和 integration report 不得覆盖新状态。
- 保留检测成功后的既有客户端重建与状态提示。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 工作区切换的 generation 门禁继续保留。
- 拓扑或隧道配置改变通过客户端实例变化使旧检测失效。
- 检测本身仍只走 Xshell 本地隧道；本批仅做静态验证。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 端点检测权威隔离、拓扑 UI 与相邻连接配置定向测试，21/21。
- [已通过] TypeScript 构建、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮从运行态异步权威边界开始新五批周期，每五批执行一次完整测试。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：GPU 历史缓存 reset 与异步加载竞态，不扩展服务器通信范围。
- 提交记录：本批使用独立 `fix` 提交并推送 `origin/master`；哈希以 Git 历史为准。
