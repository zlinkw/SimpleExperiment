# 0.5.364 结果汇总与本机表格性能

## 当前证据

2026-10-17 通过各自 discovery 和实时 capabilities 复核，运行 Host 已是 Experiment 0.5.363、SFTP 0.2.93，PID 49920。没有将上轮安装版本当作运行版本。当前 MultiModal 导出有 422 个 job、51 张表，即 102 个 CSV/Markdown 文件，JSON 425391 字节；只读取规模，没有修改消费项目。状态中最近结果查询报告为 04:51:45Z，包含 fetch failed；较后的四台 Worker probe 报告 Agent 0.5.363、status=ok，H20 latencyMs=4083。历史汇总失败不能说明隧道现在断开，probe 也不能代替本轮完整产物核实；不能以旧本机导出证明当前远端状态或现场加速。

调用链为结果按钮 → ResultCollectionHost.update/collect → PLAN 声明查询 → 全部启用 Worker 文件/窗口观察 → collectFreshResults → SimpleSFTP 内存读取 → 验证与汇总 → publishLatestResult；本机按钮只经 regenerateLatestResultTables 和本机目录刷新。原实现每个 job 单独调用 SFTP，失败 Worker 被每个 PLAN 再次尝试；新完成事件还可令手动请求反复执行完整轮次。表格无论内容是否变化都串行 durable flush/rename。

## 修复和约束

- PLAN 声明有界四路查询；网络不可达或超时仅在本轮抑制后续重复探测，下一轮重新尝试。PLAN 不一致、HTTP 400 等声明错误不隔离整个 Worker。全部启用 Worker 仍查询全部声明和实际文件，不缩减核实范围。
- 每组最多 16 个 job，按 Worker 合并同轮读取，传输批次最多 4 MiB。每份 manifest、指标的路径、长度、SHA256、runId、job 身份及运行异常仍独立核实；坏批次按 job 隔离，保留其他结果和原有副本回退。原始指标只留内存，不引入持久缓存，不复用上一轮远端证据。
- 手动请求完成一个完整轮次即返回；新完成事件安排独立后续轮次，不把当前请求无限延长。共享请求、取消、PLAN 内容变化、工作区/实际服务器绑定及传输层连接换代围栏保留，等待所有在途子操作结束后才释放所属轮次。健康检测可重建相同物理目标的客户端，后续查询使用当前客户端，不因旧对象已 disposed 而使剩余 PLAN 全部失败，也不把对象更换当成实际目标变化。
- 本机表格以实际字节比较，完全相同才省略落盘；变化或损坏继续原子重建，最多四个写入并行。保持内核单写者、链接/硬链接与安全路径检查、发布前上下文检查，以及 JSON 先提交、表格可重建的语义。失败也等待同批写入全部结束，不提前释放锁。
- 摘要增加声明、远端观察、内存读取、本机发布和总耗时，以及实际内存请求/文件数。未更改 TTL、完成确认、PLAN 计数、删除双确认、科研环境或调度规则。

## 可复现验证

隔离回归通过 SIMPLE_RESULT_BASELINE=1 装载修改前提交 `789c9144037ffd57a658cd7118121e694fcce960` 中的三个生产模块，与当前源码在相同调用夹具比较，未回滚或改写工作区。性能与连接回归共十一项；坏文件隔离、PLAN 特定错误、实际目标变化围栏及硬链接保护在旧版也正常，继续保留。

| 本机隔离场景 | 旧版 | 新版 |
| --- | --- | --- |
| 48 job，每次传输固定等待 20 ms，全部内容核实 | 48 次，1549 ms | 3 次，120 ms |
| 12 PLAN 的首个 Worker 不可达 | 12 次声明失败重试 | 最多 4 次；仍对全部 Worker 发出 12 份文件声明 |
| 51 张未变化表格重建 | 102 次 durable 重写，640 ms | 0 次重写，56 ms |
| 单表损坏 | 全部重写 | 精确修复 1 个文件 |
| 查询中又观察到完成 | 当前手动请求连续执行两轮 | 当前一轮返回，后续独立刷新 |

这些是本机夹具测量，不是 H20 网络或现场端到端耗时。既有 freshResults/freshResultHost 覆盖零指标、真实非零退出、运行异常待复核、离线保留旧导出但本轮未知、取消、PLAN 编辑、独立写者和 JSON/表格中断恢复。所有测试串行、单文件限 20 秒。没有重新提交、重跑、停止或清理科研任务，没有部署远端 Agent/Scheduler。

完整构建、确定包检查、源码推送、稳定发行与一次安装的最终回执在完成后补记。新版实际运行与 H20 现场验收必须在用户重载后单独确认。

## CORIM seed 44 与错误折叠

用户在打包验证后补充问题，安装和发行尚未执行，合并到同一个未交付版本并重新完整打包验证。只读 tasks.list 1318 ms 返回原 commandId `77f6cf6556334e6ab3f2a5d9bf5f57d1`、index=5、H20 jqg_zlk，当前 execution=missing、manifest=null、完成 unverified；独立 tmux.list 2263 ms 未找到该命令窗口。当前配置项目根 `/jqg/zlk/MultiModal` 中，精确输出 `work_dirs/quality_composition/all_low_quality_min_integer_gap/final/corim/5_corim_pad_p100_seed44` 经 SimpleSFTP 元数据通道 431 ms 确认不存在，父目录仅有 index 0..4；其余三个启用 Worker 同一精确目录亦不存在。日志路径主动读取报 ENOENT。以上只证明当前缺少可核实证据，不否定过去可能运行过，也不补成完成。

现有同服务器大清单处于 hashing、1532 个文件，capacityWaitMs=0。一次隔离精确 inventory API 等待超时没有提供文件存在或缺失结论，未重发该请求，也未取消用户大清单。独立目录元数据通道得到了上述明确结果。没有把“隧道通”“HTTP 可查询”混同为所有 SSH 文件操作立即完成。

本机队列原源码基线中 `configs/_base/robust_fair_encoders.yaml` 为 1845 字节、SHA256 `5b46af67937326fa27adf43eeec8dbd28d845c38280f0e590ae4733202b72a70`；当前本机 1881 字节、SHA256 `5871a065f9cc44f90c09947fce5f5578f82289267f4455004810744f28ce22ec`。这是实际配置版本冲突。旧重跑入口先远端查询、发送取消围栏，再核对本机源码，故同一不可重放输入可能先暴露超时、停止未核实，下一次才遇到源码冲突。现在先解析并验证原源码基线，确定性冲突在任何查询等待、停止、清理或队列修改之前返回；保留后续真实停止核实、精确 commandId、源码与产物二次核实、完整删除双确认。不绕过版本冲突、不自动改用当前配置、不自动重跑。错误建议明确指出核对具体文件与版本，不能靠刷新消除冲突。

CORIM 后端 PLAN 摘要本来就是 unknown、5/6；UI 将 missing 窗口排除出“活动未知”，随后将没有活动任务兜底当作 completed，错误进入“已完成 Plan 历史”。现在未知完成计数独立于活动显卡占用；只有有 job 且全部确认成功的 PLAN 才进入完成历史。新增真实渲染脚本回归覆盖 5/6、连续刷新、变为真正 6/6 后进入历史以及新缺失证据后返回当前区；缺失任务仍不占活动槽位。没有改变已确认完成事实在单纯断线/TTL 下的保留规则。

## 完整代码验证与确定包

上述最终代码已重新执行 `npm run package`，退出 0，包含完整 build、串行内置回归、Windows flow、256 模块/2 入口闭包检查。最终目标结果性能 11 项、实际渲染 35 项、运行日志与重跑 Host 12 项通过；lint、额外 vm.Script 和 diff 检查通过。对照旧提交的性能回归为 6 项失败；原源码变更的专门对照在旧入口中先进入远端查询而失败，新入口连续三次均在查询/停止前稳定返回 PLAN_SOURCE_CHANGED。没有 20 秒挂起后重试。

确定包 `simple-experiment-0.5.364.vsix`：3082475 字节，SHA256 `eaa33995043788c6df99f993541a4fcd4b149d1a9e533e52c3758fb96d0590dc`，535 个 ZIP 条目、376 个 dist 文件，全部运行字节与当前源码构建一致。publisher/name/version、universal 平台、源 package-lock、实际 discovery token 排除、无机器状态/依赖缓存检查通过。同名 SHA256 清单精确绑定文件名。包已冻结，后续文档回执不改变运行字节，不重新打包或替换发行资产。

配套 SimpleSFTP 0.2.94 进一步将不超过 4 MiB 的内存指标读取与同服务器大清单/落盘传输隔离；API 外层与实际下载内层使用相同有界通道，避免只改外层后仍在内部排队。完整哈希、单服务器容量、取消、文件白名单和磁盘写入保护保留。其独立验证及发行记录见 SimpleSFTP 仓库 `docs/release-delivery-0.2.94.md`。Experiment 的既有内存协议仍兼容 0.2.93，本次最终交付配套 0.2.94 才包含此容量优化。

## 稳定发行与一次安装回执

实现提交 Experiment `ebe6922cb843dc5c0ba4721e5d97d2033d442877`、SFTP `8d273049f3686be487a13d5dcdc4606c9e10172f` 已各自普通 fast-forward 推送 origin/master，fetch 核对一致。原有 pyc、未跟踪脚本、历史校验清单和运行目录均未提交。

- [Experiment 稳定 v0.5.364](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.364)，精确资产 `simple-experiment-0.5.364.vsix` 3082475 字节及同名 `.sha256`，指纹见上节。
- [SFTP 稳定 v0.2.94](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.94)，精确资产 `simple-sftp-0.2.94.vsix` 170860 字节，SHA256 `1452a52b9da84a89f760154b162d299cc79ff2496a945d67840450a75988aa92`，以及同名 `.sha256`。

真实 Latest 均 draft=false、prerelease=false，tag 与 target_commitish 绑定各自实现提交，资产名称、大小、GitHub digest 与本机冻结包一致。使用实际已安装旧版 Experiment 0.5.363 的 ReleaseClient 为 Windows win32-x64 识别两项更新，通过其实际下载入口取得两份 VSIX 和清单；逐字节、SHA256、身份、universal 平台、版本和清单精确文件名均通过。下载验证文件保留在 `C:/Users/ZLK/AppData/Local/Temp/simpleex-0364-release-MqEC0q`，没有覆盖或清理历史资产。

各仓库显式执行且仅一次 `npm run install:latest`，安装 SFTP 0.2.94 与 Experiment 0.5.364，无 force、无降级。VS Code 安装列表、simpleex/simple-sftp-api 入口和 simpleex --help 核对通过；已安装 Experiment 376 个 dist、SFTP 21 个 JS/Python 运行文件与稳定发行包逐字节一致。

安装前最后 API 只读核对仍为运行 Host 0.5.363、CORIM 5/6、原 commandId 不变、seed44=unknown。安装后停止插件 API、面板和服务器操作。等待用户 Developer: Reload Window 后再验收实际运行版本、H20 端到端耗时和错误分组；当前不宣称现场已修复。没有重提、重跑、停止科研任务，没有改动配置、产物、指标、日志或权重，也未升级远端 Agent/Scheduler。本节为文档回执，不改变冻结包或 tag。
