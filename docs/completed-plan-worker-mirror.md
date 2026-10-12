# Plan 完成后的 Worker 产物同步

版本 0.5.284。复现基线为 f84e7fde / 0.5.283；保留原有两个 runtime `.pyc` 和测试辅助缓存。

## 根因及行为

此前关闭后台汇总时，`scheduleDistributedPostprocess` 与 `queueCompletedPlanArtifactSync` 被一起改成空函数。队列仍能识别 job 完成、重连及产物缺失，但这些事件没有触发 Worker 间传输。新增真实 Host 方法回归在修复前三项失败，完成 Plan 未发起任何镜像。

现改为一个正式 Plan 的全部 job 成功后统一同步到已启用 Worker。每个冻结 run 单独绑定项目、revision、代码指纹、globalJobId、commandId、来源 Worker、输出与声明 CSV；磁盘 PLAN 后来变更不会重写原完成身份。旧 attempts 只读保留，不进入新自动传输。失败、运行中、取消、不可用或恢复不完整的 Plan 不触发此同步。

通过现有 SimpleSFTP API 在 Worker 间压缩同步已完成 job 的独立目录内权重、日志、配置快照及结果，CSV 使用原声明路径。只读内存核验来源 `formal_job_owner.json` 的 SHA256、完整身份、checkpoint 来源及完成模式。自动同步不上传本机代码，不重建或发布汇总，不下载原始指标到本机，也不调用全项目合并、覆盖、清理或删除。

队列里的逐 job 镜像回执持久化。不同 Plan 和同时到来的完成事件串行合并，已完成镜像不会在每个轮询重复传输；离线节点不标成功，连接恢复后继续缺少的镜像。自动传输与代码/文件树/手动汇总互斥。传输前、分批前、传输后重新核查项目、完成身份、活动写入者、登记路径交叉和清理 hold；变化立即停止。不同内容的目标文件报 `FORMAL_JOB_MIRROR_CONFLICT`，保持原字节及失败重试时限。

产物状态比对与传输共用排除规则，PID、lock、exit_code 等机器状态不再造成已镜像 Plan 被误判不一致。项目同步范围页面仍比较用户选定的整个目录，历史产物、Worker 机器状态和不同代码版本的差异不会被自动覆盖；其红色计数不等于本次完成 Plan 的同步结论。该页面需点“刷新同步状态”取得新清单。

## 验证及边界

本地合成多 Worker 库存执行真实 Host 完成钩子、产物枚举、SimpleSFTP 请求契约、SHA256 校验、队列补丁及状态比对。覆盖全部完成与单 job 完成、并行作业独立 CSV、断线/持久回执/重连、事件合并、来源身份错误、目标冲突、项目切换、活动写入者、清理 hold、旧 attempt、磁盘 PLAN 修订及 train-only。没有连接生产服务器、传输生产数据、运行训练或清理用户文件。

完成同步回归 11 项、手动汇总边界 6 项、手动产物同步 25 项、队列恢复 20 项、产物状态 8 项通过。`idleGpuDispatchLifecycle.integration.test.js` 中本轮修改的 G4 完成钩子与版本门禁单独通过；扩展尝试该存量文件时，其余用例有 15 项失败，涉及旧 attempt 派发/重试夹具及 Python 提取缺少 `durable_plan_public_identity`。这些旧执行夹具不属于本轮自动镜像实现，未改生产执行逻辑来迁就它们；不将整文件或全套测试列为通过。

构建新增完成同步的强制串行门禁。交付须通过完整 build、Webview vm.Script、VSIX runtime 闭包及版本/包内容核对，再执行一次 install:latest。真实服务器吞吐、连接恢复后的实际复制及页面状态仍需用户重载后观察。本轮修复位于本机 Host，未修改 Agent/Scheduler 行为，也未实际部署 Worker。
