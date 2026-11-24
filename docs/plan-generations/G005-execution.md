# G005 执行登记

上限 12000 字符，达到 10800 前归并。目标、用户决定、阶段与保护以 [G005 计划](G005-plan.md) 为准；G004 原记录保留，不作为本代开发前置。

## 当前状态

- P1：G004 专用历史复用选项及其组装凭据退出现行入口，旧闭包登记不再阻挡编译或组装；普通测试计划、日志、退出状态和当前凭据逐项校验保留。目标 runner 两项通过，额外旧闭包反例通过；未编译或完整 build。
- P2：通用命令链正在修改，尚未形成可交付闭环；P3–P9 未完成。
- 当前不连接真实 Worker 或操作真实服务器、任务、GPU、传输及删除；六项原 dirty dist 和既有现场保留。旧任务不自动迁移或重派。
- 最终 build、试行发行、安装与用户重载后的真实 UI/MCP 验收均未执行。

## P1 验证

`test/features/testWorkflowRunner.test.js` 的 final profile、assemble 和产物变更拒绝目标用例通过，真实退出码均为 0；覆盖旧 G004 选项与凭据拒绝、当前凭据接受、缺项和输入过期拒绝、旧闭包状态不阻挡组装，以及测试后产物变化阻止打包。夹具目录保留。没有运行完整测试文件或编译。

实际命令均在项目根执行，原始输出保存在本执行会话工具记录；未另写日志文件：

- `node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'runner: (final profile rejects --only; --max-parallel capped; reuse removed|assemble refuses empty/short receipts item-by-item)' test/features/testWorkflowRunner.test.js`，退出 0，2/2。
- 增加旧闭包反例后，以上命令的 pattern 改为 `runner: assemble refuses empty/short receipts item-by-item`，退出 0，1/1。
- `node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'runner: package refuses artifacts changed after tests' test/features/testWorkflowRunner.test.js`，退出 0，1/1。

## P2 进行中

已在源码中开始替换 PLAN 声明、队列及任务窗口命令路径，尚需接通提交前检查、远端观察与受影响调用链，不能视为可运行或已交付。`node --test --test-force-exit --test-timeout 20000 test/features/declaredCommandPlan.test.js` 两次退出 0，各 1/1；为代码修改后的针对性检查，夹具保留。原始输出在本会话工具记录。

`node node_modules/typescript/bin/tsc -p . --noEmit --incremental false --pretty false` 首次退出 1，发现新队列类型及既有 dirty PlanCleanupHost 的类型错误；修正后一次退出 1（新增结构类型缺字段），补齐后退出 0。该检查不生成 dist，不代表 build 或完整行为通过。

`node --test --test-force-exit --test-timeout 20000 test/features/taskLifecycle.test.js` 在增加通用命令和完成事实断言的两次运行均退出 0、14/14；实际窗口执行未验证。增加假 shell 进程检查后，`declaredCommandPlan.test.js` 再次退出 0、1/1。原始输出在本会话工具记录。

继续接入假调度任务、来源凭据及观察后，`declaredCommandPlan.test.js` 目标文件再次退出 0、1/1；加入独立执行观察后 `taskLifecycle.test.js` 退出 0、15/15。相关调用均为本机夹具或替身，不是 Worker 验收。

进一步调整观察后 `taskLifecycle.test.js` 退出 0、16/16；扩大声明命令预演夹具后 `declaredCommandPlan.test.js` 退出 0、1/1。随后 noEmit 首次退出 1（WorkerProgressQuery 中集合元素类型推断为 unknown），补充真实字符串类型后同一命令退出 0。

移除科研输出门槛并保留实际命令的静态入口检查后，`node --test --test-force-exit --test-timeout 20000 test/features/staticEntrypointProbe.test.js` 最终退出 0、2/2，noEmit 退出 0。动态或项目外入口标记未检查；这些检查不运行科研命令。

加入 PLAN 命令与工作目录解析断言后，同一入口检查测试退出 0、3/3；`node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'PLAN validation fences project changes' test/features/mcpWorkflowHostSafety.test.js` 退出 0、1/1。当前通用调度链其余工作仍未完成。

会话状态检查首次误将 `/local` 后缀传给 UUID 参数，退出 1；用真实 UUID 修正后退出 0、角色 match、继续，无项目修改。

一次只读源码搜索的 PowerShell 重定向参数被外层展开导致解析失败；改用不带重定向的定向搜索，无项目修改。
一次准备分块暂存的命令因嵌套 PowerShell here-string 解析失败，退出 1、未更改索引；改用 pwsh 直接解释并检查补丁后暂存指定 Host 片段。
