# 0.5.363 慢清单与提交等待修复

## 当前证据与范围

2026-10-17 通过实时 discovery、capabilities 及只读 API 复核，实际 Host 仍为 Experiment 0.5.362、SFTP 0.2.92。上一轮 TMDC 原提交 `plan-submit-selected-plan-9b4d4084-6524-43b3-9c70-a1eeb64ed173` 当前已经 succeeded；没有重新提交。其 historyChoiceMs 为 2478884，包含产物审核及用户确认阶段，不能把这段约 41 分钟全部当成文件扫描。clickToEnqueueMs=2511062，clickToFirstAcceptedJobMs=0，说明本机入队和真正远端开始仍是不同阶段。

上一轮实际观察到 H20 一个清单核实 2318 → 2955 个文件、另一个请求长时间 preparing/0。源码与隔离复现进一步确认两条可修复链路：调用方将精确 manifest 文件提升成顶层目录范围；执行器即使收到精确文件范围，也从项目根目录开始 os.walk，先枚举祖先的无关兄弟项再过滤。同服务器 inventory 还与大批产物核实、传输共用容量，代码核实排在它们后面；原 API 不区分排队和真正进入执行。

03:27:16Z 的只读基线：当前无活动 SFTP 文件操作；H20 SSE 标为 disconnected，但主动任务查询仍得到 43 个完成确认、1 个 unknown，CORIM PLAN 为 5/6。这里不把历史 heartbeat 或 online 文案当成流连接成功。没有为修复重启、升级远端服务或中断隧道。

## 改动

- 每个已启用 Worker 核实完整 manifest 的所有精确文件，包括未变化文件；按 5000 路径和 1 MiB 上限分批，不扩大成顶层目录。缺失文件进入既有差异上传；任何实际读取错误继续阻断，不使用旧缓存冒充本轮结果。Worker 集合、自动同步、命令探针及后续 proof 校验保留。
- 配套 SFTP 0.2.93 直接从声明范围的最小根开始。精确文件不扫描祖先目录；声明目录仍完整递归；重叠范围去重。保留空范围、缺失路径、非递归语义，以及路径、链接、文件类型和读取期间身份变化检查，继续进行 SHA256/五字段缓存身份核实。
- 运行准备的代码 inventory 使用独立有界读取容量，每条容量通道仍最多两个服务器、每服务器一个；后台产物 inventory 和写入通道保持原上限。长清单不再占住代码核实的同服务器票据；不改变写入资源锁、最终内容复核、取消或未知写入防重放。
- 活动 API 增加容量入队、获准、等待时长、子进程启动及首个真实进度时间；最终 inventory 回应保留精简 queryTiming。排队事件不增加文件或字节计数、不刷新文件证据时间。当前 UI 能区分同服务器容量排队与实际枚举/核实。
- 本批没有修改删除执行器、精确路径双确认、完整产物范围、完成确认或 PLAN 计数规则，没有自动清理旧文件。

## 验证边界

新增隔离反例在旧实现下明确失败：精确文件清单触发被禁止的无关项目根目录枚举；前台代码核实被同服务器后台清单阻塞。修复后使用真实 Python 生成脚本核实文件 SHA、目录范围完整性和重叠去重；真实调用方夹具核实全部 Worker 和全部 manifest 文件；容量票据仍有串行、失败释放和取消保护。

所有测试均为本机隔离夹具，串行执行，单文件 20 秒上限。旧 distributedRerunAndWorkerDelta 夹具还沿用已退役的 executeCommand 上传查找、缺少现有手动任务选择状态，并绑定旧按钮文字；仅修正夹具到现有 API 和操作身份，未为通过测试更改生产 UI。

运行版本为 Experiment 0.5.363 / SFTP 0.2.93。本修复的执行器位于本机 SFTP，不自动部署远端 Agent/Scheduler。源码、打包、稳定发行、本机安装与重载后现场验收分别记录；没有通过正式重提 PLAN 进行验收。

## 确定包与代码验证

Experiment 最终 `npm run package` 退出 0，完整执行 build、串行回归、Windows flow 和 256 模块/2 入口运行闭包门禁；lint 与额外 vm.Script 均通过。目标清单/Worker 验证 18 项、SFTP 等待 15 项、差异同步/日志入口 8 项通过。SFTP 完整串行回归 42 文件、271 项通过；追加的同服务器票据失败释放检查在最终 package 的 metadataTreeRead 7 项中通过，最终 package 退出 0、23 运行文件闭包通过。没有挂起超时或跳过必需检查。

| 确定包 | 大小 | SHA256 |
| --- | --- | --- |
| simple-experiment-0.5.363.vsix | 3073740 字节 | `518cee1b0ff48bf8bd1b9b9ad2b6f7c3c32e679150450739fa7f9a43074c1c57` |
| simple-sftp-0.2.93.vsix | 170663 字节 | `742e44343fe1572a5da6856d3b5cbc9886fc89c42660495de2bdb9ac72eb9797` |

两包均 universal，身份、版本、源 package-lock 一致；实际 ZIP 中 Experiment 376 个 dist 文件、SFTP 21 个 JS/Python 文件与当前运行源码逐字节一致，未包含当前真实 discovery token、机器状态或依赖缓存。逐包清单精确绑定文件名。VSCE 默认不打入 package-lock，锁版本在源码检查，未假称锁文件存在于 ZIP。包在交付回执补记前生成，后续文档补记不改变已验证运行文件或包字节。

稳定发行及一次安装须独立验收；重载后的新代码清单耗时仍待现场只读核验，不能用本机隔离测试宣称 H20 已加速。

## 发行、安装回执

实现提交 Experiment `6d1b56a506399f6cbf4d98655ec57d8db14e05ab`、SFTP `e75af6b0de826e2e8752c302b8a00b23545b1150` 已分别普通推送各自 origin/master，fetch 确认一致。未提交原有 pyc、未跟踪脚本、运行目录或历史 SHA 清单。

- [Experiment 稳定 v0.5.363](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.363)，tag 和 target_commitish 均绑定上述 Experiment 实现提交。
- [SFTP 稳定 v0.2.93](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.93)，tag 和 target_commitish 均绑定上述 SFTP 实现提交。

真实 Latest 重读通过，均 draft=false、prerelease=false，资产为表中精确 VSIX 和逐包同名 SHA256 清单。包大小、GitHub digest 和真实下载 SHA256 一致，没有覆盖历史资产。使用实际已安装旧版 Experiment 0.5.362 的 ReleaseClient 从公开 Latest 识别 Windows win32-x64 的两项更新，并通过其真实下载入口取得 VSIX 与清单；清单精确文件名、身份、universal 平台、版本及与本机确定包的全部字节核对通过。验证文件保留于 `C:/Users/ZLK/AppData/Local/Temp/simpleex-0363-release-verify-zs0Gwf`。

各仓库显式执行一次 `npm run install:latest`，分别安装 SFTP 0.2.93 和 Experiment 0.5.363，无 force、无降级、无重复安装。VS Code 安装列表及 simpleex / simple-sftp-api 入口、simpleex --help 核对通过；已安装 Experiment 376 个 dist 文件、SFTP 21 个 JS/Python 文件与已发布包逐字节一致。

安装前最后只读核对在 03:33:28Z：运行 Host 仍为 Experiment 0.5.362、SFTP 0.2.92，无活动 SFTP 文件操作。安装后停止当前面板、插件 API 和服务器操作，没有把安装版本冒充已重载运行版本。等待用户 Developer: Reload Window 后，再通过只读查询验收新清单和容量时间；不重新提交或重跑任务。本次未升级远端 Agent/Scheduler，未改动项目、环境、指标、日志或权重，未执行清理。现场加速结论仍待新版实际运行后确认。本节为文档回执补记，不改变 tag、确定包或安装字节。
