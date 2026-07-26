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
- [已完成] 3/5 前端：优化结果证据分区的证据可追溯性。
- [待做] 4/5 后端：审计文件传输状态与进度派生。
- [待做] 5/5 前后端：执行第二十二轮非服务器静态测试。

## 当前批次：autonomous-ui-108（已完成）
### 修复点

- 新增 `evidenceCoverageState`，区分“未生成”“已覆盖全部归档结果”“覆盖不足需重跑”三种状态。
- 质量门禁、SCI 统计与论文表格三行各自展示覆盖对照，不再要求用户跨行手工比对计数。
- 产物条数多于当前归档条数时提示归档已变更，同样要求重跑。
- SCI 统计行的状态与色调改由覆盖判定驱动。

### 相邻回归风险

- 无归档结果时必须优先显示“等待归档”，不得误报为待运行。
- 质量门禁行原有状态表达式不变，覆盖信息以附加字段呈现。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建和生成文件一致性。
- [已通过] 全量静态测试 798/798。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 陈旧产物此前与从未生成同样显示“待运行”，用户无法判断是否需要重跑。
- 覆盖对照把判断依据放进同一行，不再需要跨“结果筛选”行取有效条数。
- 提交记录：本批使用独立 `feat` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
