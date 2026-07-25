# 目标模式当前计划：前后端静态优化周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不手工修改安装目录；仅在完成独立备份后，按用户本批明确授权通过 VS Code CLI 安装新版 VSIX；不覆盖已有 VSIX，不删除完整文件，不把未验证实验声明当作事实。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- 结果证据使用最终归档结果；`metrics_summary.csv`、PPT 和论文证据不得混入临时结果；PPT 绘图目标确认必须先于 automation 调用，且不迁移、删除或重写旧任务和结果。
- PPT 绘图链路与 realtime post gate 稳定化继续保留；GPU 历史与 Docker 兼容后续验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`。
- 连接边界：Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 新增补充任务不得破坏当前主目标；计划更新必须防止修复循环。
- 禁止“父级 evidence key 被子文件 archive 反向命中”。
- 长时间 Webview payload 预算：`schedulerStates` 与 `experimentTraces` 必须限量、压缩并保留受保护记录；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 由代码和测试覆盖。
- 当前窗口持续用于开发；禁止重载、关闭或自动操作 VS Code。
- 当前不连接服务器；只执行本地静态检查，不运行真实 Xshell、SimpleSFTP、GPU 或 Agent 联调。
- 每批最多 2 至 3 个强相关问题、8 个源码/文档/测试文件，并独立提交、推送到 `origin/master`。
- 每 5 个完成批次执行一次全量静态测试；其余批次只跑定向检查。

## 后续优先级：第十个五批周期
- [已完成] 1/5 前端：缓存 GPU 历史总览派生曲线并按序列修订失效。
- [已完成] 2/5 后端：复用未超预算的实时状态分支，减少长期事件流分配。
- [已完成] 3/5 前端：优化 GPU tooltip 与运行按钮的高频 DOM 扫描。
- [已完成] 4/5 后端与工具链：优化 trace payload 超预算排序与分类。
- [待做] 5/5 前后端：执行第十轮非服务器静态测试。

## 当前批次：autonomous-static-049（已完成）

### 范围
- trace 超预算排序前一次性计算优先级和时间，避免比较器重复解析。
- 对已排序 trace 单次分类 protected、当前 Plan 和 attention 记录。
- 保持各优先级顺序、去重、attention 上限和总 payload 上限不变。

### 保护区
- 不修改服务器通信、Xshell、SimpleSFTP、GPU、Agent、归档和 PPT 行为。
- 不处理现有用户删除项、历史 VSIX 或 `zlk_cluster/ui/`。
- 不重载或关闭 VS Code，不执行真实网络联调。

### 相邻回归风险
- protected 和当前 Plan 记录必须继续优先保留。
- 相同优先级与时间的记录必须维持原始稳定顺序。

### 验证清单
- [已通过] TypeScript 与 Lint。
- [已通过] trace payload 预算、Plan 范围和 Webview state post 定向静态测试 12/12。

## 本批记录
- 上一批完成基线：`502d07c`，Webview DOM 扫描优化已同步远程。
- 当前批次影响区：Extension Host trace payload 裁剪与对应静态测试。
- 排序元数据每行只计算一次；排序结果单次分类并保持稳定次序、去重和预算语义。
- 下一批边界：执行第十轮非服务器广泛静态测试。
- 真实服务器、Xshell、SimpleSFTP、GPU 与 Agent 联调继续延期。
