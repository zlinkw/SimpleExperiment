# 传输等待、退出核查与通知收口

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
