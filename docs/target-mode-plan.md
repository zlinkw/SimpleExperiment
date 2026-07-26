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
- [已完成] 4/5 前端：审计诊断与能力视图派生。
- [待做] 5/5 前后端：执行第二十轮非服务器静态测试。
- [待确认] 人工清理：`docs/manual-cleanup-candidates.md` 待审核项已完成路径审核，等待用户授权执行。

## 当前批次：autonomous-static-098（已完成）
### 修复点

- 功能就绪分组表提升为固定常量，诊断渲染不再逐次重建 5 组 39 个命令数组。
- 目标完成矩阵的静态行与固定证据数组提升为常量，只保留 4 行随状态计算。
- 能力条对文件列表、下载、上传各只探测一次能力，去掉重复调用。
- 增加分组唯一性、矩阵行序、常量结构与单次探测测试。

### 相邻回归风险

- 就绪分组与命令集合必须与原表逐项一致且跨组不重复。
- 目标矩阵行序必须保持版本、基线、项目、Agent、烟测、遗留的原顺序。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建和生成文件一致性。
- [已通过] Webview 与功能定向测试 472/472。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 诊断分区每次渲染的固定表构建成本移出热路径，与既有固定查找集合用法保持一致。
- 常量为共享引用，渲染方只读不写，避免固定表被就地修改。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
