# SimpleExperiment 全插件稳定性与性能改进计划

> 保存日期：2026-10-03（Asia/Shanghai）。
> 本文为用户确认的完整合并版：全插件源码对照计划 + 长期灰屏专项 + Luna 执行交接。
> 文档最初仅保存计划；2026-10-03 用户授权开始执行。本轮承接工作区内尚未提交的安全重试批次。
> 执行状态：批次 0 deferred（按用户指示暂跳过 `planStopClear.test.js`；不得重跑该超时进程）；批次 1 的本地测试通过，SimpleSFTP 子仓库提交已推送。现场传输验证与发布门禁保留。

**补充结论：目前不能确认长期灰屏已经解决。审查时 0.5.215 的通信和渲染 ACK 正常，但 ACK 不能证明最终画面已经正确显示。**

## 1. 审查结论与范围

上一轮完成了 `src` 下 271 个源码文件、约 10.76 万行的结构扫描，并深入追踪运行调度、传输、结果发布、Panel、隧道、持久化、清理、通知和更新链路；同时检查了配套 SimpleSFTP 的关键实现，并与 GitHub 项目源码对照。结构扫描不等于逐行语义验证或全部运行测试通过。

**优先问题是取消完成判定、清理归属、持久化一致性和实际请求限流。** 这些边界不收紧，继续增加重试、缓存或恢复逻辑容易引入新的并发问题。

审查时源码基线为 `0.5.215 / cef3e436`。审查没有修改文件、执行远端操作或安装插件；既有未提交修改和两个 dirty `.pyc` 均保留。此前安全重试批次仍有一个测试超时，不能视为已交付。本文中的版本、行数、性能和 Git 状态都是审查快照，执行时必须重新核实。

审查区分三类证据：源码已证实的行为、已复现的功能错误、需要压力测试确认的风险。以下计划不宣称已经完成长期运行验收。

已有机制继续保留：显式渲染 ACK、单份未渲染状态背压、section projection/revision、局部 DOM 更新、队列磁盘签名与稳定显示快照、最新完成 run 权威、跨 Plan 打包、自动退避重连及最新完整产物保留策略。

## 2. 修改清单与源码对照

### P0：取消、重试与停止必须有真实完成证据

**已证实：** SimpleSFTP 的失败路径可以先从 `activeTransfers` 移除控制器，再终止进程、等待 `close`。当前安全重试通过“传输列表中消失”确认停止，因此仍存在旧传输尚未退出、新传输已经开始的窗口。

修改方案：

- 在现有安全重试机制上补齐 `cancelling → settled` 回执，分别记录取消请求、子进程退出、写入流关闭和远端状态。
- 只有 `settled` 才释放同目标互斥并启动替代请求；列表缺失、断线、取消 ACK 都不能单独证明退出。
- UI、CLI、API 共用请求身份和替换规则，避免只有三个界面同步入口受到保护。
- 失败历史保留为记录，不参与资源占用；已确认仍运行的 Plan 继续采用用户批准的“确认停止后重跑”。
- 跨窗口或重载后，通过持久化回执重新核实；无法确定时返回明确的 `outcomeUnknown`，禁止并发重发。

对照 [BullMQ `Worker.close()`](https://github.com/taskforcesh/bullmq/blob/b2aa09331e60ca92cefcf78cca7cf0b706dc7eb4/src/classes/worker.ts#L1271) 的等待完成语义，以及 [p-queue 的 `onEmpty/onIdle`](https://github.com/sindresorhus/p-queue/blob/180ab9e25cd10b6f548767d7176076b50d25e188/source/index.ts#L601)。采用其完成判定原则，不引入 Redis 或替换现有调度器。

### P0：清理必须绑定所有者，停止必须绑定运行身份

**已证实：**

- `cleanupSchedulerTmpForOp()` 通过文件名包含 operation/Plan 字符串寻找删除对象。
- Agent 状态清理以文件年龄和总体积为主要依据，缺少完整的活动任务归属判断。
- 遗留管理接口仍包含按进程名、tmux 前缀批量停止的实现；需要先验证路由可达条件。
- Git backup hook 的删除异常被忽略，仍可能返回“已删除”。

修改方案：

- 文件记录必须携带项目、operation、run、attempt、用途和规范路径；禁止通过字符串包含关系推断归属。
- 活跃任务、未确认停止任务、未发布事务和可恢复传输的文件始终受保护。
- 停止接口只接受可验证的项目、commandId、PID 启动身份或精确 tmux 身份；空参数不得扩大停止范围。
- 清理失败如实报告，不能返回成功。
- 完整文件/目录清理统一经过现有路径安全门禁和确认流程；历史文件先预览，永久删除仍需完整路径两次确认。

### P0：结果发布和关键状态写入形成可恢复事务

**已证实：** 当前结果表逐文件写临时文件、逐文件 rename，存在中途失败后不同表属于不同世代的窗口；部分其他状态仍直接写目标文件。

修改方案：

- 统一关键状态存储边界：读取版本、独立工作副本、校验、提交、冲突处理。
- 结果先写完整 generation，校验 runId、seed 覆盖和 hash 后，原子切换当前 generation。
- 插件读取当前 generation；兼容的固定路径 CSV 在发布锁内更新，并用事务记录支持失败恢复。
- 发布未完成时继续展示上一份可信版本；禁止混读新旧表。
- 保留现有最新 run 权威和旧 raw 可追溯语义，不重新引入 revision-only 或共享 CSV 存在即有效的判断。
- Host 关键队列写入补持久化保障；不退回非原子直接覆盖来绕过 rename 错误。

参考 [write-file-atomic 的同路径串行写入、fsync 和 rename](https://github.com/npm/write-file-atomic/blob/23e111d95367e1d987c1b4d7823791eaaf6b21df/lib/index.js)。多文件事务由项目自己的发布协议完成。

### P1：让请求预算真正限制负载

**已证实：** `RequestBudget` 当前主要处理暂停、隐藏、离线状态；并发参数没有形成实际并发上限，部分 Worker action slot 只计数。

修改方案：

- 分成紧急控制、普通控制和大文件传输三类队列。
- 初始默认：每 Worker 普通请求最多 4 个、全局最多 8 个；每 Worker 大传输 1 个、全局 2 个；停止与恢复核实保留独立控制容量。
- 相同只读请求合并；无订阅者的过期读取取消；不同项目和服务器保持独立推进。
- 同一操作只由一个层级负责重试，复用现有退避与 jitter，避免 Host、隧道和传输层叠加重试。
- 保留 500ms 队列 tick，通过缓存和请求合并降低请求量。
- 将排队时间、在途数、合并数和重试数加入 bounded diagnostics。

参考 [VS Code `ThrottlerByKey/SequencerByKey`](https://github.com/microsoft/vscode/blob/06a1c70075c89ce81acd39767b024e904c6d3066/src/vs/base/common/async.ts#L282) 和 [Google SRE 过载处理原则](https://sre.google/sre-book/handling-overload/)。上述数字是可配置的初始限制，性能收益以实测为准。

### P1：补齐流式通信背压与取消传播

**已证实：** 本地 API SSE 忽略 `response.write()` 返回值；现有事件数量限制不能限制慢消费者的字节积压。RPC 也缺少贯通的请求取消上下文。

修改方案：

- SSE 遇到写入背压暂停发送，等待 `drain`；限制每个订阅者待发送字节数和总连接数。
- 初始上限为每客户端 1MiB 待发送数据、每 API 实例 8 个订阅；溢出发送缺口标识并要求重新读取快照。
- 事件历史同时按条数和字节限制。
- 客户端断开取消只读计算；写操作继续以 operation 回执查询结果，不能因 HTTP 断开就假定失败。
- Agent HTTP/SSE 增加对应的连接、线程和输出队列压力测试，按连接类型分配容量。

依据 [Node.js 流背压机制](https://nodejs.org/learn/modules/backpressuring-in-streams)，避免将慢消费者转化为内存增长。

### P1：进一步削减 Panel Host 计算，而非重复重做前端架构

**已证实：**

- `buildState()` 仍调用日志保护更新，可能引起压缩、合并和状态比较。
- 状态合并会重建对象，而 section revision 部分依赖对象引用变化。
- Plan 摘要重复聚合；结果 catalog 缓存入口仍包含同步文件检查，缓存失效时执行同步读取。

修改方案：

- `buildState()` 改为纯快照投影；日志保护和缓存更新由对应数据事件触发。
- domain revision 在真实数据变更入口递增；未变化的容器保留引用。
- Plan 摘要按完整证据版本缓存，保持 projection 前聚合。
- catalog 在后台异步更新；状态明确标注加载中或旧快照，不能伪装成空结果。
- 使用 IntersectionObserver 缓存可见性，保留现有 offscreen dirty、强制导航和 pinned inspector 规则。
- 不增加通用虚拟 DOM，不放宽 heartbeat/stall 阈值。

参考 [GitLens Webview 的 session、取消及可见性管理](https://github.com/gitkraken/vscode-gitlens/blob/a3ab1179ac86a0d83cb35c63a0af9114a6003f99/src/webviews/webviewController.ts)。这里只借鉴生命周期边界，保留现有 Panel 协议。

### P1：传输采用有界压缩批次和可恢复发布

**已证实：** 跨 Plan 合并传输已经存在；当前 SimpleSFTP 的 `auto` 压缩主要等价 gzip，分组主要依据文件数量，流式解包会逐步改变目的目录。

修改方案：

- 保留按源/目标 Worker 合并多个 Plan 的能力。
- 打包同时限制文件数和字节数；默认每批最多 128MiB 未压缩数据，超大文件走独立分块。
- 压缩选择结合有限样本、CPU 时间和链路吞吐；文本优先压缩，低收益二进制允许原样传输。
- 保留 gzip 兼容；仅在双方能力协商成功时使用 zstd。
- 传输 manifest 记录文件 hash、已验证块和目标 generation；重试只补缺失或不匹配内容。
- 在暂存位置校验后发布，避免半成品被结果扫描器当作当前产物。
- 取消、重载和断线都复用同一传输回执，不新增另一套恢复状态机。

参考 [rclone 的有界分块并发](https://github.com/rclone/rclone/blob/9e27583e8045bfffd9016e231fa8bfcc215ef006/fs/operations/multithread.go) 与 [Syncthing 的 `finalClose/SyncClose`](https://github.com/syncthing/syncthing/blob/05b6704ef5080b8013c690b83b831d0dbedca5a0/lib/model/sharedpullerstate.go#L292)。不安装额外同步守护进程。

### P1：从源头减少临时文件和长期状态积累

**已证实：** 部分写入使用随机临时名；每窗口资源锁文件会持续留下；更新目录使用时间戳；PPT 请求审计文件逐请求生成。不能将这些全部视为可随意删除的垃圾。

修改方案：

- 将数据明确分为临时传输、恢复检查点、运行历史、审计记录和正式产物。
- 临时元数据优先驻内存；需要落盘的使用有所有权的固定槽位，成功 rename 消耗暂存文件。
- 资源锁注册表复用已验证闲置槽位；损坏记录按归属隔离，不能一个旧坏文件阻塞全部项目，也不能忽略未知活动锁。
- 日志和遥测采用有界环形记录；审计保留小摘要，完整导出由用户显式触发。
- 继续使用现有 `latest-complete`：新版本完整校验发布后，旧完整产物才成为清理候选；正在构建的新版本不覆盖唯一可用版本。
- 旧文件清理由安全预览统一处理，不新增周期性全目录删除器。

### P1：通知与操作状态解耦

**已证实：** `withUiCommandStatus()` 在发送最终状态之前等待失败模态框关闭；用户取消/被新请求替代的区分还依赖部分文案；Plan 失败去重集合没有完整的内存上限。

修改方案：

- 操作结束立即发送终态并解除按钮 loading，再独立调度通知。
- 使用结构化错误类别：失败、用户取消、被替代、配置错误、冲突、远端结果未知。
- 用户主动请求失败必须明确通知一次；后台批量失败合并通知。
- 父同步任务汇总子任务失败，避免逐 Plan 连续弹窗。
- 去重键包含项目、请求世代和错误码，并设置容量上限。
- 完成、失败、恢复均不自动跳转或滚动；只有用户点击“查看详情”才导航。

遵循 [VS Code 通知规范](https://code.visualstudio.com/api/ux-guidelines/notifications)，同时保留用户要求的主动失败提示。

### P1：生命周期、附属窗口与更新流程统一收口

**已证实：**

- 部分 activation 定时器没有统一托管。
- 同步 `try/catch` 包住异步调用，不能处理之后的 Promise rejection。
- deactivate 没有等待异步释放。
- TensorBoard proxy 关闭可能等待活动连接；PPT 响应累积没有明确字节上限。

修改方案：

- 项目、Panel document、代理窗口各有独立 cancellation/disposable scope。
- 定时器、监听器、请求和临时代理统一注册；释放后返回的资源立即关闭。
- 停用流程有界等待插件自有资源退出，保留远端正式训练。
- 图表关闭或失去订阅时取消读取；PPT JSON 响应增加大小与总时长边界。
- 初始化失败明确进入诊断状态，禁止空服务替身伪装初始化成功。

### P1：修复已复现的版本比较与更新资产选择错误

上一轮内存执行源码得到：

- `0.5.215-rc.1` 被判断高于 `0.5.215`。
- 未找到匹配插件的 VSIX 时，会退回选择其他名称的 VSIX。

修改方案：

- 使用标准 SemVer 比较，明确稳定版和预发布通道。
- VSIX 必须匹配 extension ID、版本和目标平台；缺失时停止自动安装。
- 下载采用有界流、超时和 hash 校验，验证包内 manifest 后才安装。
- 仅安装确实有更新的组件；同版本跳过。
- 更新文件使用可复用的受控暂存位置，避免每次创建新的永久目录。
- 配套更新部分成功时明确显示版本组合及重载要求。

比较语义参考 [node-semver `comparePre()` 源码](https://github.com/npm/node-semver/blob/main/classes/semver.js#L142)；将小型 SemVer 依赖显式纳入打包，不依赖环境中的隐式安装。

### P2：降低项目接入要求，逐步收拢架构

**已证实：** 通用契约仍默认包含 checkpoint、特定结果文件及四态指标路径；部分 service 类为空壳，核心逻辑仍集中在四个大文件中，约占源码行数的 63%。

修改方案：

- 提供三层能力：通用命令运行、可选指标采集、可选训练/checkpoint 能力。
- 最小接入只声明命令、工作目录、输入和输出；指标支持 CSV/JSON 字段映射。
- MultiModal 现有约定保留为兼容 preset，不要求其他项目采用四态指标或改训练内部代码。
- UI、CLI、API 使用同一 schema 和验证结果；接入检查区分必需项与可选项。
- 单 Worker 即可使用；复用现有服务器配置和动态隧道端点。
- 随上述批次逐步抽出请求协调、状态存储、结果发布和通知模块；旧入口作为薄适配保留。
- 修正文档与空 service 的不一致，不做一次性全仓迁移。

参考 [DVC Stage 的 command/dependencies/outputs](https://github.com/iterative/dvc/blob/56e59829512ff134aa269099a2099587b810b4dd/dvc/stage/__init__.py) 和 [MLflow ArtifactRepository 的存储接口](https://github.com/mlflow/mlflow/blob/0b1e3700e9ecdc88890791c2a9a549e4eea51053/mlflow/store/artifact/artifact_repo.py)。采用接口划分，不增加 DVC/MLflow 运行依赖。

## 3. 必须统一的接口与兼容规则

| 接口 | 确定行为 |
|---|---|
| 请求上下文 | 统一 project、requestId、目标资源、generation、取消信号；旧响应不能结束新请求 |
| 停止回执 | 明确 `cancelling/settled/unknown`；只有 settled 允许替代同目标执行 |
| 传输 manifest | 绑定源/目标、文件 hash、分块进度和发布世代；支持按已验证内容恢复 |
| 状态存储 | 工作副本与显示快照隔离；基于磁盘版本提交；冲突保留可信快照 |
| 结果发布 | 以 authoritative run 为世代，完整验证后切换；固定路径导出受事务保护 |
| 错误模型 | 稳定错误码、可重试性、结果确定性、所属父操作；文案不承担控制逻辑 |
| 能力协商 | 新协议通过 discovery 暴露；旧 Agent/SFTP 缺少退出证明时安全降级，不推断成功 |
| 项目契约 | 版本化最小 schema，加可选能力；现有项目不强制迁移 |

外部项目只提供实现依据。复制代码前核对许可证与署名要求；默认在现有模块内实现必要机制，控制新增依赖。

## 4. 实施顺序

每批处理 2–3 个相关问题，控制修改面；先补可复现用例，再改实现。

| 批次 | 内容 | 完成门槛 |
|---|---|---|
| 0 | 收口现有安全重试未提交批次，定位 `planStopClear` 超时 | 明确未释放等待点；不原样盲重跑，不延长超时掩盖 |
| 1 | SFTP 真实退出回执、统一请求替代 | 旧执行未退出时新请求绝不启动 |
| 2 | 清理所有权、精确停止、状态原子写入 | 不跨项目、不误删活动数据、失败不报成功 |
| 3 | 结果事务发布、最新完整版本及缓存切换 | 故障注入下无混合世代表 |
| 4 | 请求限流、SSE 背压、取消传播 | 并发与内存边界可验证，停止请求不被传输堵住 |
| 5 | Panel 纯投影、缓存与生命周期 | 未变化 section 不重算，关闭后资源回收 |
| 6 | 压缩分批、恢复传输、暂存文件控制 | 重试只补缺失内容，半成品不成为当前结果 |
| 7 | 通知、更新、附属窗口 | 无自动跳转、终态及时、错误资产不能安装 |
| 8 | 通用接入、模块边界、测试与文档 | 普通命令项目低成本接入，兼容现有 MultiModal |
| 9 | 全插件故障测试与长时间运行验收 | 提交真实指标及剩余问题，完成统一交付 |

通过验证的批次按项目规则独立提交、普通推送并核对 `origin/master`。最终交付再统一递增补丁版本、打包和安装一次，重载后进行现场验收。当前未通过验证的批次不得作为成功版本发布。

新增灰屏专项以 **5A、5B** 插入批次 5 后，详见第 6 节；原批次内容不删除。

## 5. 测试与验收

### 测试基础设施

- 修正测试入口可能并行执行、缺少硬超时的问题；逐文件串行，20 秒上限。
- 逐步将源码字符串切片 fixture 改为真实模块接口和可控时钟，优先覆盖此次修改链路。
- 保留 build、Webview `vm.Script`、实际内联脚本解析、runtime closure、UTF-8 和动态端点门禁。
- 建立 Windows 与 Linux 的对应单元测试；Python 只提取被测函数，避免完整运行 Agent/Scheduler。

### 必须通过的行为场景

- 同请求连续重试、取消 ACK 早到但进程晚退出、断线未知结果、重载后恢复、多窗口争用。
- 不同 Plan 可并发；同 Plan 真正 active 严格阻止；旧失败记录不阻塞新请求。
- run A/B 同 revision：只发布 B；BUS/PAD seed 完整；中途断电、磁盘满、rename 失败均不混读。
- 活跃文件超过 TTL 仍受保护；路径越界、符号链接、父目录核验失败都不能清理。
- 5Hz 状态更新仍最多一份未渲染 full state；不可见 section 不执行 model/DOM render；进入后只渲染最新状态。
- 至少 1,000 次取消/重试循环后，监听器、timer、队列、锁记录和临时状态不随次数线性增长。
- 慢 SSE 客户端、超大响应、断线重连、旧 generation 回执、压缩失败和分块恢复。
- 稳定版/预发布比较、错误 VSIX、损坏 hash、同版本安装及配套更新部分失败。
- 用户失败通知一次、取消不报错、按钮终态不等待弹窗关闭、任何后台事件不自动跳转。
- 普通命令、CSV 指标项目及现有 MultiModal 三类接入均通过。

### 真实性能验收

在相同工作区、相同历史规模和相同网络条件下记录修改前后数据：

- Extension Host/Webview 内存、CPU、事件循环延迟。
- payload 字节、字段归因、IPC 字节/分钟、ACK 延迟、section 渲染耗时。
- 每 Worker 请求数、最大并发、排队时间和恢复时间。
- 同步有效吞吐、压缩耗时、压缩率、重试重复传输字节。
- 临时文件数量/体积、锁记录数量、后台连接与监听器数量。
- 至少一次 8 小时真实运行，覆盖隐藏/恢复 Panel、项目切换、断线和重复操作。

性能改进以这些数据判断，不预先承诺百分比。最终报告必须分别列出代码验证、故障测试、MultiModal 现场验收和仍未验证的项目；未完成现场测试时不能宣称黑屏、同步或长期稳定性问题已经全部解决。

## 6. 新增：长期使用后整页灰屏专项

### 6.1 本次查到的真实情况

2026-10-03 约 03:20–03:21（Asia/Shanghai），通过本机 `panel.diagnostics` 取得两次只读采样：

| 项目 | 实际结果 |
|---|---|
| VS Code | 1.140.0 |
| SimpleExperiment 运行/安装版本 | 均为 0.5.215，构建身份一致 |
| Panel lifecycle | `ready` |
| 第一次 posted/delivered/rendered | `16040 / 16040 / 16040` |
| 第二次 posted/delivered/rendered | `16184 / 16184 / 16184` |
| 未渲染 outstanding | 两次均无 |
| 当前会话 lastFailure | `null` |
| 最近 ACK 延迟 | 两次分别 21ms、17ms |
| 单份 payload | 约 474–475KB |
| 最近一分钟 full-state | 211–215 份，约 100–102MB 序列化数据 |

这里的每分钟字节是 **Host→Webview 状态发送统计**，不能解释为服务器隧道流量。它表明背压有效，但前端仍持续接收较多重复数据；最大字段是 `distributedPlans`、`operations`、`diagnostics`。需要继续优化，不能把“没有积压”当成“资源开销已经很低”。

历史诊断中仍有 **0.5.207 的 `heartbeatTimeout`，约 10 秒后出现 `panelReadyWatchdogTimeout`**。这证明当时自动重建文档后仍未完成握手，但没有记录足够证据区分脚本阻塞、Webview 容器故障或 renderer 崩溃。

本次可读取的 VS Code 日志没有找到与公开案例相同的 titlebar 异常或明确 OOM 记录；这些日志也不足以覆盖原故障时刻。因此：

- 当前采样没有复现通信失活。
- 旧版本失败不能计为当前版本失败。
- **长期灰屏的根因尚未锁定，也不能宣布已解决。**

### 6.2 网络上确有相似案例，但必须按证据匹配

| 类别 | 公开证据 | 对本插件的处理 |
|---|---|---|
| Windows Webview 运行一段时间后变灰 | VS Code 1.137.0 有运行约 5–30 分钟后灰屏的报告，涉及 guest window 的 titlebar overlay 异常；修复 PR 已合并。[问题](https://github.com/microsoft/vscode/issues/335931)、[修复源码](https://github.com/microsoft/vscode/pull/336604/files) | 审查时机器为 1.140.0，且未找到同类异常，不能直接认定同因。外链继续通过 Host `openExternal`，不引入 Webview `window.open()` 弹出窗口 |
| 视图布局变化使 WebviewView 空白 | 打开 Terminal 后多个 WebviewView 变空白的上游问题已被确认。[案例](https://github.com/microsoft/vscode/issues/277136) | 将侧栏隐藏、移动、终端展开和窗口布局变化纳入真实 VS Code 验收 |
| 更新后的资源缓存失效 | 有报告指出原地更新后资源仍解析到旧扩展目录，出现 `ERR_FAILED` 和空白页。[案例](https://github.com/microsoft/vscode/issues/325767) | 本插件主界面目前以内联脚本为主，不能照搬该结论；继续校验构建身份，并补资源失败归因 |
| 资源耗尽、renderer OOM | 有高并发资源加载失败及 renderer 内存耗尽报告。[资源加载案例](https://github.com/microsoft/vscode/issues/326500)、[OOM 案例](https://github.com/microsoft/vscode/issues/323819) | 分开测 Extension Host 与 renderer；前者内存正常不能排除后者故障 |

上游案例提供排查路径，不作为本机根因证明。尤其不能默认通过清空 VS Code 缓存、禁用 GPU 或扩大堆上限处理所有灰屏。

### 6.3 本地代码存在的可观测性与恢复缺口

本次源码检查确认：

- `webviewStateRendered` 在 `render()` 返回后发送，能证明应用执行了渲染流程，**不能证明 Chromium 最终完成了像素合成**。
- 全局 `error/unhandledrejection` 统一发送 `webviewBootstrapError`，且整份文档只记录第一次；运行较久后的不同错误可能丢失。
- 错误监听与主程序位于同一大段脚本内，无法可靠捕获该段脚本自身的解析失败。
- `showPanelRecovery()` 仍向同一个 Webview 写恢复页；如果容器或 renderer 已失效，恢复页也可能无法显示。
- `retainContextWhenHidden: true` 保留整个隐藏页面；官方明确说明该选项有较高内存开销。[官方说明](https://code.visualstudio.com/api/extension-guides/webview#retaincontextwhenhidden)
- 全页 MutationObserver 会在 DOM 变化后重新扫描标题元素；界面还包含大面积模糊、透明合成效果。这些是需要削减和测量的工作量，尚不是灰屏根因证据。

### 6.4 新增预防和诊断机制

#### A. 分层故障记录，记录恢复之前的状态

复用 `panel.diagnostics`，增加轻量 `incident` 摘要：

- 会话、VS Code 版本、插件构建、view/document generation。
- 最后一次状态接收、DOM 渲染完成、动画帧探针、heartbeat ACK 的时间。
- Host 事件循环延迟、页面可见性、最近窗口布局变化。
- 错误阶段：bootstrap、runtime、DOM/layout、消息通道、资源加载、宿主进程证据。
- 原始触发原因、自动恢复结果、无法判断的项目。

运行时采用最多 64 条事件的内存环；故障时保存到两个固定、限额的诊断槽位。只保存摘要和脱敏堆栈，不保存完整 state、日志正文或 token。详细记录按需读取，不随每份 full state 发送，不因性能遥测触发 `postState()`。

#### B. 独立的小型启动保护层

在主脚本之前运行独立 bootstrap，记录 `scriptStarted → bridgeReady → firstStateReceived → firstRenderCompleted`。

bootstrap 独占 `acquireVsCodeApi()`，通过明确接口供主程序使用；提前安装错误和 CSP/resource failure 捕获。静态 HTML 保留基本加载文字，即使主脚本无法解析也不只剩背景色。运行期错误按签名去重并有界保留，不再一律归为首次启动错误。

#### C. 区分通信、DOM 和绘制健康

保留现有 ACK、背压与 stall 判断，增加轻量主容器几何尺寸、可见样式和帧探针证据。正常布局隐藏、零尺寸停靠区域和后台页面不得误判。

保持真正 heartbeat ACK 超时判断严格；不提高现有时间阈值。性能慢只记遥测。

诊断明确显示“通信正常、DOM 已提交、像素状态不可直接确认”等状态。Electron 的 `render-process-gone` 属于宿主层能力，普通 VS Code 扩展不能假装直接订阅该私有对象；相关证据从可用的宿主日志或隔离验收实例获得。[Electron 接口说明](https://www.electronjs.org/docs/latest/api/web-contents#event-render-process-gone)

#### D. 恢复入口必须在 Webview 之外仍可用

新增原生命令面板入口“复制 Panel 诊断”“恢复 Panel”，复用现有诊断和恢复实现。

保留现有一次自动重建限制；若重建后仍无握手：

- 停止递归重建。
- 通过 VS Code 原生通知说明具体失败阶段。
- 提供复制诊断、重新加载面板、用户主动重载窗口的入口。
- 不自动跳转、不停止训练、不重复提交任务、不清理项目结果。

如果整个 VS Code renderer 都已崩溃，在线通知也可能不可用；下次激活应展示上次异常退出摘要，而不是承诺任何情况下都能弹窗。

#### E. 降低长期驻留与合成负担

- 将全页标题扫描改为处理 MutationObserver 的实际变化子树，合并重复节点并限制单次工作量。
- 图表、观察器和定时器归属于 document/section，隐藏时解除非必要订阅。
- 恢复模式使用简单背景和低合成开销样式，取消大面积 blur、复杂阴影和过渡动画。
- 完整补齐草稿、筛选、滚动位置和当前区域恢复测试后，将默认隐藏行为改为可卸载上下文；每次重建分配新的 document generation。
- 保留显式兼容选项供必须常驻的场景使用，禁止保存完整 full state 到 `vscode.setState()`。

隐藏再显示只恢复界面和获取最新状态，不重放业务命令。

#### F. 用本次真实负载验证原计划的优化

以本次约 100–102MB/分钟的状态发送量作为一个已测基线，记录对应页面与工作区快照。重点追踪：

- 为什么大量 section 已判定 `signature-unchanged`，仍持续发送 full state。
- `diagnostics` 约 52.7KB 的哪些内容无需常驻传输。
- execution 历史是否可以保留轻量行摘要，仅在展开时提供详情。
- 时间戳、诊断计数和重建对象是否造成无业务变化的 revision 更新。

通过消除无效变更、减少数据和计算实现降负载，不用固定长间隔或周期性重载掩盖问题。

### 6.5 新增批次和灰屏验收

| 新批次 | 内容 | 门槛 |
|---|---|---|
| 5A | 故障分层、独立 bootstrap、原生诊断与恢复入口 | 主脚本解析失败、运行期异常、ACK 中断均能留下可区分证据 |
| 5B | 隐藏释放、观察器收敛、低合成恢复模式 | 状态恢复正确、无命令重放、资源数量有界 |
| 扩展批次 9 | 真实 VS Code 长时间与故障验收 | 同时检查诊断和实际画面，不能仅检查 ACK |

新增测试包括：

- 主脚本解析失败、运行期连续不同异常、CSP/资源加载失败。
- ACK 正常但主容器不可见、主容器被意外覆盖、DOM 存在但布局异常。
- 在隔离 VS Code 实例中暂停或终止 renderer，验证原生恢复入口及下次启动诊断；不操作用户业务窗口。
- 至少 100 次隐藏/显示、终端展开、视图移动、项目切换；验证草稿、滚动位置和 generation。
- 长时间空闲、高频状态更新、锁屏/唤醒、窗口最小化及远程桌面重连场景。
- 连续 8 小时验收中同时记录进程资源、通信、DOM 指标和定点画面；截图只用于验收，不加入生产高频监控。
- 保留并扩展 `panelRenderHealth`、`panelLifetimeRecovery`、`panelBootstrapRecovery`、`panelStaleDocumentHandshake`、`panelStateFlowControl` 等回归，逐文件串行执行。

最终结论分为三档：**根因已复现并修复、预防与恢复机制已验证、原现场暂未复现**。只有复现证据与修复验证对应起来，才能把“长期灰屏”标记为已解决。

## 7. 给 Luna 的执行交接与防误改说明

本节补充执行细节，不替换或削减第 1–6 节要求。用户本次仅要求保存文档；收到后续实施指令后，才开始批次 0。不要因为读到本文件就自动安装插件、启动实验、停止现场任务或清理文件。

### 7.1 先确认实际工作树，避免把旧计划当作当前事实

1. 主工作区是 `D:\GitRepo\MCP\zlk-cluster-orchestrator`。重新读取根目录 `AGENTS.md`、`docs/project-constraints.md`，执行 `git status`、检查分支与 remote。`AGENTS.md` 开头保留有旧路径文本，不能据此切换到另一个仓库。
2. 原有 [安全重试 TODO](todo-safe-request-retry.md) 包含未完成批次的详情；[既有稳定性审查记录](todo-plugin-stability-audit.md) 是前次交付记录，不代表本计划已实施。
3. [目标模式文件](target-mode-plan.md) 目前记录另一个已完成目标。本次没有激活或重写目标模式。后续若用户要求目标模式，先按该模式规则同步目标和批次边界；不要删除本完整计划或覆盖其他目标历史。
4. 原有代码、测试和生成文件已 dirty，不能 reset、restore、checkout 覆盖或全量格式化。不要将所有 dirty 文件一次性提交。每批先审阅现有 diff，识别属于本批的修改。
5. 构建版本、已安装版本、Extension Host 运行版本和 Agent/SFTP 能力分别核对。审查时安装的 SimpleSFTP 为 0.2.46；未来不能把此值当作强制版本或兼容依据。
6. 单独的 SimpleSFTP 工作区在审查时为 `D:\GitRepo\MCP\simple-sftp`。涉及取消回执、压缩、暂存发布时，先读取其自身规则和 Git 状态，再限定修改协议所需范围。它是独立仓库，不能在 SimpleExperiment 中伪造它未提供的能力。

### 7.2 当前未完成修改与真实阻塞

开始实施后，工作树包含安全重试新增模块：

- `src/core/SafeRequestRetry.ts`
- `src/features/PlanSafeRetry.ts`
- `src/core/SimpleSftpProgressWait.ts`、`src/extension/legacy.ts`、`src/ui/PanelHtml.legacy.ts` 的修改。
- 对应新增测试及若干旧 fixture 更新；部分 `dist` 已生成，但最新源码修改尚未完成最终门禁。

历史验证记录为：安全重试相关独立用例、build 和 vm.Script 门禁通过；`test/features/planStopClear.test.js` 中 `stopping during a hung fingerprint cancels that submission and a new one can enqueue` 在约 20015ms 超时，其余 32 条通过。用户已指示暂时跳过该测试并继续；本轮不重跑，也不把批次 0 标记为通过。

**不得假设只是 fixture 问题，也不得假设生产代码已正确。** 先静态追踪等待、取消和资源释放链，构造可控、局部的定位证据。遵守项目“超时停止、不重试”的规定；不要原样重复运行碰运气，不延长超时、不删除失败用例、不关闭并发保护来过关。用户允许本轮暂跳该测试，故批次 0 标记为 deferred；其余独立批次继续实施，最终明确列出该未验证项。

两个用户 dirty `.pyc` 必须保留。保存本计划前的 SHA256 为：

| 路径 | SHA256 |
|---|---|
| `dist/runtime/__pycache__/cluster_agent.cpython-314.pyc` | `D5FE48406C58309DE04D804FFB9D4F611F4350226D67BD78AC21C00EEFD09AEB` |
| `dist/runtime/__pycache__/cluster_scheduler.cpython-314.pyc` | `B6261FD32D49AF800DAB701DA24D2DAA4E9F982CCACDF30A73D00E82EED00C74` |

哈希仅用于核对，不是恢复或覆盖用户文件的授权。执行时若用户又修改了文件，以新基线为准。避免完整导入 runtime 或使用会重写这些缓存的验证命令。

### 7.3 入口定位表：按符号找代码，不按历史行号机械修改

| 子系统 | 首要入口与需要交叉检查的模块 |
|---|---|
| 请求重试与停止 | `SafeRequestRetry`、`PlanSafeRetry`、`SimpleSftpProgressWait`、`assertPlanNotAlreadyActive`、`reconcileStalePlanRunOperations`、SFTP `createTransferController/openMappedDownloadStream/transfers.cancel` |
| 队列与锁 | `DistributedPlanQueue`、`loadDistributedQueue/saveDistributedQueue/tickDistributedQueueCore`、`ResourceOperationLease`；保留 immutable display snapshot 与磁盘签名 |
| 结果与产物 | `ProjectResultTables`、`writeProjectResultRegistry`、`rebuildDistributedResults`、`retainLatestDistributedPlanOutputs`、`PlanOutputRetention`；复用最新 completed run 权威 |
| 隧道和流 | `RequestBudget`、`RealtimeTunnelClient.legacy`、`MultiEndpointRealtimeClient`、`LocalApiServer.legacy`、Agent HTTP/SSE；控制请求与长连接分开计数 |
| Panel Host | `buildState/flushStatePost`、`PanelStateFlowControl`、`PanelStateProjection`、`PanelPlanStatusSummary`、`PanelBuildIdentity`、heartbeat/ready/recovery 入口 |
| Webview | `PanelHtml.legacy` 的 render/section signatures/visibility/progress patch；`PanelBootstrap`、`PanelRecoveryHtml`；保持外层模板转义正确 |
| 生命周期与附属功能 | `extension/Activation`、`extension.ts`、`TensorBoardLocalProxy`、`PptPlotBridge.legacy`、`GitBackup`、`ExtensionUpdates` |

### 7.4 实现时必须守住的语义

- **取消等待不等于取消底层工作。** `Promise.race` 或 AbortController 触发不能单独证明进程和远端写入已退出。普通超时不能释放仍由未知执行占用的互斥。
- **相同请求和相同目标不是单一按钮名。** key 需包含规范项目、端点和操作目标；读请求可合并，写请求要依据资源冲突。兼容别名不能绕过同一 guard。
- **锁超时不是所有者已死亡的证明。** 固定槽位复用必须有互斥、所有者身份与代际验证；无法判断的旧记录隔离诊断，不能直接抢占。
- **整组结果并不因逐文件 rename 自动变成原子。** 插件内部读者必须按已提交 generation 读取；固定路径导出是兼容输出，崩溃恢复完成前不能声称整组原子可见。
- **只保留最新完整产物不等于立刻覆盖正在运行的 attempt。** 新版本未完整验证前保留上一份可用版本。旧 raw 元数据追溯、旧目录清理与当前表读取权限分开处理。
- **没有加载不等于真实空值。** projection 的 `notLoaded/omitted` 和真实空数据继续区分；所有 Plan 的轻量摘要仍基于未裁剪运行证据，不能因省 payload 把历史 Plan 标成未开始。
- **不要把历史 evidence、当前 session 和 pending generation 混在一起。** UI、诊断、测试都要分别标注；正常 lag 不等于 stall，ACK 不等于像素绘制完成。
- **`retainContextWhenHidden` 的改动是有前置门禁的。** 先验证草稿、筛选、滚动位置、隐藏期间更新、首次显示、旧回执拒绝和新 document generation；未通过前不得只改一个布尔值上线。
- **遥测不能形成业务更新回路。** 高频样本保留在 bounded ring，诊断页按需读取；不得因记录 sectionSlow、流量或 ACK 耗时再次 `postState()`。
- **不要改变正式训练或结果数学语义。** 用带明显 runId/outputDir/hash 区分的 fixture 验证，不能只用相同指标数值推断采用了新 run。
- **清理与诊断采样都要有上限。** 第 6 节每个持久诊断槽位上限设为 256KiB，原生通知按 incident 去重；不创建每秒一份的诊断文件或截图。未知证据标记 unavailable，不编造数值。
- **保留旧公开入口。** 内部可以抽模块，UI/CLI/API alias 保留兼容；不要用空 service、catch 后假成功或强制覆盖绕过失败。

### 7.5 批次验证及外部依赖规则

- 先 `rg --files test` 定位实际文件；下面名称用于导航，不保证未来路径不变。
- 批次 0/1 优先：`safeRequestRetry`、`planSafeRetry`、`safeRetryFeedback`、`duplicatePlanSubmissionGuard`、`planSubmissionOwnerReconcile`、`planSubmissionVisiblePreflight`；`planStopClear` 按用户指示暂跳且不得重跑本次超时进程，保留未验证记录。
- 队列/结果优先：`distributedPlanQueue`、`distributedQueueStartup`、`distributedRerunAndWorkerDelta`、`pendingResultMetricSync`、`projectResultSyncCompleteness`、`projectResultTables`、`runCompletionResultRefresh`、日志身份相关用例。
- Panel 优先：`panelLifecycleDiagnostics`、`panelMessageDispatch`、`panelStaleDocumentHandshake`、`panelStateProjection`、`planSelectorStatus`、`panelProgressDom`、`panelRenderHealth`、`panelStateFlowControl`、`panelStateProgress`、`panelLifetimeRecovery`、`panelUnknownHealthRecovery`、`panelWebviewScriptHealth`、`panelBootstrapRecovery`。
- 逐文件使用 `node --test --test-force-exit --test-timeout 20000 <单个文件>`。禁止同时运行 Node/Python 测试，禁止一开始跑宽泛 `npm test`。
- 相关目标测试通过后，按项目规则运行 `npm run build` 和 `node -e "new (require('vm').Script)(require('fs').readFileSync('dist/ui/PanelHtml.js','utf8'))"`，并保留实际 HTML 内联脚本解析测试。只验证外层 JS 文件不能替代内层脚本门禁。
- 此处 20 秒限制针对单个测试进程；8 小时 soak 是独立的显式验收阶段，不能伪装成已通过的单元测试，也不能通过扩大上述测试超时实施。
- 调整默认并发和压缩参数前记录 workload、文件类型、页面兴趣区域和链路条件。128MiB 是批次字节边界，不是允许一次性把 128MiB 全读入内存。
- 外部源码大多已固定 commit；浮动链接执行时记录实际 commit。Issue 作者的推测不是本机证明，检查是否已有上游修复。复用源码先核对许可证，禁止引入 Redis、同步守护进程或通用前端框架作为默认依赖。
- 本机、Agent、SFTP 和不同版本组合均需兼容测试。能力缺失时明确安全降级，不能按版本字符串猜测回执字段存在。
- 现场 API 每次先读 discovery 和 live capabilities/openapi，端口及根目录来自实际配置；只通过 SimpleExperiment/SimpleSFTP 执行运行或传输。保留精确目标与必要确认。
- 不在用户工作窗口注入 renderer 崩溃，不自动禁用系统 GPU，不自动清空 VS Code 全局缓存，不私自中止现场训练。无法取得真实现场条件时保留“未验证”，继续完成独立可验证的工作。

### 7.6 进度维护与交付

执行顺序固定为 `0 → 1 → 2 → 3 → 4 → 5 → 5A → 5B → 6 → 7 → 8 → 9`。每批限定 2–3 个相关问题、最多 8 个源码/测试/文档文件；生成构建文件不计入该数。更大批次拆为子批次，不悄悄扩范围。

本文件第 1–6 节保留作为验收基准。执行时维护下表，每行只记录最新状态、证据位置/命令摘要、真实 commit、剩余门槛；详细历史由 Git 与相关既有 TODO 保存，不不断创建新的临时总结文件。状态只用 pending、running、blocked、passed、failed、deferred；功能实现通过而现场未测时，在剩余门槛明确记录，不能把总验收勾完。

| 批次 | 状态 | 最新证据 / commit | 剩余门槛 |
|---|---|---|---|
| 0 | deferred | `planStopClear.test.js` 32/33，单项约 20 秒超时；用户指示暂跳并继续，按 P0 不重跑 | 该项保持未验证；不阻断独立批次 |
| 1 | passed | SimpleSFTP `b2e39f9` 已推送至 `origin/master`；SFTP 回执/流关闭测试通过；主仓安全重试测试、build、vm.Script 通过 | 两插件组合的真实传输/重试验收与最终版本打包安装 |
| 2 | passed | `9d15ef7` 已推送 `origin/master`；`schedulerAtomicWrite` 1/1、`schedulerStateCleanupOwnership` 2/2、`stopSchedulerIdentity` 2/2、`abortSchedulerStopRouting` 5/5、`tmuxCloseRuntime` 1/1、`cacheCleanupPanel` 1/1；build、vm.Script、生成 Agent/Scheduler AST 通过 | 真实 Worker 路径和双确认 UI 操作留待重载后的现场验收；`planStopClear.test.js` 保持 deferred |
| 3 | passed | commit `22d12add`；`ProjectResultPublication` 支持 SHA256 校验的多文件暂存、失败回滚/崩溃恢复、注册表最后提交及 generation 冲突拒绝；`projectResultPublication` 6/6、`projectResultTables` 18/18、`projectResultSyncCompleteness` 16/16、`pendingResultMetricSync` 26/26、`runCompletionResultRefresh` 1/1，build、Panel inline `vm.Script` 门禁通过 | 双窗口竞争与 Extension Host 崩溃恢复留待现场验证；批次 0 的 `planStopClear.test.js` 仍按用户指示 deferred |
| 4 | running | SSE 子批次 `02d1a3db`、RPC 取消 `fac2dbe4`、SSE 异常清理 `f392be06` 已推送；`localApiSseBackpressure` 3/3、`journalGapSnapshot` 1/1、`localApiRequestCancellation` 1/1、`localApi` 28/28、build 与 Panel `vm.Script` 通过。请求预算实现及 `requestBudget` 11/11 已验证；`multiEndpointRealtimeClient.test.js` 集成用例超时，前置并发断言通过；清理循环已修正，因 P0 未重跑，修订版仍未验证 | 请求预算集成用例保持未验证；Agent HTTP/SSE 压力待处理；现场压力测试待 Extension Host 可用 |
| 5 | pending | 未执行 | Panel 计算与生命周期 |
| 5A | pending | 未执行 | 灰屏证据、bootstrap、原生恢复 |
| 5B | pending | 未执行 | 隐藏释放与资源回收 |
| 6 | pending | 未执行 | 压缩分批、断点恢复与发布 |
| 7 | pending | 未执行 | 通知、更新与附属窗口 |
| 8 | pending | 未执行 | 接入契约及架构边界 |
| 9 | pending | 仅有第 6.1 节短时只读采样 | 全插件回归、现场与 8 小时 soak |

每批先审阅 diff，仅提交属于已验证批次的文件。用户 dirty `.pyc`、运行报告和其他未审阅修改不得混入。按当前仓库规则向已核实的 `origin/master` 普通推送，fetch 后核对；上游变化、冲突、凭据或 hook 阻塞按规则停止，不自动 rebase/merge/force push。若用户的新指令将范围限定为“只保存文档”，该轮到文档保存与检查为止，不启动上述代码批次。

发布时重新确定版本，禁止盲目写死下一版本号。统一打包验证后仅安装目标版本一次，核对安装和 CLI，再等待用户重载；之后才进行新 Host 的现场验收。不能将未重载的旧 Host 数据作为新实现的验证。

不要自行开新聊天、派生子代理或切换模型。用户会把本文交给 Luna；执行中需要交接时保留本表与证据，让下一位可以从真实状态继续。
