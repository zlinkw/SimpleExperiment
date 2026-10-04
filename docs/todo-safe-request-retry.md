# 安全重试收口

用户确认：失败/取消记录不阻挡重试；同一传输先取消并核实退出；活跃 Plan 一次确认停止后重跑；未知远端结果不并发重发。

- [x] 阅读约束、检查 Git；保护两个 dirty pyc；核对已有 active guard、停止回执、SimpleSFTP 取消协议。
- [x] 三个结果同步入口按项目/动作/Plan 隔离；取消后等待传输控制器实际退出；未知结果保留最多 64 个待核实请求。
- [x] Plan 重跑一次确认，按精确运行身份停止，保留产物/历史；旧失败记录不参与占用。
- [x] 前端开放明确重试入口，旧请求回执不解除新请求 loading。
- [x] 串行回归（含 `planStopClear.test.js` 33/33 和 `tunnelClient.test.js` 5/5）、build、vm.Script；检查 UTF-8、pyc 与 diff。
- [ ] 补丁版本、package、安装一次；提交推送并核对 origin/master。

不删除文件、不清空历史、不绕过真实 active guard；不执行真实训练或取消用户现场任务。现场重试待重载后验收。

验证记录：前序逐文件通过 `safeRequestRetry.test.js` 9/9、`planSafeRetry.test.js` 9/9、`safeRetryFeedback.test.js` 2/2、`duplicatePlanSubmissionGuard.test.js` 10/10、`planSubmissionOwnerReconcile.test.js` 4/4、`planSubmissionVisiblePreflight.test.js` 19/19、`manualDistributedResultSync.test.js` 7/7、`panelMessageDispatch.test.js` 8/8、`sftpProgressWait.test.js` 2/2、`cancelRetry.test.js` 2/2。2026-10-04 依用户要求回检后，`planStopClear.test.js` 33/33、`tunnelClient.test.js` 5/5；内部 Webview 脚本测试 1/1，`npm run build`、`dist/ui/PanelHtml.js` 的 `vm.Script` 门禁和 `git diff --check` 通过。失败测试复核中发现最后订阅者取消时 AbortSignal 的 reason 没有传给底层 Worker fetch，已在 `TunnelClient.legacy.ts` 修复并加断言。此前约 20 秒超时记录保留；当前隔离用例完成约 75ms。两个 dirty pyc SHA256 与保护基线一致。

历史记录（2026-10-03）：`planStopClear.test.js` 的 `stopping during a hung fingerprint cancels that submission and a new one can enqueue` 两次在 20000ms 超时，其余 32 条通过。之后隔离第二个 host 的调度调用；2026-10-04 按用户新要求回检，该用例通过，整文件 33/33。原 timeout 作为历史记录保留，不再作为当前失败。

本批未完成，未递增版本、打包、安装、提交或推送；源码仍为 0.5.215。所有修改保留供后续定位。两个用户 dirty pyc 的 SHA256 与开始时一致；没有真实远端重试验收。
