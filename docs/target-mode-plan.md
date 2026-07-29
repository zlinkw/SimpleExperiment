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
- [已完成] 1/5 transport-001：绑定 Hub 与 Worker 操作提交到发起请求的实时客户端。
- [已完成] 2/5 transport-002：隔离 operation 状态探测与 watchdog 的旧客户端回写。
- [待做] 3/5 transport-003：隔离远端只读下载和审计读取的旧客户端结果。
- [待做] 4/5 transport-004：规范化前端分区摘要对象键顺序，减少等价状态重绘。
- [待做] 5/5 transport-005：执行第二十八轮完整非服务器静态测试并修正新增回归。

## 当前批次：transport-002（已完成）
### 修复点

- operation probe 与 watchdog 定时器必须绑定创建时的实时客户端。
- 客户端或项目切换后，旧查询不得写回 operation、结果摘要或错误状态。
- 定时器触发时只清理自身映射，避免旧回调删除同 operation 的新定时器。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 旧客户端失效时保留项目态 operation 记录，供新客户端恢复或人工诊断。
- 长操作 watchdog 仍可在同一权威客户端下续期。
- 状态查询继续只走 Xshell 本地隧道，不增加探测次数。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] operation 探测权威、状态恢复与定时器边界定向测试，13/13。
- [已通过] TypeScript 构建、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮收紧 operation 后台定时器在拓扑和隧道重配后的生命周期。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：远端只读下载和审计读取，不扩展文件传输职责。
- 提交记录：本批使用独立 `fix` 提交并推送 `origin/master`；哈希以 Git 历史为准。
