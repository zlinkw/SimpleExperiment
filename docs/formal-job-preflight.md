# 正式作业启动前预检

0.5.286 修复 Worker 启动前的固定 10 秒总时长限制，以及 only-index 仍重复调用全部作业资产校验的问题。修改范围为插件、Scheduler 和 Agent；消费项目的模型、数据、权重及历史结果不变。

当前交付版本为 **0.5.288**，补齐 Scheduler 的任务 shell 环境核验。0.5.287 已补齐正式失败 job 的显式重排入口。2026-10-13 用户手动重新运行同名 AOEPT PLAN 时，提交操作 `plan-submit-runPlan|1791832616556|6167491056271724|runPlan|planFile=experiments/plans/comparison/aoept.yaml` 被本机 `FORMAL_JOB_CONFLICT: this declared directory is already registered` 拒绝；该次没有产生新的 Worker 失败作业。这是重复登记保护，不是 10 秒超时重现。

旧界面用 `job.attempt` 的真值决定显示重排按钮，正式 job 的内部兼容值 0 导致按钮隐藏。现改为完整 declared/globalJobId 身份，按钮为 **重新排队此 job**，不发送 attempt。进入原失败 Plan 的此按钮，经原 Worker 停止/身份、空输出核验及用户显式确认后，保留 workflow、globalJobId、revision、代码指纹和正式路径，生成独立的控制 command；旧 command 和拒绝证据存入历史。重排清除当前命令旧的 terminal/rejection 缓存；服务器返回已登记的原终态 command 时只作为历史，不与新 command 冲突。未记录、身份变动或仍活动的旧 command 继续阻断。

对同一目录创建另一个 workflow 的门禁保留。不要通过删除研究文件解决登记问题；已有权重/结果/失败文件仍阻断重排，本轮没有清理、重新排队或启动任何真实任务。新增 `formalJobRejectedRecovery.test.js` 四项通过，覆盖真实渲染脚本、旧/新回执合并、拒绝活动/外来/非空/过期目标、确认期间身份变化和取消。

实际修改源文件：`src/clusterAgentRuntime.legacy.ts`、`src/clusterSchedulerRuntime.legacy.ts`、`src/extension/legacy.ts`、`src/features/DistributedPlanQueue.ts`、`src/ui/PanelHtml.legacy.ts`、`src/api/LocalApiServer.legacy.ts`、`src/tunnel/WorkerTelemetryApi.ts`、`src/tunnel/TunnelClient.legacy.ts`、`src/runtime/RuntimeManifest.ts`；同步 package/lock 和生成 runtime/JS。回归夹具及相关协议测试随源码更新。

## 启动契约

`verified_formal_job_command()` 调用真正的 Scheduler `--formal-job-preflight --only-index <原索引>`，使用原 workflow、command、globalJobId、PLAN revision、代码指纹及声明路径。进程通过 `subprocess_inactivity_run()` 执行。

- stdout 只接受完整 JSON，最多 4 MiB；stderr 保留有界 32 KiB 尾部，并独立解析 `SIMPLE_PROGRESS`。
- 严格接受非负整数 `processedBytes` / `processedFiles`。全进程高水位增长才算真实进展；相同计数、倒退计数、改变 phase 的重复心跳和普通输出不续期。
- 连续 30 秒无真实进展终止预检。持续真实核验没有固定总时长限制。保留取消及进程组终止、等待回收，不以截断 stdout 作为成功 JSON。
- 全 PLAN 仍执行声明路径绑定、命令参数一致、越界及 CSV/正式目录唯一性检查；昂贵的项目 `validate_result_paths()` 只调用选中索引一次。普通 validate / dryRun 仍核验全部作业。
- 完整资产内容/SHA256、身份、checkpoint 来源、目录占用与协议门禁均保留。

## 只预检 API

每次调用前读取本机 discovery 和 live capabilities。以下是 JSON-RPC 的 method/params 示例，不是已经执行的生产操作。

```json
{"method":"tasks.preflight","params":{"workerId":"nwpu3","commandId":"8dff3bd0c52f7fa77cf1cbdb931da710"}}
```

该接口必须在已配置的 Worker 查到当前项目的原始失败任务，且有 `neverStarted=true` / `formal_preflight_rejected` 证据。Agent 使用持久队列冻结命令重新调用同一个启动前预检函数；拒绝改动身份、运行模式、路径、checkpoint 来源或活动任务。不重新渲染本机新 PLAN，不生成新 job/attempt，不上传、不训练、不重新入队、不修改原失败状态。原始代码证明以只读方式核验，不续写证明。

返回新的诊断 operationId，后续使用：

```json
{"method":"tasks.preflight.status","params":{"workerId":"nwpu3","operationId":"<返回的 formal-preflight-...>"}}
{"method":"tasks.preflight.cancel","params":{"workerId":"nwpu3","operationId":"<同一诊断 ID>"}}
```

取消只能命中该 Worker 的诊断操作，不能停止训练或 Scheduler。操作进度和回执进入插件诊断日志；研究文件保持只读。status 的 `payload.report.preflight` 应包含 `onlyIndex`、全 PLAN `structuralJobCount`、单元素 `assetValidationIndices`、`executionStarted=false`，外层同时返回 `queueChanged=false`。新版 Agent 的 `preflight-worker-task` capability 缺失时，提交前明确阻断。

## 回归与部署

新增 `formalJobPreflightProgress.test.js` 和 `formalJobPreflightFailure.test.js` 在真实 Worker admission → 子进程 → 提取的真实 Scheduler 路径上复现旧错误。真实资产分块读取/SHA256 与 stderr 进度超过旧总预算后仍可通过；重复心跳、倒退计数、停滞、取消、异常退出、污染 stdout JSON 和身份拒绝均阻断。六作业 PLAN 的 BUS/PAD 索引仅调用一个项目资产回调，跨作业 CSV 冲突仍在回调前拒绝。计时缩放仅在测试夹具，生产仍为 30 秒停滞。测试拆成独立文件并顺序执行，每个 Python 进程上限 10 秒，每个 Node 测试文件上限 20 秒。

`formalJobPreflightApi.test.js` 检查冻结拒绝身份、代码改动拒绝、零科研执行/队列写入、旧 Worker 阻断及诊断取消边界。测试使用临时项目，无科研训练、生产上传或清理。

构建后安装 Windows 插件 0.5.286；用户执行 Developer: Reload Window，再通过插件部署匹配的 Agent **和 Scheduler** 到 NWPU3/NWPU2。仅重载本机无法替换旧远端 Python。远端更新前不能把 validatePlan/dryRunPlan 成功算作启动前预检验收。

0.5.285 已包含完整 Python 修复；首次真实 API 验收发现本机诊断入口误用不存在的客户端方法，未发送远端请求。0.5.286 修正入口，并新增检查被调用宿主方法实际存在的回归。已按 VSIX 内 Python 字节对比确认 0.5.285/0.5.286 除版本常量外完全一致，所以已更新的 0.5.285 Agent + Scheduler 可用于本次只读预检；部署记录必须如实报告该版本组合。

## 真实 Worker 验收记录

2026-10-13 北京时间，用户重载并确认仅预检后，通过 live Local API `tasks.preflight` / `tasks.preflight.status` 顺序执行。没有调用 validatePlan/dryRunPlan 代替启动验收，也没有调用 runPlan、retry、同步或清理。

本机 Extension Host 0.5.286；live state 的 NWPU3、NWPU2 Agent 均报告 **0.5.286**、`declaredJobPaths=true`、`preflight-worker-task=true`，实际/预期项目根均为 `/data/qgking/zlk/MultiModal`。`declaredJobPaths` 由 Agent 检查 Scheduler 的正式路径协议及同版 runtime 后发布，匹配门禁通过。

原工作流 `distributed-plan-1791829693071-ryoqg8`，PLAN `experiments/plans/comparison/aoept.yaml`，revision `7a2f073ee01498a19cfb047247456e90a9edd14f82780bac09e4d842e3eeb35e`，代码指纹 `3e527bdce3c17a8f3e445538041e59ebcbab7bfe1ffd3cf58ca7c5e77336bc85`。

| Worker / 原作业 | 诊断 operationId | 真实回执 | 核验进度 |
|---|---|---|---|
| NWPU3 BUS index2 seed44，command `8dff3bd0c52f7fa77cf1cbdb931da710` | `formal-preflight-1791832459697-6ams9i` | completed / ok=true；结构 6 作业，资产索引仅 `[2]` | UTC 19:14:20–19:14:30；字节增至 1,610,359,857，文件增至 25,841 |
| NWPU2 PAD index5 seed44，command `f6e91841eaac8058bd5ed3762ecb1b68` | `formal-preflight-1791832504251-wf3vg1` | completed / ok=true；结构 6 作业，资产索引仅 `[5]` | 保留的事件窗口 UTC 19:15:15–19:15:40；字节增至 16,378,478,441，文件增至 11,516 |

PAD 诊断提交 ID 对应 UTC 19:15:04.251；status 最多取最近 200 事件，`startedAt` 是该保留窗口的首事件，不能当完整总时长。即使只用保留窗口，也超过旧 10 秒总预算，并以持续真实字节/内容核验通过。

两份报告完整保留原 workflow/command/globalJobId/revision/code/configHash 及 declared output/result CSV 绑定，均返回 `executionStarted=false`、`queueChanged=false`。这是 `verified_formal_job_command()` 调用真实 Scheduler 启动门禁的结果，并非仅模板验证。诊断不会把旧失败卡片标为完成或自动重派；生产训练本轮未执行。

验收后重新读取 `tasks.list`：原工作流全部六个作业仍为 failed / neverStarted=true / formal_preflight_rejected，保留原 10 秒超时错误、commandId、revision 和代码指纹，没有新增作业或成功状态。

本地验证实际执行：三个新增预检文件共 10 项通过；`subprocessInactivity.test.js` 9 项、`formalJobExecution.test.js` 6 项、`preflightDispatchRejection.test.js` 6 项、`localApi.test.js` 28 项通过。`npm run package` 内置构建门禁共 52 项通过，完成 TypeScript、node -c、额外 vm.Script 和 VSIX runtime closure 校验。未执行全仓库全量测试或科研训练。

既有 `planResultPathContract.test.js` 的通用夹具和缓存检查通过；依赖消费项目旧 `quality_composition/late_fusion.yaml` 的实机测试失败，因为该 PLAN 当前不存在，未伪装通过或改动消费项目来适配旧测试。

## 0.5.288 后续任务 shell 修复

用户随后自行提交工作流 `distributed-plan-1791833986160-p2fzbq`。只读 `tasks.list` 核实 BUS index0/1/2 在 NWPU3 running，PAD index3/4/5 在 NWPU2 failed。通过插件 `tmux.capture` 定位原 PAD index3 command `a1021796a28fcef81beeb2824f29196c` 的实际窗格 `%57`，读到连续五次 `conda activate /data/qgking/conda_env/zlk` 失败，原始错误 `/bin/bash: conda: command not found`；尚未执行项目 train.py。其正式目录中可能已有 Scheduler 身份、配置和失败日志，不能把 failed 当成空目录或自动清除。开发助手未提交、重派或停止这些科研任务。

Agent 预检用配置的绝对 Python 启动，而 Scheduler 的 `run_command()` 又包一层依赖 conda CLI 的 shell；两者环境不一致。Scheduler 现在与 Agent 一样优先使用已验证的环境目录 `bin/python` 和 PATH，不要求非交互 shell 存在 conda CLI。命名环境/不存在的前缀仍失败，未关闭身份、目录、checkpoint 或来源哈希门禁。统一 `formal_job_command_env()` 使预检使用原冻结命令的 condaEnv，真实执行也使用同一前缀。

完整启动预检新增无科研副作用的 stdlib shell 探针，比较实际解释器、sys.prefix 和原始身份 JSON；UTF-8 显式传递。stdout 上限 64 KiB，stderr 尾部 32 KiB，探针超时后回收子进程。这里的 8 秒仅限制轻量环境探针，昂贵资产核验仍采用 30 秒无真实进展检测，没有改回固定总预算。

另提供原失败任务的独立环境诊断：

```json
{"method":"tasks.preflight","params":{"workerId":"nwpu2","commandId":"a1021796a28fcef81beeb2824f29196c","environmentOnly":true}}
```

该可选模式仍核对当前项目、冻结失败 command 身份、PLAN revision、代码证明及原模式，只运行任务 shell，不访问/改写失败输出目录，不收养已有结果，不入队。报告明确给出 `environmentOnly=true`、`formalJobAdmissionChecked=false`、`executionStarted=false`、`queueChanged=false`，不能把它作为资产、checkpoint 或正式目录准入成功。默认完整预检仍仅接受 neverStarted / formal_preflight_rejected。Worker capability `executionShellPreflight=1` 必须来自同版 Agent/Scheduler 的协议标记，旧端点在 Host POST 前阻断。

本地实际回归：清洁 Git Bash 中无 conda CLI 的环境前缀及 `/bin/python` 路径可执行，中文、空格和引号路径保留；不存在的环境失败。真实 Python 子进程验证两份独立身份与 UTF-8；不一致 metadata、非法 JSON、超限 stdout、超时均拒绝并回收。独立已有 tmux server 的 GPU/普通启动身份回归两项通过。完整 Worker 启动回归、停滞/取消/JSON 流分离、结构六作业但仅一次资产回调及非空失败目录只诊断均通过；没有运行科研训练。测试临时夹具保留，没有删除研究或远端资产。

Windows 本机交付 0.5.288；**本节新增远端 shell 核验尚待部署后通过 API 实测**。需用户重载 VS Code，并通过插件更新 NWPU2 的 Agent 和 Scheduler 到 0.5.288。NWPU3 的三项正在运行的作业保持原状，等完成后再更新该 Worker。不得重派原失败任务来代替只预检验收，也不能将前节 0.5.286 的完整资产验收冒充本节新增 shell 验收。
