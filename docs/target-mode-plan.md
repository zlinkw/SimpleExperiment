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

## 当前批次：docker-plugin-005
### 修复点
- 生成不覆盖现有安装的临时 VSIX，并与本机已安装的同版本插件逐文件比较。
- 排除恢复快照异常文件和 Python bytecode，确认 SimpleSFTP 租约与工作区映射模块进入新包。
- 仅在真实上传、Xshell、非 root 容器和远程工作区验收全部通过后写入 `plugin-drop` 与兼容结果。

### 回归风险
- 相邻回归风险：打包规则不得遗漏运行必需模块，不得把恢复残片、缓存或本机状态装入公开 VSIX。
- 版本风险：新包必须使用高于已安装版的 patch 版本，对照包不得覆盖现有安装。
- 交付边界：输入接口未完全通过前不生成正式兼容结果；Dev Container 与 Xshell 联调仍需现场验证。

### 验证清单
- [已完成] SimpleExperiment `npm test` 通过 654/654；SimpleSFTP `npm test` 通过 17/17；两插件租约压力测试均通过 10/10。
- [已完成] 临时对照包未覆盖现有安装；SimpleExperiment VSIX 不含恢复异常文件或 Python bytecode。
- [已完成] SimpleSFTP VSIX 包含共享租约与工作区映射模块；两个独立插件模块互操作通过。
- [已完成] SimpleExperiment `0.2.1` 与 SimpleSFTP `0.1.3` 对照包的 manifest、package 版本和扩展 ID 一致。
- [待验证] 计划 A 输入接口；当前 `PLUGIN-HANDOFF.md` 声明容器用户为 `root`，与原计划的非 root 约束不一致。
- [待现场验证] Dev Container 文件同字节上传和 Xshell `127.0.0.1` 为 `needs experiment`。

## 本批记录
- 上一完成批次：`docker-plugin-003`，本批验证记录与提交以 git 为准。
- 当前目标状态：共享租约、UI Host 激活和对照打包修复完成；Docker 兼容等待现场联调与正式交付。
- `docker-plugin-004c`：SimpleExperiment `21b375a`、SimpleSFTP `95399bf` 已同步各自 `origin/master`。
- `docker-plugin-005`：打包清理 `3a3cdaf`、`f27bd4e`，版本提交 `98850e0`、`1445856` 已同步；临时包未安装。
