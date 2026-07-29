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
- [已完成] 1/5 resilience-001：暴露多 Worker 结果摘要缺失，禁止把部分视图呈现为完整聚合。
- [已完成] 2/5 resilience-002：审计无 Hub 操作终态与错误归属的前后端反馈。
- [已完成] 3/5 resilience-003：压缩结果页高频签名和无效重绘。
- [已完成] 4/5 resilience-004：收紧拓扑切换后的本地缓存失效边界。
- [待做] 5/5 resilience-005：执行第二十六轮完整非服务器静态测试并修正新增回归。

## 当前批次：resilience-004（已完成）
### 修复点

- 拓扑切换立即重建实时客户端并清除旧权威端点的快照、结果摘要、健康和 capability 缓存。
- 离线导入结果、项目 Plan、选择、操作历史和归档记录不得随拓扑切换清除。
- 旧客户端尚未结束的结果摘要请求不得回写新拓扑缓存。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 配置事件与面板保存入口共享幂等切换逻辑，避免重复重连。
- 模式切换不迁移、覆盖或删除已有任务与结果。
- 新拓扑必须重新检测端点；真实连接行为保持现场验收。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 拓扑 UI、缓存边界、结果请求竞态和相邻实时客户端定向测试，23/23。
- [已通过] TypeScript 构建、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮只处理拓扑切换后的运行态缓存，不修改项目态记录。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：执行第二十六轮完整非服务器静态测试并修正新增回归。
- 提交记录：本批使用独立 `fix` 提交并推送 `origin/master`；哈希以 Git 历史为准。
