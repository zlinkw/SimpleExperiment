# G005 执行登记

上限 12000 字符，达到 10800 前归并。目标、用户决定、阶段与保护以 [G005 计划](G005-plan.md) 为准；G004 原记录保留，不作为本代开发前置。

## 当前状态

- P1：G004 专用历史复用选项及其组装凭据退出现行入口，旧闭包登记不再阻挡编译或组装；普通测试计划、日志、退出状态和当前凭据逐项校验保留。目标 runner 两项通过，额外旧闭包反例通过；未编译或完整 build。
- P2–P9：未开始。完整命令链、分支、GPU、删除、精简、面板、MCP 与交付均未完成。
- 当前不连接真实 Worker 或操作真实服务器、任务、GPU、传输及删除；六项原 dirty dist 和既有现场保留。旧任务不自动迁移或重派。
- 最终 build、试行发行、安装与用户重载后的真实 UI/MCP 验收均未执行。

## P1 验证

`test/features/testWorkflowRunner.test.js` 的 final profile、assemble 和产物变更拒绝目标用例通过，真实退出码均为 0；覆盖旧 G004 选项与凭据拒绝、当前凭据接受、缺项和输入过期拒绝、旧闭包状态不阻挡组装，以及测试后产物变化阻止打包。夹具目录保留。没有运行完整测试文件或编译。

实际命令均在项目根执行，原始输出保存在本执行会话工具记录；未另写日志文件：

- `node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'runner: (final profile rejects --only; --max-parallel capped; reuse removed|assemble refuses empty/short receipts item-by-item)' test/features/testWorkflowRunner.test.js`，退出 0，2/2。
- 增加旧闭包反例后，以上命令的 pattern 改为 `runner: assemble refuses empty/short receipts item-by-item`，退出 0，1/1。
- `node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'runner: package refuses artifacts changed after tests' test/features/testWorkflowRunner.test.js`，退出 0，1/1。
