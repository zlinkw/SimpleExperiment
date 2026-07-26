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
- [已完成] 1/5 后端：限制运行日志尾部读取字节数，避免大日志全量载入。
- [待做] 2/5 前端：审计任务和计划派生索引的重复扫描。
- [待做] 3/5 后端：审计 Agent 快照采样中的重复序列化。
- [待做] 4/5 前端：审计结果与操作视图的重复派生。
- [待做] 5/5 前后端：执行第十五轮非服务器静态测试。

## 当前批次：autonomous-static-070（已完成）
### 修复点

- `collect_live_output` 只读取日志末尾有界字节窗口，再保留最后 120 行。
- 日志偏移与最新尾部文本继续保持原有事件契约。
- 超长单行和多字节截断采用替换解码，不能阻断采样循环。

### 相邻回归风险

- 普通短日志的文本和换行必须保持不变。
- 大日志读取上限不能影响返回真实文件偏移。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 短日志、行数裁剪、字节上限和文件偏移回归测试 2/2。
- [已通过] TypeScript、Lint、Python 语法和 `git diff --check`。

## 本批记录
- 原实现每次采样通过 `readlines()` 将完整运行日志载入内存，再截取末尾 120 行。
- 本批不改变采样频率、事件类型或 Xshell 通信边界。
- 首次定向测试识别出二进制尾读保留 CRLF；恢复文本模式原有换行归一化后重新验证通过。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
