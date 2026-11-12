# Windows 日常点击验收

本轮以 Windows 0.5.485 为初始实点基线。当前安装并运行 0.5.503 与 SimpleSFTP 0.2.120，继续逐入口实点；0.5.504 为输出检查与数据画像的返修候选。入口状态以 windows-entry-coverage.json 为准，静态源码位置不等同当前可达控件分母，动态行和菜单单独记载。整体入口尚未全覆盖，不以自动回归或局部修复替代实点验收。四个停止任务和两个成功实验的原证明保持；界面保持侧栏，只验正常条件。本人暂不执行永久删除；不继续该文件的确认或执行。

## 0.5.504 业务返修候选

- 配置路径实点确认会误改当前 PLAN：点击 Generic 卡片 config.yaml 后，编辑器打开正确，但 SDK 返回 selectedPlanId=config.yaml，而计划选择框仍显示 acceptance.yaml。已通过原计划卡片恢复 selectedPlanId=experiments/plans/acceptance.yaml，没有启动任务或改写文件。共用文件打开处理器现仅对配置的 PLAN 目录内 YAML 切换选择，配置、结果文件及路径归一后落在目录外的文件保持原选择；20 项工作区隔离回归先 19/20、修复后 20/20。最终 7 套件定向 runner 2026-11-12T10-42-22-831Z-65764-test 全过，exit0、21312 ms。中途 2026-11-12T10-38-35-232Z-88848-package 经正式 cancel 输入正常结算，9 作业中的第 9 项取消、overall=cancelled、exit1、lockReleased=true，未记通过。
- 首轮完整 package 322 作业、13 门禁通过，exit0、826929 ms，记录 2026-11-12T10-22-01-453Z-69924-package/run.json，未发布、未安装。期间实点另发现 PLAN 卡片丢弃通用 metrics.csv、MultiModal 的 job_metrics.csv 等显式路径，错误展示推测的四个标准文件。取消输入因会话 stdin 已关闭未送达，该轮实际正常结束，之后才修改源码。新增行为断言先复现同一错误，再修正显式路径识别和推测来源区分；目录推测及旧契约去重保留。7 个受影响套件于 2026-11-12T10-37-00-304Z-4988-test 串行通过，exit0、23541 ms；最终冻结 package 尚待重跑。
- 继续实点当前计划文件跳转，实际打开 Generic acceptance.yaml 且未修改；MultiModal 进入实验准备并手动刷新识别后，13 个计划、当前验收 PLAN 及完成 1/1 一致，原修改中的 final.md 保留。草稿 UI 的四处旧源码已核实没有渲染调用，实际搜索无入口，单列已退役，保留外部兼容命令。12 个 MCP 查询实际通过；独立 SimpleSFTP target 因未设置 .vscode/sftp.json 明确报错，不计目标配置流程通过，指定 rjj8 的文件查询正常。详细状态分别保留于覆盖清单，不把文件登记的历史实例当实时存活证明。
- 冻结前共享结果消费者定向 runner 2026-11-12T10-20-16-070Z-28764-test 实际 11 文件串行通过、exit0、37190 ms，maxObservedConcurrent=1。首次筛选误用逗号拼接 --only，记录 2026-11-12T10-19-37-234Z-14112-test 实际 0 文件，不能当测试通过；已改为逐项 --only。中止的旧构建锁阻断后，经本人明确允许，只删除 process-owner.json 并确认精确目标不存在，未触碰其他锁、报告或实验数据。
- 0.5.503 四个结果工具均实际命中 rjj8 和所选 acceptance PLAN。输出契约错误要求项目未声明的两个快照，且把嵌套 output_dir 替换为单级通配符，漏掉已经存在的 metrics.csv/model.pt；数据画像没有样本却报告泄漏检查 ok。这两项不计通过。候选复用 Scheduler 的真实 case/seed/naming 展开，核对全部声明文件，显式声明只要求其中的快照；未显式声明的旧快照契约保留。无可读样本明确标为 not_checked，实际重叠样本仍报失败。
- 定向实际输出契约回归通过，覆盖通用模型文件缺失、MultiModal 同形七项声明、显式快照缺失、旧快照缺失及其他 PLAN 结果不被借用。结果元数据排除套件首次因提取夹具缺少 Scheduler 失败，补齐实际函数闭包后 3/3 通过，未删除原断言。空数据、空表、有样本及真实重叠四类画像回归通过。新版完整打包及实机复核尚待完成。
- 一次误调用 npm run build 启动完整回归，随后误并发运行单文件测试，违反单测试进程约束；已中止该轮，exit1、未生成完成 run.json，不记通过。原始日志保留于 2026-11-12T09-56-55-352Z-91632-build；只读核对已无残留测试进程，后续定向均串行完成。后续冻结 runner 不再修改输入。

## 0.5.503 已交付及实点复核

- 后续实点运行区“刷新运行状态”，低流量下执行结束，四个停止及一个完成事实保持。逐个点击停止任务和成功任务的“重新分析运行日志”：前者缺少执行证据时明确待核实、退出码未知；后者实际完整日志无异常、退出码 0，未重跑，原确证时间保持。高级操作记录实际展开；历史记录按钮打开无日志列表，完整日志按钮明确提示文件不存在，不能当非空日志通过。另有重载前历史 MCP 请求仍为 running/resultAvailable=false，实际 SDK 查询一致；其告警与普通实验任务不混算，原因尚未核实。
- 最终 package 322 作业、13 门禁通过，exit0、818165 ms，记录 2026-11-12T09-21-47-739Z-36412-package/run.json；实际 VSIX 380 项、327 运行模块、秘密排除和 vm.Script 通过。源码 515a1331fef7d591e0c5f0a83db0826c3d2369c0 已同步 origin/master。试行 v0.5.503 已发布并真实下载比对：3082045 字节，SHA256 7fa9f17bbcc210413fc0f0c221dd02b568e07f1c2dee907e44df7e7bdc5a8fe6。原生及认证更新客户端均核对权威 Latest 仍为 0.5.483/0.2.118，试行不降级。
- 本机仅安装一次，两个窗口通过标准 Reload 重载。新官方 SDK 返回 Generic/PID68616、MultiModal/PID81276、正确项目和 0.5.503。CLI 从插件仓库以显式 --workspace 查询 Generic，顶层根目录、API 工作区及服务状态均正确。Codex 持久 MCP 仍绑定 0.5.499，实际拒绝版本不匹配且未发送业务请求；本轮后续使用新官方 SDK stdio 连接，不把持久连接记为已更新。
- Generic Agent 首次 ensure 因原 0.5.502 远端源码哈希不符失败；随后已授权 project_prepare 成功并保持原任务，rjj8 的 Agent @52 和 Scheduler @15 实际 0.5.503、来源一致，重复 ensure 复用成功。MultiModal 服务尚待本轮结束恢复到最终版本。
- GPU0 单卡手动刷新实际显示 2026-11-12T09:47:42.000Z 和 17:41–17:47 的曲线；普通 idle 投影、滚动及导航后仍保留真实样本。高级诊断的配置、Worker、端口和能力条真实显示，rjj8 为 localhost:18770 → localhost:18765；可选 list/upload 未提供不再误报升级。“启动 Worker 隧道”含义已核实。
- 准备后至 09:48 未再出现分布队列继承失效租约的错误。配置输入框等待期间造成后台资源冲突的独立问题仍待处理，不能与已修复的失效租约合并算通过。手动添加 Worker 可见且不遮挡，已实点新增名称输入后取消，配置未改变，只计预览；重置布局实际恢复默认且读回一致。全局高级命令设置已恢复默认 false。
- 检查点清理预案实际完成但候选为空，没有删除；PPT 绘图契约实际导出到所选 PLAN 路径，内容尚未复核。这两项不扩大为非空保留策略或实际绘图通过。PLAN 清理、隔离批次及空目录审核只检查预览，未执行确认、移动或删除。

## 0.5.503 实点返修候选

- 返修后定向 runner 2026-11-12T09-20-54-023Z-55460-test 实际 8 个文件、exit0、18066 ms，通过消息分发、真实只读租约、GPU 缓存/粗细粒度、诊断和全部按钮接线检查；此前路径写错的两个 UI 套件本次已实际入选并通过。后续完整 package 冻结期间不再改动输入。

- 首次完整冻结 package 为 321/322 通过、exit1、782681 ms，记录 2026-11-12T09-06-47-775Z-2544-package/run.json。唯一失败为旧测试要求两个 webview 租约调用点；本轮已合并为共用工作函数。测试改为核对两条入口都调用该函数，并新增带状态/无状态分别验证两个只读查看和配置写入的实际分发回归；5 项租约及 15 项消息分发直接通过。没有放宽只读豁免集合、写锁或原安全断言；最终打包尚待重跑。
- 新增实点：专用 git_ui_source_501 仓库通过界面登记为祖先，master/c47f0acf/干净状态读回一致。界面从该祖先实际创建 codex/ui-acceptance-503，独立 worktree 位于 acceptance_files/artifacts/git_ui_source_501--codex-ui-acceptance-503，同基点、干净且登记已验证。分支行打开实际生成独立 VS Code 窗口，取消其项目初始化后关闭；原 Generic/MultiModal 窗口保留。未新建 GitHub 仓库或 PR。
- 分支工具的刷新状态、刷新统一策略、刷新运行状态和结果对比逐个实点。策略确认显示当前服务器配置一致，保存替换/新增 0 台；两个专用仓库的运行查询显示未打开匹配实例，结果队列确实不存在并显示为空，没有借用其他项目任务或伪造科研验证。非空跨分支实验及 GitHub PR 仍未验。
- 原生配置端口已实际打开并确认 18766/18999 原值，rjj8 的 localhost:18770 → localhost:18765 保持且无端口冲突；等输入期间后台队列于 09:07:47.264Z 记录资源占用错误，单独保留为后续需核对问题，不算全部无误。

- 0.5.502 已实际安装一次并标准重载两个窗口，新 SDK 均返回正确工作区和版本。试行 v0.5.502 绑定 87127cd7f5ddcad0ce4984b7c1478272f9d86a00，VSIX 为 3080957 字节，SHA256 e6a555969eee01a80e2ebe9ea6b8c187d934cc02f01d28ddc92e70d0e95c7edf；远端资产实际下载一致。原生更新客户端两次受到 GitHub 403 限流，未记通过；认证的真实 ReleaseClient 查询确认权威 Latest 仍为 0.5.483/0.2.118，试行版不降级。
- 0.5.502 原生暂停全部网络活动及恢复实时流均实点成功，暂停状态、请求预算与低流量偏好读回一致。离线导入分别实际选择 JSON 文件及导出目录成功，随后恢复在线并保留原任务。任务卡“查看窗口日志”一次点击即定位并捕获 rjj8/@16/GPU1 的原始训练日志，无需第二次手动刷新。原生“清除缓存”打开审核页，实际显示本机 0、rjj8 6 个含仅预览候选；未确认或执行删除。
- 新缺陷：CLI 从插件仓库运行 project status --workspace 验收项目时，API 工作区正确但顶层项目根仍为插件仓库。修复根目录解析遵循显式 --workspace，18 项直接回归通过。后台调度定时器继承已完成准备请求的资源租约，随后反复报租约失效；仅让定时器从请求租约外创建，17 项回归通过，失效前台写入仍拒绝。
- 四个相关结果工具实际均到达处理器，但缺少 Worker 归属而报错。GUI 入口现对唯一启用 Worker 明确绑定，多 Worker 时先选择再取写租约；取消为取消终态。MCP 保留显式 Worker 参数和原归属核验。14 项消息分发回归通过，实机最终效果待 0.5.503 安装后核实。
- GPU 单卡手动历史入口实际仍显示“尚未手动刷新”且曲线消失。回归复现普通 idle 投影清空新样本，以及重复旧历史覆盖新样本；修复后 9 项直接回归通过。手动时间使用 Worker 真实采样时间；项目或端点改变时清除旧曲线、提示与待响应，防止跨对象显示。另有 9 项粗细粒度曲线回归通过，最终新版仍待实点。
- 诊断页接回已有配置、Worker 和端口渲染器，能力条使用已启用 Worker 的实际探测，区分待检测和未提供；不把缺少可选文件接口误报成需升级。相关渲染输入变化纳入现有刷新键。“启动 Worker”保留命令但明确标为启动隧道，避免误称启动 Agent。
- 定向 runner 2026-11-12T08-59-37-772Z-27680-test 实际 10 个文件通过；两个后续套件首次路径写错而未入选，未算通过。第二次 2026-11-12T09-05-08-994Z-69112-test 因编译中递增版本触发 input-hash-drift，exit1、invalidated、0 文件，不能复用；最终冻结 package 必须重新完成覆盖。GPU 测试的 Windows CRLF 提取问题已修正，保留所有原断言。

## 0.5.502 正常操作入口返修

- 最终冻结候选 package 实际 322/322、13 gate、exit0、842769 ms，通过记录 simple_cluster/reports/test-workflow/2026-11-12T07-38-46-964Z-63952-package/run.json；没有改变旧自动刷新断言或超时。实点中新发现的高级诊断问题留待下一批：四个配置/Worker/端口区域未调用已有渲染器而空白；能力条仍读旧顶层能力，已健康 0.5.501 的 rjj8 也被误报“需升级”。“启动 Worker”实际启动隧道，旧提示却称启动 Agent，需要同步说明。该批未修复项不计通过。

- 0.5.501 实点任务卡“查看窗口日志”，准确定位 rjj8/GPU 1 的 @16 后仍停留在“正在定位”，110 秒后捕获区仍为空；另点手动刷新立即读到同一任务日志。低流量门禁将跳转后的首次读取误当自动刷新。候选只把任务卡点击的手动意图传给首次精确匹配，后续列表刷新继续服从原门禁。真实渲染脚本与消息处理器回归先 12/13、修复后 13/13，覆盖其他 Worker、重复响应与后续自动读取不获手动许可。
- 结果区“输出契约、数据集画像、检查点清理预案、PPT 绘图契约”四个相关入口逐个实点后均仅跳回自身，没有发出业务操作。候选保留原 ID、导航锚点和紧凑样式，接到既有四个处理器；清理预案只生成预案，不执行删除。原有 resultContractCompact 套件补四项真实按钮绑定断言，先失败、后通过。
- 上述两项加入前，第二轮完整 package 为 322/322、13 gate、exit0、825151 ms，记录 simple_cluster/reports/test-workflow/2026-11-12T07-21-13-947Z-26492-package/run.json；该包未发布、未安装，不能作为后续修改的最终证据。后续定向首次因旧脚本检查要求自动刷新调用点保留而失败，记录 2026-11-12T07-36-23-819Z-14504-test；保留原断言与自动分支，仅明确区分首次手动分支。最终五套件通过，记录 2026-11-12T07-37-09-013Z-37352-test。此前一次 --only 写错审计套件目录，实际四文件，不把缺席套件算通过；最终正确路径已实际执行。
- 0.5.501 结果区 acceptance 的 CSV 与 Markdown 按钮分别打开当前验收汇总，任务身份和指标一致；拆表按 rate_percent 的空值实际生成 experiments/results/_unassigned/methods/acceptance/by_rate_percent/empty.csv，读取内容与来源行一致。PPT 浏览、新建路径分别打开正确文件类型对话框后取消，只记预览；配套 PPT 插件未启动，绘图最终效果未验。
- GPU 总览手动刷新与历史曲线已实测；单卡展开后低流量下缺少手动历史入口，候选复用已有按精确 GPU 系列刷新控件，不开启自动查询。TMUX 手动选 @16、刷新捕获、暂停/恢复跟随、跳至最新和核实复制附着命令分别实点；退出码 0、原日志及精确窗口保持，未执行终端命令或清理。

- 实点 0.5.501 的高级“暂停全部网络活动”命令抛出 client.pauseAll is not a function，未实现暂停。真实 MultiEndpointRealtimeClient 没有暂停和恢复入口，之前的 host fixture 恰好模拟了不存在的方法，漏掉这处错误。新增使用两个真实 Worker 客户端和实际 RequestBudget 的回归先失败，再为多端点客户端接入各 Worker 的暂停/恢复，并同步宿主预算；恢复实时流统一进入原恢复网络流程，保留低流量偏好及原任务。
- 实点“配置隧道端口”在打开输入框前被同窗口“写入调度队列”资源锁拒绝，随后重复弹命令错误。没有活动训练、没有手动写操作，也未移除锁。新增真实资源管理器的回归，先保持后台精确队列写入、再请求原宿主配置入口；旧实现失败。最终候选仅为原生命令 configure-tunnel-ports 和面板 configurePorts 复用现有资源锁的有界等待，不关闭互斥、不改其 30 秒边界或授权；其他入口和显式不等待的调用方保留原来立即拒绝忙态的行为。
- 缓存回收审核实际列出 6 个归属未知的日志，展开可查看精确路径且所有文件仅预览、不可选；没有执行删除。摘要却将这些文件称为“可回收”，候选仅改为“候选（含仅预览）”，保留两页审核及所有执行保护。
- 定向回归：lowTrafficDisplayRework 旧实现 15/16，错误与实机一致；修复后 16/16。hostOperationLeaseIntegration 旧实现 3/4，修复后 4/4。未修改超时或退役覆盖。完整候选检查及新版实点仍待完成。
- 首轮 0.5.502 package 为 321/322，exit1、811168 ms，记录 simple_cluster/reports/test-workflow/2026-11-12T06-44-32-098Z-38960-package/run.json。新增的等待默认曾扩及其他入口，syncScopeWriteLease 的跨窗口立即拒绝用例达到 20 秒，job-231 原始日志保留；没有延长测试超时或将该轮视为通过。最终修正恢复非端口入口原语义，完整修正后的候选仍需重新检查。
- 实点离线 JSON 导入时，Windows 原生对话框因同时设置文件和目录模式而只能选择目录，输入真实 JSON 精确路径后报“文件夹名无效”。目录格式的专用软件快照已导入，MCP 曾返回 offline_import、schemaVersion=1；随后实点“恢复实时流”，实际恢复 xshell_tunnel_realtime、offline=null，未改科研任务。候选先选择 JSON 或目录，再打开单一类型的选择框；实际 importOffline 方法的回归先失败、修复后 3/3。
- 最终收窄等待和离线选择修复后的三个定向套件通过，记录 simple_cluster/reports/test-workflow/2026-11-12T07-07-06-125Z-78004-test/run.json。更早一次定向命令把六个文件用逗号放进单个 --only，实际运行 0 文件，不计通过；正确重复 --only 后六套件实际通过，记录 simple_cluster/reports/test-workflow/2026-11-12T06-43-37-983Z-17972-test/run.json。

## 0.5.501 发行及新增实点

- 源码 d0e05602d3905fbad30d7597bb391ac648f1237e 已推送并 fetch 核对 origin/master。试行 v0.5.501 实际 tag、提交、资产、下载包和 SHA256 文件匹配，prerelease=true、latest=false；实际更新客户端仍看到正式 0.5.483 / 0.2.118，试行不降级。0.5.501 与配套 0.2.120 各安装一次、两窗口标准重载；新 SDK 命中 Generic PID 78840、MultiModal PID 47584 和各自正确根目录。原 MultiModal 未保存页保留；不把新 SDK 连接冒充原 Codex 持久 MCP 已重连。
- 实点原生命令“准备 Agent 并启动”，确认 rjj8 与 Generic 精确目录后成功，通知使用新的实际就绪文案。主动 inspect 确认为 Agent @50、Scheduler @15、0.5.501；Agent 源码摘要 a5226b3ebc6c8de107ee6220f23dd8c921d4c265d149728eaee783c347ae378d、Scheduler 833e8c6d68ad834d054179dea695bcbe8f6e75782e004535f0e95c04f0fe96b5 与最终包一致。
- 产物下载复测真正通过：同一 acceptance_files/artifacts/ui_transfer_0_5_500.txt 从 rjj8 副本经过两页完整路径确认回写本机；本机变为 57 字节，SHA256 626219d4dbcfbc4bced6809312ec7d2f469927bc959d0033d38e1e1ae5aa98c1。文件树将本机与 rjj8 合并为同内容副本，原自身写锁冲突未再出现；cleanup_20261111.txt 仍为 49 字节原摘要，transfer_20261111.txt 仍为原 47 字节摘要。全目录摘要实际使用“目录内”。
- 设置“转到结果区编辑”在首次延迟渲染前点击后，映射编辑器已展开。实际 GUI 更新全部 PLAN 返回本轮 1/5 job、另有 1 项未发现运行记录的声明；当前 PLAN 的 metrics.csv 正确显示 3 列、seed 42、accuracy 0.953125、loss 0.10787482559680939 样例。保存按钮可用且成功，真实配置 projectAdapterRules 读回 csvColumnMapping={}、derivedMetric={}，未保存原始 CSV 到本机或重写 MultiModal 结果。
- 审计刷新实际为 232 按钮、78 命令、接线 0、payload 0、Worker 0。右键折叠“接线”仅影响该卡，展开恢复；完整明细显示五项分布且其他卡不被拉高。另发现 5 个按钮缺说明、12 个缺悬浮提示；已从源码核对 analyzeRuntimeLog、applyPlanDatasetMapping、autoMatchPlanDatasets 并补说明。其余两项标识仍需逐条核对，不把截断显示猜作真实命令，也不当作处理器失效。
- 高级命令“启动 Worker 隧道”“启动全部后台隧道”“启动全部后台连接”分别实点。均核对唯一启用 rjj8、root@127.0.0.1:15791、localhost:18770→localhost:18765，最终返回 rjj8:ok。未启用其他 Worker。“重启实时流”后实际 reconnectCount=1、心跳更新，低流量下 streamStatus=disconnected，Agent 健康；不将主动低流量关闭显示流当作 SSE 已连接。
- “配置 Worker 隧道”实际进入 rjj8 编辑字段并核对原名称、地址、用户和三个端口，在认证方式页退出，未变更认证；完成返回后原清单保存为 1 个启用。“配置 Xshell 会话文件”兼容入口实际进入同一当前 Worker 清单，退出未改配置，仅记预览。高级显示开关为继续验收临时开启，结束前须恢复原 false。
- 原生命令“清除缓存”另行实点，新审核页列出相同 6 项仅预览日志，没有借用顶部按钮的证据充作命令证据。“写入 Agent 自启动 RemoteCommand”展示精确 XSH、备份和 Generic Worker 路径后取消；旧自动隧道配置也实际进入当前 Worker 清单，两项保留且仅记预览。
- Git 专用对象在已信任验收文件夹的 acceptance_files/artifacts/git_ui_source_501，origin 仅指向相邻 git_ui_remote_501.git。初始提交 58c8a38c52ad2c77db10fead15437ba5361e7839；实点“同步到 GitHub”后 acceptance.txt 提交 3679f95f9ebbdae44b40c9ca49c70db71036a0d1，源 HEAD、origin/master、裸仓 master 一致且源干净。只覆盖实际 Git 提交/推送链，不声称验证 GitHub 认证或新仓库发布。
- 专用仓库中实点“配置提交自动备份”，真实 hook 安装。随后创建测试提交 c47f0acf17f4624f2ed5ef94880fb418cf6740cd，hook 自动推到本地 origin，无手动 push；两端一致。追加独立用户注释后，实点“移除提交自动备份”，插件段确实移除，hook 文件及用户注释保留，未删除文件。原 MultiModal、Generic 和发行仓库未参与这些 Git 操作。
- “安装或补装配套更新并重载”原生命令在已装试行版状态执行，实际状态栏为 0.5.501 / 0.2.120 已是最新；未安装、重载或降级，仅覆盖无更新分支。
- GPU 总览实际显示唯一启用 rjj8 的 8 张 GPU；展开 GPU 0 后归属与无进程状态正确。总览“手动刷新历史”读取后实际绘制 24 小时曲线、显示手动查询时间。单 GPU 明细未提供相同手动入口，低流量下展开只触发被关闭的自动请求，留下空图；候选在原明细复用既有按序列手动刷新和时间提示，不改变自动请求门禁。相关五套件通过，记录 simple_cluster/reports/test-workflow/2026-11-12T07-20-10-178Z-23772-test/run.json；新控件仍待新版实点。
- TMUX 区实际刷新 rjj8，显示 8 个 GPU 会话、本项目 1 个任务标签及 5 个归属未核实会话。选择 GPU 1 的 synthetic_classifier/seed42 精确 @16，再刷新日志，内容为原 commandId 78e8aab0f09dcad43c5fe305b826d3f4、20 epoch、原指标及 pane_dead 退出码 0。暂停跟随、继续跟随、跳到最新分别实点；“核实并复制附着命令”主动核实后复制 tmux attach-session -t '=zlk-gpu-1:@16'，剪贴板长度 39、目标准确，未执行终端指令或关闭任何窗口。

## 0.5.501 结果编辑与本批实点返修

- 0.5.500 设置中保存专用结果目录，再重新读取实际项目配置一致；随后恢复 experiments/results。浏览按钮实际打开该项目结果目录，选择原目录后保存一致。配套更新检查返回已是最新，保留正式 0.5.483 / 0.2.118 与本机试行 0.5.500 / 0.2.119 的区别，不把客户端缓存时间冒充新网络查询。
- 结果总表实际更新全部 PLAN，核实 1/5 个已有 job，另有 1 项从未运行的声明未纳入运行分母；未重跑训练。实际 CSV、Markdown 按钮打开本项目 final.csv / final.md，accuracy=0.953125、loss=0.10787482559680939 与原 MCP 导出一致。原 MultiModal 历史表未改写。
- 实际 final 行“拆表”选择 result_family=acceptance，取消词条、全选、排除 plan_file 列并生成，专用 by_result_family/acceptance.csv 存在且保留相同指标，确实没有 plan_file 列，源表不变。
- 运行环境的管理 AI 授权按钮实际打开当前 Generic 根目录的授权页，退出后授权未变，只计预览。检查项目配置按钮生成 2026-11-12T05:21:46.523Z 的真实报告，0 错误、1 警告、6 PLAN。部署 Agent 按钮核对并确认 rjj8 的 Generic 精确路径后正常结束；后续 MCP 主动检查仍为健康的 @49 Agent / @15 Scheduler、0.5.500，@12/@16/@9/@15 等原窗口均保留。
- 项目同步范围按钮打开实际独立编辑页，索引本机和 rjj8 完成。点击编辑、保存现有范围后，项目设置仍为 config.yaml、experiments、train.py，未扩大传输范围。另发现全文件比较把目录内所有文件标成“同步范围内”，与真实勾选不符；候选仅将这个全目录比较摘要改为“目录内”，不改变勾选、传输或文件状态。
- 确认并修复：相同零值的诊断卡片共享折叠身份；展开明细拉高同排卡片；结果映射跳转先于延迟渲染而丢失；协议 2 的主动结果摘要在旧归属投影中丢失 source，继而误判旧版本；当前内存 CSV 解析没有提供编辑器列名样例。候选为审计卡片设置独立稳定身份，延迟展开仅消费一次且离开结果区取消，按 PLAN 保留主动查询身份和各自源列预览，不落盘原始 CSV、不借用其他 PLAN 样例。
- 四项新断言先在旧实现失败：审计卡片单文件 exit1，其余三套件完整记录 simple_cluster/reports/test-workflow/2026-11-12T05-18-29-803Z-10708-test/run.json。首批修复后五套件通过，记录 simple_cluster/reports/test-workflow/2026-11-12T05-19-37-541Z-49272-test/run.json；之后补充旧摘要过滤与离开结果页的断言，最终检查仍待运行。没有改超时、停跑测试、重写完成证明或执行删除。
- 正常重复准备也错误显示“首次准备”和必须识别工作区，候选提示改为本次服务已就绪及实际版本来源核验通过，保留原操作入口。本批完整打包、试行交付及新版实点仍待完成。
- 第一轮完整 package 实际 321/322 通过、exit1，记录 simple_cluster/reports/test-workflow/2026-11-12T05-28-50-611Z-25424-package/run.json。失败为 agentFirstRunPreparationWorkflow.test.js 仍匹配旧“首次准备完成”文案；已同步两处期望，首次失败完整保留于 job-072-agentFirstRunPreparationWorkflow.test.out.log，不将该轮记为打包通过。
- 文件树已实点展开、显示一致项、两个同步范围页及编辑保存。本机 transfer_20261111.txt 临时改为 52 字节后，从本机来源按钮经过两页精确路径确认上传，界面主动内容校验显示远端相同版本。原 47 字节内容已通过命名 MCP 恢复，操作 mcp-f310ab3e-f14c-4bbc-81c2-0b21ebb3ecd9 确认为 succeeded 且 chunked-sha256 通过，原本机摘要仍为 2c3224c2233be261891a8226051055adc9df36cf61caac0f1dc0c8aa4df154eb。未勾选的 cleanup_20261111.txt 本机 49 字节原摘要不变，未执行删除。
- 普通 acceptance_files 下的 txt 按既有代码保护被拒绝回写，这次尝试不计下载通过，也未放宽代码归属。改用明确产物 acceptance_files/artifacts/ui_transfer_0_5_500.txt 后，经过两页确认仍因 SimpleSFTP 与当前“同步范围：保留版本”的父写锁冲突失败；本机 29 字节、远端 57 字节保留给复测。候选通过同窗口 SimpleSFTP 命令进入原 API 下载处理函数，保留父写锁、真实传输控制、路径确认和出队后的项目身份核验，不关闭互斥或改走其他工作区。单文件和批量回写共用该入口，普通 CLI/MCP HTTP 下载保留原行为。
- SimpleSFTP 新 API 行为断言先失败后通过，覆盖父写锁内成功、另一窗口仍互斥、错误项目拒绝和排队期间切换项目拒绝。SimpleExperiment 的四个定向套件通过，记录 simple_cluster/reports/test-workflow/2026-11-12T05-49-56-346Z-23736-test/run.json。配套 0.2.120 的 runtime 闭包 23 文件、69 套件共 466 项及 VSIX 打包 exit0，完整输出在 D:/GitRepo/MCP/simple-sftp/package-0.2.120.log，逐文件原始日志在 C:/Users/ZLK/AppData/Local/Temp/run-YUG9Ru。源码 22849216c87e089b17e4b2a30680a01e30c00c77 已推送，试行 v0.2.120 已发布并下载核对 tag、提交、242849 字节和 SHA256 91bd1e2617d5b04c91ae65584d2710b3c4c3e6f9e93b520429f7ac75ea2d65b7；Latest 仍为 v0.2.118。首发请求 EOF、核对未创建后第二次成功，原失败保留。尚未安装，不将下载记为实点通过。
- 0.5.501 最终 package 的 322 项串行作业及 13 个门禁全部通过，exit0、790415 ms，输入前后一致（6410f651b96ea613b66cbe0b65b6c65512d111becf517952f2874c245956e5de），记录 simple_cluster/reports/test-workflow/2026-11-12T05-54-05-379Z-22756-package/run.json。vm.Script 与实际 VSIX 的版本、平台、380 项、327 个运行模块字节及秘密排除通过。VSIX 3080523 字节，SHA256 ab4568a457703a9b00ea966eaf4d52edc6d62da498b91f23145f2a25135ea932。自动检查不替代新版实点。
- 另实点命令面板的真实 Xshell 集成检测，返回 rjj8:ok；生成 Xshell 会话启动脚本经原生保存框写到 acceptance_files/artifacts/start-xshell-acceptance-500.bat，读回实际 rjj8卡.xsh、SSH15791、18770→18765 配置一致。仅验证生成，未执行脚本。

## 0.5.500 诊断审计修复

- 实点后续：Generic 新面板刷新得到按钮 47、命令 39，接线/说明/悬浮/payload/Worker 均为 0；明细实际展开并完整显示固定、右侧、行级、发布与主列五条分布。只证明本轮当前已渲染控件，不等于全部入口通过。
- 新发现缺陷，尚未修复：对接线 0 右键选择“折叠此卡片”，说明 0、悬浮 0、payload 0 和 Worker 0 也同时折叠；对原卡片选择“展开此卡片”后全部恢复，未使用全局重置。原因范围已定位到状态卡片由数值标签生成相同身份。另有明细展开时同排数字卡片被拉高的显示问题，下一批集中处理，不提前记为通过。
- 本人重连后，原生 Generic MCP 实际返回 0.5.499、正确工作区、PID 51956；面板 ready、lastFailure=null，原项目授权保持。原成功任务 completed 及原停止任务 cancelled 均保持。本轮工具目录只有 Generic，实际窗口清单也没有 MultiModal 窗口，不把其新 SDK 的旧证据当作本轮原生重连通过。
- 审计“接线 24”确认包含显示错误：按钮 title 转为 data-tip 后未计入已有提示；缺说明和缺悬浮又叠加进处理器接线计数。现按真实提示判断说明与悬浮，接线只统计缺处理器，三个计数分别显示。仍保留真实缺说明或无提示按钮，未降低处理器与 payload 核验。
- 原审计明细放在会被统一移除的 span title，且只保留前四条。改为可展开的完整明细，原数字卡片和右键菜单入口保留。本批仅影响诊断显示，不改实验、同步、配置或授权业务。
- 两个新增行为用例先在原实现失败，完整原始输出在 simple_cluster/ui-audit-red-0.5.500.log。修复后的审计、面板脚本和折叠滚动三个串行套件通过，记录 simple_cluster/reports/test-workflow/2026-11-12T04-21-43-345Z-34292-test/run.json；原单次遍历及帮助缓存断言保持。首次 test:features 筛选未包含 test/ui 文件、实际运行 0 项，不计为目标回归通过，随后已用正确入口实际运行。
- 重新打开已授权 MultiModal 窗口后，该路原生 MCP 已实际返回 0.5.499、正确项目根、PID 57248；两路 0.5.499 的重连现已核对，不再记为旧版连接阻塞。
- 0.5.500 最终 package 322 项串行作业及 13 个门禁全部通过、793161 ms，输入前后一致（40126cf437e779faf7e663c424fec95d61f658efbf52034c32d543627d70eaff），记录 simple_cluster/reports/test-workflow/2026-11-12T04-22-48-964Z-72968-package/run.json。vm.Script、实际 ZIP 的 380 项、327 个运行模块、版本、平台、runtime 字节和秘密排除通过。VSIX 3079598 字节，SHA256 60a2b1acbeab789b9998f325fbc75a839d7841e31cc2214c1da21a14eb0c3440。源码 839a32e8ae72a8e9b40c76b7f2d7d582f7d9158d 已推送，试行 v0.5.500 已发布并真实下载核对；仅安装一次且两窗口已标准重载，实际面板复核及新发现见上节。其他未测入口、本人授权撤销和暂缓删除的状态不变。

## 0.5.499 停止状态刷新修复

- 本人重连后，Codex 原生 MCP 两路均实际返回 0.5.498 和正确项目根，MultiModal PID 89272、Generic PID 64844；面板 lifecycle=ready、lastFailure=null。此前原生连接版本不符的阻塞已解除。
- 面板运行环境区的启动全部隧道实际核对 rjj8、root@127.0.0.1:15791、localhost:18770 → localhost:18765 并启动成功；同一区域检测全部实际返回 rjj8:ok。重复打开隧道确认页后取消，环境区位置保留；此前一次跳到结果区的现象暂未稳定复现，不宣称已修复。
- Generic 四个已停止控制任务在本轮查询中错误显示 unknown，磁盘仍保留精确取消证明。87daf103e2ca8b69d1bd5fb4d9a69e10 的取消时间仍为 2026-11-11T19:02:34.755Z。原因是实时查询缺失或拒绝另一项目 Agent 时，共享归并未恢复已有取消证明。现复用同一身份核验恢复逻辑，未刷新证明时间、未重发或重新停止任务。
- 回归先在原实现因空 Worker 查询返回 unknown 失败；修复后 mcpProject、verifiedCompletion、distributedPlanQueue、distributedQueueCacheStability 四个串行套件通过，记录 simple_cluster/reports/test-workflow/2026-11-12T03-24-12-130Z-60552-test_features/run.json。新增断言覆盖查询缺失、项目不符、查询错误、查询进行中及完整空清单，并拒绝另一身份或无证明的取消恢复；不修改调用方输入。
- 最终 package 322 项串行作业及 13 个门禁全部通过，输入前后一致（ab450dd4ab2d0064be9e8441257cdaf08525b5d1be114b3d19ecee0d18aadf6a）、801308 ms，记录 simple_cluster/reports/test-workflow/2026-11-12T03-25-28-115Z-61368-package/run.json。vm.Script 与实际 ZIP 的 380 项、327 个运行模块、版本、平台、runtime 字节及秘密排除通过。simple-experiment-0.5.499.vsix 为 3079508 字节，SHA256 dd893b4fd2455fb29be4793e22aba9265871ea571faf8fa65fdf885b0ba07b09。首次定向失败的完整输出保留在本轮工具记录，后续 runner 的定向和完整检查日志已落盘。
- 设置中的打开命令设置实际定位 showAdvancedCommands；临时开启后执行暂停实时流，原生 MCP 读回 streamStatus=paused。恢复命令执行后为 disconnected，当前仍是另一项目 Agent，不能算作健康连接恢复通过。显示选项已恢复默认关闭。命令面板检查服务器配置实际保存 rjj8 → /root/autodl-tmp/zlk/SimpleMcpAcceptance 的目标，MCP sftp_servers 读回一致，setup 前后相同；未启动新 Agent 或训练。
- 通用项目功能可用性审计实际刷新为按钮 43、命令 40、payload 0、Worker 0、接线 24。接线数混合处理器、说明和悬浮提示，明细仍需核对，不能据此宣称 24 个按钮失效或全部接线正常。诊断入口待后续检查。部署本项目 Agent 横幅可进入当前项目和 rjj8 的准确准备确认页，本轮退出，暂记预览。
- 源码 6e45afed00592734dc5016126ee6cf2aad912ce5 已普通推送并 fetch 确认。试行 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.499 精确绑定该提交，draft=false、prerelease=true、latest=false；3079508 字节 VSIX 与 97 字节 SHA 文件均实际下载核对一致，SHA 文件自身摘要 4eb1ed721d4969236a59af320edc54dbe9171a32d70a07882f3cc1a9306707fc。真实 ReleaseClient 返回 up_to_date，正式 Latest 保持 0.5.483 / 0.2.118，不降级已装试行版。install:latest 仅执行一次，已安装清单为 0.5.499 / 0.2.119，simpleex 稳定入口有效。
- 两窗口标准重载后 Generic PID 46976、MultiModal PID 15068 均实际返回 0.5.499，未保存的 final.md 页保留，未再次出现已确认的全局配置提醒。新 SDK stdio 对 Generic 原四个停止任务在隧道未连通、正常连通和另一项目 Agent 三种本轮实际查询中均确认 cancelled，原 provenAt/finishedAt 保持，未修改落盘证明。正常连通的完整响应另存 simple_cluster/mcp-retained-stop-connected-0.5.499.json，另一项目响应存 simple_cluster/mcp-retained-stop-live-0.5.499.json，明确保留 AGENT_PROJECT_MISMATCH。
- CLI 指定 Generic 工作区实际查询四个原 commandId 为 cancelled、原成功任务为 success。面板实际打开 PLAN 下拉框，四张控制 PLAN 均显示已中止，原 acceptance.yaml 为已完成 1/1；退出下拉后原选择未变。未重跑训练、重新停止任务或执行清理。
- rjj8 的 Generic 准备 mcp-5775c82e-f554-47ea-97e7-d5afd4e6a2af 完成，Agent @47 / Scheduler @15 为 0.5.499；精确停止 @47 后 MultiModal 准备 mcp-bb4b92b7-69f5-40b1-b277-b438ab070da3 完成，最终 Agent @48 / Scheduler @9 为 0.5.499。实际 Agent 哈希 8e8b5c619585ce700b803feb7682359de126902c5292af09d76e669342464323、Scheduler 哈希 5982db6c0c465203204ef339975b73f8f5417ec7412bff1b28d9137887c45d5d，原 @12/@16/@9/@15 保留，未更新其他 Worker。
- 两个方向共享端口切换后的原成功完成保持均通过，MultiModal verifiedAt=2026-11-11T10:28:00.155Z、Generic verifiedAt=2026-11-11T21:39:45.642Z 未变。最终 MultiModal 新 SDK 连接核对 138 项声明和 9 次实际调用通过，原任务主动查询 observed、completed/verified/exitCode=0，面板 ready 且无当前失败；未调用其结果收集或导出来重写历史结果。MultiModal 最终保留原窄侧栏。
- Codex 两路原生连接本轮均实际拒绝 0.5.498→0.5.499 版本不符，未发送业务请求；新 SDK 成功不能替代原生重连。当前覆盖为 42 命令（实点 18、预览 2、未测 22）、175 静态 data-command 位置（实点 19、预览 2、未测 154）、138 MCP 工具、115 迁移项及 38 条动态观察。剩余入口和诊断接线提示待继续；永久删除继续暂缓，授权撤销仍需本人操作，不计为通过。

## 0.5.498 项目归属与产物查询实机复核

- 源码 4ca277e85facc328fe184eb0351c25eeae854846 已普通推送并 fetch 确认，试行 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.498 精确绑定该提交，draft=false、prerelease=true、latest=false。VSIX 和 97 字节 SHA 文件均经真实下载核对；SHA 文件自身摘要 a1752965f2c67e996dc6a878fc58556d0b2e5fd01df823e7a676204cd8470c32。原生 ReleaseClient 为 up_to_date，旧版仍只看到正式 0.5.483 / 0.2.118，试行不降级。install:latest 仅执行一次，稳定 simpleex 入口有效；两窗口标准重载后 MultiModal PID 27108、Generic PID 83360 均为 0.5.498，原未保存页保留，未再次弹出已确认的共享配置提醒。
- Generic 准备 mcp-e7f99115-d66f-41d7-bd38-76fe0973297b 成功，Agent @44 / Scheduler @15 为 0.5.498；此时 MultiModal 的 task_list 与 experiment_list 明确拒绝另一项目的 Agent 查询，原 completed/verified/exitCode=0 及 verifiedAt=2026-11-11T10:28:00.155Z 保留。Generic 的 138 声明、30 次真实 SDK 调用通过，结果详情、CSV 导出、按原 commandId 查询产物及按返回 ID 检查产物均成功；目录元数据的 size/mtime/hash 为空，不冒充逐文件内容核验。
- Generic 原任务以新鲜的退出码、完整产物及日志观察重新确认为完成，新的 verifiedAt 为 2026-11-11T21:39:45.642Z，没有手工写回旧证明或重跑训练。精确停止 @44 后，MultiModal 准备 mcp-f8430383-5d54-46ca-b1c4-e9eb8277e4af 成功，最终 Agent @45 / Scheduler @9 为同版；Agent 哈希 f44a9f56a06f445f48fcf66a3f91903349ea5abdf59a66cd1a6aefd4c17e900f、Scheduler 哈希 1b2249691f428bacc31bdd83f0e73c2794bdbaa58dee9183e414d3191034f971 均与最终包匹配，其他 Worker 未更新。
- 反向切换后 Generic 的 task_list 和 experiment_list 保持新确证完成、原 commandId 和相同新确证时间，queryState=unknown 并附明确 AGENT_PROJECT_MISMATCH；artifact_list 以 failed/ARTIFACT_QUERY_UNVERIFIED 结束，不再假装空列表成功。另按实际配置 http://localhost:18770 发送只读的错误项目绑定请求，新 Agent 在处理前返回 403；同一错误绑定的健康查询仍返回实际 MultiModal 根目录，未隐藏诊断。MultiModal 新宿主的 138 声明和 9 次查询也通过。
- TensorBoard 在新边界下另行实测 19 次调用通过：mcp-ffc6276e-c86a-4f12-858f-5c9f80fb6372 实际建立 @46，running/listening/proxyVerified 均 true；两种 viewer 链接绑定本项目且未自动打开浏览器。mcp-b2b1aed4-1ee8-42e2-abfb-1c02c7eb9049 精确停止后主动确认 @46 不存在、原 @12/@16/@9/@15/@45 保留，保存链接已去除凭证。最后 Generic 面板实际显示已完成、确证完成 1，所选 acceptance.yaml 未改变；MultiModal 恢复原窄侧栏。
- Codex 原生 MCP 仍绑定 0.5.494，实际返回 0.5.494→0.5.498 版本不符并明确未发送业务请求；新 SDK stdio 的成功不能冒充旧原生连接已重连。需要本人回来后重连两路 MCP。授权撤销未由 AI 代选，永久删除按本人决定暂缓。当前清单为 42 命令、175 静态 data-command 位置（实点 16、预览 2、未测 157）、138 MCP 工具、115 迁移项及 34 条动态观察；不以目录映射、自动测试或上述局部实机通过宣称所有入口通过。
- 最终 package 已通过 322 作业、13 gate，实际最大并发 1、输入前后一致、总耗时 819784 ms，记录 simple_cluster/reports/test-workflow/2026-11-11T21-23-50-562Z-73632-package/run.json。vm.Script、包策略、身份、平台、327 模块字节闭包和秘密排除通过；380 归档项。VSIX 3079479 字节，SHA256 408b3198575ea5103dea4e6f67b391df49af834aee01db4a3483e43043181052。发行、单次安装和新宿主复验已完成，详情见本节实机记录。
- 范围仅为上批两个实机缺陷：项目请求错误命中另一 Agent，以及 commandId 的产物列表为空。项目读取先读取同一端点健康信息，核对配置中的远端项目根；服务端再在实际处理前核对请求绑定路径，防止切换服务后处理其他项目的数据。健康、版本、GPU 与精确 tmux 查询保留各自用途；精确停止没有新增健康/版本前置条件。未添加新重试、超时、缓存或任务重放。
- 产物查询先将 experiment 映射到其 PLAN，再按确切 runId 或声明输出路径筛选。读取 summary.results 完整列表，不使用前 200 行预览；现代查询 current=false 明确返回 ARTIFACT_QUERY_UNVERIFIED，不把失败当空列表。旧路径元数据与本机产物入口保留。
- 新增回归先在原实现失败，修复后 TunnelClient 13 项、原生 HTTP handler 2 项、产物/CLI 7 项、原生完成投影 10 项及 Worker API 契约 8 项通过；MCP 21 项通过。修改均在 GUI/CLI/MCP 共用边界。最终 package、新 Agent 实机及双项目切换后的完成保持已完成；未手工恢复 Generic 已被上版错误撤销的旧证明，已用真实新观察重新确认，并保留首次错误与原确证时间记录。

## 0.5.496 返回结构与打包

- 实机后续：源码 83c5b3f42900774e648bd4ecb4e634708c087fa9 已普通推送并 fetch 确认。试行 v0.5.496 的 tag/提交、3077462 字节 VSIX 和 97 字节 SHA 文件均经真实下载核对；SHA 文件自身摘要 9a0e9bac7d63af44dae09ee85393572e9c54e296dabb1bb40db6504daf43da40。实际原生 ReleaseClient 返回 up_to_date，正式 Latest 保持 0.5.483 / 0.2.118。单次安装后两个窗口标准重载，MCP 分别命中 MultiModal PID 44748、Generic PID 46660，均为 0.5.496；Generic 在重载尚未结束时首次连接 closed，后续新连接成功，没有将该瞬间记为业务成功。两个窗口未再弹已确认的共享配置提醒。
- rjj8 的 Generic 准备 mcp-5c00407d-078c-4f6e-9d93-dd02a46dc367 成功，Agent @38 / Scheduler @15 均为 0.5.496；精确停止 @38 后 MultiModal 准备 mcp-c6edbb2b-3689-4c8f-9232-6df9fb446ad7 成功，最终 Agent @39 / Scheduler @9 为同版。Agent 哈希 4de1fdb718b27fa56f2fedc1945a0303ab8c6d08047fed8a0b8a480bba1137fa、Scheduler 哈希 7a85205746d41df4e30afd4b6eab9a42043e0ba258ce5d443dcf91bdefc19d57；未更新其他 Worker。
- 新宿主 SDK 已确认 134 个实际声明与候选逐项一致；Generic 前 9 次状态、授权、任务、GPU、tmux、诊断和准备结果查询通过。随后 result_show mcp-f04758b7-8d6b-4265-9464-d6aff3194fcb 的延迟结果被 SDK 以 outputFiles/0 must be object 拒收，实机核验失败。原始结果 outputFiles 是字符串路径数组；诊断捕获只读取该既有回执，旧声明确实拒绝，新候选通过，不把诊断绕过输出校验当作客户端验收通过。证据 simple_cluster/mcp-advertised-generic-0.5.496.log 与 mcp-rejected-native-result-0.5.496.json。

- 当时 134 个具名 MCP 工具均有独立 outputSchema。长操作目录与宿主请求调度共用同一声明，operation_get 按原 tool 校验延迟结果；顶层列表包装、原生附加字段、数值或字符串错误代码及 detail 均保留。没有修改授权、清理确认或实验业务。
- 官方 SDK 19 项定向回归通过；候选结构对两项目当前 0.5.495 宿主的 55 次只读响应核对全部匹配，覆盖 51 个工具。54 次业务成功；1 次为 sftp_target 未配置独立 .vscode/sftp.json 的真实错误，原错误保存在 simple_cluster/mcp-output-sftp-target-0.5.496.json，未改写消费项目设置。绑定 Worker 的目录、树、清单、文件属性查询均正常。
- 配置参数明确要求目录返回的完整命名空间键；更新 MCP 接入文档的当前版本及历史记录标识。最终 package 的 322 作业、13 gate 全通过，输入前后一致、实际测试并发 1、827510 ms；记录 simple_cluster/reports/test-workflow/2026-11-11T19-26-10-193Z-28624-package/run.json。vm.Script、包策略及 ZIP 身份检查通过，380 项、327 runtime 模块、秘密命中 0。VSIX 3077462 字节，SHA256 31c6d2a38ccc5067c9de541218244cfadfa270389ec2af3680855298b1de066d。发布、安装及新宿主实机核验仍待完成。
- 打包冻结期间在 0.5.495 MultiModal 面板实点发现 GPU 导航子项与主项没有定位到对应标题，后续视口还发生漂移。此项尚未定位原因、未混入本批；保留为后续修复，整体界面验收仍未通过。

## 0.5.497 返修候选

- 实机与发行：源码 ee5ab4166a4a879986e51d113b5b2d6933964ac1 已普通推送并 fetch 确认；试行 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.497 精确绑定该提交，prerelease=true、latest=false。两资产真实下载匹配，SHA 文件 97 字节、自身摘要 eda6ebf0e2d0a6987bcf1eb097dc9a1ebfab9609d1acf10a87428d209f6a061d；实际原生 ReleaseClient 为 up_to_date，正式 Latest 保持 0.5.483 / 0.2.118。单次安装后两窗口标准重载，Generic PID 62900、MultiModal PID 80352 均为 0.5.497；未保存 final.md 页保留。Codex 旧原生 MCP 连接仍绑定 0.5.494，明确返回版本不符且未发业务请求，需本人重新连接；以下成功均为官方 SDK 新 stdio 连接，不冒充旧连接已重连。
- rjj8 Generic 准备 mcp-e48c8dfe-68c6-4d5b-aa48-4eea62172bee 成功，Agent @41 / Scheduler @15 为 0.5.497。精确停止 @41 后 MultiModal 准备 mcp-64ff70d3-41bc-4f51-8cd1-895ae5da77fa 成功，最终 Agent @42 / Scheduler @9 同版；Agent 哈希 29ec99de7984a96e989e5006e34dac1c3a050b472529e77dac748db602022531、Scheduler 哈希 52598b34d3c49c7617832aab0a9b4ac25c93ce5c90c0094594fa469c029497b9。原 @12/@16/@9/@15 均保留，其余 Worker 未更新。
- 两个新宿主实际声明均为 138 项，SDK 与逐工具 schema 匹配。Generic 20 次调用无 schema/业务错误，result_show 和 CSV 导出的真实路径、指标、来源及可空时间通过；artifact_list 传 commandId 返回空数组，只证明返回契约，不能计作产物业务通过，正确 experiment/PLAN 映射待修。MultiModal 9 次查询通过，原 bc9df623805ca30d675854c0044f4bd2 为 observed/completed/verified/exitCode=0，原 verifiedAt 仍为 2026-11-11T10:28:00.155Z；Worker 的其他历史待核实提示仍保留。
- 四个 TensorBoard MCP 工具共 19 次真实调用通过：启动操作 mcp-74e4e1d5-9549-4d42-996b-d86b7fad2567 取得实际 @43、running/listening/proxyVerified 均 true，两个 viewer 地址绑定本项目且未自动开浏览器；停止 mcp-af8baf75-afe5-4e0b-bee7-b866c3b79929 后服务 running=false。成功 tmux 主动查询确认 @43 不存在，原 @12/@16/@9/@15/@42 保留；保存证据已去除链接凭证。两项目新增普通工具的逐项批准配置已补齐，默认 prompt 和专项审核项未变。
- 新版实点：GPU 主项定位状态标题，子项定位 GPU 总览，后续刷新保持在对应 GPU 区域，未回跳原结果页。低流量保持开启，刷新窗口列表后仅点击原 image_only_bus_p100 seed 42 标签，日志获取时间自动更新为 2026-11-11T21:08:30.050Z，无需点击“刷新当前日志”；实际 commandId、done index=0 与 Pane dead status 0 匹配。曲线测试窗口已关闭，未重训或改写 MultiModal 历史表。
- 剩余真实缺陷：共享端口恢复 MultiModal 后，Generic 的 task_list/experiment_list 从 MultiModal 根目录读取该 Generic commandId 的日志和声明产物，并将缺失当作真实反证；原 Generic 完成确认已错误降级。原远端任务窗口 @16 保留，先前同版本 Generic Agent 下退出码、完整产物与原证明已实测。下一批限制为修复 Worker 查询的项目归属边界、正确映射产物查询对象，并复验两项目；不手工改写旧证据、不重跑训练。原始前后快照见 simple_cluster/generic-tasks-after-other-agent-0.5.497.json 与 mcp-advertised-generic-0.5.497.json。
- 最终候选 package 的 322 作业、13 gate 全部通过，输入前后一致、实际最大并发 1、总耗时 822099 ms；记录 simple_cluster/reports/test-workflow/2026-11-11T20-49-09-563Z-15836-package/run.json。此前失败的原生 tmux 场景本轮通过，首次失败仍保留。vm.Script、包策略、身份、平台和 327 模块字节闭包均通过，380 归档项、秘密命中 0。VSIX 3078315 字节，SHA256 1c1a0c3adef1026d1b7d168f4b79598439a8c6720bd7c73e9cf00d1483b5a1e1。
- 结果声明遵循既有 ResultRow.outputFiles:string[] 和 observedAt:string|null；不改业务值。官方 SDK 回归先失败后通过，19 项通过，覆盖真实延迟结果、路径字符串和非法对象拒绝。
- 两个滚动保留回调记录现有导航锁，在新导航取代旧视口后不再恢复旧位置；常规视口恢复改为即时，保留显式平滑跳转。新增行为回归复现旧回调将 900 覆盖为 100，修复后通过。导航相关 4+7+3+3+9 项回归及 compile、vm.Script 通过；首次 CSS 断言取到被覆盖的早期样式，已修正夹具选择，未改生产行为迁就断言。GPU 真正实点仍待新版安装。
- 本批最终候选尚未完成打包、发布或安装；早期包的实际结果见下文。逐入口全量验收、独立 SFTP 目标及本人授权撤销实测仍未完成；永久删除继续暂缓。
- 首份候选 package 的 322 作业、13 gate 已全部通过，输入前后一致、实际并发 1、835295 ms；记录 simple_cluster/reports/test-workflow/2026-11-11T19-49-33-809Z-8108-package/run.json。冻结期间继续实点发现以下正常流程缺陷，因此未提交、发布或安装该候选；最终候选另行验证，不能复用首包声明完整通过。
- 低流量模式下点击任务标签只改变选择、未读取日志。实际手动“刷新当前日志”可取得 rjj8/zlk-gpu-1:1 原日志、bc9df623805ca30d675854c0044f4bd2 的 done index=0 和 Pane dead status 0。已将手动 Worker、任务、窗格、GPU/窗口选择及旧选择器的读取标为 user；不改变自动刷新策略。新增回归先失败后通过，tmux 选择/关闭保护与低流量策略相关 19+7+1+2+2+16 项通过。
- 任务 API 的 Worker 汇总将 controlIncomplete/diagnosticsPending 当作每个 job 的查询失败，导致 queryComplete=true、无 queryErrors、当前任务原生 completed/complete/verified/exitCode=0 时仍显示 unknown。改用本轮查询完整性，继续保留合并层已核过的该任务身份、路径、新鲜度及各类实际查询错误；Worker 汇总提示仍在原返回中。真实宿主箭头函数回归先失败后通过，10 项通过，并覆盖冷连接、缺少协议、未完成查询、该任务自己的失败及原完成时间不刷新。
- 0.5.496 额外实点：PLAN 搜索、失败状态空筛选、名称排序、筛选后单项全选和清空均正常，原 acceptance 选择保留，最终恢复空搜索/全部状态/扫描顺序/零批选。tmux 实际刷新为 rjj8 会话 8、GPU 8、任务标签 1、归属待核实 5；日志暂停/继续跟随、跳到末尾正常，附着复制重新查询 @12 后得到 39 字符精确 tmux 命令，未执行终端。GPU 刷新显示 8 张 3090，单卡展开/折叠、合并开关、进程列隐藏/恢复及设置关闭正常；无历史点时未宣称曲线数据通过。授权命令确实打开当前 MultiModal 路径的授权/撤销选择页，退出未修改授权，只记预览通过。
- 上述原始界面观察保存在 simple_cluster/live-ui-0.5.496-details.json。后续观察保存于 live-ui-0.5.496-final-details.json。当前为 42 命令、175 静态 data-command 出现位置、138 MCP 工具、115 迁移项；静态实点 16、预览 2、未实测 157，另有 31 条动态观察。该分母不是全部按钮和行内控件总数，最终包与新宿主实点尚待完成。
- 第二份候选 package 实际退出 1：321 作业通过、1 失败，总耗时 794100 ms，输入冻结保持；记录 simple_cluster/reports/test-workflow/2026-11-11T20-10-10-626Z-12580-package/run.json。原生 WSL/tmux 控制测试的非零退出场景观察到 pane_dead=1，但 pane_dead_status 为空，未取得预期退出码 7；没有超过 Node 20 秒上限。未修改生产 Python、测试时限或断言。单独隔离该原场景后通过，随后完整原测试文件 3 项通过；首次失败原因仍未确认，原日志保留，不能宣称已修复。
- 0.5.496 后续实点：通用项目“识别工作区”检测到已有 6 个 PLAN，通知中心“查看现有”正常返回列表，未覆盖配置，只记该分支预览通过。重新选择 acceptance.yaml 后，实际页面与 MCP 均为同一路径，显示原确证完成 1/1。
- MultiModal rjj8“打开曲线”实际加载原验收任务的 1 个 seed、7 个标量指标及 60 step 曲线；原生页实际创建专用 TensorBoard @40，等待后显示真实原生页面及曲线。关闭本轮新浏览器标签，再经 CLI 精确停止该服务；CLI 返回 null 不作完成证明，成功 tmux 主动查询确认 @40 消失，原 @12/@16/@9/@15/@39 保留，未重训或改写论文结果。
- 上述 CLI 展示动作返回空值，因此补齐四个具名 TensorBoard MCP 工具，复用现有业务函数并返回真实服务结果。MCP 21 项、宿主 6 项及设置/标量消费者 10 项定向回归通过，包含真实授权上下文撤销后在网络写入前拒绝。最终版本须重新完整打包，不能复用前两份候选包作为本次通过证据。

## 0.5.495 修复与实机核验

- 原生 job 卡新增“停止此任务”，仅携带原 Worker、commandId 和 workflow，调用 GUI/MCP 共用的精确停止逻辑；保留原派发、清理和旧停止入口。终态任务不显示该按钮。新增渲染、按钮参数和真实宿主分支回归，与既有覆盖合计 54 项通过。
- 冷面板状态不同步的两个遗漏已定位：PLAN 渲染模型没有纳入未选中 PLAN 的状态摘要，执行区域刷新标识没有纳入 Worker 观测与队列代次。补齐后，摘要单独变化、API 先读状态及随后面板刷新有行为回归；投影套件 6 项通过。旧停止路由与结果解析 12 项通过，compile 通过。
- 最终 package 的 322 作业、13 gate 全通过，输入前后一致、最大实际测试并发 1、823941 ms；记录 simple_cluster/reports/test-workflow/2026-11-11T18-40-46-116Z-55520-package/run.json。vm.Script、包策略及实际 ZIP 身份检查通过，379 项、326 runtime 模块，秘密命中 0。VSIX 3071499 字节，SHA256 5623d0ca8010b8d8d287c34bdc289bceb47894466bf8c30cff49b4b9f90697cd。
- 源码 07d3e092a64148c4871fb0a54f7a3f3916418d4d 普通推送并 fetch 确认等于 origin/master；试行 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.495 的 tag 精确绑定该提交，draft=false、prerelease=true、latest=false。下载的两资产与本机包逐字节一致；SHA 文件 97 字节，自身 SHA256 aa85866534a59e14c2afbb8775c611df37c0fae88f0004161d91c4a6004b3137。首次实际更新客户端请求返回 GitHub 403，提示限流至 2026-11-11T19:03:54Z；后续实际原生客户端返回 up_to_date，真实发布客户端分别核对正式 Latest 0.5.483 / 0.2.118、旧版可见更新、试行版不降级。未更改发布渠道或生产网络逻辑。
- install:latest 仅执行一次，清单为 SimpleExperiment 0.5.495 / SimpleSFTP 0.2.119，稳定 simpleex 入口可用。两窗口通过标准 Reload Window 重载，MultiModal 未保存 final.md 页仍为已修改。新 stdio MCP 分别返回 Generic PID 15680、MultiModal PID 61172、各自根目录及 0.5.495；没有再次弹出已确认的全局复用提醒。原生 MultiModal MCP 在升级前已实际确认 0.5.494，不能把新 SDK 连接的 0.5.495 证明当作旧持久连接已重连。
- 原生 MultiModal MCP inspect 确认旧 Agent @34 后，agent_stop 返回 stopped。Generic 准备操作 mcp-6a06b654-f34a-4e8e-bb00-9211d46f731e 成功，Agent @35、原 Scheduler @15 均为 0.5.495。Generic 精确停止后，MultiModal 恢复操作 mcp-e72ffa10-cab1-40da-894d-dca13bc85357 成功，最终 Agent @37、原 Scheduler @9 均为 0.5.495。主动返回的 Agent 哈希 88cdacfb6e45b9f3a13174deb8bccff3a2663d3621b4d3e4084a0815a968fca1、Scheduler 哈希 31d59f0b01360d25bcc9ee0f3bc6ea6985b7f3890cfb7d47fb72a0ffa42fc3a2。停止旧 Agent 后 tmux API 曾返回 fetch failed/空 sessions，未将其当作窗口已消失；新 Agent 下主动列表核对 @12、@16、@9、@15 保留，@34、测试任务窗口及随后 @35 不再存在。其他 Worker 未更新。
- 新控制 PLAN normal_stop_ui_0_5_495.yaml 保留同一软件脚本、seed 42、独立输出 work_dirs/mcp_controls/normal_stop_ui_0_5_495；预检 mcp-fce67fa3-0ee6-4008-86c4-353f74820849 succeeded、ready=true。面板选择与 MCP state 均为该精确路径；MCP plan_run 的父回执 workflow-run-1794423699281-wk6jkf 不作为训练完成。实际 workflow distributed-plan-1794423706074-rpryha、commandId 87daf103e2ca8b69d1bd5fb4d9a69e10 在 rjj8/GPU 0 运行，revision=6c908e0a570b8d1c9cb0bbb35f671642b755c5adc0c6d1592a2441979d21bf14、codeFingerprint=dc790bf0199658ebf3426acd3bc284aa15016e249e1d4ee1f34d6034fe0db121。
- 主动 task_list 确认 running 后，不再提交写动作，面板摘要、PLAN 选择器和卡片随后自行更新为运行中；旧三个 PLAN 保持已中止，原 acceptance 保持已完成。点击摘要进入运行进度、展开该新卡，实点“停止此任务”。未点清理或重派。共享 stopProjectTask 确认精确停止，原队列留下 trustedTerminalProof，outcome=cancelled、provenAt=2026-11-11T19:02:34.755Z；nativeStartProof 仍记录 windowSeen=true、observedAt=2026-11-11T19:01:55.295Z。MCP 与显式工作区 CLI 随后均为 cancelled；面板显示运行 0、失败 0、已中止 4、原确证完成 1，停止按钮从终态卡消失，日志与产物入口保留。
- 停止控制任务没有最终 manifest，远端原始观察仍是 missing/incomplete、日志无正常结束标记；本轮 Worker snapshot 的 controlIncomplete/diagnosticsPending 为 true，jobLifecycle/CLI 如实保留 queryState=unknown。该复查状态不推翻本机精确停止证明，也未把控制任务计为成功。MultiModal 恢复后原 bc9df623805ca30d675854c0044f4bd2 仍为 completed/verified/exitCode=0，面板选择器已完成 1/1；未刷新其既有完成证据时间、未重跑或重写论文结果。
- 设置齿轮与关闭设置可往返同一项目和 PLAN。手动添加入口无遮挡，实点至新 Worker 名称页后退出，列表仍为原五个配置、仅 rjj8 启用；Xshell 导入可显示实际本地到远端端口对，取消后未导入，两项仅记预览。接入任务复制得到 969 字符及两条精确 v0.5.494 指南链接；设置中的指南链接实际在 Edge 打开对应 GitHub 页面。专用 cleanup_20261111.txt 仍存在、49 字节，未继续删除审核。
- 当前清单为 42 命令、175 静态按钮出现位置、134 MCP 工具、111 迁移项；静态实点通过 14、预览通过 2、未实测 159，另有 11 条动态观察。保留 0.5.494 缺少停止入口的历史发现，并新增 0.5.495 修复实点证据。本批不调整 MCP 业务或授权；逐工具返回结构留待下一批完成。

## 0.5.494 当前修复

- 静态检查接受显式 declared 协议及通用 runner.outputs 列表，复用 PlanBuilder 的命令与结果声明解析；通用命令格式不强制旧的 suite/config/seeds 与固定 CSV、日志文件名。旧格式检查保留，真实完成仍由退出码和 artifact manifest 判断。覆盖普通命令、块列表、行内 runner、缺失结果、配置文件与既有路径检查；25 项静态检查回归通过。
- 主动取消单独统计为已中止，不计失败；取消作业的 unverified 结果和已移除任务窗口不再生成误导的待核实或丢窗提示。宿主汇总、面板投影、PLAN 选择器、任务卡和总计的相关回归通过。初步 build 的 272 项作业通过；该记录早于最终版本与静态检查收尾，不能代替最终 package 记录。
- 命令面板“检测全部隧道”实点后健康时间与状态更新，但没有手动检测进度和通知。工厂绑定遗漏旧入口的 testTunnel(true)，本轮同时恢复两个手动检测命令的标记；新增行为回归先失败后通过。README 补齐已有高级命令显示开关，保留原文档及原断言。最终打包与实点结果见下一节。
- 首份 0.5.494 package 的 322 作业、13 gate 全部通过，耗时 820280 ms，记录为 simple_cluster/reports/test-workflow/2026-11-11T17-23-16-168Z-60936-package/run.json。打包期间发现上述命令缺陷，候选未安装、未发布；随后重新完成最终包的规定检查。
- 最终 0.5.494 package 已通过 322 作业、13 gate，输入前后一致、串行最大并发 1、总耗时 823959 ms，记录 simple_cluster/reports/test-workflow/2026-11-11T17-40-36-511Z-17008-package/run.json。最终 VSIX 为 3071291 字节，SHA256 87a9f01fde3ba97fc080e0843ea5a1fb864c1f55fe6326f9c308981beaa30109；379 归档项、326 runtime 模块的字节闭包、版本、平台、包策略和秘密排除通过。源 README 缺少已有高级命令开关说明的额外检查先失败，补齐说明后 2 项通过；原断言未改。
- 0.5.493 实点新增：命令面板复制 Panel 诊断后剪贴板为合法 JSON，39774 字符；诊断区两个静态报告按钮分别打开原报告、复制 26501 字符。导航搜索“诊断”与定位可用；刷新按钮审计显示已缓存，当前 DOM 为 187 按钮、65 命令，该快照不等于全部入口验收。
- 0.5.493 命令“恢复 Panel”实点后重新显示当前项目及所选 PLAN；MCP panel_diagnostics 为 ready、rendererNeedsReset=false、sectionFailures=[]、lastFailure=null。“手动快照”反馈已查询 1/1 台 Worker、69 个任务、核对 0 项原操作。为验高级命令临时打开显示设置，最终复验后恢复原 false。
- 原静态报告 21 个错误的首次实机证据保留于 simple_cluster/reports/check-static-0.5.492-original-failure.md。当前两个取消任务仍使用原 commandId，不重跑，不改写 MultiModal 结果；其余未实点、授权撤销和用户暂缓删除的状态保留。
- 新版界面启停使用独立 normal_stop_ui_0_5_494.yaml，seed 42、原软件控制脚本及专用输出 work_dirs/mcp_controls/normal_stop_ui_0_5_494。本机创建与面板选择后，已按下一节完成真实启动及停止；MCP state 与实际执行 PLAN 路径一致。下一批 MCP 返回结构需按工具细化：当前 Server.ts 仅给所有工具同一宽泛 outputSchema，不能记作每工具返回契约已完成。

## 0.5.494 发行与实机复核

- 源码 310e9571f40c5e86fb27314f50c459afb2c0e41e 已普通推送并 fetch 核对 origin/master。试行 Release 为 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.494，tag 精确绑定该提交，draft=false、prerelease=true、latest=false。实际下载的 VSIX 与 97 字节 SHA256 文件均匹配本机验证包；SHA 文件自身摘要为 344f02c5a76259445c720ca9282520c2b94faea6853ded586dd39fe0b524c7bf。实际 ReleaseClient 确认正式更新仍为 0.5.483 / 0.2.118，已装试行版不降级，配套 0.2.119 试行资产仍可取得。
- install:latest 仅执行一次且成功，code 清单为 SimpleExperiment 0.5.494、SimpleSFTP 0.2.119，稳定 simpleex 入口可用。通过标准 Developer: Reload Window 分别重载两窗口，MultiModal 未保存 final.md 页保留。新 stdio MCP 实际命中 Generic PID 14132 与 MultiModal PID 14508，各自返回正确工作区与 0.5.494；两个窗口未再次弹出已确认的全局复用提醒。Codex 原生 project_status 实际返回 0.5.492→0.5.494 的 API_PLUGIN_VERSION_MISMATCH，明确未发送业务请求，仍需本人重连；不将 SDK 直连测试冒充原生工具已重连。
- 精确停止 MultiModal 辅助 Agent @31 后，Generic project_prepare 操作 mcp-7758c399-865c-46ac-99e1-e50603d3ac0e 成功，Agent @32、Scheduler @15 均为 0.5.494。结束验收后仅停止 @32，再以 mcp-08b8fd32-b546-486c-91e6-b9cea926043f 恢复 MultiModal，Agent @34、Scheduler @9 为同版。两个项目均主动核对 Agent 哈希 9656609916f4e597928cb724ac009563a46155788003acf493aef1083db1c7eb、Scheduler 哈希 f58db2794f8ffd703d75cbb3fb6875a020739d8be7f2e6a188556d9c4f739a93；MultiModal 命令面板版本核验也提示全部一致。其他禁用 Worker 未更新。
- Generic 实点“检查项目接入”，实际报告生成于 2026-11-11T18:01:29.208Z，toolVersion=0.5.494，5 个 PLAN、0 错误、1 warning、2 info、overall=passed。原失败报告仍保留。此结果证明静态接入检查通过，不证明训练完成。
- 面板选择 normal_stop_ui_0_5_494.yaml，MCP state 返回同一路径；从摘要按钮启动后，按已授权的 root@127.0.0.1:15791、/root/autodl-tmp/zlk/SimpleMcpAcceptance 核对一次性上传位置，没有选择永久抑制。实际 workflow distributed-plan-1794420554044-ifyqpn、commandId 8371bcf755cdec1b4492c003f83aa0f5 在 rjj8/GPU 0 运行；revision=934f568dc86dc61fd5bfc03349b13b977cad9aabcfb640287563e9755f77fe9f、codeFingerprint=f3106e82f128f415522e6ed037407f56f85e2a8fdad187cb65da89e97d0d2b71。训练脚本未改。这是软件控制任务，不作科研结果。
- 原生分布式 job 卡只提供派发/重派和清理等入口，没有独立普通停止按钮，本轮不点清理。MCP task_stop 精确停止上述任务，操作 mcp-85a948f5-5dde-42c6-b5f3-c9d968500a75 succeeded，completionSource=exact_window_observation、paneClosed=true、cacheRetired=true、stoppedPids=[]；原记录保留，后续 MCP 与显式工作区 CLI 均返回 cancelled。面板显示已停止/已中止、已中止 3、失败 0、原确证完成 1，没有将该任务计为成功。实际 tmux 列表保留 @12、@16、@9、@15，@31、@32、测试窗口 @33 已消失，最终辅助窗口为 @34。
- 两个隧道检测命令分别实点，均返回“隧道检测完成。Worker：rjj8:ok”。高级命令显示开关已通过界面恢复，完整配置键 simpleExperiment.showAdvancedCommands 返回 false、scope=application；首次使用未带命名空间的键被正确拒绝，MCP 参数说明仍需补充完整键示例。Generic 启动时更新检查曾返回 fetch failed，手动检查配套更新后返回 0.5.494 / 0.2.119 已是最新，MultiModal 同样正常；保留首次失败，不由此推断代理实现缺陷。
- 尚存的一致性问题：重载后、随后 MCP task_list 与 project_state 已返回旧任务 cancelled，但面板手动快照后未选中的旧 PLAN 仍显示待核实；新任务提交/停止触发状态更新后，旧卡又正确显示已中止。下一批核对共享观测与面板缓存更新，并补普通停止入口；MCP 逐工具返回结构随后补齐。现有 UI 入口分母及未实测项保留。永久删除专用文件仍存在且为 49 字节；授权撤销未由 AI 操作。

## 记录规则

入口清单由 scripts/entry-coverage.js 从当前 package、面板和两插件 API 生成，保存在 [windows-entry-coverage.json](windows-entry-coverage.json)。静态清单不包括所有动态菜单，必须用真实面板补充。每个入口分别记录实点通过、发现缺陷、未实测或已退役。只打开审核页记为预览通过。源码可达、自动回归和 API 成功均不能冒充人工点击。

当前源码盘点为 42 个 VS Code 命令（包括新增授权命令）和 175 处静态按钮声明。两者不可相加作为去重分母；动态行和上下文菜单还未完整盘点。当前尚未获得全覆盖结论。

当前静态声明位置中实点通过 16 处、预览通过 2 处，其余 157 处仍未实测。42 个命令面板入口尚未全部核验，不能把同业务按钮或 MCP 的通过转记为命令面板通过。动态控件盘点未结束，不计算整体覆盖率；默认隐藏的高级命令须在启用对应设置后单独验收。

0.5.485 运行中宿主的实际目录为 58 个 API 方法、191 个动作，已保存在入口清单的 liveBaseline。动作目录和 safe 字段都不能证明按钮已点击或具有写入授权。0.5.490 完整 322 项串行回归通过，不能替代剩余实点。原始记录为 simple_cluster/reports/test-workflow/2026-11-11T10-15-41-498Z-38512-package/run.json，退出码 0，总耗时 847421 ms。

## 实点与效果

| 操作 | 状态 | 已观察结果 |
| --- | --- | --- |
| 聚焦 SimpleExperiment 视图 | 实点通过 | MultiModal 面板加载，显示当前项目与 12 个原有 PLAN |
| 最大化辅助侧栏、计划导航 | 实点通过 | 面板可扩展，导航定位到计划区 |
| 当前 PLAN 下拉选择 image_only | 实点通过 | UI 与宿主 selection、planFileInput 都为 experiments/plans/comparison/image_only.yaml |
| PLAN 搜索与切换独立验收 PLAN | 实点通过 | 搜索后保留原选择，切换后页面与操作记录均指向 windows_mcp_20261111.yaml |
| 独立验收 PLAN 校验与预演 | 实点通过 | rjj8 返回实际校验、预演终态；任务数 1；未启动训练 |
| 低流量开关 | 实点通过 | 0.5.491 从开切换到关，宿主 effective=false；再恢复开，宿主 effective=true，无保存错误 |
| 仅校验后的 PLAN 状态 | 发现缺陷，已修复源码 | 本机准备回执被算作已运行，出现部分完成 0/1；修复后不把准备回执计入任务运行证据，定向回归通过 |
| 零台 Worker 的服务器设置 | 已配置状态预览通过；零台状态仅回归 | 0.5.486 实际页面没有添加按钮；现将手动添加和 Xshell 导入固定放在 Worker 设置顶部，零台、全禁用及已配置状态的渲染回归通过，待剩余实点 |
| 全局共享服务器与项目切换提醒 | 已实现，待实机 | 新项目读取同一连接、环境与配额；旧项目不覆盖后续共享修改；项目队列、API 身份及授权保持独立，定向回归通过 |
| 管理 AI 项目授权 | 发现缺陷，已修复源码 | 0.5.487 工厂启动遗漏命令注册，实机命令 not found；0.5.488 补齐工厂绑定及运行环境准备按钮，实际注册链回归通过，待剩余实点 |
| 0.5.488 授权保存和共享服务器 | 本人完成授权，读取及界面通过 | 两项目实际运行 0.5.488，均保存 rjj8 的 experiment/sync/agents/configuration/results 授权，项目根分别匹配；通用项目实际界面可见授权按钮及保存通知。未由 AI 代选授权项 |
| 共享服务器提醒重复触发 | 发现缺陷，已修复源码 | 0.5.488 两个窗口切换焦点相互改写全局上一个项目，实际重复弹出通知；0.5.489 改为项目独立提醒记录，交替焦点及同项目重载回归通过，待剩余实点 |
| MCP 连接跨窗口正常重载 | 发现缺陷，已修复源码 | 旧原生 MCP 连接固定了启动时实例，两个项目查询均返回 HTTP 401；重新建立官方 SDK stdio 连接可正确读取各项目与授权。0.5.489 在每次调用前重新核实工作区唯一实例；显式绑定、歧义拒绝及版本门禁回归通过，待长期连接实机复核 |
| 项目识别与隧道提示 | 发现缺陷，已修复源码 | 0.5.487 通用项目已有 PLAN/接入配置且隧道 TCP 已通，仍依赖旧引导标记；当前 Agent 实际属于 MultiModal。0.5.488 分开本地识别与 Agent 项目归属，明确实际/预期路径，不把端口连通当作本项目就绪；待剩余实点 |
| 顶部总览与当前 PLAN 状态 | 发现缺陷，已修复源码 | 0.5.488 实际界面及只读 API 确认：校验/预演的本机进度记录 type 为 run-plan、localSubmissionProgress 为 true，当前任务数为 0。顶部未排除该标记，误报调度已完成；0.5.489 与下拉框采用同一排除条件，不改写历史记录，待剩余实点 |
| 0.5.489 顶部预演与面板提交 | 实点通过 | 预演后显示可提交；从当前 PLAN 按钮提交独立验收文件，未把准备回执计为完成 |
| 原生 MCP 与 CLI 指定项目查询 | 实际调用通过 | 两个 MCP 状态分别为正确工作区和 0.5.489；MultiModal 同一 commandId 的 MCP 与 CLI 均查询到真实运行状态 |
| 项目归属识别 | 实际调用通过 | 通用项目连接 MultiModal Agent 时明确返回 agent_project_mismatch，未当作本项目就绪 |
| Agent 运维与科研任务隔离 | 实际调用通过 | 仅关闭对应项目的指定 Agent 窗口；MultiModal 任务窗口 @12 和 Scheduler @9 保留，任务随后成功完成 |
| 通用项目仅 MCP 运行与导出 | 部分通过 | 准备、预检、启动、主动查询、收集及 CSV 导出均经 MCP；退出码 0、manifest 完整、日志检查 clear，completionState=verified。首次准备及同步配置需修正，不能计为首次接入流程通过 |
| 通用项目面板结果 | 实点未闭环 | 当前 PLAN 显示 1/1 完成；资源树搜索与结果导航、更新结果按钮已点，结果区显示 1 个 PLAN 未识别数据集，尚未完成从面板打开相同指标行 |
| 通知明确确认 | 实点与重载持久性通过 | 0.5.490 已选择确认项；0.5.491 重载两个窗口后，两项目确认值仍为 true。关闭通知不代替确认，未改写授权 |
| 其余命令、按钮、动态菜单和行内动作 | 未实测 | 按当前清单逐项继续，不记通过 |

## 0.5.491 本轮实机复核

- 两个原生 MCP 状态分别返回正确工作区和 0.5.491；两项目 rjj8 授权的目标与五类权限未变。SimpleSFTP 同窗口连接均可用。
- MultiModal Agent 从 @19 升级到 @20，主动检查为 0.5.491，Scheduler @9 为同版且源哈希匹配；随后精确停止 @20，通用项目部署为 @21，Scheduler @15 为同版。通用项目复核结束后精确停止 @21，恢复 MultiModal 为 @23，并用 MCP restart 验证仅关闭 @23、建立 @24，Scheduler @9 不变。最终共享端口服务 MultiModal；原有 @12、@16 均保留，退出码 0，没有更新其他服务器。
- 面板“启动全部隧道”已实点并核对实际 rjj8 配置，确认后后台建立 localhost:18770 → localhost:18765，健康检查通过。首次 MCP project_prepare 已成功升级 Agent，却因未启动隧道而最终失败；0.5.492 补齐该工具的启动连接参数，CLI 原默认保持。
- 通用项目 configuration_set 的 workspaceFolder 写入和随后 configuration_get 返回相同范围。相对路径上传 config.yaml、experiments/simple_project.yaml 保留目录层级，实际目标查询匹配；整项目上传在本项目准备完成后成功，5 文件、6138 字节、删除 0 文件。另一项目 Agent 占用端口时的保护拒绝保留，未绕过映射校验。
- 两项目 log_read 使用原 commandId 均返回实际日志；MultiModal 按返回的 offset 续读无重复内容。已确认完成记录仍保留原 verifiedAt，未因重载或本轮远端摘要未核实而降级。
- 面板展开完成历史中的 windows_mcp_20261111.yaml，显示成功 1/1、退出码 0、产物完整及原确证时间 2026-11-11T10:28:00.155Z。点击该 job 的“查看窗口日志”后选中 rjj8/GPU 1 的实际任务标签；在低流量开启状态手动刷新，显示 commandId bc9df623805ca30d675854c0044f4bd2 的 train/test 与 Pane is dead (status 0)。MCP tmux_capture 精确读取 @12，返回同一 commandId 和退出码；未触发任务或重建结果表。
- 通用项目专用 acceptance_files/transfer_20261111.txt（47 字节）经 MCP 上传后，将本机内容改为 local-v2，再经 sftp_download_paths 下载恢复远端 remote-v1，逐字节比较一致。上传操作 mcp-90b58077-ba30-4d3a-af3e-8bc199faac82、下载操作 mcp-9150e1f1-557d-41cb-a6c2-a335980843b7 均成功。主动 file_stats 确认远端仅存在所选 transfer 文件，未选择的 cleanup_20261111.txt 不存在于远端且本机仍为 49 字节；没有执行删除。
- 通用项目主动收集仍为原结果 ID result-3a0cfd3b0ddd0260f42c7a2d2331615dc9bac95b2974dcbf94942a7df1a938c4，导出继续走内存；没有改写 MultiModal 历史结果。
- 手动添加服务器按钮可见，点击后出现包含“新增 Worker”和现有服务器的列表；退出后未新增服务器。该项为预览通过，不记作新服务器保存成功。
- 低流量开关实际切换关、再恢复开，主动状态均匹配且无错误。配置说明实际打开 GitHub 的配置文档，但已接入项目仍被要求识别工作区，等待通知选择后误报 stalled。Agent 版本按钮也在首条纯信息通知处等待关闭，未及时完成。0.5.492 对已识别项目跳过接入向导，版本检查只在末尾提示且不等待纯信息通知；需要本人选择的向导或部署提示不再受前端 45 秒完成判定。两条新增行为回归先失败后通过，原向导和按钮状态回归通过；新版实点待重载。
- 通用项目 draft_list 返回草稿未启用、gpu_history 返回 idle、flow_get 返回实际步骤，诊断显示 ready 且无 sectionFailures；没有把空数据记为完整功能验收。artifact_list 用 PLAN 返回现有结果目录，artifact_inspect 使用返回的精确 ID 成功；首次误用 commandId 的查询失败原文保留，不据空 size/hash 声称完成逐文件校验。
- 停止验收使用独立 normal_stop_20261111 PLAN、seed 42、仅软件控制脚本；命令 53f2db23f7f783a65d8ea3d33fa8d38c 实际运行，经 task_stop 关闭精确窗口，服务主动观察确认取消，原任务与两个 Scheduler 保留。但随后任务记录被后台按清除路径移除，按原 ID 查询失败。0.5.492 将普通停止记录保留为取消终态，显式停止并清除入口继续按原行为移除；定向原型链回归通过，新版实机待重载。
- 另修复 server_list 在 GPU 遥测未取得时只返回 local、完成 PLAN 顶部仍标“排队中”、自动 GPU 配额被误报成未配置 Worker。均已获得失败回归并修复；最终打包和新版实点尚待完成。
- 实际服务器只读执行配套目录契约：尚不存在的授权项目子目录可被接受且没有创建；这是目录边界复核，不等同第三个全新工作区的完整首次接入。
- 通用项目窗口最小化，自动还原连续返回 user input was detected；已请本人还原，结果表打开、其余界面实点不记通过。
- 只为永久删除准备本机专用测试文件 D:/GitRepo/SimpleMcpAcceptance/acceptance_files/cleanup_20261111.txt（49 字节），审核页已打开。最后主动查询确认次数仍为 0、文件仍存在；该预览已过有效期，继续验收时需重新生成预览并由本人完成两页确认，当前没有执行删除。授权撤销后的真实写入拒绝仍需本人操作授权界面后验证，AI 不改授权状态。

## 0.5.492 重载后的实机复核

- 两项目状态返回各自正确根目录和 0.5.492。MultiModal 的 project_prepare 自动建立配置隧道并成功，将 Agent 更新为 @25；精确停止该辅助窗口后，通用项目 project_prepare 成功，Agent 为 @26。Scheduler @9、@15 均为 0.5.492，来源哈希匹配；原任务 @12、@16 保留。两次准备没有普通人工确认。
- MultiModal 实点“校验 Agent 版本”，通知显示插件、Agent、Scheduler 均为 0.5.492 且 SHA256 匹配；通知仍可见时按钮已恢复。实点“配置说明”，浏览器打开 v0.5.492 配置文档，返回面板没有再次要求识别工作区。已完成 PLAN 顶部显示“已完成”；通用项目静态容量正确显示已配置 1 台 Worker。无 GPU 遥测时 server_list 仍返回在线 rjj8。
- 通用项目从结果总表实点 CSV，编辑区打开 experiments/results/_unassigned/final/final.csv。该行 commandId 为 78e8aab0f09dcad43c5fe305b826d3f4，accuracy_mean=0.953125、loss_mean=0.10787482559680939，与 MCP 原结果一致。缺少数据集元数据的提醒保留，没有虚构数据集或重跑实验。
- 新软件控制 PLAN normal_stop_0_5_492.yaml 使用原控制脚本和 seed 42，独立输出目录；实际 commandId b54246b8cb31eabd2109a02f39e91f9e 在 rjj8/GPU 0 运行，经 task_stop 关闭精确窗口，主动回执 paneClosed=true、cacheRetired=true。记录保留，但后续变成 unknown：取消证明已持久保存，恢复路径却没有恢复取消状态。0.5.493 使用精确身份的既有取消证明恢复终态，不重派任务；落盘、陈旧投影与身份错配回归先失败后通过。
- 同次预检 ready=true 却带 VALIDATION_REQUIRED；workflow-run 父请求因同项目操作字典替换而长期 running，精确 plan-submit 子请求实际已经 succeeded。0.5.493 区分请求处理与实验完成，按工作区代次及原子请求 ID 结算，并在共享读取时归并历史父请求；不以回执证明实验完成。三项新增工作流回归先失败后通过。完整打包及新版实机复核尚待完成。
- 命令面板实际执行“打开面板”成功。默认 showAdvancedCommands=false 时“显示隧道端点清单”没有出现在命令匹配中，属于条件隐藏，未把它记作命令执行失败或通过。未操作授权撤销界面；永久删除按本人回复暂不执行，专用文件保留。
- 命令面板“查看备份状态”返回本验收仓库、远程未配置、自动备份未启用，没有写入 hook。“检查配套插件更新”遇到真实 GitHub 限流，界面明确显示等待至 2026-11-11T16:10:16Z，旧结果不作为新结果；未记更新成功。“打开配置说明”实际打开 v0.5.492 文档。
- 命令面板“校验 Agent 版本”复现缺少 HostOperationLease；同业务面板按钮正常。工厂错误地查找并不存在的模块级 withHostOperationLease，未接到当前 Provider 的方法。其他标记为需要租约的命令也受同一注册链影响；待当前冻结回归完成后，将以实际 Provider 租约接入修复并补执行回归，不取消跨窗口互斥。
- 命令面板“查看操作完整日志”实点返回 command not found；工厂缺少该入口与“一键打开 Xshell”的声明/绑定，而旧激活入口仍有注册。两项纳入同一注册链修复，保留旧入口；Xshell 尚未实点，不据源码结论记作现场通过。
- 首个 0.5.493 冻结候选的完整 322 作业、13 门禁通过，原始记录 simple_cluster/reports/test-workflow/2026-11-11T16-03-58-662Z-21996-package/run.json，860050 ms，输入未变；尚未发布或安装。随后加入命令工厂修复：Provider 绑定既有租约方法、补两个遗漏入口；workflowPanelNavigation 的两个新增执行回归先失败后通过，包含所有需租约描述项转发、参数与 this 绑定、缺失和冲突拒绝。
- 额外运行 test/factories_integration.test.js 为 7 通过、1 失败，完整日志 simple_cluster/after-factory-0.5.493.log。失败是旧行数门禁：CacheCleanupPanel.ts 479 行、PlanCleanupHost.ts 470 行、ResultCollectionHost.ts 451 行，三文件与 HEAD 一致，不在本轮修改范围；保留失败与原门禁，不为此重构或放宽断言。此附加全工厂旧门禁不在既有 package 规定范围中；本轮相关工厂行为与完整打包检查分别记录，不把它计为全部通过。
- 通用项目设置页可见手动添加与 Xshell 导入按钮，无遮挡。按原值实点保存共享前缀/默认环境、全局调度策略及 rjj8 服务器，重新读取值一致；调度和服务器原生保存通知正常，rjj8 的 SSH/隧道、Conda、项目父目录及所有其他 Worker 配置未变。面板计算的代码与 Agent runtime 路径均属于 SimpleMcpAcceptance，没有自动准备服务或启动实验。此项只证明现有值保存，不代替新增服务器完整接入。
- 高级命令开关经 VS Code 设置临时打开后，端点清单命令实际打开 JSON，包含 rjj8 和实际 18770 端口，没有 Hub Agent；隧道状态命令打开当前项目的 JSON 状态。验收后已实点恢复开关为 false，API 回读一致，未改授权。
- 命令面板“检查项目接入”实际生成报告并通知 failed（3 个 PLAN）。原始报告位于验收项目 simple_cluster/check_reports/check-static-latest.md，2026-11-11T16:35:13.743Z，21 errors、7 warnings、2 infos。检查器仍强制旧模板的 metrics_summary/metrics_case、双日志、大表追加及固定 test --result-csv 接口，将已被当前正式预检接受、退出码 0 且 manifest 完整的普通训练项目判错。这是下一批通用性修复项，不改通用训练代码迁就检查器；不把该入口记为业务通过，也不覆盖首次失败报告。0.5.493 已冻结，不为这个新发现改写其已完成打包证据。

## 0.5.493 实机复验

- 源码 3a1c79e918ce30a50f5fa98f51ccd4184e4e9f06 已普通推送并 fetch 核对主线一致。试行 v0.5.493 的真实 tag 绑定该提交、prerelease=true/draft=false；VSIX 3070455 字节、SHA256 7f3656adf080ec222d3277372b2c465e4c4b21aad0d10eb791166459b945392a，远端重下载与本机一致。直接读取曾遇到真实 GitHub EOF/ECONNRESET；使用现有 Windows 系统代理 127.0.0.1:7897 后读取成功，未改系统设置。实际原生 ReleaseClient 在该进程代理环境下检查为 up_to_date；另以同一解析器、真实认证网络传输确认正式 Latest 仍为 0.5.483/0.2.118，试行 0.5.493/0.2.119 不降级。原始检查位于 simple_cluster/release-verification/0.5.493。
- 显式 install:latest 一次成功，已安装版本与 CLI 核对为 0.5.493/0.2.119；随后通过普通 VS Code Reload Window 重载两个项目，保留 MultiModal 已修改文档。新官方 SDK stdio MCP 分别返回正确项目根、0.5.493、PID 7344/53456。Codex 旧原生 MCP 连接仍为 0.5.492，按门禁拒绝版本不符且未发送业务请求；该连接需本人在 Codex 重连，AI 未操作 Codex UI。
- 通用项目 project_prepare 请求 mcp-2c88c159-7787-4152-8763-b4901b884aca 成功；Agent @29 和 Scheduler @15 实测 0.5.493、来源哈希匹配。命令面板版本核验实际通知 0.5.493 和两个 sha256 ok，没有缺少租约错误；操作完整日志命令实际打开 SimpleExperiment 操作日志输出频道。两个修复命令实点通过。
- 旧 commandId b54246b8cb31eabd2109a02f39e91f9e 重载后仍为 cancelled；原运行父请求 workflow-run-1794411835137-lc9vcv 主动查询为 succeeded，绑定原精确子请求，receiptProvesExperimentCompletion=false。原通用成功任务 78e8aab0f09dcad43c5fe305b826d3f4 仍 completed。
- 新 normal_stop_0_5_493.yaml 沿用软件控制脚本、seed 42、专用输出。预检 mcp-d0da6dbe-ceba-4e6a-a271-7f0105721d1b 返回 ready=true/blocker=null；父请求 workflow-run-1794415655426-zpz5wo 已真实结算 succeeded。workflow distributed-plan-1794415663332-cq34v8、commandId 5e436d7c18a271d95e8ab7129d356b7d 实际在 rjj8/GPU 0、窗口 @30 运行，task_stop 请求 mcp-a225f228-536d-41ad-a73f-6829001497fe 成功，主动 exact_window_observation 确认 paneClosed=true/cacheRetired=true。后续主动查询新旧两条均 cancelled，原成功任务和日志产物保留。
- 新发现的界面余项：停止后任务 API 正确，但 PLAN 下拉将旧取消记录标失败、新记录仍标准备提交中；两张运行卡优先显示“远端未发现执行窗口”，而非“已中止”。与旧接入检查误判一起纳入下一批展示/检查修复，不把 0.5.493 当作所有界面已完成验收。API 的真实任务终态与请求终态复验已通过。
- 通用项目结束后精确关闭 Agent @29，MultiModal 准备请求 mcp-3a1b827c-a4b9-4441-bda2-df3cd90b09f9 成功，Agent @31、Scheduler @9 实测 0.5.493、两个来源哈希匹配。当前共享端口恢复 MultiModal。实际 tmux 列表仍有 @12/@16 原任务与 @9/@15 两个 Scheduler，@29/@30 已消失；未清除队列、日志或产物，专用删除文件仍为 49 字节。普通通知确认未重复弹出；未修改安全授权。

## 后续验收范围

| 区域 | 最终效果 |
| --- | --- |
| 打开与导航 | 所选项目、Worker、PLAN、任务随跳转正确传递；搜索、卡片与菜单分别实点 |
| 项目与服务器 | 设置重新打开值一致；准备后主动查询端点与运行版本 |
| 同步与文件 | 专用样例的已勾选与未勾选范围、源和目标内容一致 |
| PLAN 与运行 | 单独验收 PLAN 的预检、启动、排队、派发；短任务验证精确停止 |
| GPU、日志、结果 | 对应 Worker 与精确窗口；退出码、声明产物、指标及导出值一致 |
| 设置与维护 | 诊断、草稿、缓存、更新与 Git 专用验收对象；清理保留完整路径双确认 |
| MCP 授权 | 普通流程一次授权后继续；撤销后下一次写入拒绝；新目标单独确认 |
| 双窗口 | CLI、MCP、面板分别命中指定项目；拒绝其他窗口的身份 |

## 实验边界

MultiModal 的独立验收 PLAN 为 experiments/plans/acceptance/windows_mcp_20261111.yaml，image_only_bus_p100、seed 42、原有 7 项声明产物。首次 commandId 9d807fcc01babe7fce717eb5528897a7 退出码 1：旧验收输出根不满足消费项目自身 quality_paths 规则；失败日志与产物保留。仅将 PLAN 输出改为 work_dirs/quality_composition/all_low_quality_class_joint/plugin_acceptance/20261111/image_only，全部配置检查通过，提交 0ce22674881a1797cacc872005716ef0dae78f7d 已推送。

修正后 workflow distributed-plan-1794392521604-swd6l3、commandId bc9df623805ca30d675854c0044f4bd2 在 rjj8/GPU 1 完成，退出码 0、completionState=verified，日志包含真实 train/test 结束记录。7 个声明文件逐项存在，quality_evaluation_complete.json 的 status=complete。精确 PLAN 结果查询返回 10 条指标记录，exported=false，未发布或重写历史论文结果。本批原始指标只有 roc_auc、f1_score、accuracy、auprc、ece；AP、macro_f1、weighted_f1 没有实际输入，本批不能证明其真实实验别名效果。

通用项目位于 D:/GitRepo/SimpleMcpAcceptance，来自 examples/mcp-dl-acceptance，普通 PyTorch 入口、seed 42，不依赖 MultiModal adapter，训练代码未修改。明确设置项目代码同步范围 train.py、config.yaml、experiments 后预检通过。workflow distributed-plan-1794392812546-3c0hdy、commandId 78e8aab0f09dcad43c5fe305b826d3f4 退出码 0，模型与指标 manifest 完整，后续日志主动核验 clear，completionState=verified。MCP 导出 result-3a0cfd3b0ddd0260f42c7a2d2331615dc9bac95b2974dcbf94942a7df1a938c4，与该任务指标一致；导出在内存返回，未另存原始指标副本。

## 实机发现与本轮修复状态

最终 0.5.491 完整打包检查已通过：322 项串行作业全部通过，记录 simple_cluster/reports/test-workflow/2026-11-11T11-39-45-090Z-11984-package/run.json；包内容与远端试行资产核验通过。0.5.491 与配套 SimpleSFTP 0.2.119 均已安装一次；新修复仍需本人重载两个窗口并重连 MCP 后实机复核，本页待实测项保持原状态。

0.5.491 首轮完整回归的 322 个作业中，8 个测试文件因模拟配置缺少 inspect 或 ConfigurationSettings 模块绑定失败；首次完整日志保留于 simple_cluster/reports/test-workflow/2026-11-11T11-25-28-974Z-48436-package。仅补齐原测试输入与真实模块，不改断言、超时或生产判断；8 个定向修正回归全部通过。既有 package:assemble 门禁只接收单份完整通过记录，本轮沿用门禁重新运行最终打包，不修改旧失败记录或绕过组装校验。

- 本轮源码修复（配套 SimpleSFTP 0.2.119）：project_prepare 首次面对不存在的项目远端根时先 inspect，返回 AGENT_LIFECYCLE_FAILED/No such file or directory。原来只能先上传创建根再准备；现已允许只读 inspect 不存在的合法项目根，不创建目录，后续正常上传创建。嵌入与配套控制脚本一致，真实 tmux 定向回归通过；新版本实机仍待重载。
- sftp_upload_files 的项目相对路径返回“本地文件不存在”；绝对路径上传成功，但 experiments 下两文件被平铺到远端根。sftp_upload_workspace 在默认根范围返回 MACHINE_STATE_PATH_PROTECTED；sftp_remote_directories 查询 experiments 子目录因请求路径与 server.remotePath 不同被拒。本轮保留路径层级、生成已选范围 manifest 并关闭删除，子目录绑定与请求一致；定向回归通过，新版本实机待重载。未自动清理误放的验收文件。
- configuration_set 的 workspaceFolder 写入缺少资源 URI；workspace 写入实际成功，但回执及 configuration_get 仍返回空数组，不能反映保存值。空同步范围曾产生空 manifest，code-sync-proof-1794392704048-2g5513 登记结果未知；明确项目范围后新预检成功。本轮配置读写均绑定工作区资源并重新读取保存值；区分 VS Code 推断的默认空数组和用户显式空范围，保留用户取消全部选择的语义。定向回归通过，新版本实机待重载。
- 日志工具传 commandId 返回空；传已知精确相对日志路径可读。首次派发曾返回 HTTP 500/action failed: timed out，但远端实际继续执行；不得据回执自动重发。任务主动查询已正确反映最后退出码。本轮增加原生 commandId 日志路径解析，显式读取错误向上传递，CLI 优先使用任务诊断中的路径。accept 原 8 秒等待短于本轮约 18 秒代码核验，改为调用方已有的 30 秒预算，其他控制调用仍为 8 秒；不重发未知任务、不变更队列协议。真实 tmux 定向回归通过，新版本实机待重载。
- 两个项目复用同一 Agent 隧道端口，本轮按各自授权顺序切换精确辅助服务窗口，任务与 Scheduler 保留。若需同时在线，仍需为项目分别配置端口。

0.5.490 通知按钮已实点验收：两个项目的“已确认，此后不再通知”确认值均已持久保存，切回已确认项目未重复弹出。通用项目结果已生成但因缺少数据集名称被界面隐藏；本轮展示现有未标注数据集表格，保留元数据提醒，不改写结果或虚构数据集，渲染回归通过，新版本实机待重载。

所有有副作用的操作使用专用目标。MultiModal 项目的现行规则禁止 AI 永久删除项目文件；清理验收应在独立通用项目的专用目录由本人完成审核。
