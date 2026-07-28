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
- [待做] 2/5 前端：优化计划参数与配置检查器的差异呈现。
- [待做] 3/5 后端：审计结果解析与统计的输入校验。
- [待做] 4/5 前端：优化实验追踪分区的状态归因。
- [待做] 5/5 前后端：执行第二十四轮非服务器静态测试。

## 当前批次：autonomous-backend-116（已完成）
### 修复点

- `defaults_from` 优先按当前配置文件目录解析，同时兼容已有项目根目录相对路径，并显式阻断继承循环与非对象配置根节点。
- Plan、case 与 override 合并完成后递归渲染 job config 的字符串值，列表和嵌套对象使用同一组当前 job 模板变量。
- 保持 Plan、case、seed、输出目录与结果路径的现有优先级，不扩展服务器通信行为。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 相对 `defaults_from` 必须兼容配置文件同目录语义和已有项目根目录路径写法。
- 配置模板只能替换当前 job 已知变量，不得执行表达式或修改 YAML 键结构。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建与 Scheduler runtime 生成一致性。
- [已通过] Scheduler 相关定向测试 22/22，覆盖两类相对继承、循环阻断与嵌套模板渲染。
- [已通过] Lint、Node/Python 语法与 `git diff --check`。

## 本批记录
- 初次测试夹具在 Python 3.14 动态导入 dataclass 时缺少 `sys.modules` 注册；已修正夹具并完成两轮通过复测，运行代码无对应故障。
- 提交记录：本批使用独立 `fix` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 三类拓扑实施仍按 `docs/target-plans/worker-topology-modes.md` 排队，不并入本批。
