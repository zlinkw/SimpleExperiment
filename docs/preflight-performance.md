# 0.5.293 启动前核验提速

## 核验阶段

0.5.292 在入队、候选出队、Agent 启动和 Scheduler 执行四个阶段调用昂贵的项目资产校验。GPU 繁忙时，候选出队还会不断重复该回调，并逐 job 启动 Scheduler、采集 GPU。前台等待每次操作状态读取也可能附带全量运行日志及 tmux 存活诊断。

0.5.293 保留两次新鲜资产核验：Agent 真正创建任务进程前一次，Scheduler 进入 writer 前一次。入队只核查完整身份、原 PLAN revision、全 PLAN 路径唯一性及声明绑定、输出占用和 checkpoint 归属，不导入项目资产回调或执行 torch 环境探针。入队回执明确 `startupPreflight=pending`，不代表资产、任务环境或训练已经成功。启动前拒绝保存原 commandId 和 `neverStartedEvidence=formal_preflight_rejected`；网络或启动结果不明仍保持 unknown 与所有权。

繁忙队列使用每轮一次的 GPU 提示快照，跳过尚无产物的等待 job 的 Scheduler 子进程。已存在的输出、owner、完成标记仍优先核验，不能借忙卡隐藏目录冲突或完成文件哈希变化。提示快照只能决定等待；真正派发仍重新读取 GPU 状态并执行原资源预留门禁。GPU 状态变化不能用旧提示启动任务。

`--formal-job-structure-only` 只适用于只读 `--formal-job-preflight`。真实执行不能用它跳过资产校验。只测试任务的 checkpoint 验证也保留，避免在同一 Scheduler 中额外重复整个资产回调。三种运行模式、声明路径、单写者、来源哈希、患者隔离和完成指标门禁均保留。

前台终态等待只读取对应 operation 状态；不在每个 500 ms 轮询间查询全部日志或 tmux。后台 watchdog、原停滞计数、取消、未知回执核对保留。没有扩大 HTTP 超时，没有对写入请求盲重试，也没有更换原 commandId。

## 原来源的只读诊断

`tasks.preflight` 仍使用失败任务的冻结身份，不入队、不重派。0.5.293 对原来源执行 SHA256 内容检查后才进入任务环境探针，不因 mtime 单独变化误判字节改变。此检查只允许诊断，不更新或续期原同步证明；真正调度仍拒绝陈旧 stat 证明。

新登记的证明保留原 manifest 的 SHA256。历史证明仅能使用其原 manifest 或已保存的 SHA，且必须重新验证 manifest digest 等于原任务 codeFingerprint。缺少原 SHA 时返回 `CODE_SYNC_ORIGINAL_HASH_UNAVAILABLE`，不能采用当前文件的 SHA 伪造原来源。内容改变仍拒绝。成功回执有 `sourceContentVerified=true`、`proofRenewed=false`、`executionStarted=false`、`queueChanged=false`。

## 回归范围和限制

`test/features/preflightStages.test.js` 通过真实 Agent 函数及独立 Scheduler 子进程验证：三条等待作业、三轮忙卡检查均不运行资产回调；每轮只采集一次 GPU 提示、不启动 Scheduler；Agent 真正启动边界及最终 Scheduler 路径分别执行一次新鲜校验；后续资产变化在 tmux 之前拒绝；空闲提示过时不能授权启动。训练入口和 tmux 在夹具中关闭，未运行科研训练。测试同时覆盖前台状态轮询没有额外全量核对、只读来源核验区分 metadata 与字节变化。

原进展回归仍通过：只有选中 job 执行昂贵回调，全部 PLAN 仍检查路径；真实增长超过旧 10 秒限制可继续；停滞、重复心跳、递减计数、取消、异常退出、非法 stdout JSON 和身份拒绝仍阻断。拒绝消息回归覆盖丢失回执、重载、繁忙 GPU、外来身份与不确定 HTTP 结果，禁止重复派发。

环境 shell/ELF/tmux、取消回收、UI 语法及包装校验属于 package 构建门禁。完整历史测试全集未运行；单文件测试串行且各有 20 秒退出门禁。合成资产的回调次数减少不能代表生产资产读取的具体秒数；远端整体耗时需部署后实测。

2026-10-13 只读 API 核对：NWPU2 原 command `f352ab9e6f9d8ec5abda7ca22a5f7dfb` 仍为 failed，PLAN revision `d92152424d0ce4a55494d5a8778526f6ec69552350b72dcc612c99bd2c76c478` 与 codeFingerprint `6b9b0407b31ba8dc6215ab84ab1c86a5d76730c6a91593f1ff3ed5beb5b422f2` 保留。没有重派、同步研究源码、清理、训练或覆盖产物。任务快照没有活动 job，不等于远端 GPU 无其他用户进程。

## 部署与待验收

Windows 扩展、Worker Agent、Scheduler 目标版本均为 0.5.293。本机重载后，通过插件更新需要使用的 Worker 与 Scheduler；`stagedJobPreflight=1` 表示远端具备提速阶段，`originalSourceHashDiagnostic=1` 表示具备原来源只读内容核验。旧 Worker 继续原行为，不能宣称远端已提速；混合 Agent/Scheduler 版本仍按现有版本绑定拒绝。

NWPU2 在 0.5.292 的实际环境诊断被原 wrapper 的 stat 证明提前阻断，尚未到 nvJitLink/torch 导入。0.5.293 安装后，需用户重载并更新 NWPU2 Agent、Scheduler，再使用原冻结 command 的 `tasks.preflight(environmentOnly=true)` 仅核验导入/CPU。若原 SHA 或 revision 不可验证，继续明确阻断。不得为验收环境而改源文件、刷新旧身份、同步、重训或清理。
