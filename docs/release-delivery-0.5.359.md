# 0.5.359 产物核实不再等待日志 I/O

现场扩展及四台 Agent 均已为 0.5.358，H20 探测成功约 1542ms，任务结果查询仍反复 15 秒超时，同批完成数在 19、27 等数值之间变化。只读元数据 API 确认 cpsc_bus_p100 seed 43 与 concatenation_bus_p100 seed 42 的最终清单存在。SimpleSFTP 文件属性查询约 0.65 秒返回；两份清单 inventory 约 19.4 秒，内存内容请求超过 35 秒，不能以此认定清单不存在。

用户随后明确允许本次只读 SSH 诊断。核实当前 H20 Agent 精确窗口 zlk-worker-jqg_zlk-agent/@197，PID 3796194，cwd 为 /jqg/zlk/MultiModal，项目位于 NFS4。Agent 多个线程处于 wait_on_page_bit_common/rpc_wait_bit_killable，另有 futex 等待。没有附加调试器、发送信号、停止任务或写入远端文件；proc fd/syscall 的权限不足已保留，没有绕过。

提取实际只读函数进行有界核实：cpsc commandId 12a6bad01552b615bb3401b85abea391 的清单声明本次身份、完成状态、权重大小和指标哈希全部匹配，产物完整；原清单核实约 0.90 秒，独立 256KiB 日志读取约 0.67 秒。原 task_result_query 必须等待日志分析才能返回已经核实的产物，而 task_log_diagnostics 在全局缓存锁内进行 NFS 读取，造成跨 job 串行阻塞；15 秒轮次中尚未回传的清单被丢弃，误显示产物尚未确认。此前减少请求和重复 tmux 查询没有解决这个耦合。

修复为先读取本轮清单/指标并独立发布产物结果，再通过单独诊断只读请求分析日志。日志慢、离线或超时只影响日志核实状态，不撤销已核实的产物；明确非零退出仍失败，退出 0 有异常仍须复核，日志未取得不宣称无异常。日志请求归属 HTTP read 类，不占 task control/probe 槽位。普通控制查询及原 API 入口保留。

日志解析改为每个项目、commandId、日志独占解析锁，全局锁只管理内存字典。相同日志正在读取时立即返回待核实，不产生重复等待解析；不同任务互不阻塞。保留 UTF-8/ANSI/分块/重连/早期异常/运行阶段绑定及有界增量读取，缓存仍仅在内存，活动条目不被逐出。每轮路径验证只解析每个精确文件一次，当前文件类型/大小、指标内容哈希及读取期间变化检查保留，不读取权重内容。

将本批只读元数据函数提取后在 H20 通过标准输入运行，不部署或写文件；一次实际窗口查询，按每批四项、最多四并发核实：43 个当前 native 窗口全部已结束且退出码 0，43 份产物全部匹配，用时约 6.63 秒，没有读取原始日志。此证据确认现场产物完整，但不代表原日志无异常，也不等于已安装新版入口已验收。

本机展示投影共有 44 个 H20 登记，投影不含 collectionResultCsv，不能直接作为完整查询选择器。额外登记 CORIM PAD seed44 的 commandId 77f6cf6556334e6ab3f2a5d9bf5f57d1 没有当前窗口；按当前 corim.yaml 明确声明的 mode/result_csv 核实该精确 outputDir，最终观察 result=null，未取得有效完成清单。不能把该项补成完成，未重跑或修改它。43 个实际窗口的验证采用真实 native header，不依赖缺字段的 UI 投影。

新回归先复现阻塞日志持有全局锁及产物回执等待日志，再验证隔离、日志超时不清除产物、逐 job 日志错误互不污染、异常复核和真实非零退出；查询身份和 HTTP 路由隔离也验证。没有更改 MultiModal、模型、数据、指标或训练逻辑，没有安装环境依赖，没有重跑、重发、停止任务或清理文件。

## 构建验证

最终 npm run package 完成 121 个串行测试文件，833 项通过、0 失败。每次 Python 回归只提取目标函数；阻塞夹具在 finally 中解除并回收线程，同一日志重入直接返回待核实。编译 PanelHtml 及三个实际渲染脚本的 vm.Script、253 模块运行闭包、8 个 Python AST、禁止固定端口和秘密排除检查通过。

确定包 simple-experiment-0.5.359.vsix 为 3,036,704 字节、526 条 ZIP 记录；373 个 dist 文件与本机构建逐字节一致。SHA256 为 eb092f9914ec92b586a3b049943e6393d976e9a25ff933e1270227f863d410c2，同名 .vsix.sha256 绑定精确文件名。包内本文为构建补记前版本，补记不更换已验证字节。此前已记录的额外旧 workspace 正则断言问题不在本批修复范围，未据此更改生产保护。

## 实际交付

源码提交 88aa92d6e6fdb689da965977782317613a4a4263 已普通推送 origin/master，fetch 确认一致。真实稳定 Latest 为 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.359，tag 与 target_commitish 均绑定该源码提交，draft=false、prerelease=false；VSIX 大小、GitHub digest 及 98 字节逐包 SHA256 清单与确定包一致。

已安装旧版 0.5.358 的实际 ReleaseClient 识别更新，并实际下载 Experiment 0.5.359 与现有 SimpleSFTP 0.2.91 及各自校验清单；身份、平台、版本、文件名、大小、SHA256、GitHub digest 与本机确定包字节一致。隔离验证目录 C:/Users/ZLK/AppData/Local/Temp/simpleex-0359-release-verify-U6O8gB。SFTP 复用包 169,109 字节，SHA256 e483156ad117fd8c3aaeb81d01fc0285ad6ce7c698827b589ad16596a9ea453e，未修改、未重复安装。

仅执行一次 npm run install:latest，本机为 0.5.359；373 个安装 dist 文件与包一致，simpleex --help 正常。安装后停止当前面板/API 操作，也不再继续 SSH。未部署远端 Agent/Scheduler；用户重载并通过原入口更新后再验收正式 UI/API。旧运行时不会自动拥有新的元数据/日志隔离协议；H20 本次只读函数验证及合成回归均不能替代新版部署后的正式入口验收。
