# 本机停止意图与服务器任务状态

## 0.5.305：两条操作链主动回收废弃状态

“终止并清理”关闭原 commandId 的精确 tmux 标签后，直接从 Worker task snapshot、持久 job 队列、启动 claim 和 GPU 预约移除对应活动条目。所选 PLAN 的旧操作索引也退出列表；原始事件日志保留用于审计。只有稳定身份与少量取消 ID 保留为防重放记录，旧日志尾、进度和错误载荷不再留在活动缓存。

“覆盖并重跑”在已确认的精确产物删除完成后，调用现有 finalize-worker-operation 的 retireAbandonedState 模式回收原命令状态，然后才允许新提交。操作 ID 按清理批次与节点确定，断线重试保持相同 ID。元数据回收失败会保留 partial 与待处理节点，通过原清理操作继续，不能把删除成功冒充整个覆盖完成。恢复已删除目标的其他流程不触发状态回收。

本机真正移除操作载荷并持久化少量退役 ID；合并实时快照、离线快照和迟到回执时应用同一围栏。Worker 写 task、队列、claim 或 GPU 预约前也应用命令围栏，旧后台回调不能重新占位。任务归属审计由 retiredTasks 仅供清理证据读取，不进入普通运行队列；只有清理调用指定 retiredCommandIds 才返回精确记录，普通任务刷新不读取全部历史。原 PLAN、配置、日志、权重和结果不因状态回收被删除。

元数据回收只使用原 commandId、项目/Worker/工作流及当前任务/操作表，不遍历 /proc，也不使用“GPU 为空”推断其他 CPU 任务结束。真实活动任务、其他项目与新操作保留。产物永久删除仍走原精确路径双确认和文件安全保护。

operationRetirement.test.js 覆盖实际 Host 的磁盘载荷移除、重载/迟到回执、覆盖断线恢复、固定请求身份和并发队列保留；提取的实际 Agent 函数验证 task/queue/claim/GPU 晚到写入围栏。localStopControl.test.js 继续在隔离真实 tmux 中核验关闭后活动记录消失。需要用户重载本机并更新相关远端 Agent/Scheduler 至 0.5.305 才能验收新行为；开发不执行生产清理。

## 0.5.304：历史操作不充当活动锁

覆盖预览原先读取面板合并状态，把旧失败清理仍保留的 running 行，以及当前 runPlan 自身的提交进度，全部当成活动写入者。现在保留这些历史记录，但清理只使用 Agent 当前内存执行表、服务器任务快照与有效资源锁。资源锁检查仅排除当前异步调用的祖先锁，不排除同窗口独立调用、其他窗口或真实上传。Worker/项目精确归属保持区分，同路径的其他服务器不会误阻断。

Agent 的 worker/tasks 返回 activeOperations，覆盖同步请求与后台操作，执行成功或异常后立即退出表；重启后旧日志不复活为活动操作。只返回允许的身份与路径字段，凭据不出现在回执。旧 Agent 缺少此字段会显示覆盖范围说明，仍检查任务、资源锁及可见句柄，不用版本号或历史状态制造永久阻断；更新远端 Agent 至 0.5.304 才能获得完整实时执行表。

SimpleSFTP 0.2.80 将同用户不可读 /proc 进程报告为 PROC_VISIBILITY_LIMIT 预检说明，而非机器范围的文件锁。Linux 扫描只覆盖可见的同用户进程，不宣称不可读进程没有句柄。实际发现目标打开句柄仍报 ACTIVE_HANDLE；缺少 /proc、目标文件读取/权限失败仍阻断。精确路径预览及覆盖双确认会列出扫描限制。此处没有改变删除权限、所有权、完整指纹、活动任务、共享依赖和直接父目录保护。

cleanupActivity.test.js 验证真实异步资源锁调用链及提取的 Agent 执行边界；clearedOutputReplacement.test.js 在实际 Host 预览链重现旧清理和当前提交误阻断，并检查真实操作/上传仍阻断。SimpleSFTP cleanupHandle.test.js 使用本机 WSL/Linux CPU 子进程真实持有文件句柄，并覆盖不可读 /proc、进程退出竞态及后续活动句柄。没有接触生产服务器或删除真实产物。

0.5.303 修复三处独立问题：覆盖只查询活动队列而漏掉已清除的归属登记；受管理 Xshell 登录段打印 lifecycle JSON；停止错误地要求历史 revision、代码哈希、结果契约及停止后快照全部一致。

## 普通停止与终止并清理

本机发出开始/停止意图，服务器报告实际运行状态。停止保留原 commandId，不创建新的科研任务。请求使用现有 `stop-worker-task` / `stop-scheduler-operation` 路由及 `stopBoundary: local_command`，不按插件/Agent 版本号拒绝停止。新增协议能力为 `stop-worker-task-local-command`，旧 Agent 必须部署一次新实现才能执行该模式；磁盘更新不代表运行中 Agent 已更新。

服务器只检查稳定 Worker、项目、工作流、commandId 及实际标签页归属。PLAN revision、代码指纹、CSV、科研环境和 attempt 不作为停止门禁。通过原 task 的精确 pane/window 或窗口 command/project 标记定位；无任务缓存时仍可通过标记找到窗口。旧记录仅有共享会话且无法定位任务窗口时不关闭整个会话。新任务记录 command/project 窗口标记，支持缓存恢复。

停止先记录原命令取消围栏，再关闭精确 tmux window，重新读取实际清单确认消失，解除对应活动登记、启动 claim 与 GPU 预约。无 PID 信号、不关闭 Agent、SSH、平台入口或其他科研标签页。保持原始日志、模型、结果及归属审计；不删除缓存目录或共享状态文件。

停止意图未确认时保留本机队列，禁止该 command 重新派发。重连后用户重试同一目标；没有有效回执时不假报完成。晚到启动在启动边界再次检查取消围栏，已经创建的晚到窗格按该意图关闭。已确认停止的旧终态回执即使带陈旧 revision 也不恢复本机卡片；新的活动证据仍可见。

## 覆盖已清除卡片的正式产物

0.5.302 已清除登记实际保留了项目、workflow、revision、代码指纹、globalJobId、case、seed、输出及 Worker/commandId，但没有 CSV 和状态。恢复覆盖候选时，以新鲜、完整 Worker 消息补齐缺项，并逐项匹配保留的原身份。只生成内存清理视图，不重新保存执行卡片或收养旧结果为当前成功。新清除记录保留结果绑定和清理生命周期。

预览与执行仍复用 `plans.cleanup.*`，仅删除已证明独占的 job 输出、独立 CSV 和确认的同步副本。精确路径两次确认、全部节点预检、指纹、类型、直接父目录、活动写入者和共享依赖保护保持原样。源身份变更不能授权删除其他任务文件。执行围栏与删除结果写回原清除审计；部分失败不能重跑。

## Xshell 登录

只有受管理 Agent 启动段重定向到 `/dev/null`，保留原登录命令和转发设置。API 的完整 JSON 回执及 Agent tmux 日志保持可用。已保存的 V1 启动段在用户执行“准备 Agent”或“写入 Agent 自启动 RemoteCommand”时幂等更新，不在开发验证期间修改真实 Xshell 配置。

## 验证与边界

`localStopControl.test.js` 使用隔离的真实 WSL/tmux server 和轻量 CPU shell，测试陈旧版本字段、丢失缓存、重复停止、排队取消、不同项目、窗口重用、Scheduler 停止及其他任务保留。没有导入完整 Agent/Scheduler，也没有科研训练、GPU 或生产服务器操作。

`clearedOutputReplacement.test.js` 使用与实际 0.5.302 清除登记相同的夹具，覆盖只读归属恢复、消息过期/身份不符拒绝、真实 Host 预览/执行索引链、部分生命周期保存和卡片不复活。永久删除执行器继续由既有 SimpleSFTP 回归验证，没有清理真实产物。

`independentAgent.test.js` 在真实登录 shell 边界验证成功/失败启动静默、中文登录输出保留及旧 V1 幂等升级；直接 API 路径仍返回 JSON。

生产 Worker、旧卡片覆盖和 Xshell 登录 UI 验收需要用户重载本机并更新对应 Agent 后完成，本轮未自动部署或执行真实中止/覆盖。
