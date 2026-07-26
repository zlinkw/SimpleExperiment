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
- [已完成] 4/5 前端：审计操作与事件视图派生。
- [待做] 5/5 前后端：执行第十九轮非服务器静态测试。

## 当前批次：autonomous-static-093（已完成）
### 修复点

- 操作行的检索文本按行对象缓存，检查器扫描不再逐行重建并小写化拼接串。
- 匹配条件提取为 `operationResourceMatcher`，锚点分词与分区正则每次扫描只算一次。
- 分区正则改用固定 Map，避免原型链键命中导致的错误匹配。
- 增加派生复用、分区范围、锚点分词与限额默认值测试。

### 相邻回归风险

- 无锚点时的分区匹配范围必须与原有正则完全一致，未知分区仍不匹配。
- 锚点分词仍需过滤长度不超过 2 的片段，限额非法时回退为 4。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建和生成文件一致性。
- [已通过] Webview 与功能定向测试 464/464。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 检索文本用 WeakMap 按行缓存，操作快照替换后随行对象一起自然失效。
- 检查器时间线与操作分区共用同一派生入口，重复扫描成本降为一次。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
