# 0.5.315 交付记录

日期：2026-10-15。范围：启动清理提醒、Worker 独立准备与派发、实际任务启动失败。未部署生产服务器、停止科研任务、删除真实产物或重新提交原 PLAN。

## 日志与实时核对

本机 API 运行版本为 SimpleExperiment 0.5.314、SimpleSFTP 0.2.86。通过当前 discovery 与 capabilities 读取任务、操作及清理状态，没有执行运行或删除接口。

- NWPU2 提醒来自旧请求 `e1b8dad2fcd8baa5f315fa4dfc5521beebfd2edbeae5b3f9`；其旧错误是 SimpleSFTP capability 查询 HTTP 401。目标 `2_concatenation_bus_p100_seed44` 经 SimpleSFTP 实时存在性查询确认不存在。随后调用 `plans.cleanup.status`，结果为 completed、pendingNodes 为空、error 为空；没有发送删除。完成请求按现有规则退出列表并精简目标载荷。
- 当前 corim 任务窗口记录包含 `NVJITLINK_PROOF_CHANGED: interpreter/library fingerprint changed since preflight`。自动启动仍运行插件的库解析器，将预检未执行产生的空证明与实际库比较，或继承旧环境证明，阻断了真实项目命令。
- 另一个任务窗口显示 `seq.txt.writing -> seq.txt` 的 FileNotFoundError。原生任务进程仍进入旧 Agent 事件日志；进程内线程锁不能防止不同进程争用同一个暂存文件。
- 提交源码等待整批代码同步结束，调度又通过全局 codeSyncInFlight 阻断；服务器预排队权重只记录首批节点，后就绪节点不能接收剩余任务。

## 实现

各 Worker 独立执行当前任务核查和代码同步，完成实际核验与代码登记后即可参与派发；第一台就绪服务器执行共享 PLAN 校验和预演。全部启用 Worker 仍检查，后续节点继续准备，未就绪节点不能接收新任务。同版本并发提交复用同次准备，不重传；失败节点不使已有任务重复派发。后就绪服务器可加入剩余预排队，已接收身份保持原样。

覆盖删除仍等待整批相关节点检查，保留精确路径两次确认和原路径安全约束。后台同步不能将已结束的提交按钮改回运行中。

移除自动启动中的 nvJitLink 枚举、哈希、库路径修改和指纹门禁，清除旧证明；保留所选解释器、用户库配置、GPU 与任务身份，并如实返回实际命令错误。显式手动诊断入口保留，普通启动不调用。

原生任务进程不写旧 Agent 事件序号或日志；其他必要原子写使用每进程/线程独立的同目录暂存槽。进度和执行状态仍来自实时 Scheduler、tmux、文件系统与最终产物。

本机 capability GET 遇到 401 时重新读 discovery，只重试该只读查询一次，不重放写接口。查询失败不能产生“仍有文件待删除”的启动通知；真实文件尚在时才提示审核。

实现文件及边界说明见 [worker-preparation.md](worker-preparation.md)。

## 验证

最终 `npm run package` 完整通过，包含 typecheck、构建、单文件串行回归、面板脚本、Windows 流程及运行依赖闭包。另行 `vm.Script` 校验通过。新核心回归包括：

- workerPreparationPipeline：真实提交方法先就绪先入队、并发提交共享准备、慢节点失败及 401 令牌轮换。
- distributedSchedulingModes：5 项，覆盖后就绪节点及已接收任务不改派。
- cleanupMissingTargets：11 项；planCleanupReconnect：9 项；planStopClear：34 项；planSubmissionVisiblePreflight：19 项。
- nvJitLinkShell：实际登录 shell、隔离解释器、原始错误退出码、三个独立写进程以及原生任务不触碰旧日志；使用临时夹具，不运行训练。
- planRunQueryRegression、覆盖确认、结果同步、手动同卡并发、隔离 tmux、指标仅内存读取等当前打包门禁均通过。

首次打包暴露旧宿主方法夹具未注入新准备服务及回调，已修正夹具并逐个重验，最终完整打包通过；没有删除断言或绕过门禁。本轮未执行全仓库 `npm test`，不宣称所有历史测试通过。

## 发布与安装

测试并发行提交：`62a9beb2cecf0e600bf88e1a771f19b3534359b3`。普通快进推送并 fetch 核对与 origin/master 一致。

稳定 Release：[v0.5.315](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.315)，绑定上述提交，非草稿、非预发行。

安装包 `simple-experiment-0.5.315.vsix`：2797909 字节。

SHA256：`ec347ad8badf993b0838a58e2d2d97200c5b5851a2126a6d9e344c323b59df86`。包内 360 个 dist 文件与测试构建字节一致，身份、版本、运行闭包及敏感状态文件排除检查通过。VSIX 和同名 SHA256 文件已发布。

实际使用已安装的 0.5.314 ReleaseClient 核实更新可见，并将远端包字节、大小、SHA256、清单及绑定提交与本地逐项比较一致。SimpleSFTP 继续使用 [0.2.86](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.86)，远端包与既有已验证包一致，无需重复安装。

仅执行一次 `npm run install:latest`，核对已安装 `simple-local.simple-experiment@0.5.315`、`simple-local.simple-sftp@0.2.86`；simpleex 入口与帮助命令通过。安装目录的宿主、WorkerPreparation、Agent 和 Scheduler 文件与已验证构建字节一致。

安装后停止调用当前面板和 API，等待用户 Developer: Reload Window。远端 Agent/Scheduler 尚未自动更新；须通过插件更新并核对实际运行版本，不能仅看磁盘文件版本。重载后的通知、逐台准备派发及实际项目命令启动仍待实机验收，不能用本机夹具通过替代。
