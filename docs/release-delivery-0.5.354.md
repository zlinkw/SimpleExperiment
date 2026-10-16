# 0.5.354 服务器最高占卡上限与产物同步退出核验

每台 Worker 新增 gpuMaxConcurrentCards，作为高于逐卡 job 配额及显存门槛的并发占卡上限。所有 PLAN 合计按实际 admitted、starting、running 的不同 GPU 计数，手动任务也计入。排队、死窗口和其他用户的外部进程不占本插件 job 名额；外部进程仍影响实际剩余显存。留空不限，0 暂停新启动。降低上限不停止当前任务；当前已超过上限时，后续启动等待自然释放。

选择正在使用且满足逐卡条件的卡，只有占卡名额允许时才开启其他满足条件的卡，不固定裁剪前 N 张卡。Host 自动分配、手动请求、可用性、预排队权重及独立 Scheduler 执行侧共同应用该上限。旧 maxConcurrentGpus 继续保持弃用；新显式参数独立配置，不意外恢复旧限制。新 gpuCardLimitScheduling 能力门禁防止旧端忽略上限。清空限制后，旧 job 提交参数不复活旧上限。显式当前配置在原生控制窗口标记，晚到的旧 accept 或重复提交不能覆盖它；状态核实不以空卡或占卡名额为前提。

同步报错 LOCAL_PROCESS_ANCESTRY_UNAVAILABLE 定位于配套 SimpleSFTP 0.2.90。只读本机进程快照复现一条 ssh -N -T 手动端口转发，其 PowerShell 父进程的父辈已经退出。它不执行远端命令，但被当成未知文件传输阻断旧请求退出证明。配套 0.2.91 保守识别完整、无远端命令的 ssh -N，仅在本机内存解析 SSH 命令行，不输出或持久化；未知选项、远端命令、普通传输及真实活跃原请求仍保留退出保护和远端写入核验。

合成原生 tmux 测试包含两张卡、单卡两 job、服务器上限一张、手动任务先占卡、自动任务只能填同一卡、上限 0 暂停并保留原窗口、旧请求不能放宽新上限、恢复后释放队列。tmux 兼容夹具对保留的死窗口允许原生退出码缺失，仍必须以当前 runId 的真实完整产物确认完成；明确非零退出依旧失败，没有修改生产完成判定。

最终 npm run package 的 117 个串行测试文件、799 项通过、0 失败；编译模块及三个实际渲染脚本 vm.Script 校验通过，无禁止的固定隧道端口。VSIX 共 520 条 ZIP 记录，372 个 dist 文件与本机构建逐字节一致，8 个 Python AST、身份/版本/平台、运行闭包和秘密排除通过。simple-experiment-0.5.354.vsix 为 3,013,440 字节，SHA256 为 49d900c6f45a6b04ca65b38b56b768d6114d4043cec3b6588745fdd8c76ef77a；同名 .vsix.sha256 绑定精确资产。包内为结果补记前的本文，补记不更换验证包。

## 实际交付

源码提交 961758c893d1c946476724d360c00701c12a6aac 已普通推送 origin/master 并 fetch 确认一致。真实稳定 Latest 为 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.354，tag 及绑定提交一致，draft=false、prerelease=false；VSIX 大小、GitHub digest、逐包校验文件均与上述构建字节一致。配套 https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.91 绑定 2e8b50b7e62d87b3c052ff37ab2d908023587ba8，169,109 字节、SHA256 e483156ad117fd8c3aaeb81d01fc0285ad6ce7c698827b589ad16596a9ea453e，自己的真实 Latest 验证通过。

已安装旧版 0.5.353 的实际 ReleaseClient 从两个公开 Latest 识别更新，实际下载两个 VSIX 及校验清单，核对平台、扩展身份、版本、资产大小、精确文件名绑定 SHA256、GitHub digest，并与本机确定包逐字节比对。隔离验证目录 C:/Users/ZLK/AppData/Local/Temp/simpleex-0354-release-verify-vM1OWx。

两个仓库分别显式执行一次 npm run install:latest，安装版本为 SimpleExperiment 0.5.354、SimpleSFTP 0.2.91；未 force、未降级、未重复安装。Experiment 372 个 dist 文件、SFTP 23 个 runtime 文件及各自 package 身份均与对应 VSIX 字节一致。simpleex --help 正常；simple-sftp-api 输出既有用法入口（其 --help 按现行解析返回 1，未调用 API）。安装后停止操作插件面板/API，等待用户重载，再通过原入口更新 Worker Agent/Scheduler 并配置服务器占卡上限；真实 UI 和远端派发验收待该步骤完成。

未启动、停止、召回或重跑正式科研任务，未修改科研服务器、环境、日志或产物，未自动清除传输登记或重新发起传输。
