# 目标模式当前计划：Docker Codex 插件兼容
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不修改安装目录，不覆盖 VSIX，不删除完整文件，不把未验证实验声明当作事实。
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

## 当前批次：docker-plugin-004c
### 修复点
- 校验计划 A 的 `plugin-handoff.json` 与 `PLUGIN-HANDOFF.md`，运行两个插件真实协议互操作检查。
- 保持只读状态页并行；确认第二窗口副作用操作显示持有窗口、工作区、动作和过期恢复方式。
- 联调验证 SimpleExperiment、SimpleSFTP、Windows Xshell `127.0.0.1` 与 Dev Container 工作区映射使用同一宿主项目路径。

### 回归风险
- 相邻回归风险：租约不得阻断只读状态，不得改变单窗口 Windows 行为、旧命令 ID、Xshell 入口或任务生命周期。
- 崩溃恢复：只能由过期租约接管，不得强制删除活动租约绕过保护。
- 交付边界：输入接口未通过前不生成交付结果；不安装或覆盖 VSIX；Dev Container 与 Xshell 联调仍需现场验证。

### 验证清单
- [已完成] 共享租约协议模块：原子创建、心跳、过期接管、崩溃恢复、同窗口嵌套和持有者保护。
- [已完成] 两个插件副作用入口接入租约；只读状态命令不申请租约；冲突使用强窗口展示完整恢复信息。
- [已完成] 两个独立插件模块对同一租约文件的真实互操作：跨窗口冲突、同窗口嵌套和最终释放。
- [待验证] 计划 A 输入接口；当前 `PLUGIN-HANDOFF.md` 声明容器用户为 `root`，与原计划的非 root 约束不一致。
- [待现场验证] Dev Container 双插件联调、文件同字节上传和 Xshell `127.0.0.1` 为 `needs experiment`。

## 本批记录
- 上一完成批次：`docker-plugin-003`，本批验证记录与提交以 git 为准。
- 当前目标状态：共享租约协议、两个插件副作用入口与租约心跳稳定性修复完成；Docker 兼容等待现场联调批次 `docker-plugin-004c`。
- `docker-plugin-002`：SimpleExperiment 提交 `d5750ff` 已同步 `SimpleExperiment/origin/master`，`npm test` 通过 644/644。
- `docker-plugin-003`：SimpleSFTP 提交 `bbaa528` 已同步 `SimpleSFTP/origin/master`，`npm test` 通过 10/10；未生成、安装或覆盖 VSIX。
