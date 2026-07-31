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
- [已完成] 1/5 project-191：合并后端 Worker 已选任务字段派生。
- [已完成] 2/5 project-192：合并前端复选任务 payload 派生。
- [已完成] 3/5 project-193：合并后端项目指标类型划分。
- [待处理] 4/5 project-194：合并前端 Webview 命令审计遍历。
- [待处理] 5/5 project-195：执行第六十九轮完整非服务器静态测试。

## 当前批次：project-193（已完成）
### 修复点

- 项目适配器指标只遍历一次，按分割指标 token 同时划分 classification 与 segmentation 候选。
- 保持指标归一化、原始顺序、默认指标补齐、去重和 taskType 推断不变。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Dice、DSC、IoU、HD95、ASD、Hausdorff 仍归入 segmentation，其他指标归入 classification。
- 大小写匹配、输入顺序和别名归一化不得改变，默认 AUC/accuracy/F1 与 Dice/IoU 等补齐项必须保留。
- 项目检测仅做静态文件推断，不生成实验结果声明。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 指标单次划分、大小写、顺序、默认补齐与嵌套结果相邻定向 Node 测试，5/5。
- [已通过] `git diff --check`；仅有既有 Windows 行尾提示。

## 本批记录
- project-192 已由提交 `239b799` 同步至 `origin/master`。
- 本批仅处理后端项目指标划分、对应测试和计划文档；无视觉样式变化，不调用截图。
- 归一化指标改为单次遍历划分 classification/segmentation，再接入原有默认指标补齐；5/5 定向测试通过。
