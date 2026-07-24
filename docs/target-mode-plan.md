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
- [已完成自动化，待现场验证] 修复 SimpleExperiment 面板启动握手竞态，并将当前项目接入提示提升为可见的模态提示与面板内持久入口；真实服务器、Xshell 隧道、SFTP 上传和 GPU 请求联调暂缓。

## 当前批次：panel-onboarding-release-005
### 修复点
- [已完成自动化] Webview 先注册消息监听，再赋值 HTML；握手同步到达时不得丢失，已加入顺序回归测试。
- [已完成自动化] 项目接入通知改为模态窗口；取消或关闭通知时，面板保留“当前项目待接入”持久入口。
- [已完成] 代码批提交 `4660c69` 已推送并确认与 `origin/master` 一致。
- [已完成] 版本升至 `0.2.7` 并生成短文件名 VSIX；`0.2.6` 初始包不覆盖重打，已列入人工待删除候选；不覆盖当前安装，不连接真实服务器。

### 回归风险
- 影响范围仅限面板宿主渲染、项目接入提示展示及其测试；服务器连接、Xshell、SimpleSFTP 真实上传、GPU、归档、结果和 PPT 行为保持受保护且未执行现场联调。
- 相邻回归风险：不得覆盖已完成的新配置；无旧状态的首次安装不得报错；多项目不能共用接入标记；面板重试不得重复注册 Provider 或启动第二套网络客户端。
- 新增风险：提示状态只读来自当前工作区；未完成接入不得被普通 UI 关闭动作永久吞掉。
- 发布风险：VSIX 不得纳入恢复残留、旧 VSIX、本机状态或源码测试文件；不得覆盖安装。

### 验证清单
- [已通过] 消息监听早于 HTML 赋值、模态提示和持久待接入入口回归测试；相关静态测试通过。
- [已通过] `typecheck`、`lint`、VSIX runtime 闭包 50 个本地模块及 5 个入口、`node -c` 生成 JS 语法检查。
- [已通过] 全量本地测试 679/679；测试进程将 Python3.10 放在 PATH 首位，未连接真实服务器。
- [已纠正] 默认 Python 3.14 缺少 PyYAML 导致 3 个既有 scheduler 测试失败；未修改环境，改用本机 Python 3.10 后全量通过。
- [已通过] `0.2.7` 打包门禁、runtime 闭包、VSIX 文件清单、版本和 SHA256；139 个文件，SHA256 `B69DEE420B63B66AA369E3298E5A15DFCF66B00DD36D65C522B1BF918261F683`。
- [已通过] 相对 `0.2.5` 仅变更版本清单、主扩展代码、面板代码和 manifest，并排除 3 个未使用的 `dist/test`、`dist/testing` 编译模块。
- [暂缓] 真实 Xshell、SimpleSFTP、GPU 历史和 Agent 联调；用户开始使用后再验收。

## 本批记录
- 上一完成批次：`gpu-history-stability-001`；恢复交付 `5b78dd3`、`df0ade6`、`3e7dc83` 已同步，安装包为 `simple-experiment-0.2.3.vsix`。
- 本批静态加固提交 `37dd2c6` 已推送，并确认本地 `HEAD` 与 `origin/master` 一致。
- 本批发布提交 `0be4166`、记录提交 `b7956d1` 已推送；正式待安装包 `simple-experiment-0.2.5.vsix`，SHA256 `14AABE3E298C0B978B6CC6CEF950D08BD5E6672D62E6176F79F650F34C29CBBD`，未覆盖当前安装。
- 本批代码提交 `4660c69` 已推送并确认与 `origin/master` 一致；正式安装包 `simple-experiment-0.2.7.vsix`，SHA256 `B69DEE420B63B66AA369E3298E5A15DFCF66B00DD36D65C522B1BF918261F683`，未覆盖当前安装。
