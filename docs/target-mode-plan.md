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
- [已完成] 1/5 后端：审计 Scheduler 作业构建与配置渲染。
- [已完成] 2/5 前端：优化计划参数与配置检查器的差异呈现。
- [待做] 3/5 后端：审计结果解析与统计的输入校验。
- [待做] 4/5 前端：优化实验追踪分区的状态归因。
- [待做] 5/5 前后端：执行第二十四轮非服务器静态测试。

## 当前批次：autonomous-ui-117（已完成）
### 修复点

- 将当前 Plan 的 `base_config` 作为配置检查器基准，展示所选配置相对 Plan 配置的一致、变更、仅所选和所选缺少参数，并显示双向值。
- Plan 配置自动置于可选配置首位；搜索同时匹配所选配置与 Plan 基准，缺失参数不会因只存在于基准中而被隐藏。
- 保持配置目录、参数搜索和打开文件入口，不增加无 handler 的控件。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Plan 使用内联或 case 级配置时不得伪造单文件基准；只显示无法比较的明确状态。
- 配置摘要存在截断时必须保留省略提示，不把未扫描参数误判为缺失。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Webview 生成与内联脚本语法。
- [已通过] 配置检查器相关定向测试 14/14，覆盖差异分类、基准解析、搜索与渲染接线。
- [已通过] Lint、Node 语法与 `git diff --check`。

## 本批记录
- 初次内联脚本检查暴露模板字符串内正则转义不足，随后测试夹具又暴露正则字面量提取限制；均已改为稳定实现并完成复测。
- 未执行截图；本批布局沿用现有配置列表和 pill 组件，等待用户后续人工视觉确认。
- 提交记录：本批使用独立 `feat` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 三类拓扑实施仍按 `docs/target-plans/worker-topology-modes.md` 排队，不并入本批。
