# 0.5.447 试行交付

基于试行版 0.5.446（`ef720e2d0e906d73e8efb2aabe2b76c47c1de023`），独立分支 `codex/trial-commit-guards-20261030`。用户确认三类问题全部修复。权威版仍为 SimpleExperiment 0.5.440 / SimpleSFTP 0.2.117；release-policy.json 未改。继续 Prerelease、latest=false，不自动转正。

## 修改与边界

1. 批量服务器排队逐个 PLAN 审核后，立即在最新队列事务保存已发现的产物阻断。后续 PLAN 取消、报错或配置变化，仅释放本批 preparing 预约，保留前面已保存的 ACTIVE_TRANSFER 等安全事实。整批提交前不发送已通过的子集。隔离恢复原有规则仍排除审核中的 manualDispatch 预约。
2. 手动派发在准备结束、停止原任务前及最终队列写入事务内重新验证精确任务绑定、PLAN 声明身份、完成事实及停止/召回意图。生产宿主使用现有队列写入租约执行最终验证和变更，拒绝覆盖审核期间的新状态。失败只释放原命令对应的 preparing 标记，保留其他任务的完成证据。不改变实际发送、显存预算、并行准入或停止传输协议。
3. metric show、compare 与结果查看/导出共用精确 ID 和唯一别名选择。多行别名报 RESULT_SELECTION_AMBIGUOUS 并返回候选，不再混合指标或随行顺序改变结果。唯一别名、无指标及比较缺值提示保持兼容。

README、配置说明、CLI 输出说明同步更新。显存/OOM、用户并行上限、已完成任务、产物安全及低流量严格手动刷新保留。远端 Python 生成物仅版本常量递增；未部署 Agent/Scheduler，未运行科研任务、连接训练服务器传输或清理产物。原目录和既有工作副本保留。

## 验证事实

- 必要编译 `npm run compile -- --max-parallel 1` 退出 0，记录 `simple_cluster/reports/test-workflow/2026-10-30T06-46-15-487Z-46284-compile/`。
- 定向文件均按单文件 `node --test --test-force-exit --test-timeout 20000` 串行执行：serverQueueDispatch 最终 14 用例、manualJobDispatch 21 用例、manualDispatchHost 最终 11 用例、simpleCli 18 用例全部通过。覆盖后续 PLAN 取消/失败/配额变化、审核及队列提交间的完成/停止/召回/声明变化、实际 Host 事务和序列化恢复、指标行顺序与缺值兼容。没有新增性能压测、性能阈值、测试文件或修改既有超时。
- 本轮无测试失败或超时。首次 git diff --check 发现 metric.ts 文件末尾多余空行，修正后通过；不把格式问题记为测试失败。
- 最终 `npm run package -- --max-parallel 1` 退出 0：318 个规定作业全部通过，按需未运行文件 0，maxObservedConcurrent=1。包含完整规定回归与 build 语法门禁。总耗时 667925 毫秒，完整检查 656785 毫秒。原始记录、输入、日志与退出码见 `simple_cluster/reports/test-workflow/2026-10-30T06-48-54-394Z-41912-package/run.json` 及同目录。
- `npm run verify:package-runtime` 通过：311 模块、2 入口。精确 VSIX 清单 361 项，泄漏、缺失资源和 README 违规均为 0。
- vm.Script 校验编译面板模块及真实渲染的 3 段脚本通过。未把用户重载后的 UI 和真实科研任务流程记为已验收。

## 精确包与交付

资产 `simple-experiment-0.5.447.vsix`，2770316 字节，universal，扩展 simple-local.simple-experiment，engine ^1.100.0，本机 VS Code 1.144.0 x64。

SHA256：`61f033b184c45d0ebcbbe5ee2df9908e2b62431fd1361660130197fb8838ace3`。同名 .vsix.sha256 绑定精确文件名。

试行地址：[v0.5.447](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.447)。提交并普通 fast-forward 推送后，发行绑定本次提交和以上同一 VSIX/SHA256；实际下载比较字节、核对 tag/提交/资产，并通过真实更新客户端确认权威 Latest 仍为 0.5.440 / 0.2.117、不会向试行版推送降级。历史资产不覆盖。

发行验证完成后仅安装上述同一包一次，不 force、不降级；立即核对安装版本及 simpleex，之后等待用户 Developer: Reload Window。各阶段以实际命令及验证回执为准，本文件不是尚未执行环节的成功回执。远端部署和权威版提升不在执行范围。
