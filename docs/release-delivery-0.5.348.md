# 0.5.348 批量提交与未发送任务的状态边界

## 现场与范围

本轮通过当前 discovery、capabilities 和只读 state 核对 Extension Host 与磁盘均为 0.5.347，SimpleSFTP 为 0.2.90。批量操作完成 1/5，第二个 `experiments/plans/comparison/qmf.yaml` 报请求超时，后三个未提交。QMF 仅记录选 Worker 耗时，尚未进入代码指纹、同步、校验或入队阶段。

首个 CORIM 并非全部未启动：`distributed-plan-1792123564723-1q9ne2` 的索引 0、1、3、4 由本轮服务器查询显示运行中；索引 2 显示 missing，原 commandId 为 `a24111c2f2c344c53283ca446e52eff2`；索引 5 尚未绑定 Worker。缺失项的本机派发错误为“持久队列接收回执未确认：The operation was aborted due to timeout”。此前补跑的 QA_MOE 索引 5 已在 H20 运行，UNIMIX_AD 的六项也在运行。本轮不停止或重跑它们。

## 根因与实现

`sendDistributedJob` 在实际 POST 前仍要等待协议和本 PLAN 源码核实。旧 tick 将这类只读准备错误与 POST 后丢失回执合并处理，留下已绑定 commandId 的 unknown 输入；后续主动查询自然只能报告远端没有任务。另一 PLAN 追加会使旧 tick 失效，旧 tick 也不能再整体回写纠正输入。

现按实际传输边界标记“从未调用任务 POST”。只有这个本机证据允许原子撤回相同项目、PLAN、job、attempt、Worker、GPU、commandId 的未发送意图；从最新租约内队列进行单项修改，并围栏旧 tick。保持原 commandId 为下次待发送身份，不生成新运行身份。已经运行、已接收、有停止意图、身份变化或真正 POST 后超时的项都不能由此回队。远端 missing 本身从来不授权重发，也不自动修复既有缺失项。

批量的普通单 PLAN 入口还会逐个调用 NativePlanRetry，其提交前检查原先读取每台 Worker 的完整任务观察，连同无关已结束任务的产物、日志与源码载荷。增加显式 `executionOnly` 只读请求：从本轮 tmux 列表和已发布窗口身份头读取执行绑定、pane_dead、退出码及阶段；不读源码分块，不分析历史日志，不查询产物，不声称日志无异常。正常进度、最终产物核实、日志分析和结果汇总仍使用完整观察入口。所有启用 Worker 的检查范围、实际执行前源码核实、正式产物与路径检查保持原用途。

请求经过 MultiEndpoint、Realtime 与 HTTP 客户端，合并读键区分完整观察和窗口观察。新版 Agent 支持轻量分支；旧版忽略该可选参数并返回原完整观察，保持兼容但仍可能较慢。查询失败附上 Worker 与阶段，继续阻止后续未经核实的提交；批量失败不自动回滚、扩大选择或重发已处理项。

## 验证与兼容

新增测试覆盖真实 Host send/tick、原子回队控制入口、发送前超时、发送后回执丢失、过期 tick、较新 commandId、实际运行保护，以及五个 PLAN 经过普通入口逐项检查全部 Worker。队列写入失败也须等待同轮请求退出并释放启动中标记，错误如实上报。Python 仅提取两个生产函数，在合成 180 个 pane 中识别本项目 179 项，其中三项活跃；一次 tmux 查询，不读取任何源码载荷、产物或日志。未启动正式科研任务。

额外检查的旧 `distributedPlanQueue.test.js` 有 17 项使用已退役 attempts/缺少声明路径的 fixture，失败于 `FORMAL_JOB_PATH_REQUIRED`；用未修改 HEAD 的生产模块再次执行，同样 29 项中 12 通过、17 失败。本次不恢复旧协议或修改科研路径来迁就旧 fixture。当前协议的新回归与发布必需串行门禁另行记录。

最终 `npm run package` 完成 116 次串行单文件执行，783 项通过、零失败；日志为临时目录 `simpleex-0348-package-final.log`。额外队列存储 16 项和真实跨窗口租约/写入 2 项通过。TypeScript/build、vm.Script 模块及 3 段实际渲染脚本、8 个 Python AST、运行闭包、ZIP、身份/版本/universal 平台、370 个 dist 文件逐字节核对及秘密排除通过。

交付校验及安装状态在下方补记；包内本文件为发行前快照。没有修改 MultiModal、远端环境、真实队列、任务、日志、指标或权重。没有自动部署远端 Agent/Scheduler。

## 交付

已验证包 `simple-experiment-0.5.348.vsix` 为 2,986,569 字节，SHA256 为 `e4a6f73e7c50035cf0183bbdb7dcd409141c447bc47feb176eaa867edd3363af`。同名 `.vsix.sha256` 绑定精确文件名。源码推送、真实稳定发行及一次安装完成后补记；此处不冒充实际入口已验收。
