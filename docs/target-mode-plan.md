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
- [已完成] 1/5 前端：优化计划与发布分区的下一步指引。
- [待做] 2/5 后端：审计 Agent 操作事件写入与索引。
- [待做] 3/5 前端：优化结果证据分区的证据可追溯性。
- [待做] 4/5 后端：审计文件传输状态与进度派生。
- [待做] 5/5 前后端：执行第二十二轮非服务器静态测试。

## 当前批次：autonomous-ui-106（已完成）
### 修复点

- 发布同步流程改为数据驱动的步骤表，失败步骤按告警着色、未到达步骤按待处理淡化。
- 首个阻塞步骤标记为当前步骤，并在流程下方给出对应命令的下一步按钮。
- 失败阻塞提示“修复”，未完成阻塞提示“完成”，全部就绪时给出可提交结论。
- 同步更新两处被固定写法钉住的既有断言，改为断言新的步骤表结构。

### 相邻回归风险

- 已同步、失败、未开始三种状态必须呈现三种不同色调，不得互相混淆。
- 步骤到命令的映射必须与发布同步命令组一致，链路就绪时不得渲染动作按钮。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建和生成文件一致性。
- [已通过] Webview 与功能定向测试 492/492。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- `syncStatusFailure` 此前已存在但发布流程未调用，失败与未开始渲染完全相同且无任何操作入口。
- 抽取式断言若钉住具体拼接写法，会阻碍结构重构；本批改为断言语义结构。
- 提交记录：本批使用独立 `feat` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
