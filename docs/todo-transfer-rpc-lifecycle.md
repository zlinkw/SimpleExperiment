# 传输等待、退出核查与通知收口

## 2026-10-06 校验缓存持久化与差异透明度

- [x] 读取约束、源码与 Git 状态，保留两个 dirty pyc；实际运行 SimpleExperiment 0.5.226 / SimpleSFTP 0.2.55。没有取消、重发或清理正在传输的产物。
- [x] 通过实时 discovery/capabilities 调用只读 projectInventory：nwpu5 的 experiments/simple_project.yaml 570 ms，hashedFiles=0 / reusedFiles=1。仅证明该文件缓存有效，不代表所有权重缓存命中。
- [x] 核实目录范围计数只在整批 RPC 返回时增长；缓存更新也仅在整批结束提交，途中退出会丢失本批已算出的 SHA256。ThreadPool map 的顺序等待还会延迟已完成小文件的统计与缓存写入。截图 3816 个候选、2106 个差异，不能称全部重传；1710 个相同文件应跳过，缺失/内容变化仍需分开统计。
- [x] 用真实 Python helper 复现中断丢缓存；最多 16 个待处理 future / 8 个工作线程，按完成顺序收集；每 32 条或累计 64 MiB 或间隔 1 秒（文件完成时检查）提交，正常结束提交尾批。中断后 inventory / exact batch 均复用已提交 SHA256；慢首文件不阻塞其他已完成文件写缓存。保留五字段身份、稳定读取与 SHA256；暴露缓存可用性、命中与重算数，缓存写入失败仍完整校验。
- [x] 目录校验显示明确任务目录数、实际已校验文件与校验读取字节；差异清单显示相同跳过、目标缺失、内容不同，沿用旧协议 fallback，不增加远端扫描。性能/缓存计数不能成为 wire bytes 或 keepalive；跨 scope 不沿用旧命中数。
- [x] 串行目标与传输回归：SimpleSFTP 79 个、SimpleExperiment 103 个 Node 场景全部通过（含 build Webview 解析 1 个）；两项目 build、Webview vm.Script、编码/diff 门禁通过。打包后 188 / 18 个 runtime 文件逐字节 SHA256 核对成功，无 pyc。
- [ ] scoped commit/push/fetch、自动安装 SimpleExperiment 0.5.227 / SimpleSFTP 0.2.56 各一次；安装后停止 API 与 Panel 操作。

安装前最后一次只读现场：同一请求仍 running/unpacking，3816 候选、2106 差异、已完成 231/2106 文件、21/132 分组，实际流字节 20177671732。没有取消/重发/删除。旧版没有记录 missing/different 分项，不能宣称这 2106 个全是缺失或证明某文件被重复复制。旧失败请求为 3296/4578 差异；两个请求候选不一致，也不能直接比较得到速度提升。新缓存行为已在本机真实 Python helper 验证，服务器大权重的下一轮耗时/命中率未实测；当前同步结束前不要 Reload Window。

## 2026-10-06 分块续传槽位与错误摘要

- [x] 读取约束、Git 状态、实时 discovery/capabilities；运行仍为 SimpleExperiment 0.5.225 / SimpleSFTP 0.2.53，源码为 0.5.226 / 0.2.54。当前 transfers.list 没有活动请求；保留两个 dirty pyc 与所有已完成产物。
- [x] 读取真实 actionErrors：接收端 chunk_state 抛出 `stale or invalid chunk offset`，随后源端 BrokenPipeError。弹窗被 SIMPLE_PROGRESS / SIMPLE_CHUNK_VERIFIED / SIMPLE_COMPRESSION_WIRE 淹没，根因不是指标 CSV 或 Panel 状态延迟。
- [x] 用真实接收器复现：较早槽位释放后同身份续传会丢失原偏移；两个新增场景修复前均失败。已有身份优先恢复，连续大文件流固定槽与 flock 到整文件校验/发布，不逐块重新 claim。
- [x] 保留逐块及整文件 SHA256、offset、所有权与退出核查；失败不删旧产物。接收器 5/5 覆盖空槽竞争、相同身份活跃拒绝、连续多帧、截断/校验失败后只续传有效前缀。
- [x] direct/relay 的错误 ring 只保存有界非性能日志，保留退出码、实际异常与大文件路径/两端身份；进度仍走原有通道。实际进度洪流 fixture 仍能保留起始 tar 异常，包含 UTF-8 分段与无换行超长文本；packedSyncProgress 8/8。
- [x] 串行接收器、压缩/续传、进度、批量同步与退出保护回归：SimpleSFTP 89 个 Node 场景通过（退出探针另有 35 个 Python 场景），SimpleExperiment 客户端/手动同步 33 个 Node 场景通过。旧 guard、两条并行流及 SHA256 差异传输均保留。
- [x] 两项目 build 与 Webview vm.Script 通过；含 build 的 Webview 脚本回归，本轮共 123 个 Node 场景通过。补丁 SimpleSFTP 0.2.55 不变更 SimpleExperiment 0.5.226 的协议或版本。
- [x] 补丁打包及 VSIX 18 个 runtime 文件逐字节 SHA256 核对通过。SimpleSFTP 修复提交 bb19001 已普通 fast-forward 推送并 fetch 核对 HEAD=origin/master；安装 0.2.55 一次，没有 force/降级，CLI 核对安装为 SimpleExperiment 0.5.226 / SimpleSFTP 0.2.55 与两个命令入口。安装后没有继续调用 API 或操作面板。

SimpleSFTP 0.2.55 VSIX SHA256：8e747b09373ab0b8c895dd29577dcb3c193558370fa42f4c113130b585f574fc。

现场限制：在传输已无活动请求后尝试通过 API stat 查询最新 ebmc 的两个权重；该次 discovery 端口拒绝连接，未得到目标目录数据，之后 SimpleSFTP discovery 监听仍不可达。不能宣称已现场核对两个目标的权重完整性，也没有重发/取消或删除任何服务器文件。待用户 Reload Window 后再次同步，差异比较跳过相同 SHA256 文件，失败权重仅在退出核查通过后从有效检查点继续；实际大传输尚未复测。

目标：修复旧传输核查的 `/proc/exe` 权限误判、长传输 RPC 提前失败后后台仍运行，以及同一传输显示两层通知。保护正在运行的任务、历史产物、回执与原有两个 dirty .pyc。

- [x] 读取项目约束、Git 状态、两插件 discovery/capabilities。开始时运行/安装 SimpleExperiment 0.5.224、SimpleSFTP 0.2.52。
- [x] 只读现场：一个活动 serverToServerFpsync 请求；上层 action error 已记录 fetch failed，而该请求仍产生实际流字节。432 是校验候选路径，不是已传文件数；当前差异清单 totalBytes=34169609411（约 31.8 GiB）。队列区分 fragmentWorkerIds 与 mirroredWorkerIds，结果片段同步不等于完整检查点同步。
- [x] 定位生产入口：全局 fetch 的默认响应头等待存在 300 秒截止；RPC 仅在业务结束时发送响应头，修改操作断开 HTTP 不会自动停止。旧回执探针对常驻 SFTP 的 exe/FD 检查还会遇到 Linux ptrace 权限限制。不能把权限不足说成产物文件被占用。
- [x] 为长 RPC 使用无固定响应头/总时长的本机 HTTP 请求；仍由真实进展、AbortSignal 与有界 JSON 控制等待。请求中断只取消该 operation，最多 20 秒核对持久回执；未知退出仍保留 guard，禁止重放。真实 loopback 回归模拟 360 秒业务时间、RPC 断线后等待子任务退出、abort 和 32 MiB 响应上限，4/4 通过；模拟时钟不冒充现场长传输测量。
- [x] 退出核查仅在明确的 staged-tar 协议中区分受保护的独立系统 SFTP 会话，记录最多 32 条未观测摘要；仅对 PermissionError + 睡眠稳定进程 + 绝对路径的 root-owned、不可被普通用户改写的系统 sftp-server 启用。真实协议 writer、可观测目标可写 FD、未知执行文件、PID/命令变化、忙槽及不完整协议证据仍阻止。绝不宣称未观测的外部会话没有写文件；这不是第三方写入互斥证明。生产探针 35 个 Python 场景通过。
- [x] API 调用不创建重复 SimpleSFTP 通知；事件、取消与进度仍保留。清单显示校验数与实际差异数；流式管道统一显示“流处理（打包、传输与解包）”，底层阶段与 scope 继续作为真实进展依据，未改批次 128 MiB / 大文件 8 MiB 校验分块，也没有按块重新建连接。6 候选/2 差异的实际 core fixture 只派发 2 个文件。
- [x] 修正只读 sync.project* 的断线取消归类与容量等待取消。回归证明断线的排队读者释放自己的 ticket，不影响仍活跃的传输。
- [x] 用户补充权重要求：完整同步保持最新版运行选择，不扫描整个 work_dirs。手动 bulk 统一按选定 attempt 目录递归补扫，复用 Worker 批量预检；旧清单即使完整也不漏后添 last_checkpoint.pth、嵌套 safetensors 等文件。已有 SHA256 身份校验不变；旧 attempt、无归属目录及 lock/pid/exit_code 临时状态不进入传输。新增回归先复现漏项，修正后 manualDistributedResultSync 21/21、distributedJobArtifacts 3/3、pendingResultMetricSync 31/31、planOutputRetention 15/15 通过；第二次未变化同步不重新派发。服务器间包含权重，本机指标下载沿用项目不默认下载大权重的契约。
- [x] 串行目标回归：SimpleExperiment 152 个 Node 场景（含新增目录补扫与 build 的 Webview 解析门禁）、SimpleSFTP 80 个 Node 场景均通过；退出探针另有 35 个 Python 场景通过。两插件 build、Webview vm.Script、diff 与 UTF-8 检查通过。首次 SimpleExperiment package 的 vsce ls 在现有 8 秒界限超时；单独核验通过后重新 package 成功，没有延长界限或跳过门禁。
- [x] 补丁版本、VSIX 内容身份验证、scoped commit/push/fetch；按既有授权自动安装一次，安装后停止 API。代码提交 SimpleExperiment e9733c35、SimpleSFTP d46189c 已普通 fast-forward 推送，fetch 后分别确认 HEAD=origin/master；两个原有 dirty pyc 未暂存。当前传输如仍活跃，不提前重载或中断；现场重新同步留待窗口重载后验收。

已完成安装：SimpleExperiment 0.5.225、SimpleSFTP 0.2.53，各执行 install:latest 一次，无 force/降级。code 列表、安装目录的新增运行文件与 simpleex 入口均已核对；安装后没有再调用 API。SimpleExperiment 包内 188 个 runtime 文件与工作区一致，buildId=b7c14a8e66cb；SimpleSFTP 包内 18 个 runtime 文件一致，均不含 pyc。VSIX SHA256 分别为 d26f1b48f4f29ec9d553f9b2a83ccb01f54645942921c9091244b7406ec98d46、ccbc0e7475d52ee06c685ac0fb333b7d3d4f0a2a2cfc05974b4ba0ca5e1e3c3c。

限制：两次只读文件 stat 由于当前传输容量等待超过调用方 25 秒而未取得结果；随后 API discovery 指向的本机端口拒绝连接，无法继续查询现场传输。不能宣称已核实目标检查点缺失、当前任务已退出或所有 Worker 完全同步。未知旧回执仍需真实退出证明；不删除文件、回执或租约，不杀未知远端进程。

依据：[Undici Dispatcher 默认响应头超时](https://undici.nodejs.org/api/Dispatcher)、[Linux proc_pid_exe 权限](https://man7.org/linux/man-pages/man5/proc_pid_exe.5.html)、[OpenSSH 平台进程保护](https://github.com/openssh/openssh-portable/blob/master/platform.c)。默认超时机制已经源码核实；本次旧日志没有保留 cause.code，不能冒充现场取得 UND_ERR_HEADERS_TIMEOUT。

## 2026-10-06 较大归档批次与完成计数

- [x] 读取约束和 Git 状态；保留原有两个 dirty pyc。现场 discovery/capabilities 确认运行 SimpleExperiment 0.5.225、SimpleSFTP 0.2.53；只读 transfers.list：running/unpacking，processedFiles=0、changedFiles=3296/4578、transferredBytes=9670022677、差异文件未压缩总字节=186931445249。没有取消或重发正在运行的同步。
- [x] 回归复现分组完成后仍显示 0：现有 group done 仅更新内部通知，未进入 API completion counter；不同 child/phase 的 processedFiles 还是各阶段局部值。生产 core、controller、SSE 转发及外层通知的四个 seam 均先失败再修正；不是靠隐藏真实完成数过关。
- [x] 默认归档批次改为 512 MiB，维持流式内存、有界 manifest、最多两路和大文件 8 MiB 恢复校验协议；不把 checksum 分块当作独立打包/连接。真实分组函数 fixture 的 6 个 100 MiB 文件从 6 组变为 2 组（5+1），没有分配这些文件内容；这不是现场速度实测。
- [x] 新增整次传输 committed completedFiles/totalFiles、completedGroups/totalGroups；独立于局部 stage counter，经 SSE/poll 转发到统一通知。大文件未完成时不伪造完成文件数，旧版本缺少计数时不显示误导的“已处理 0”。
- [x] 串行回归：SimpleExperiment 93 个 Node 场景、SimpleSFTP 81 个 Node 场景全部通过（同一文件多次执行不重复计数）；包括新计数、512 MiB 分组、乱序并发组累计、真实字节、压缩、取消/恢复、暂存发布、API 与 Panel 背压/健康检查。两插件 build、Webview vm.Script、UTF-8 和 diff 门禁通过。
- [x] 打包 SimpleExperiment 0.5.226 / SimpleSFTP 0.2.54；包内 188/18 个运行文件与工作区逐字节一致，无 pyc。buildId=c906e92b79b9，VSIX SHA256 分别为 adf81de5d148fcc2f9a0cc819b738661dc90eb963202cd649c7f7329d750f8be、4ac69e054de415fa9724a3de7045bcf6e433d8e2b8edbb63b95d88bb8f076814。
- [x] scoped commit/push/fetch：SimpleExperiment 87d524fc、SimpleSFTP e31c6c4 均普通 fast-forward 推送，fetch 后 HEAD=origin/master。各执行一次 install:latest，确认安装 0.5.226 / 0.2.54，核对运行文件与 simpleex 入口；安装后未再调用 API。两个 dirty pyc 保留未暂存。新批次与新计数只在重载后的新请求生效，不能热改正在执行的旧请求；不要为展示新计数重载一个仍有活动传输的窗口。

安装前末次只读采样：同一活动请求仍 running，transferredBytes 从 9670022677 增至 21471241567，旧版 processedFiles 仍为 0。该采样证明实际流字节在增长，不证明已全部完成，也不代表新版现场提速测试。
