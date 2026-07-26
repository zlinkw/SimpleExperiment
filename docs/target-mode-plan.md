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
- [已完成] 1/5 前端：缓存 GPU 历史点索引并优化 hover 邻近查询。
- [已完成] 2/5 GPU 历史：三天滑动窗口补零、持久化序列上限与 Webview 缓存上限。
- [已完成] 3/5 前端：避免维护阶段重复扫描全部原生 title 节点。
- [已完成] 4/5 后端：限制 Worker 操作节流时间戳缓存并清理过期键。
- [已完成] 5/5 前后端：执行第十一轮非服务器静态测试。

## 当前批次：autonomous-static-055（已完成）
### 修复点

- 执行仓库全量 Node 静态测试，覆盖前端、Extension、Agent runtime、隧道策略和归档契约。
- 执行 TypeScript、Lint、JavaScript 语法、生成 runtime 一致性与包内容静态校验。
- 不运行真实服务器、Xshell、SimpleSFTP、GPU 或 Agent 联调，不生成或安装 VSIX。

### 相邻回归风险

- 全量失败必须记录并修复，不能用定向测试替代。
- 静态通过不能声明真实服务器行为已验证。
- 验证命令不得重载或关闭当前 VS Code 窗口。

### 验证清单

- [已通过] `npm test` 全量 Node 静态测试 714/714。
- [已通过] TypeScript、Lint、核心 JS 语法、runtime closure、目标计划压缩和 VSIX 包内容静态校验。

## 本批记录
- 上一批完成基线：`27cacd7`，Worker 操作节流缓存上限已同步远程。
- 全量首轮暴露本机缺少 PyYAML 和目标计划固定边界被压缩的问题；已安装本机 PyYAML，并让压缩器保留“相邻回归风险”。
- 全量复验 714/714，Lint、核心 JS 语法、runtime closure 与 VSIX 内容静态校验均通过。
- [待做] 进入第十二个五批静态优化周期；真实服务器、Xshell、SimpleSFTP、GPU 与 Agent 联调继续延期。
