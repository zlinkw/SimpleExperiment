# 0.5.366 交付记录

## 汇总规则与补跑合并

按用户本轮明确要求，结果汇总只主动核实产物，不读取或等待控制台日志。远端 collection 保留最终 manifest、任务身份、声明路径、权重存在性/大小、指标 SHA256 等既有核实；本机继续内存读取并复核 manifest 与指标的精确字节、SHA256 和逐 job 维度。没有产物、查询失败、内容变化或副本身份冲突不能用本机旧记录填补。真实非零退出、failed 清单保留指标并进入产物复核表，不冒充正常结果。窗口关闭、复制目录没有原服务器控制台日志，以及单独的日志诊断状态不再阻断汇总。

任务进度的日志分析、异常复核和已确认完成事实保持独立，没有把 aggregationState 写成任务 completionState。旧 Agent 返回的日志诊断仍可显示，但新 Host 不以它作为结果合并门禁；collection 停止读取日志的远端性能变化需要新版 runtime 实际部署后验收。

用户明确接受 CORIM 新旧源码混合汇总并保留逐 job 版本标记。相同项目、PLAN 路径及声明 revision 的补跑组成只读逻辑视图，原始队列不改写；每个 job 保留原 workflow、commandId、Worker、revision 和 codeFingerprint。表格增加 mixed_versions、job_versions，JSON 保留完整来源；从哪个副本读取与原执行 Worker 分开记录。最新执行覆盖同一 job 的旧选择，未知或失败不能借用旧成功；新的全量提交重建范围，不拼入更早全量运行。工作区、目标配置或当前 job 身份在读取中变化时，迟到结果不能发布。

面板、Host PLAN 摘要和只读全局同步核验共用逻辑范围。合并卡片的单 job 与批量控制仍指向各自原 workflow，不能用最新一条提交的身份操作其他 job。未来仅重跑当前源码的单 job 也保留完整 PLAN job 数。

完整 job 产物目录与所选范围的交集仍同步到全部启用 Worker，未缩小权重/日志/指标目录核验或扩大用户取消的范围。相同实际目标上的客户端健康重建不再误取消同步及目录核验；真实项目、目标或清理边界变化仍拒绝迟到结果。汇总分母区分已登记/已观察的 PLAN 与其余目录声明，保留 catalogExpected、unobservedDeclarations 以及查询未知原因，未发现记录不等于未运行。

## 现场证据与边界

本轮通过 discovery/capabilities 核对实际运行 SimpleExperiment 0.5.365、SimpleSFTP 0.2.94，消费项目 d:/GitRepo/MultiModal；不能沿用最早的 0.5.359 假设。07:57:10.539Z 的既有主动查询导出包含 422 项声明，其中比较实验 102 项产物完整，旧规则仅把 59 项计入正常汇总，另 43 项主要因副本中找不到原 H20 的 simple_cluster/tmux_logs 控制台日志而待复核。其余 320 项是其他 PLAN 声明，不能直接表述为比较实验丢失 320 份产物。这些数字有明确观察时间，不作为安装后新一轮查询结果。

本轮还通过 SimpleSFTP sync.projectFileStats，主动查询一个 H20 来源 concatenation job 的全部 49 个已声明产物文件：nwpu3 512 ms、nwpu2 1569 ms、nwpu5 1024 ms、jqg_zlk 7585 ms，四端均存在，所查权重大小均为 3240994 字节。该证据是一个 job 的文件存在性和大小检查，不是全部 102 个 job 在四端的完整 SHA256 验收。102 项队列中的 synced 回执只作既有同步记录，不冒充本轮远端完整核实；旧结果查询也记录 H20 timeout，不能据此证明隧道断开或产物损坏。

CORIM 原提交 distributed-plan-1792123564723-1q9ne2 保留索引 0..4；补跑 distributed-plan-1792219813171-iyksnx 的索引 5、commandId 2783a3e0d206d054afc1591aa57ff676 已有独立完成事实。使用真实本机队列回放新逻辑得到 6 个 job、两个原 workflow 和混合版本标记。原缺失 commandId 77f6cf6556334e6ab3f2a5d9bf5f57d1 没有被补成完成，也没有转移完成证明。回放不是重载后真实面板验收。

没有重提、重跑、停止或清理科研任务，没有修改科研源码、配置、环境、原始指标、日志、权重或远端产物，没有上传或重启 Agent/Scheduler。

## 代码验证

最终 npm run package 退出 0，包含完整 build、单文件串行回归、Windows flow 和 257 模块/2 入口运行闭包检查。lint、git diff --check、vm.Script 对模块及真实渲染内层 script 的校验通过；业务 src/dist 禁止端口零命中。

相关回归包括 FreshResults 8 项、Host 收集 12 项、逻辑 PLAN 4 项、真实渲染 36 项、全目录同步状态 9 项、完整 PLAN 镜像 12 项、逐 job 同步 6 项、指标表格 19 项。覆盖无日志、窗口关闭、异常日志与产物独立、真实失败、混合版本、补跑合并、全量重跑边界、最新执行未知、项目/revision/声明隔离、断线、配置变更、客户端重建和迟到发布拒绝。提取真实 Python 函数的夹具证明 collection 不调用日志扫描；任务诊断仍能识别真实 CPU 子进程异常。没有发生 20 秒挂起后重试。首轮完整打包在旧夹具仍断言 collection 返回日志时正常失败，修正为新汇总契约后重新完整打包通过，没有为通过测试放宽生产异常识别。

既有性能回归仍通过：48 个 job 三次内存传输；51 张内容未变化的本机表格零次 durable rewrite。此为隔离测试，不是新版 H20 现场耗时。

## 源码、发行、安装

已验证源码提交 be8784cf5a7cc29ac7175390a6b3249ba60f22c7 普通 fast-forward 推送 origin/master，fetch 核对一致。预先存在的两个 pyc、迁移脚本、历史 SHA 清单及缓存未提交。

稳定 [v0.5.366](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.366) 绑定该提交，真实 Latest 的 draft=false、prerelease=false，tag 实际对象为该 commit。资产 simple-experiment-0.5.366.vsix 为 3094626 字节，SHA256 为 7475633f5f4905e58a5cbe193d881c666b013e9587e6728a0859fa7240cc177c；同名 .vsix.sha256 为 97 字节，精确绑定文件名。537 个 ZIP 条目、377 个 dist 文件，身份、版本、universal 平台、锁文件、runtime 版本与 SHA256、运行字节、实际 discovery token 和机器状态排除均通过。

实际安装旧版 0.5.365 的 ReleaseClient 已通过真实 Latest 识别 0.5.366，并下载 VSIX/校验清单，逐字节等于本机冻结包；远端资产大小、digest 和源码绑定再核对通过。验证文件保留在 C:/Users/ZLK/AppData/Local/Temp/simpleex-0366-delivery-bUD2kt。

配套复用既有稳定 SimpleSFTP 0.2.94，170860 字节，SHA256 1452a52b9da84a89f760154b162d299cc79ff2496a945d67840450a75988aa92；经真实更新器下载和清单/身份校验，没有修改或重复安装配套插件。

显式 npm run install:latest 仅执行一次，0.5.366 安装成功，无 force 或降级。立即核对 code --list-extensions、simpleex 入口及 --help；npm CLI 链接解析到当前仓库 0.5.366，已安装 377 个 dist 文件逐字节等于冻结发行包。随后停止插件 API、面板和服务器操作，等待用户 Developer: Reload Window，再更新结果汇总并只读验收。远端新版 runtime 未部署，现场验收未完成，不能宣布现场问题已解决。本文件是安装后的文档回执，不重新构建、打包或安装该版本。
