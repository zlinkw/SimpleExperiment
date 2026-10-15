# 0.5.340 PLAN 多选提交

计划选择区域增加可滚动多选列表、全选筛选结果、清空选择和“运行所选计划”。当前单个 PLAN 与旧“运行全部计划”入口保留。隐藏在筛选结果之外的已选文件仍明确展示。

`SelectedPlanBatchHost` 冻结本轮明确路径，校验整个选择集合后逐项调用原 `runPlan` 流程。每个 PLAN 使用独立操作身份，复用同步、校验、预演和原有两次覆盖确认。失败、取消、未知提交结果或工作区/真实目标变化时停止后续项；已提交项不回滚、不重发。原 `runAllPlans` 的 `selectionOnly` / `planFiles` 分支允许 UI、API、CLI 共用，空列表不能回退成运行全部。说明见 `docs/plan-batch-run.md`。

- `npm run package` 最终 114 次串行单文件执行、751 项通过；实际渲染脚本与 vm.Script 校验通过。
- VSIX ZIP、身份、版本、平台、368 个 dist 字节、8 个 Python AST、运行闭包与秘密排除通过。
- 源码 `b5f569308de668586c31fdf934871c2f79a236da` 已普通快进推送并 fetch 核对 origin/master。
- 稳定发行 <https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.340>，绑定上述提交。
- `simple-experiment-0.5.340.vsix` 为 2,939,877 字节；SHA256 `eace9911acd19d97906df6d36b09fa2d9c7f8c0eb5a3077efa4cf4405067fec9`，同名 SHA256 资产已核对。
- 实际已安装 0.5.339 更新客户端读取真实 Latest、下载并核对公开安装包及配套 SimpleSFTP 0.2.90，与本机包一致。

0.5.340 未安装。发行后用户补充进度刷新、手动派发和 NWPU2 空卡问题，故将已验证多选功能与后续修复合并进 0.5.341，最终仅安装 0.5.341 一次。没有为验证启动或停止正式任务，实机点击验收等待重载。
