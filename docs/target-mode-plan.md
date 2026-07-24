# 目标模式当前计划：面板启动与项目接入恢复
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不手工修改安装目录；仅在完成独立备份后，按用户本批明确授权通过 VS Code CLI 安装新版 VSIX；不覆盖已有 VSIX，不删除完整文件，不把未验证实验声明当作事实。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- 结果证据使用最终归档结果；`metrics_summary.csv`、PPT 和论文证据不得混入临时结果；PPT 绘图目标确认必须先于 automation 调用，且不迁移、删除或重写旧任务和结果。
- 连接边界：Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 新增补充任务不得破坏当前主目标；计划更新必须防止修复循环。
- 禁止“父级 evidence key 被子文件 archive 反向命中”。
- 长时间 Webview payload 预算：`schedulerStates` 与 `experimentTraces` 必须限量、压缩并保留受保护记录；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 由代码和测试覆盖。

## 后续优先级
- [待现场验证] 服务器状态页三天 GPU 历史曲线，详见 `docs/target-plans/server-gpu-history.md`。
- [已完成] SimpleExperiment 恢复基线、target mode 压缩契约和 UI 契约修复；全量测试基线 624/624。
- [已完成] Docker Codex 的 SimpleExperiment 与 SimpleSFTP 宿主路径接入、远程编辑器 URI 保留和传输位置确认，详见 `docs/target-plans/docker-codex-plugin-compat.md`。
- [待现场验证] Docker Codex 的双插件多窗口租约、真实 SFTP 上传和 Xshell `127.0.0.1` 联调验收；两插件租约心跳截断竞态已修复，自动化验证通过。
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。
- [已完成自动化] GPU 三天历史按本机一分钟采样，停止高频历史请求和状态闪动；所有服务器通信继续强制经过 Xshell 本地隧道，不允许一次性 SSH 轮询。
- [执行中] 修复 SimpleExperiment 面板持续加载、公开扩展更名后旧 Xshell 配置未迁移，以及打开项目后接入与上传提示被全局一次性标记吞掉的问题。

## 当前批次：panel-onboarding-recovery-001
### 修复点
- [已完成自动化] 激活时在当前公开扩展配置为空且旧扩展状态更完整时，只读恢复 Xshell 隧道、Hub/Worker 与项目父目录配置；不得恢复直接 SSH 执行能力或秘密值。
- [已完成自动化] 面板增加 Webview 启动错误上报和握手超时恢复页，避免脚本异常时永久显示加载状态。
- [已完成自动化] 将“首次配置”与“当前项目接入”分开：配置提醒保持全局，项目接入按工作区记录；关闭通知不能静默永久禁用，成功上传后按工作区停止提醒。

### 回归风险
- 相邻回归风险：不得覆盖已完成的新配置；无旧状态的首次安装不得报错；多项目不能共用接入标记；面板重试不得重复注册 Provider 或启动第二套网络客户端。

### 验证清单
- [已通过] 更名状态迁移、项目级接入提示、Webview 握手与恢复页回归测试 21/21；真实旧状态只读探测确认 Xshell 配置完整且含 3 个 Worker。
- [已通过] 全量测试 673/673、typecheck、lint、VSIX 闭包；默认 Python 3.14 缺少 PyYAML，测试使用本机已配置的 Python 3.10。
- [已通过] 唯一命名 VSIX 已打包并覆盖安装，安装目录关键文件与仓库哈希一致；待重载 VS Code 后现场验证面板和项目提示。

## 本批记录
- 上一完成批次：`gpu-history-stability-001`，提交 `3fcdc52` 与记录提交 `3fb6b99` 已同步。
- 自动化交付提交：`5b78dd3` 已推送并确认与 `origin/master` 一致；正式安装包按版本号命名为 `simple-experiment-0.2.3.vsix`。
- 现场证据：公开扩展仍有 0 个 Worker，旧扩展状态有 3 个 Worker，迁移将在重载后的新扩展宿主激活时执行；面板、迁移结果和当前项目提示为 `needs field verification`。
