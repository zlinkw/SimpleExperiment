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

## 当前批次：panel-state-fallback-release-008（已完成自动化，待用户验证）

### 相邻回归风险
- 未改变 Xshell、SimpleSFTP、GPU 历史、Agent、归档、结果和 PPT 的真实连接边界。
- 项目提示“已显示”不等于“已接入”；只有成功代码同步才写入项目接入完成标记。
- 状态构建失败时仅发送本地恢复状态，不触发服务器请求或文件传输。
- 新包必须使用短文件名和新版本号，不覆盖任何历史 VSIX；安装后仅要求本地 UI 验证。

### 验证清单
- [已通过] 代码批 `1e09702` 已推送并确认本地与 `origin/master` 一致。
- [已通过] 已升级至 0.2.8 并生成 `simple-experiment-0.2.8.vsix`；139 个文件，SHA256 `2DC44CE91A75139AA6CEA5A3FC303D6487A8A59B16E52218B185304D584B33DD`。
- [已通过] 相对 0.2.7 文件数不变，只修改 manifest、`package.json`、`dist/extension.js`、`dist/ui/PanelHtml.js`，无新增或移除文件。
- [已通过] 已覆盖安装 0.2.8；安装目录 `dist/extension.js` 与源码构建产物 SHA256 一致。未启动任何服务器通信。
- [已通过] TypeScript、Lint、Node 语法检查、定向静态测试 16/16、全量静态测试 680/680。
- [已通过] VSIX runtime 闭包：50 个本地模块、5 个入口。
- [已通过] 静态验证使用 Python 3.10.11；未连接真实服务器、Xshell、SimpleSFTP、GPU 或 Agent。
- [已通过] 状态构建失败 fallback、Webview 渲染错误回报、单项目接入入口和旧版 SFTP 提示优先级均有定向覆盖。
- [已通过] 本地 headless Webview smoke：内联脚本启动握手、待接入状态渲染和旧缓存状态渲染均无脚本错误；未启动服务器通信。
- [已通过] 只读验证旧版扩展状态迁移可恢复 Xshell 配置并剥离直连 SSH 字段；未写入用户状态库。
- [待用户] 当前 VS Code Extension Host 日志仍早于 0.2.8 安装时间，尚未加载新包；需执行 `Developer: Reload Window` 后再读取新激活日志。
- [deferred] 真实服务器、Xshell 隧道、SimpleSFTP 上传、GPU 和 Agent 联调。

## 本批记录
- 本批代码提交 `1e09702`、发布提交 `3174f14` 已推送并确认与 `origin/master` 一致；正式安装包为 `simple-experiment-0.2.8.vsix`。
- 上一完成批次：`gpu-history-stability-001`；恢复交付 `5b78dd3`、`df0ade6`、`3e7dc83` 已同步，安装包为 `simple-experiment-0.2.3.vsix`。
- 本批静态加固提交 `37dd2c6` 已推送，并确认本地 `HEAD` 与 `origin/master` 一致。
- 本批发布提交 `0be4166`、记录提交 `b7956d1` 已推送；正式待安装包 `simple-experiment-0.2.5.vsix`，SHA256 `14AABE3E298C0B978B6CC6CEF950D08BD5E6672D62E6176F79F650F34C29CBBD`，未覆盖当前安装。
- 本批代码提交 `4660c69` 已推送并确认与 `origin/master` 一致；正式安装包 `simple-experiment-0.2.7.vsix`，SHA256 `B69DEE420B63B66AA369E3298E5A15DFCF66B00DD36D65C522B1BF918261F683`，未覆盖当前安装；下一批边界：用户开始使用后，仅现场验收 Xshell 隧道、SimpleSFTP 上传、GPU 历史和 Agent 项目接入，不在本批自动执行。
