# 0.5.368 / SimpleSFTP 0.2.96 交付记录

## 原因与现场只读证据

本轮 discovery 确认实际 Extension Host 为 SimpleExperiment 0.5.367、SimpleSFTP 0.2.94，PID 8968；SimpleExperiment 启动时间为 2026-10-17T08:57:21.863Z。没有以磁盘版本代替实际运行版本。当前消费项目为 d:/GitRepo/MultiModal。所有现场通信均经现行 discovery/capabilities 与插件 API，没有直接 SSH、文件传输、删除、科研任务启动、停止、重跑或重新提交。

截图的 sync.projectTree HTTP 503 来自本机 SimpleSFTP api-server.js 的全局 activeRpc >= 8 拒绝分支，响应为 API_CAPACITY_EXCEEDED。它把排队中的长文件操作、目录查询与状态/取消控制一起计算；不能据此认定 NWPU3 隧道断开或带宽耗尽。旧代码的确定性回归中，八个未结束的清单 RPC 会使目录浏览和 transfers.list 失败，修复前目标测试 20/21，通过结果不是现场网络压测。

按当前四台启用 Worker 的实际配置，只读查询 experiments/plans/comparison：NWPU3 623 ms、NWPU2 511 ms、NWPU5 920 ms、H20/jqg_zlk 3785 ms，均返回 exists=true、20 个条目。这些数值是调用端总耗时，包含本机 API、排队、SSH 和目录读取，没有冒充握手或链路吞吐测量。NWPU3 的实际目标为 qgking@10.70.50.180:22，项目根 /data/qgking/zlk/MultiModal。

安装前另一次 state 只读调用 125 ms，13 个 PLAN 的同步状态均为 synced，说明上一版的 job 确认复用在现有 Host 中已生效；不是新版现场验收，也不是重新核实全部产物。该 state 中四台 Agent 能力记录为 0.5.367，本轮没有逐台重新部署或以缓存能力记录冒充新运行字节证明。SimpleSFTP transfers.list 136 ms；H20 原有 sync.projectInventory 从 2026-10-17T09:32:40.731Z 持续运行，当次快照 lastProgressAt=2026-10-17T09:54:20.913Z、processedFiles=4711。没有取消或重发该现场请求。完整远端文件系统扫描仍可能慢，改并发及传输通道不能替代必要的文件核实。

## 修改与边界

SimpleSFTP 的文件长操作、目录浏览、清理审核和轻量状态控制分为独立有界 RPC 队列。入口并发分别为 8、4、2、4，各队列最多保留 64 个等待请求；底层文件执行仍默认全局两路、每服务器一路，独立只读通道也保持有界。Agent 准备、项目创建和传输复核归入长操作队列，不能占满状态控制队列。health 暴露各通道活动/排队数量。队列满或排队期间断开明确返回 notStarted；已开始写入仍保留原有执行归属和核实路径，不因连接关闭重复执行。清理审核只读通道与批量哈希隔离；真实删除执行没有绕过原写入通道、路径保护和双确认。

同步页面最多同时读取两个目录，同一目录请求合并；刷新只重新列出已展开目录，不为全部历史展开缓存和每个勾选路径的父目录重复发请求。完整内容核实范围、全部启用 Worker 和递归校验保持不变，本机哈希与远端查询并行。某台 Worker 目录读取失败时保留成功读取的内容并明确显示未知；不完整清单不撤销旧选择，也不将未返回路径判为不存在。实际批量操作的 strict/fresh 文件树查询仍要求所有目标核实成功。

关闭页面、保存范围或开始路径操作取消该页面旧只读网络请求；不取消已开始的写入或科研任务。请求 id 和既有操作换代保护阻止旧响应覆盖新范围、恢复已删除条目或阻塞下一次刷新。SimpleSFTP 的真实排队、文件阶段计数及慢响应提示送到页面，计数不会冒充完成比例或文件存在证明；列表恢复后清除旧列表连接错误，仍待完整内容核实。保存范围后旧校验回包和进度不能恢复旧状态。

当前代码、runtime、产物、指标及临时结果读取入口已经使用 SimpleSFTP 的 tar/rsync 文件流程，Agent HTTP 隧道用于状态/动作通信。本轮没有将它们改成共享一个文件隧道；移除了归档和结果查看对旧 Agent downloadWorkerFile 方法存在性的错误门禁。底层旧文件兼容接口保留，当前操作入口不以它们传输文件。不同连接仍共享物理网络和远端磁盘，未宣称无限并发或带宽已扩大。

未增加 TTL，未刷新旧完成证据时间，未将缓存当作本轮文件证明。既有完成固定、PLAN 计数、commandId/runId/Worker/路径隔离、非零退出与异常复核均保留。删除仍须精确节点/路径/类型、实际文件元数据、安全根、规范直接父目录与物理 cd 校验、./直接子项及两次确认；本轮没有执行现场删除或修改研究源码、环境、指标、日志、权重及同步范围。

## 代码验证

先单独运行目标测试复现容量问题，再完成修复回归。SimpleSFTP 最终 42 个文件、275 项全量串行通过，api.test.js 覆盖八个长操作占用、目录/审核/状态独立、排队读写取消、64 个等待上限与四个 Agent 准备不占状态队列；metadataTreeRead.test.js 覆盖同服务器长清单不阻塞审核和目录读取。

主插件 syncScopeDeletionRefresh.test.js 11 项、真实生成页面 syncScopeTree.test.js 5 项通过；相关状态、批量同步、删除和指标内存读取单文件串行回归通过。覆盖部分成功、失败未知、严格操作复核、慢本机哈希并行、重复刷新合并、关闭取消、路径操作换代、旧回包和真实文件进度关联、连接恢复清除旧错误。最终 npm run package 完整 build、Windows flow、现有完成/断线/迟到响应回归和 257 模块/2 入口闭包门禁退出 0；lint、vm.Script 模块及实际页面 script、UTF-8 复读、禁止端口检查、git diff --check 通过。没有 20 秒挂起后重试。

## 源码与稳定发行

- SimpleExperiment 源码提交：4c712546f675413718a562cfcd28c882b79662da，已普通 fast-forward 推送 origin/master，fetch 核对一致。
- SimpleSFTP 最终源码提交：fed954a00ead166644b8bb9e23512e6022efd798，已普通 fast-forward 推送 origin/master，fetch 核对一致。前一独立队列批次为 013a1a4d2dfb69dd400642704b85a3f8168d27a2 / 0.2.95；补齐长 Agent 操作隔离后发布 0.2.96，没有覆盖旧 tag/资产，0.2.95 未安装。
- 稳定 [SimpleExperiment v0.5.368](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.368)：simple-experiment-0.5.368.vsix，3105809 字节，SHA256 be22a74193a0b96b9441d0741c0e789452876f88c4a9beea7e7dd9acd0bed8d9；同名 .vsix.sha256 精确绑定文件名。
- 稳定 [SimpleSFTP v0.2.96](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.96)：simple-sftp-0.2.96.vsix，171416 字节，SHA256 52a0acf130e5f69ba889a29e2351ce7d7e1c8e7ad1003244ce7612715ad2b271；同名 .vsix.sha256 精确绑定文件名。

重新读取两个真实 Latest，tag 均绑定上述提交，draft=false、prerelease=false，资产名称、大小及 digest 一致。使用实际已安装旧版 0.5.367 的 ReleaseClient，对 0.5.367 / 0.2.94 识别两个更新并真实下载 VSIX 和 SHA 清单，逐字节等于冻结本机包。主包 539 个 ZIP 条目、377 个 dist 文件；配套包 26 个条目，身份、universal 平台、engine、运行闭包、源码/发行运行字节、实际 discovery token 和机器状态排除均通过。验证文件保留于 C:/Users/ZLK/AppData/Local/Temp/simpleex-0368-delivery-L4OhHB，未自动清理。

## 安装与现场验收状态

各显式执行一次 npm run install:latest，SimpleSFTP 0.2.96 与 SimpleExperiment 0.5.368 安装成功，没有 force 或降级。立即通过 VS Code 已安装清单和包内版本核对；主插件 377 个 dist 文件、配套插件 23 个文件逐字节等于真实发行包。simpleex、simple-sftp-api 入口存在，simpleex --help 正常。安装后停止当前插件 API、面板和服务器操作，仅完成本交付文档及 Git 同步。

代码验证、稳定发行和安装已完成；需要用户 Developer: Reload Window 后，才可通过插件 API 和页面验收新版真实运行、NWPU3 连续刷新、H20 慢扫描期间目录/审核/状态响应及完成计数稳定。未部署远端 Agent/Scheduler；不以本轮单元/渲染测试或旧版现场观察宣称新版现场问题已经解决。
