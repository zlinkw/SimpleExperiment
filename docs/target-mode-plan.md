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
- [已完成] 3/5 后端：审计结果解析与统计的输入校验。
- [待做] 4/5 前端：优化实验追踪分区的状态归因。
- [待做] 5/5 前后端：执行第二十四轮非服务器静态测试。

## 当前批次：autonomous-backend-118（已完成）
### 修复点

- Agent 运行时、结果 CSV、JSON 和兼容 Metrics 解析器不再把空值、布尔值、`NaN` 或无穷值当作有效数值；长表预览明确统计被跳过行。
- 统计入口校验方法、配对键、`alpha`、`minPairs` 和 baseline；重复或缺失配对键不参与统计且产生警告。
- 未实现的统计方法只返回 `needs experiment` 警告，不生成伪造 p 值；多重校正只处理真实有限 p 值并保持 Holm/FDR 单调性。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 已归档结果、有效 CSV、PPT 和论文证据不得摄入空值被转换出的伪零值或非有限指标。
- 重复配对键不得静默覆盖；未实现的检验不得回退为 paired t test。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建与 Agent runtime 生成。
- [已通过] 结果解析、统计与 Agent runtime 定向测试 19/19。
- [已通过] Lint、Node/Python 语法与 `git diff --check`。

## 本批记录
- 首次 Agent 定向测试误从精简 action response 读取记录明细，已改为核对持久化 summary 后复测通过；产品行为未受影响。
- 提交记录：本批使用独立 `fix` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 三类拓扑实施仍按 `docs/target-plans/worker-topology-modes.md` 排队，不并入本批。
