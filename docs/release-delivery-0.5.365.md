# 0.5.365 交付记录

## 重跑范围与当前源码

0.5.364 对原源码的提前核实会将用户已编辑的配置直接报 PLAN_SOURCE_CHANGED。隔离回归重现此错误；0.5.365 对真实源码/配置或 PLAN 变更先提醒，提供“仅重跑当前 job”“重跑全部 job”和取消。身份不明、非法路径、链接或损坏基线仍不能当作普通配置变更放行。取消范围提示不查询任务、不停止、不同步、不清理、不修改队列。

确认后重新读取当前 PLAN，核对全部启用 Worker 的真实同步版本，执行正常校验与预演，再按 case、seed、输出目录和 CSV 精确选择当前 job；索引变化不把其他 job 当作目标。新输入使用新 workflow/command 身份，不改写原 PLAN 的 revision、codeFingerprint 或其他 job 的完成事实，也不将旧版完成数移到新版本。单 job 新批次按自己的范围计数，旧批次仍保留原范围与证据。

只核对所选旧 command 的执行状态，不等待旧产物或日志分析；新源码上传前设置这些原请求的取消围栏，防止迟到的启动。运行/排队任务仍需用户先中止或召回。新鲜产物核实覆盖全部启用 Worker；旧产物保留精确路径预览、两次完整路径确认及直接父目录保护。当前源码在确认期间再次变化、部分同步、断线或身份变更均不能触发删除或派发。同一旧卡片、范围和确认输入绑定稳定的新提交身份；重复确认不会再次同步、设置围栏、删除或入队。

## Agent 准备

实际代码链路在部署与启动核实成功后才打开 Xshell，原来“部署 runtime”还覆盖逐 Worker 的重复 ensure 和健康等待。现在不同传输目标最多两个并行，同目标串行；每阶段等待全部请求收尾，所有只读归属检查通过后才允许上传。已有本轮真实运行版本、磁盘和运行身份完整 SHA256、独立 Scheduler current/absent 证明且无更新错误的服务免去第二次 ensure。缺证据继续核实，旧 Scheduler 继续精确升级，不以任务登记阻断 Agent。

HTTP 就绪前原先强制 prune_agent_state 和 reconcile_worker_tasks_after_restart，可能在慢文件系统上等待历史文件或任务归并。只提取真实 serve_http 启动段的 Python 夹具复现旧入口必经该阻塞点；新版不执行这两个启动扫描，仍先取得独占生命周期锁与归属，保留 Scheduler 来源校验、会话信息和采样器。既有历史函数与主动入口保留，没有清理文件、重放任务或扩大停止范围。阶段进度细分为版本来源核对、上传和 Agent/Scheduler 启动核实。没有增大健康超时或状态 TTL。

## 代码验证

最终 npm run package 退出 0，包含完整 build、单文件串行回归、Windows flow、256 模块/2 入口闭包检查。额外 lint、vm.Script、UTF-8 内容复读与 git diff --check 通过；业务 src/dist 中禁止端口零命中。

重跑/日志 Host 19 项、部署 Host 10 项、启动快路径 1 项、首次准备流程 3 项通过。新回归覆盖仅当前/全部/取消、当前声明索引变化、其他完成事实保留、运行状态拒绝、同步时再次改动、部分 Worker 同步、路径确认取消、命令被并发替换、上传前取消围栏以及重复点击幂等。已有真实独立 tmux、Scheduler 升级、晚到请求、删除双确认、慢日志、完成固定、重连及 PLAN 渲染回归一并通过。未发生 20 秒挂起后重试。补齐保护后重新完整打包，以下指纹仅绑定最终确定包。

确定包 simple-experiment-0.5.365.vsix，3087211 字节，SHA256 3bf2279cff59532de22dcd34b71e49b3b4646f0a03bc495537eaffb8b5add3a1。535 个 ZIP 条目、376 个 dist 文件，publisher/name/version、universal 平台、锁文件、运行字节、runtime 版本及 SHA256、实际 discovery token 排除和机器状态排除均通过。同名 .vsix.sha256 精确绑定文件名。冻结后不再打包或换包；本交付回执不改变包内运行字节。

配套复用既有稳定 SimpleSFTP 0.2.94，170860 字节，SHA256 1452a52b9da84a89f760154b162d299cc79ff2496a945d67840450a75988aa92。其真实 Latest 绑定 8d273049f3686be487a13d5dcdc4606c9e10172f，draft=false、prerelease=false，远端资产名称、大小及 digest 与本机一致。生命周期协议未改动，没有为本批次重复打包或安装配套插件。

## 现场证据与验收边界

本轮先经 discovery/capabilities 核对实际运行 Extension Host 为 Experiment 0.5.364、SFTP 0.2.94，PID 55480，不能沿用旧版本假设。prepareAgents 错误记录为 2026-10-17T06:06:09.772Z，失败目标为 H20 jqg_zlk、tmux server 367、zlk-worker-jqg_zlk-agent:@205。

插件 API agents.lifecycle inspect 2578 ms 返回另一个实际窗口 @206、Agent/Scheduler 0.5.364、运行身份与来源 SHA256。随后 server.testAll 9136 ms 中 H20 报 This operation was aborted，其他三个 Worker 正常。后续一次独立 inspect 4047 ms 未在其服务器本地健康预算内确认健康（status=unhealthy），同一个 @206 仍存在，磁盘源码 SHA256 仍为 0.5.364 的字节；不能据此断言 Agent 退出或隧道断开。再经当前插件 tmux.capture 393 ms / 1524 ms 成功，指定窗口只有 24 个换行，没有有效错误正文。没有绕过 API 另读远端日志，也没有把 @206 推断成失败 @205 的迟到成功。activeTasks 空数组仅是辅助登记诊断，不能证明科研任务为零。

这些现场检查全为只读，未部署或重启 Agent/Scheduler，未重提、重跑、停止科研任务，未修改科研项目、环境、指标、日志、权重或产物。上述启动阻塞的隔离复现与代码修复不等于 H20 原 @205 失败的完整现场因果证明。0.5.365 的实际 Host、重跑选择界面、H20 准备耗时与稳定性须在重载及用户确认部署后验收，当前不宣称现场已经解决。

## 源码、稳定发行与安装

源码实现提交 320c76014967de449299255888b479cdea2f2cbb 已普通 fast-forward 推送 origin/master，fetch 后 HEAD 与 origin/master 相等。未提交预先存在的两个 pyc、未跟踪迁移脚本、历史校验清单或缓存。

稳定 [v0.5.365](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.365) 已发布。真实 /releases/latest 为该版本，draft=false、prerelease=false，target_commitish 与 tag 实际 commit 均为上述已验证提交；精确资产 simple-experiment-0.5.365.vsix（3087211 字节）和同名 .vsix.sha256（97 字节），GitHub digest 与本机冻结包一致。没有覆盖历史 tag 或资产。

使用实际安装旧版 0.5.364 的 ReleaseClient，在 win32-x64 上识别 0.5.365 更新及既有 0.2.94 配套包；通过其真实 request 入口下载两个 VSIX 和清单，逐字节、SHA256、精确清单文件名、扩展身份、版本和 universal 平台均通过。读取的发行包保留在 C:/Users/ZLK/AppData/Local/Temp/simpleex-0365-release-lE9mSY，未删除验证或历史文件。

显式 npm run install:latest 仅执行一次，安装 0.5.365 成功，无 force、无降级；SimpleSFTP 0.2.94 未重复安装。立即核对 code --list-extensions --show-versions、simpleex 入口与 simpleex --help；已安装 376 个 dist 文件逐字节等于真实发行包与本机冻结包。随后停止插件 API、面板和服务器操作，等待用户 Developer: Reload Window。0.5.365 远端 Agent/Scheduler 尚未部署，现场验收仍待完成。本段是后续文档回执，不修改运行字节、包或 Release。
