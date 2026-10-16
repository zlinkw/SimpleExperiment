# 0.5.361 进度独立轮询与日志扫描收敛

## 本轮现场复现

2026 年 10 月 17 日北京时间，通过 discovery、实时 capabilities、SimpleExperiment 与 SimpleSFTP API 只读核实。Extension Host 与磁盘安装均为 0.5.360，SimpleSFTP 为 0.2.91。nwpu3、nwpu2、nwpu5 的实际 Agent/Scheduler 均为 0.5.360。H20 jqg_zlk 的生命周期检查返回 unhealthy，专用窗口为 @200，identity、runningVersion、schedulerRuntime 为空；不能用文件版本或隧道通畅推定进程身份健康。此次未直接 SSH、部署远端服务或控制科研任务。

同一 commandId `12a6bad01552b615bb3401b85abea391` 的真实边界如下，表内为 UTC，北京时间加八小时。

| 边界 | 时间或证据 |
| --- | --- |
| 本机诊断请求开始 | 2026-10-16T17:55:28.675Z |
| 执行请求本机发起 | 17:55:28.703Z |
| 实际进入执行网络请求 | 17:55:28.704Z |
| 执行观察收到 | 17:55:36.535Z，耗时 7831ms |
| 产物请求发起、进入网络 | 17:55:36.544Z、17:55:36.547Z |
| 产物核实收到 | 17:55:41.998Z，耗时 5451ms |
| tasks.list 返回 | 17:55:43.976Z，diagnosticsPending=true，15 秒元数据轮次已超时 |
| 上一份日志证据 | 17:48:47.860Z 发起，17:48:50.721Z 失败；没有有效日志网络观察时间 |
| UI 状态轮转 | 17:55:28.749Z completed/exited/complete；17:55:34.105Z unknown/unknown/complete；17:55:35.173Z unknown/unknown/unverified；17:55:37.298Z unknown/exited/unverified；17:55:42.754Z completed/exited/complete |

判定阈值仍为 20000ms。上述 UI 过期来自上一轮证据，在 17:55:28 开始的新请求尚未收到执行观察时发生，不能把该新请求的时间补成旧证据的实际年龄。17:56:03.445Z 的内存诊断明确给出当前执行 networkStartedAt=17:55:59.754Z，receivedAt=17:55:59.858Z，publishedAt=17:55:59.864Z，年龄 3691ms；产物 networkStartedAt=17:55:48.251Z、receivedAt=17:55:54.896Z、publishedAt=17:55:54.901Z，年龄 15194ms；日志为查询失败。远端 observedAt 比本机慢约 33 秒，仅作诊断，不参与本机年龄计算。

另一实际返回中，该命令扫描 bytesRead=524288、totalBytes=7168358，state=scanning、scanComplete=false。产物已完整、native 窗口退出码 0，但不能据此把未扫描完的日志补成无异常。该次 tasks.list 本机完整响应为 626633 字节；这是本机 API 响应大小，不能冒充 SSH/Worker 网络流量。

同一时段，四个 Worker 遥测 API 可返回当前 GPU 样本，diagnostics.realtime.endpoints 却均为 disconnected，部分 lastError 为 WebSocket closed。启动时 client 尚无 probe capabilities，原实现默认尝试 WebSocket，异步关闭发生在 connect 已返回后，绕过 SSE 后备路径。这是事件流状态错误，不是隧道关闭的证据。

## 修复边界

- 执行库存有独立共享请求与刷新通道；元数据轮次仍保持 15 秒预算，原 20 秒 TTL 不变。元数据调用加入同一执行请求，避免重复 inventory；所有证据沿用真实网络时间。执行失败只标记执行未知，保留独立产物与日志观察。
- 每 Worker/连接换代一个有界日志队列，最多 256 个精确运行身份、一个在途批次。成功收到某批元数据后立即安排日志，不等待全轮元数据完成。连续刷新只更新同一精确运行的最新接收者；增量扫描有进展时轮转继续，无进展或失败等下次主动查询。迟到响应仍按各证据时间归并，旧连接、旧工作区不能发布到新上下文。
- Agent 原始日志在服务器进程内按 256KiB 读取，单次最多 8MiB、每个读取块后检查 1 秒计算预算。NFS 单次阻塞读取本身不能被该计算预算打断，网络层仍有原有无进展超时。终态文件改变会重置扫描；保留异常检测、commandId/runId、精确日志路径、按任务互斥及非零退出保护。
- 进度请求仅携带身份、声明路径和 manifest 核对必需字段，不回传缓存 observation、异常全文或启动源载荷。新 Agent 的 compact 响应仅返回身份、判定、异常计数/类型和扫描进度；显式日志分析入口保留完整详情。旧 Agent 可忽略 compact，主机侧独立轮询和持续扫描仍兼容。
- Worker 未明确声明 WebSocket 支持时使用 SSE；独立 GPU 查询变慢不撤销已打开的事件流。认证错误与真实事件流关闭仍如实断联，不把用户当前隧道通畅当作永久在线保证。
- 已确认完成仍沿用 0.5.360 的精简固定事实，后续过期、断线、复查失败不降级；更新的真实产物问题、非零退出或异常证据继续撤销确认。尚未核实的 CORIM seed44 不补成完成，不自动重跑或清理。

## 验证与交付

本轮新增及修改的目标回归已覆盖元数据部分成功/超时但日志仍完成、跨多块自动扫描、连续 24 次刷新去重、公平轮转、无进展停止、连接换代、身份字段保留、异常详情精简、SSE 初始连接、慢 GPU 与真实认证失败的区别、独立执行刷新及失败后的产物隔离。原有新鲜度、固定完成、异常分析与非零退出回归继续适用。

最终完整 `npm run package` 串行门禁退出码 0；build、类型检查、内置真实面板脚本检查、额外 vm.Script、lint、运行闭包与包检查通过。另串行通过 RequestBudget、WebSocket、SSE、snapshot fallback、reconnect 与禁止直连 SSH 共 6 个目标文件。新增队列回归 9 项，原有新鲜度文件扩至 20 项，均通过。首次门禁暴露旧 HTTP fixture 未接受新增 compact 参数，已补齐真实路由双端点断言并单独验证；之后修复异步状态变化引起的 TypeScript 窄化检查，再重新运行完整门禁，未降低任何断言。

回归样本中，保留异常计数、身份和原始日志路径后，异常进度响应从 47172 字节缩至 659 字节；读取 640086 字节日志的一次有界扫描检出了旧 256KiB 边界之后的异常并到达 EOF。这是本机抽取函数回归结果，不是 H20 新版现场网络耗时或带宽验收。

确定包 `simple-experiment-0.5.361.vsix` 为 3057393 字节、531 个 ZIP 条目、376 个 dist 文件。身份 simple-local.simple-experiment、版本 0.5.361、universal 平台、VS Code engine、256 个本地模块运行闭包、8 份 Python AST、已构建运行字节一致性及秘密排除均通过。逐包清单 97 字节，精确绑定文件名。

SHA256：`51a35bf267258b859dc640e59d96fa9197c180113f33e536820a858639a81501`。

运行源码提交 `53b7ff824f390a5e231383ed28e8ea98902226a1` 已普通 fast-forward 推送 origin/master，fetch 核对一致。真实稳定 Latest 为 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.361，tag 与 target_commitish 均绑定该提交，draft=false、prerelease=false。VSIX 与同名 `.vsix.sha256` 资产名、大小、GitHub digest、清单和实际下载 SHA256 均一致，没有覆盖历史 tag 或资产。

使用实际安装的旧版 0.5.360 ReleaseClient 从真实公开 Latest 识别 Windows 更新，并实际下载 0.5.361 与未改动的配套 SimpleSFTP 0.2.91 和各自清单。旧版解析、平台选择、扩展身份、字节数与 SHA256 均通过；下载的 Experiment 包与本机确定包逐字节一致。隔离验证目录为 `C:/Users/ZLK/AppData/Local/Temp/simpleex-0361-release-verify-4fd278bb1eca4e7980005cecce4fca94`，验证文件保留。SimpleSFTP 为 169109 字节、SHA256 `e483156ad117fd8c3aaeb81d01fc0285ad6ce7c698827b589ad16596a9ea453e`，未修改或重复安装。

显式执行且仅执行一次 `npm run install:latest`，安装 0.5.361，无 force 或降级。VS Code 安装版本、simpleex --help 和全部 376 个已安装 dist 文件与发行包逐字节一致。随后停止当前 SimpleExperiment 面板、API 及服务器操作；最后核对的 Extension Host 运行版本仍为安装前的 0.5.360，未用磁盘安装版本冒充已重载。

现场验收待完成：用户需 Developer: Reload Window，并按原入口更新 Worker Agent/Scheduler 后，核验连续刷新下执行状态、日志 bytesRead 到 EOF、已确认完成固定事实与 PLAN 计数；compact 服务器响应和单次较大扫描窗口需要新 Agent。此次未自动部署远端，未启动、停止、重跑、重新派发科研任务，未修改项目、科研环境、指标、日志或权重，未清理旧文件。源码、发行与本机安装已完成，现场问题尚不能宣称解决。本节为交付后的文档补记，不改 tag 绑定的运行提交或已验证 VSIX 字节。
