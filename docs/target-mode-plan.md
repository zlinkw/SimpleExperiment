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
- [已完成] 1/5 loop-001：隔离 availability 自动上报旧循环与旧客户端错误回写。
- [已完成] 2/5 loop-002：隔离结果摘要定时刷新在客户端重置后的旧回调。
- [已完成] 3/5 loop-003：隔离计划文件 watcher 与 debounce 在工作区切换后的旧回调。
- [已完成] 4/5 loop-004：限制 GPU 历史展开状态与持久化样式缓存边界。
- [已完成] 5/5 loop-005：执行第二十九轮完整非服务器静态测试并修正新增回归。

## 当前批次：loop-005（已完成）
### 修复点

- 执行第二十九轮完整非服务器静态测试，覆盖本周期定时循环、客户端重置、工作区 watcher 和前端缓存边界。
- 若出现新增回归，只修正与本周期变更直接相关的问题。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 完整测试不得访问真实服务器、安装 VSIX 或重载、关闭 VS Code。
- 定向测试只允许更新受版本控制的构建产物，不纳入无关缓存或报告。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] `npm test` 第二十九轮完整非服务器静态测试，870/870；补齐 GPU 样式行为测试的缓存上限上下文。
- [已通过] Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮只执行完整静态回归及必要的本周期修正。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：完整测试通过后结束本五批运行循环隔离周期，由后续静态审计开启新周期。
- 提交记录：本批使用独立 `test` 提交并推送 `origin/master`；哈希以 Git 历史为准。
