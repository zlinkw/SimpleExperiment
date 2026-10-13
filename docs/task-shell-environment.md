# 任务登录 shell 与 nvJitLink

0.5.292 修复 0.5.291 的环境差异：启动前预检直接使用所选 Python，GPU 任务又使用普通 `bash -c`，普通 tmux 会话与 Scheduler 的命令还有其他包装层。登录配置或 tmux server 环境里的系统 CUDA 库没有在最终解释器启动前被重新排序。所选 Python 正确不代表 nvJitLink 正确。

Agent、Scheduler、适配器 wrapper 共用 `TaskShellEnvironment.ts` 中的启动逻辑。POSIX 任务均经过所选 shell 的 `-lc`，登录脚本完成后重新绑定允许的任务变量及原始身份，使用所选 Python 的 stdlib 解析其 `sysconfig` 环境内 `nvidia/nvjitlink/lib` 和环境 `lib`。仅该环境中的库能作为首选；越界链接或多个不同候选报错。无 nvJitLink 的 CPU 环境保持可用。

该目录在进程启动前置于 `LD_LIBRARY_PATH` 首位并去重，保留其他有效条目的顺序。不会修改登录配置、tmux 全局环境、系统 CUDA、项目文件或已安装包。库路径、解释器、prefix、文件 SHA256 形成 `SIMPLE_EXPERIMENT_NVJITLINK_PROOF`；预检后的启动及 wrapper 重新解析并比较，变化即拒绝。正式 runId、globalJobId、commandId、revision、来源、checkpoint 与目录单写者门禁保持原逻辑。

环境预检同样经过该登录 shell，检查实际 Python/prefix/原身份，使用动态加载器加载环境库并检查 `/proc/self/maps`；环境安装了 torch 时只执行 import，不调用 CUDA、不启动模型、不申请 GPU。stdout 为有界 JSON，stderr 保留原异常，退出码仍由 tmux 外层保存。现有轻量探针 8 秒限制与全量资产的真实进展停滞检测保持不变。正式预检及 `tasks.preflight(environmentOnly=true)` 要求同版 Agent/Scheduler；Host 提交前检查新增 capability `taskShellEnvironment=1`。

登录 shell 增加一层父子进程后，原探针仅 kill 直接子进程会留下 shell 子进程。现使用独立进程组，超时或输出未闭合时回收整个探针组。`executionShellReap.test.js` 已用真实停滞 shell 的轻量 sleep 子进程先复现残留再验证修复；它不影响任何真实任务或科研进程。

## 可复现验证

`nvJitLinkShell.test.js` 在本机 WSL 的独立已有 tmux server 上运行真实 Agent GPU/普通启动函数、Scheduler 环境预检、`run_command` 与 wrapper/子进程。用系统已有 as/ld 构造两套环境库与缺符号的旧系统库，运行合成 ELF 的 Python import 与 CPU 函数。没有训练、GPU、包安装、服务器连接或生产会话操作。覆盖旧库冲突、两个并发环境、中文/空格/引号参数与身份、重复包装去重、错误库 SHA256 拒绝，以及退出码。合成 torch 模块仅用于复现实际 ELF 导入边界，不能作为真实远端 PyTorch 验收。

`formalIdentityTmux.test.js` 检查真实 tmux shell 中两份身份不串扰、非法/跨任务身份仍拒绝、writer 门禁、checkpoint-only 标记及退出码。原启动前预检回归继续核对全 PLAN 结构、仅选中作业昂贵核验、真实进展、停滞、取消、错误退出、JSON/进度分离及来源哈希。

## 回执与锁的独立诊断

2026-10-13 07:07 UTC 经本机 discovery/capabilities 和 `tasks.list` 只读核对：NWPU2 的 concatenation workflow `distributed-plan-1791872601479-xxfl5d` 失败回执包含 `__nvJitLinkAddData_12_1` 缺失。原 commandId `f352ab9e6f9d8ec5abda7ca22a5f7dfb`、`efa6e29edaf5e7b450c5a50300cf91d6`、`6d354ca040ade763e0da0979b80bba9c` 保持失败记录；没有重派、清除或改写任务。

本机资源租约注册表当时有 32 条历史记录，无未过期租约。过期记录本身不能证明锁仍占用，也不能因此清除未知任务。此结果仅涉及该时刻的本机插件租约，不代表远端 GPU 无人占用。

用户反馈预检变慢后，源码核对确认：同一 job 的资产回调可在 `accept_durable_plan_job`、`drain_durable_plan_queue_once`、`_execute_worker_command_unfenced`、Scheduler `worker_mode` 四个阶段重复触发。入队核验还位于任务快照锁内；候选出队的昂贵核验位于空闲 GPU 判断前。MultiModal 的 quality_paths 回调不仅检查路径，还实际读取、哈希协议资产，所以这不是一个廉价的路径检查。该次 concatenation 操作记录中服务端 validate 约 20.3 秒，而本机等待 validate 约 38 秒，等待回执也有额外耗时。

本轮环境修复会在启动前实际导入 torch、验证库加载，解决原 stdlib 探针对 nvJitLink 冲突的漏检；**没有宣称四次资产扫描已经合并或整体预检已提速**。后续优化必须明确区分入队结构检查与启动前资产核验，并保留新鲜来源证据；不能用缓存成功、心跳或省略哈希伪装为预检通过。

`TunnelClient.executeRequestJson` 默认按 30 秒无响应字节中止请求。Worker 的内部 stderr 哈希进度不会自动成为这个 HTTP 回执的响应字节，所以慢预检可能仍导致 HTTP 回执待确认；这与 Python 停滞检测和库冲突是三个不同问题。现有队列遇到不确定结果保留 Worker/GPU/commandId，使用完整身份回执核对。资源租约只保护当前 API 调用，并不能代表远端任务已退出。此次不更换 commandId、不释放未知远端作业、不自动重试或扩大网络超时；若再出现需用对应 commandId 的实际回执定位，不能用失败重跑验证环境。

## 部署及待验收

本机扩展 0.5.292 打包安装后需执行 Developer: Reload Window。通过插件更新使用中的 Worker Agent 与 Scheduler 到 0.5.292，确认 `taskShellEnvironment=1` 后，对原冻结失败 command 使用 `tasks.preflight` 的 `environmentOnly=true`。该操作仅导入/CPU 核验，回执应为 `executionStarted=false`、`queueChanged=false`，不表示已有输出被准入或科学作业成功。不要点击重排，不自动同步研究文件、清理失败目录或覆盖 checkpoint。

用户已重载本机并更新 NWPU2 到 0.5.292。实际 API 验收于 2026-10-13 07:45 UTC 调用原失败 command `f352ab9e6f9d8ec5abda7ca22a5f7dfb` 的 `tasks.preflight(environmentOnly=true)`：941 ms 返回 accepted，operation 为 `formal-preflight-1791877502927-gopxxs`；约 3 秒后按原代码证明拒绝，原文 `code-sync proof stale; stat changed: experiments/simple_adapter/run_wrapper.py`。回执明确 `executionStarted=false`、`queueChanged=false`。源码中的该拒绝依据是记录的 size/mtime 与当前文件状态不一致，不能仅凭该消息判断字节内容已经改变。

**真实 NWPU2 的新库与 torch 导入仍未通过验收：本次被更早的来源证明门禁阻断，尚未到导入探针。** 不会跳过来源证明、改写 commandId、同步/恢复研究源码或重派任务来伪造通过。需先只读核对旧提交的来源证据；内容或 PLAN revision 已变化时不能把旧 job 作为当前作业使用。本地真实 shell/ELF/tmux 验证不替代远端验收。

## 本机交付证据

实际源码修改：`src/runtime/TaskShellEnvironment.ts`、Agent/Scheduler 的 `.legacy.ts`、`src/extension/legacy.ts` 与运行版本清单；更新对应生成的 runtime 与 package/lock。回归修改位于 `test/features/nvJitLinkShell.*`、`executionShellReap.*`、原环境/身份/启动前 API 夹具及 Worker capability 读取夹具。

`npm run package` 通过构建必需的 177 项检查、223 个本地模块和两个入口的 VSIX 闭包验证。额外真实 tmux 身份两项及 `vm.Script` 门禁通过。0.5.292 仅安装一次，VS Code 已安装版本及 `simpleex` 入口已核对；SimpleSFTP 保持 0.2.69。VSIX SHA256 为 `7F7E9D74BC864840A27BDB5D95BE60C259B32030144AC341E9B13BA126CBE2AE`。没有执行科研训练、GPU 作业、生产文件清理或失败任务重派。
