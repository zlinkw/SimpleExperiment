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

## 当前批次：docker-plugin-007
### 修复点
- 校验计划 A 的 JSON 固定字段与 Markdown 运行边界，未知扩展字段保持兼容。
- 错误路径、扩展 Host、远程 URI 和 Windows 回环声明必须阻断验收。
- `root` 或未声明容器用户时只能返回 `needs_experiment`，不得生成通过结果。

### 回归风险
- 相邻回归风险：不能用结构测试替代真实远程工作区、SFTP 或 Xshell 现场证据。
- 兼容风险：schemaVersion 1 的未知扩展字段不得导致失败。
- 外部边界：校验器只读计划 A 文件，不修改 Docker 配置、VSIX 或安装目录。

### 验证清单
- [已完成] SimpleExperiment `npm test` 通过 655/655；SimpleSFTP `npm test` 通过 18/18；两插件租约压力测试均通过 10/10，中文 UTF-8 租约标签回归通过。
- [已完成] 临时对照包未覆盖现有安装；SimpleExperiment VSIX 不含恢复异常文件或 Python bytecode。
- [已完成] SimpleSFTP VSIX 包含共享租约与工作区映射模块；两个独立插件模块互操作通过。
- [已完成] SimpleExperiment `0.2.1` 与 SimpleSFTP `0.1.3` 对照包的 manifest、package 版本和扩展 ID 一致。
- [已完成] 公开离线包改为直接写入全新版本目录；目标目录已存在时立即阻断，不删除、不覆盖旧 VSIX 或说明文件。实际打包与重复路径拒绝检查通过。
- [失败] 当前计划 A 输入缺少 `vscode-remote` 与 `127.0.0.1` 明示声明，且 `containerUser=root`；校验结果为 `failed`，不得生成兼容通过结果。
- [待现场验证] Dev Container 文件同字节上传和 Xshell `127.0.0.1` 为 `needs experiment`；当前只读检查未发现 Xshell 进程或本地监听端口。
- [已完成] 两个插件仓库加入 `* text=auto` 换行规范；Docker Linux 工作区不再把 Windows 混合换行误报为源码修改，Windows 工作区状态保持干净。SimpleExperiment `2fb064e`、SimpleSFTP `57137db` 已同步。

## 本批记录
- 上一完成批次：`docker-plugin-003`，本批验证记录与提交以 git 为准。
- 当前目标状态：共享租约、UI Host 激活和对照打包修复完成；跨平台 Git 工作区已稳定；Docker 兼容等待现场联调与正式交付。
- `docker-plugin-007`：校验器单元测试通过；实际计划 A 输入按预期返回 `failed`，待提交同步。
- `docker-plugin-004c`：SimpleExperiment `21b375a`、`779b5f3`，SimpleSFTP `95399bf`、`458c2b6` 已同步各自 `origin/master`。
