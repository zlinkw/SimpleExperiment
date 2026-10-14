# Worker 独立准备与任务启动

0.5.315 保留全部启用 Worker 的检查、同步范围、静态入口探针和目录创建。每台 Worker 独立核实当前任务与代码，完成实际同步和代码登记后即可参与调度；其他服务器继续准备。第一台就绪 Worker 执行一次共享 PLAN 校验和预演，普通无产物运行不再等待最慢服务器。未就绪节点不会收到新任务，其他节点失败不会把已接收的任务重新派发。

准备状态仅在本次操作内存中保存，绑定项目和代码版本，不代表远端执行状态。派发仍查询当前 Scheduler、tmux 和产物。服务器预排队保留已经接收的身份和原分配权重，新增就绪服务器可以接收尚未派发的任务。后台同步进度不能把已完成的提交按钮改回运行中。

覆盖删除继续执行整批精确路径预览和两次确认，删除前等待所有相关服务器准备完成并重新检查。单个节点查询失败不能被解释为目录为空；部分清除或未核实不能提交覆盖重跑。

实际任务只使用用户指定解释器、登录 shell、GPU 和任务身份。插件不扫描或哈希 nvJitLink、不重写 LD_LIBRARY_PATH、不比较继承的库指纹；旧 tmux 环境中的 SIMPLE_EXPERIMENT_NVJITLINK_PROOF 在任务边界清除。显式手动环境诊断入口保留，正常启动不调用。项目自身错误使用实际退出码和原始输出展示。

原生任务进程不再写辅助 Agent 的事件序号和旧事件日志。Agent 其他必要原子写使用每个进程和线程独立的同目录暂存槽，避免多个进程竞争同一个 seq.txt.writing；暂存槽不是作业状态来源。

启动清理检查必须读取真实目标。SimpleSFTP 在激活期间更换监听或令牌造成 capability GET 401 时，只重新读取 discovery 并重试该只读 GET 一次，不重放删除或其他写请求。读取失败只在审核页显示查询错误，不能弹出文件仍待删除的通知。确认目标不存在后结束该旧请求，不执行删除，也不保留已删文件清单。

2026-10-15 本机 0.5.314 日志核对：运行失败包含 NVJITLINK_PROOF_CHANGED 和 seq.txt.writing 的 FileNotFoundError；NWPU2 旧提醒对应的 2_concatenation_bus_p100_seed44 已通过 SimpleSFTP 确认不存在。通过 plans.cleanup.status 主动核对后，该请求已完成、待处理节点为空。本轮未删除真实文件、停止科研任务或重新提交原 PLAN。

回归入口：workerPreparationPipeline.test.js、distributedSchedulingModes.test.js、cleanupMissingTargets.test.js、planCleanupReconnect.test.js、planStopClear.test.js、nvJitLinkShell.test.js。后者使用实际登录 shell、隔离解释器、三个独立写进程及临时文件验证边界，不运行科研训练。实际服务器仍需更新运行中的 Agent/Scheduler 后验收。
