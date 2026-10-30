# 0.5.448 试行交付

基于试行版 0.5.447（`bcc094ffb1aaf46ffad72d343e360a88ad35bc6e`），独立分支 `codex/trial-recovery-boundaries-20261030`。用户确认四项全部修复。权威版仍为 SimpleExperiment 0.5.440 / SimpleSFTP 0.2.117；release-policy.json 未改。继续 Prerelease、latest=false，不自动转正。

## 修改与保护

1. 手动“停止后派发”只有在既有精确停止主动核实成功后，才允许把隔离受阻的旧执行移入历史。保留原 commandId、Worker、输出声明和已知日志路径；当前 job 转为无执行身份的隔离等待，不分配新 commandId。转交前继续在队列事务内核对完成事实、停止/召回意图及精确身份。ACTIVE_TRANSFER 解除后仍须本轮全节点声明路径实际不存在证明，文件存在须审核，未知继续阻断。全部受阻/保留不再返回 submitted，界面明确本批未派发。
2. 批量审核重载留下的 blocked + preparing 状态有显式“恢复中断审核”入口。只释放精确匹配的旧预约，保留阻断，重新查询传输及实际产物；活动派发/审核、命令/声明/预约或停止意图变化仍拒绝。后台不释放预约，不使用旧确认启动或清理。文件存在时沿用原安全审核，接受、取消及晚到变更均有覆盖。
3. 协议 2 完成事实无变化时传回原队列，走既有无写入路径，不再把 undefined 交给队列保存。快照写入器在前次失败后继续处理已经等待的最新快照，再传播原失败；不重放失败操作，不丢弃后续已排队完成事实，仍只保留一个活动和一个最新快照。
4. 低流量队列观察只新增明确的静默条件：全部为本机 cancelled 且用户明确保留产物或排除，没有 commandId、Worker、启动/准入/手动预约及停止/召回意图。运行、未知、待运行、缺失恢复对象和控制意图继续核实；显示和结果仍严格手动刷新。

显存预算、OOM、用户并行上限、已确认完成事实及产物安全检查保留。没有修改同步范围、全 Worker 校验、实际停止协议或文件清理执行器。远端 Python 生成物仅版本常量更新，未部署 Agent/Scheduler、运行科研任务、连接训练服务器传输或清理产物。README 与配置说明同步更新，保留既有入口。旧版本已带旧执行身份的阻断不猜测已停止，可从原手动派发入口再次精确核实后恢复。

## 验证与原始失败

- 新增断言先在 0.5.447 实现上复现：manualJobDispatch 21 通过/1 失败（submitted 而非 blocked）；outputIsolationRecovery 7 通过/1 失败（中断预约被拒绝）；serverAuthoritativeProgress 12 通过/2 失败（最新待写未处理、无变化返回 undefined）；verifiedCompletion 8 通过/1 失败（本机排除仍要求 Worker 观察）。完整原始输出和堆栈保留在本会话工具记录。这五个预期失败对应批准的四项缺陷，没有测试超时。
- 修复后定向文件均按单文件 `node --test --test-force-exit --test-timeout 20000` 串行执行：manualJobDispatch 22、outputIsolationRecovery 8、serverAuthoritativeProgress 14、verifiedCompletion 9、manualDispatchHost 11、serverQueueDispatch 14 用例通过。原有完成保护、精确停止、未知回执不重发、服务器自动选卡及产物阻断断言保留；无新增测试文件、性能压测或阈值，不修改既有超时。
- 必要编译退出 0，最后定向编译记录 `simple_cluster/reports/test-workflow/2026-10-30T09-18-41-483Z-86904-compile/`。期间调整原日志路径回退和受阻界面回执后，再编译并补跑相关定向文件；实现冻结后完整覆盖见下一项。
- 最终 `npm run package -- --max-parallel 1` 退出 0：318 个规定作业全部通过，按需未运行文件 0，maxObservedConcurrent=1。包含完整规定回归及 build 语法门禁；总耗时 678663 毫秒，完整检查 666923 毫秒。原始输入、清单、日志、包指纹与真实退出码见 `simple_cluster/reports/test-workflow/2026-10-30T09-18-51-844Z-50572-package/run.json` 及同目录。复用原生增量编译机制，组装消费同一验证输出。
- `npm run verify:package-runtime` 通过：311 模块、2 入口。精确 VSIX 清单 361 项，泄漏、缺失资源、README 违规均为 0。
- vm.Script 校验编译面板模块与真实渲染的 3 段脚本通过；git diff --check 通过。重载后 UI、真实科研任务和真实网络流量没有冒充现场验收。

## 精确包与交付边界

资产 `simple-experiment-0.5.448.vsix`，2771563 字节，universal，扩展 simple-local.simple-experiment，engine ^1.100.0。本机 VS Code 1.144.0 x64。

SHA256：`633ad9f5b2d0a50aecf41bca4e0fc582ff5fa744c1c535cdee98e22d1122d2d5`。同名 .vsix.sha256 绑定精确文件名。

试行地址：[v0.5.448](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.448)。提交并普通 fast-forward 推送后，发行绑定本次提交及上述同一包，实际下载比较字节，核对 tag/提交/资产，通过真实更新客户端确认权威 Latest 仍为 0.5.440 / 0.2.117，且不会对试行版推送降级。历史资产不覆盖。

发行核对完成后仅安装该包一次，不 force、不降级，立即核对安装版本及 simpleex，随后等待用户 Developer: Reload Window。各阶段以实际命令与回执为准，本文件不是尚未执行环节的成功回执。远端部署和权威版提升不在执行范围。
