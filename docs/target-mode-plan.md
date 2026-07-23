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

## 当前批次：release-activation-002
### 修复点
- 修复 SimpleExperiment VSIX 错误排除运行时依赖，导致扩展激活失败和面板永久加载的问题。
- 增加 VSIX 静态 `require` 闭包门禁，打包前拒绝缺失入口依赖的安装包。
- 恢复新版本首次打开已配置项目时的“接入当前项目”引导；真实上传仍由 SimpleExperiment 调用 SimpleSFTP，并保留路径强确认。
- 活动隧道实现、配置字段、测试场景和用户提示统一为 Xshell；废弃完整旧文件只登记到人工清理清单。

### 回归风险
- 激活风险：修复首个缺失模块后，其他被 `.vscodeignore` 排除的传递依赖也必须由闭包门禁覆盖。
- 相邻回归风险：项目接入提示不得绕过服务器、Worker、SimpleSFTP 和上传位置确认门禁，也不得自动上传。
- 外部边界：不运行真实实验，不写项目归档，不修改用户项目配置或服务器文件；安装新版前保留既有备份。

### 验证清单
- [已复现] VS Code 扩展宿主日志明确记录 Xshell 集成入口缺少已被打包规则排除的启动依赖，来源为已安装 `0.2.1` 的 `XshellTunnelIntegration.js`。
- [已通过] VSIX 闭包门禁覆盖 5 个入口，检查 47 个本地 CommonJS 模块；损坏规则复现与修复后通过均有本地测试证据。
- [已通过] `npm test` 665/665、`npm run lint`、`npm run typecheck`、构建和 VSIX 内容检查通过。
- [已通过] `simple-experiment-0.2.2-xshell-only-r2.vsix` 为 139 文件；相对已安装候选包移除旧迁移编译产物和人工清理文档，无旧客户端名称或内容，新增/删除/变更分别为 0/2/11。
- [按用户要求未执行] 未覆盖安装或修改现有安装目录；现场扩展宿主激活、面板加载和项目接入仍需用户手动安装候选包后验证。

## 本批记录
- 上一完成批次：`recovery-guard-006`，验证记录与提交以 git 为准。
- 上一交付批次：`release-install-001`；旧版备份位于仓库外时间戳目录且保持不变。
- 当前目标状态：代码与候选包自动化验收完成，提交 `7279aec` 已推送 `origin/master`；等待用户审核人工清理清单和现场安装验证。
- 本批候选包：`simple-experiment-0.2.2-xshell-only-r2.vsix`；旧版对照：`D:\GitRepo\MCP\installed-plugin-backups\20260723-205724\SimpleExperiment-0.2.1-d9a71be.vsix`。
- 本批提交：`7279aec fix: restore SimpleExperiment activation and Xshell onboarding`。
