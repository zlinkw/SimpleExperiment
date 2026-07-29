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
- [已完成] 1/5 project-011：隔离调试包下载对话框的项目与客户端上下文。
- [已完成] 2/5 project-012：隔离远端结果下载确认的项目与客户端上下文。
- [已完成] 3/5 project-013：隔离引导式 Plan 生成的项目上下文。
- [已完成] 4/5 project-014：隔离输出接入模板生成的项目上下文。
- [已完成] 5/5 project-015：执行第三十三轮完整非服务器静态测试并修正新增回归。

## 当前批次：project-015（已完成）
### 修复点

- 执行第三十三轮完整非服务器静态测试，覆盖本周期项目上下文隔离改动。
- 完整测试未出现新增回归，本批无需追加代码修正。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 完整测试不得连接服务器、启动 Xshell 或 PowerPoint，也不得生成、安装 VSIX。
- 定向测试只允许更新受版本控制的构建产物，不纳入无关缓存或报告。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] `npm test` 完整非服务器静态测试，877/877。
- [已通过] Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮只处理完整静态回归和直接新增回归，不扩展功能范围。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：当前 5 批周期已结束，等待下一目标流水。
- 提交记录：本批使用独立 `test` 提交并推送 `origin/master`。
