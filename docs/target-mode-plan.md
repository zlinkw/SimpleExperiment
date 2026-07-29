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
- [已完成] 1/5 project-081：缓存前端 Plan 规模与结果预览统计。
- [已完成] 2/5 project-082：缓存 Extension Host 配置摘要排序。
- [已完成] 3/5 project-083：缓存前端任务操作键派生。
- [已完成] 4/5 project-084：缓存 Extension Host Python 命令入口解析。
- [已完成] 5/5 project-085：执行第四十七轮完整非服务器静态测试。

## 当前批次：project-085（已完成）
### 修复点

- 对 project-081 至 project-084 执行第四十七轮完整非服务器静态回归。
- 覆盖 TypeScript 构建、全部 Node 测试、Lint、4 个 Node 入口和 8 个 Python 文件语法检查。
- 仅修复完整回归明确检出的兼容问题，不扩大当前五批周期范围。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 全部测试必须使用回收站保护预加载，避免测试清理永久删除临时路径。
- 构建不得改变 Agent runtime 生成内容或写入历史 VSIX、`zlk_cluster/ui/`。
- 任何失败必须保留为未完成，不得提交或推送成功记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 安全 preload 下第四十七轮完整非服务器 `npm test`，990/990。
- [已通过] TypeScript、Lint、4 个 Node 入口语法、8 个 Python 文件语法与 `git diff --check`。
- [已修复并重验] 首次完整回归在 `planLocalEntryGate` 检出隔离沙箱未注入新增缓存依赖；补齐等价测试依赖后定向测试 1/1，完整回归通过。

## 本批记录
- 本轮建立 project-081 至 project-085 五批静态优化周期；project-085 再执行完整测试。
- 本批仅修正隔离测试沙箱依赖并记录完整回归，修改 1 个测试文件和计划文档。
- 构建未改变 Agent runtime；project-081 至 project-084 的缓存边界和现有功能入口保持不变。
- 真实服务器行为保持 `needs field verification`。
