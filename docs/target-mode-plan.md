# 目标模式当前计划：修复安装包启动与项目接入引导
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

## 当前批次：project-onboarding-001
### 修复点
- 修复扩展先启动、后打开本地项目时不再触发项目接入提示的问题。
- 无工作区时不提前写入首次引导完成版本；工作区切换完成后重新检查并触发引导。

### 回归风险
- 相邻回归风险：工作区切换不得重复写入首次引导状态，也不得绕过 SimpleSFTP 和服务器配置门禁。

### 验证清单
- [已通过] 工作区切换引导回归测试、类型检查和全量测试：`npm test`，665/665。
- [已通过] lint：`npm run lint`。
- [已通过] VSIX 闭包：`npm run verify:package-runtime`，47 个本地模块、5 个入口。
- [已通过] 候选包 `simple-experiment-0.2.2-xshell-only-onboarding-20260724.vsix` 共 139 个文件；文件名与文本内容均无废弃客户端残留，相对旧 `0.2.1` 包少 2 个文件。
- [已通过] 修复提交 `c3f00c8` 已推送 `origin/master`，fetch 后本地与远端一致。

## 本批记录
- 上一完成批次：`release-activation-002`，提交 `7279aec`；计划记录提交 `4bfcfea`。
- 当前目标状态：代码、自动化验证、独立候选包和 GitHub 同步均完成；按用户要求未覆盖安装现有 `0.2.1`，等待手动安装后的扩展宿主与项目接入现场验证。
- 本批候选包：`simple-experiment-0.2.2-xshell-only-onboarding-20260724.vsix`；本批提交：`c3f00c8`。
