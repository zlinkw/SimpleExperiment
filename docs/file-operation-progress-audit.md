# 文件操作进度与等待边界复核

## 当前现场证据

2026-10-17 北京时间，通过本机 discovery、实时 capabilities 和只读 API 核对：Extension Host 实际运行 SimpleExperiment 0.5.361、SimpleSFTP 0.2.91，进程 55316。没有以磁盘安装版本或 0.5.359 的旧证据代替当前状态。

截图对应操作 `plan-submit-selected-plan-f165ae96-5533-4baa-85dc-b8398f273e9d`，本机开始于 `2026-10-16T18:27:37.733Z`，结束于 `18:30:01.368Z`，总计 143635ms。实际错误为 jqg_h20_zlk 的 `sync.projectInventory` 查询没有新进展。本轮 `enqueueMs=0`、`dispatchMs=0`，失败发生在派发前的代码同步/文件核实链路。记录没有保存该 inventory 的网络进入时刻，不能把整段 143635ms 冒充它的 SSH 耗时。

同一 Host 的主动 `transfers.list` 观察：

| 本机观察时间 UTC | 请求身份及真实进度 |
| --- | --- |
| 18:33:40.047 | `sftp-55316-1792175425601-77x9c9qiso6`，开始于 18:30:25.676，hashing，1025 个文件，1025 个 cacheHits，0 个读取字节 |
| 18:33:50.718 | 同一请求仍在运行，最新进度时间 18:33:50.645，1174 个文件，1174 个 cacheHits |
| 18:38:19.561 | `sftp-55316-1792175837804-14va654e573`，开始于 18:37:17.822，preparing，0 个文件，静默约 61.7 秒 |
| 18:47:20.373 | `sftp-55316-1792176369061-ikuj5fosnlm`，开始于 18:46:09.123，preparing，0 个文件，静默约 71.3 秒 |

这是用户正在进行的读取，诊断没有重新提交 PLAN、启动 inventory、取消请求或修改远端文件。第一行时间取自该次 API 返回的 lastProgressAt；最后三行包含实际本机取样时间。缓存命中仍须本轮 stat/open/fstat/lstat 核对，不能当作本轮网络传输字节。

## 根因和调用路径

`PLAN 提交流程 → 代码同步/核实 → verifiedSftpProjectInventory → simpleSftpApiCall → callSftpWithProgress → SimpleSFTP API 包装器 → 容量队列 → projectInventory → runSsh/runRemoteBatchSsh → 远端目录枚举、元数据与哈希 → 返回完整清单 → 完整性核实 → 后续提交`。

旧实现只有上传、下载、Worker 间传输使用“无进展仅提示”。清单、目录树、文件属性和清理仍在两侧的 120000ms 无进展计时器中自动中止。SimpleSFTP 容量队列暂停自己的计时器，却不能暂停调用方的计时器。清单脚本还在完整枚举完毕后才开始发送 hashing 进度，NFS 枚举及首次元数据读取可能长时间静默。因而“没有收到进度”被错误升级成“同步失败”；该证据不能证明隧道断开或目标文件出错。

此次改动不增大 TTL，也不伪造 heartbeat、字节数、旧缓存核实时间或完成状态。120 秒继续作为等待提示阈值；真实错误、显式取消、工作区/连接换代继续生效。

## 文件操作审查表

| 路径/操作族 | 实际进度及成功依据 | 等待和失败边界 |
| --- | --- | --- |
| projectInventory | 本轮已枚举目录/文件数量；实际读取字节；文件身份、SHA256、unverifiedFiles | 枚举阶段先报告实际数量；无进展提示等待；不因静默杀 SSH 或取消清单；stat/目录枚举失败不能返回空清单 |
| projectTree / projectTreeState / projectFileStats / planLogPaths / remote.listDirs | 实际目录项、存在性、类型、属性或已读取日志路径 | 纯读取不创建写事务；断开的读取可取消；错误保持未知，不能补成空目录或文件缺失 |
| 本机代码哈希 | 实际 stat、流读取字节、前后身份核对 | 慢文件只提示；用户取消、读错及读取期间变化仍拒绝发布 manifest |
| Agent 同步 proof | 原 operationId、Worker、manifestDigest、scopeSignature 的主动查询及最终 proof | 正常 running/queued 静默不失败；查询失败为未知；丢失或迟到的 POST 不覆盖主动查询，不重复注册 |
| 上传 workspace/files、保存上传、tar 打包/解包 | 已有远端精确文件基线和实际 writtenBytes/writtenFiles；最终 SSH 退出与内容核验 | SFTP 所有文件控制器、子进程观察器统一只提示停滞；心跳不增加计数、不表示完成 |
| Worker 间 serverToServer / Batch / Fpsync | 实际源/目标清单、分块、完成组与最终 SHA256 | 延续已有精确范围、资源锁及退出回执；无进展不自动重传/回滚 |
| 下载 fromRemote / downloadPaths / downloadMappedPaths | 实际本机写入、解包、最终内容校验 | 写本机的 mapped 下载不能因远端只读而省略写事务退出/取消回执；memoryOnly 读取不建立写事务，断开只取消该读取 |
| 隧道文件上传/下载/范围读取 | 下载先实际 writeAll，再累计字节；上传等待真实 nextOffset 与最终匹配 SHA | 取消固定 30 秒的业务请求中止和原生 fetch 300 秒响应头上限；保留有界只读 stat/list、大小上限、取消结算与未知写入防重放 |
| cleanup inspect / preview / check / verify / status | 精确路径、实际文件系统、清理窗口、remaining/removed 项 | 本机 Python 不再因固定 60 秒被杀；请求静默只提示；有界核实查询超时仅取消该只读请求，不遗留堆积查询或重启执行器 |
| cleanup execute / move / restore / settle | 原冻结身份、实际源/目标状态及精确执行窗口 | 活执行器即使单次文件操作很慢也继续观察；查询失败为未知；保留双确认、类型/身份/链接/安全根/直接父目录及 ./直接子项检查 |
| 旧本机精确删除入口 | 原父目录与身份检查、子进程退出后主动 lstat 确认不存在 | 不再固定 30 秒终止删除进程；入口保留；不扩大删除目标或自动启动任何删除 |
| Agent 文件/同步的通用操作等待 | 既有主动 operation 查询、实际 processedFiles/processedBytes | UI 等待可以结束为 outcome_pending，但不能因文件静默发送 stop/cancel；原操作保持可核实 |
| simple-sftp-api CLI 文件调用 | 与桌面 API 使用同一文件操作及最终核验 | 不再固定 15 秒因 socket 静默中断文件调用；小型控制查询继续有界；不自动重发 |

原始日志分析、PPT automation、生命周期控制、压缩采样、HTTP 小型控制查询等独立控制协议保留各自有界等待；它们不能替代文件存在性、内容核验或执行退出证据。本次不更改科研环境或 SSH 登录脚本。

## 回归和现场验收边界

目标夹具覆盖静默枚举、空目录、哈希缓存、容量排队、超过旧阈值后的恢复、观察请求失败后继续查询同一 operation、插件实例换代、用户取消、真实非零退出、错误哈希、迟到成功及清理读超时后释放。计数来自实际枚举/读取/写入，测试不访问科研服务器。

验收需要同时运行 SimpleExperiment 0.5.362 和 SimpleSFTP 0.2.92。包发布及安装记录另见对应 release-delivery 文档；安装不能冒充 Extension Host 已重载。此次修复的 SFTP 执行器在本机扩展内，不需要为这项修复自动升级 Worker Agent。未经重载后现场验收，不能宣称 H20 问题已经解决；不能自动补交截图中失败的 PLAN。
