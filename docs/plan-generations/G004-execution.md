# G004 执行登记

519重载：专用根默认profile实测519 PID29888，离线、低流量、5配置/1启用、PLAN、任务选择、结果目录、离线包和授权保持；识别原值与现值均未完成。默认发现曾指向稿件且未调用；流程读错可致覆盖，首1/2 exit1，`g004-519-flow-real-workflow-ff08.log`，无真实损失。A1错误可见、11/11 exit0，`g004-r519-a1-project-state-ff08.log`。细节见coverage.g004U04RemainingInventory.g004Reload519LocalAudit。

布局并行清旧键可能丢值，首0/2 exit1，`g004-519-layout-legacy-failure-ff08.log`，无真实损失证据。A2成功保存后清旧键；状态13/13、布局3/3、上下文20/20 exit0，日志 `g004-r519-a2-project-state-ff08.log`、`g004-r519-a2-layout-ff08.log`、`g004-r519-a2-context-ff08.log`。拓扑假对象3/3 exit0，未动真实设置。

519指标语义合并，两次各0/1 exit1，`g004-519-metric-identity-ff08.log`、`g004-519-metric-collision-ff08.log`。A4保留语义及显式别名；CSV/JSON、预览、schema、0/空6/6 exit0，`g004-r519-a4-metric-final-ff08.log`。未写真实项目。

R519 A5解析器/CLI及MCP目录各8/8；原日志见Git `59041060:docs/plan-generations/G004-execution.md`。

R519 A6历史读取反馈1/1；原日志见Git `59041060:docs/plan-generations/G004-execution.md`。

R519 B2选择等待保存及错误可见；动作46/46、迁移13/13、上下文20/20 exit0，首44/45因夹具缺依赖exit1；原日志见Git `ff1e0051:docs/plan-generations/G004-execution.md`。

R519 B3手动刷新/重连失败可见，后台容错保留；假对象4/4、低流量16/16、关闭决策14/14 exit0，原日志见Git `7ade1100:docs/plan-generations/G004-execution.md`。

R519 B4调试包反馈假对象1/1，原日志见Git `52dd844c:docs/plan-generations/G004-execution.md`，未实际下载。

R519 C1 API本地路由47/47；原日志见Git `59041060:docs/plan-generations/G004-execution.md`。

R519 C2配置作用域修正，源码48/48、内存49/49 exit0；日志见Git `52dd844c:docs/plan-generations/G004-execution.md`。

R519 C3异步Git命令4/4；首3/4因测试误判exit1，原日志见Git `52dd844c:docs/plan-generations/G004-execution.md`。

R519 C4旧CLI参数曾在进入shim前被解释管道，exit255；对照exit0，TEMP夹具 `g004-c4-cmd-fixture-1a624cb400094bdca5c67bf46b5f57c9`。用户现退役业务CLI，不更改结果ID。

B1末尾通知租约返修先验：原方法未释放的断言失败；新增夹具未恢复通知替身致后续用例超时20秒、单文件exit1，已停止不重试，日志 `g004-r519-b1-lease-before-ff08.log`；非真实Host操作。异步通知及夹具清理候选未运行验证，待总控裁决。

T1连接迁中立API；首0/1错误类型误判后1/1，日志见Git 4429ad05同文件，未连接真实实例。

T2解析1/1、入口2/2；首1/2夹具sort改对照，失败/补验日志见Git 9c7591df同文件。

T3上下文/支持迁出2/2；首1/2替身错误类型失败，日志及细节见Git 064f2221同文件。

T3项目读取及精简8/8，原日志见Git 3cbd380e同文件。

T4结果/指标/比较查询对照5/5；原日志见Git `59041060:docs/plan-generations/G004-execution.md`。

T5提取runtime及实验查询，保留既有结构化输出；12项真实queryProject配假RPC与旧消费者对照，含空结果/失败9/9 exit0，`g004-r519-t5-experiment-complete-ff08.log`；补默认精简输出对照后同文件9/9 exit0；未请求Worker，日志等消费者待迁。

T5日志全部/尾部及缺失实验9/9，原文见Git c9b4892b同文件；无Worker。

T6服务器及PLAN构建/矩阵6/6；原日志见Git c9b4892b同文件，未查真实服务器。

T6资源可用查询迁出；真实queryProject假RPC对照旧消费者，GPU零利用及进程占用保持，单文件10/10 exit0；未查询真实Worker。

T6产物列表/检查11/11；原文见Git bc739fa0同文件，未查真实Worker。

T7入口3/3、内容策略12/12；见Git bc739fa0同文件，尚未构建或安装。

T7主指南改界面/MCP，旧CLI历史已标明。

MCP迁测原记录见Git e9501015同文件：训练、健康、告警、详情、树、schema、生命周期、快照及已存运行均通过；告警首TS加载失败exit1后6/6（9a5c16/a38600）。资源拒绝及产物补验11/11；旧测试保留待裁决。

运行身份迁测首6/8 exit1（旧CLI专属resolveRuntimeObservation未迁出），移除新测试中该旧助手调用后8/8、补捕获后13/13 exit0（chunk ee595e/7f85ac/105c6d）；此两旧用例仅部分迁覆，MCP引用选择另见mcpQuerySchema。树摘要补活跃查询后9/9，旧CLI的compact-json组合未迁；旧断言及矩阵未改。

MCP终态身份10/10、结果精确身份及导出1/1、日志与配置1/1、合成本机端点的运行观察1/1 exit0；后者不是真实Worker。包排除旧runner并补动态MCP闭包清单，入口3/3、策略12/12 exit0，尚无实际VSIX验证。

519识别未完成及同窗冲突不能认定锁死；原识别不记完成首0/1 exit1，`g004-519-bootstrap-recognition-ff08.log`。B1保存PLAN及识别事实；假对象2/2、快速9/9、上下文20/20、命令3/3、持久化3/3、投影6/6 exit0；日志 `g004-r519-b1-` 加 `recognition`、`quick-first`、`context`、`command`、`persistence`、`projection` 及 `-ff08.log`。未改真实标记。

519历史CLI合成查询通过、精确ID经cmd失败，详见coverage。A3 Git hook读错及标记不完整保留原文件，假fs及启动消费者3/3 exit0，`g004-r519-a3-git-hook-ff08.log`。300/137/45/167母集重叠，不相加。

519发行：源码/tag `6932321534f3b0c2df3b1983bfede2f88f7b868f`，[试行Release](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.519)与下载同SHA、Latest483。ReleaseClient首验误期待SFTP Latest120（实际118）exit1，修后exit0，`g004-519-client-after-ff08.log`。唯一安装exit0含DEP0169，`g004-519-install-ff08.log`。实机见顶部。

519唯一package 341/341、13门禁及闭包验证通过，包SHA256 `525e235fe7e380bf3684edf5b8bfd3dd7620badefd964dcdcd671b14c0216b33`；完整日志、回执和预检路径误写见Git `0aa6b27c:docs/plan-generations/G004-execution.md`。

519交付预检及工具误用见Git `48062264:docs/plan-generations/G004-execution.md`；dry-run exit0，341独占、按需0、max1。

项目识别记忆：globalState单根保存及隔离，API/面板同源。Memento首0/2 exit1、修后3/3，提示1/1、迁移10/10 exit0；日志 `g004-518-onboarding-before-ff08.log`、`g004-518-onboarding-isolation-ff08.log`、`g004-518-onboarding-prompt-final-ff08.log`、`g004-518-onboarding-bootstrap-final-ff08.log`。未改真实标记，原文见Git `48062264:docs/plan-generations/G004-execution.md`。

项目清除状态修复：null/cleared旧值不复活，坏JSON/EACCES报告。内存存储首9/10 exit1、修后及补验各10/10 exit0；TEMP日志 `g004-518-cleared-before-ff08.log`、`g004-518-cleared-after-ff08.log`、`g004-518-cleared-final-ff08.log`。未清真实数据；原文见Git `48062264:docs/plan-generations/G004-execution.md`。

518重载验收：默认profile专用根Host 0.5.518、offline_import、低流量、本人grant及5配置/1启用均实核，未操作Worker。U54公开选择和持久化读回、U55配置保存恢复及MCP合成解析/排行通过；主动results.list/result_export需访问Worker，本轮未测。U56离线包导入/恢复exit0，面板显示2/2及0/中文/引号/空值并标未核实；首次离屏元素、文件框索引和坐标校验失败未输入。完整原证据见 `89498eff:docs/plan-generations/G004-execution.md`，517旧证仅按原范围复用。

518时持久化身份及未识别状态原始调查见 `89498eff:docs/plan-generations/G004-execution.md`；其旧workspaceState引导标记描述只适用于当时运行源码，519已按规范项目根存入同profile globalState。不能借其他profile值或虚构已识别，518未含后续持久化源码修复；四跨项目与89旧延期范围未开放。

518项目本地状态返修：损坏或拒绝读取不再当作不存在并覆盖，离线导入/清除保存失败恢复原值；内存测试7/8 exit1→9/9及补验9/9 exit0，TEMP日志 `g004-518-state-read-before-ff08.log`、`g004-518-state-read-after-ff08.log`、`g004-518-state-read-final-ff08.log`。未修改真实旧文件；详细原文见Git `48062264:docs/plan-generations/G004-execution.md`。

518共享连接保存队列失败后可重试且保留旧迁移值；内存测试0/1 exit1→1/1 exit0，TEMP日志 `g004-518-shared-retry-before-ff08.log`、`g004-518-shared-retry-after-ff08.log`。嵌套PowerShell变量展开曾导致解析错误exit1，未启动测试；未改真实连接。原文见Git `48062264:docs/plan-generations/G004-execution.md`。

0.5.518试行包、341/341及13门禁、安装一次和历史失败见Git 1242c55c同文件；原闭包核验输出及退出码未知，实际ZIP等价检查exit0，不覆盖原未知。

518 git add exit1因dist忽略，回读确认13个已跟踪生成文件及8个非生成文件实际暂存，未强制添加。

518首包339/341 exit1、前10门禁通过、并行峰1及锁释放；mcpProject夹具修后43/43、serverQuota夹具修后10/10，均exit0。原回执与完整首失败、补验见Git `1242c55c:docs/plan-generations/G004-execution.md`；未改真实权限/Worker。

U54–U56首失败与补验见Git eab27339同路径；help不支持exit1、CLI默认绑定不符exit2未重放。
U04原排查及factory门禁、恢复页VM证据见Git `48062264:docs/plan-generations/G004-execution.md`及coverage；未重载或访问服务器。

版本13/13、缓存同步4/4与3/3；U04-01首失败和02延期见4a80c627及coverage，无真实删除。

登记上限12000、90%归并；旧记录见Git 10c0689e及4a80c627。保护Worker、训练、消费项目、共享配置、窗口及夹具；源码、旧dist、安装和远端分记。

U01–U03首失败、旧测试及锁授权见Git 10c0689e、b7c0b42c同文件；历史数字非当前按钮分母。

0.5.514/515安装、发行及实际失败见10c0689e与G004-plan，Latest仍0.5.483。

U01/U02/U03分别2/8/10项已修；U03末轮42/42 exit0。J01宿主缺GIT_CONFIG_VALUE_0/5且传递未知；simpleex --version绑定不符exit2。完整记录见b7c0b42c及计划。

516首package 340/341 exit1，修后22/22及341/341；安装一次，时未确认Reload，见b7c0b42c。
U04逐项证据见Git f72d0066及coverage：43项中单项目39、跨项目4延期；撤回10项，未重放真实Worker、任务、删除和窗口。

旧关键失败保留于Git b3c3926c同文件及coverage：日志导航12/13、VM首夹具失败、U04-03假错误类型、U04-10时间戳比较、CLI绑定不符与yaml依赖缺失；后续通过不覆盖首失败。
最终逻辑母集300：界面279（限定204、延期75），独立命令21（限定7、延期14）；限定211、延期89。合成GPU/TMUX/端点和资源导航证据及探针首语法失败见Git fd58a7c7同文件与coverage；真实Worker、剪贴板、网络未测。

B1/B2/B3的39项与首失败见Git c37827c8及eab27339同路径；不扩称真实Worker通过，4跨项目与89入口未开放。
0.5.517首package 337/341 exit1、修后341/341及13门禁、安装一次；首失败/源码/tag/试行包及证据见Git 871ea78e、89498eff同文件。Latest仍483。

T7收包策略及入口证据见Git bc739fa0；未实际打包。

T7已定向MCP测试纳入四交付profile，规划确认独占；原glob亦涵盖，旧项未减。B1仍未验并阻断交付。早期矩阵及生成命令引号错误见Git 871ea78e及后续记录。

MCP Worker生命周期迁测：queryProject配独立本机合成API/Worker，4/4 exit0（chunk 252e84）；限流、来源和父级3/3 exit0（702b10）；旧8项的无API离线历史剩1项属CLI专有回退，MCP仍需Host、不新造history，原用例保留待裁决。两新测试纳入四个交付profile。

迁移期mcpQueryContext已脱离全部CLI引用：以旧实现实测结果固定MCP输入、输出、身份和错误断言，实验视图fixture排除动态快照字段；11/11 exit0（0eaa05）。转换时metric及compare的null原型两次10/11 exit1（f7c9b7、2eba9b），修期望后通过；旧CLI测试未动。

MCP普通结果契约迁至中立实现，8/8 exit0（e1771b），加入交付profile。

空PLAN矩阵MCP断言1/1（b4464e）；纳入交付profile。

原mcpProject并发项目与结果查询改用新MCP源码和上下文，保留隔离/导出/越界断言；43/43 exit0（6e2b10），其余大部分仍针对旧dist，不能代表新包。

同PLAN不同运行身份及终态不复活，MCP中立测试14/14（937804）；原测试保留。

新MCP Worker生命周期迁测去除遗留CLI测试依赖，4/4 exit0（4864b3）。中立客户端错误身份检查亦脱离CLI，首0/1 exit1（7ff115：普通校验错误误认CliError），按真实契约修正后1/1 exit0（2491a4）。

缺失指标、null导出及特殊键比较改核MCP实现，3/3 exit0（2c5e04），已列四交付profile。

结果CSV身份与宽长格式/显式预设断言切换至MCP解析，8/8 exit0（368f81），纳入四交付profile。

动作产物/结果断言改读MCP，假对象49/49（af772e）；纳入交付profile。

MCP排行补全列/零值，12/12（024418）；CLI终端断言待裁决。

旧CLI静态测试302项精确位置和同名MCP候选索引写入coverage.g004CliRetirementIndex；同名不代表断言等价；已审95项业务映射、75项逐字重复及12项纯help候选；另10项函数体重复但业务仍待审；草稿3项部分映射，CLI别名/compact/离线历史及其重复项、其余差异待裁决，不批准退役。首次路径检查转义错误，改按冒号拆分后302/302存在。

健康默认/full视图6/6（f58801）；CLI退出码待裁决。

MCP观察精确窗口、配置下载及终态排除3/3 exit0（b43a82），合成回环端点；原8项运行捕获业务断言已映射，未测真实Worker。

MCP查询身份补充活跃项非空及候选上界，4/4 exit0（9ccf3f）；旧CLI进程退出与错误外壳待裁决。

原生生命周期补当前Host查询、未知及完成证据4/4 exit0（aaec9a）；重复用例匹配预期6但实际5，首次脚本exit1未写，按实际5项更新。

草稿MCP网关对假Host读、验证、预览、授权review/reject及force透传和失败传播3/3 exit0；旧草稿清理及CLI退出语义差异见coverage，未新造工具或真实操作。

手动派发MCP补自动GPU、精确停止及PLAN/all配额；真实Gateway/宿主假端口4/4 exit0，多Worker授权和坏输入拒绝通过。首0/3因fixture根不存在，次1/3因fixture箭头this错误；修夹具通过，无真实派发。草稿清理实际UI方法与确认状态机、API三因素用内存替身3/3 exit0，未实点或移动。

中立连接合成Host核身份、槽位、工作区及发现变化2/2；原真实回执、不重发与时限分类断言迁中立客户端3/3，均exit0；CLI退出/展示未迁。

独立MCP resolver接中立客户端及合成Host，运行版本切换、身份/工作区/发现变化2/2 exit0；未测真实Host。

MCP action_catalog动态表/缺方法无回退，固定命名动作不接受任意invoke，目录文案不依赖旧CLI，Gateway假Host 1/1 exit0；旧CLI错误包装、帮助及零HTTP断言待审。

Agent MCP经实际Gateway/Host核目标、撤权及迁移digest，假Agent首2/3 exit1因测试期待错误文案漏an，修后3/3 exit0；未访问Worker。

MCP项目操作、控制、列表、GPU身份、清理预览及官方客户端错误回执7/7；真实Host方法与假端口，旧CLI外壳待审。

公开入口旧测试依裁决改为MCP契约1/1；误用Delete File使测试瞬时缺失，已立即同路径恢复，未git rm，旧版见Git 0d5cae56。旧CLI目录外24项引用列coverage，实机限制保留。

SFTP实际Gateway/McpHost核精确Worker、清单/目录、内存指标、下载授权及原样转发未知/取消中回执，假后端3/3 exit0；旧CLI选项差异见coverage。

MCP实验列表、筛选及终态别名保留旧业务断言，实际queryProject 13/13 exit0；假RPC无Worker。

MCP当前结果身份重排不变、歧义拒绝及诊断日志排除，queryProject 15/15 exit0；CLI history/文件写出差异待审。

旧客户端四项合成契约、路由取消/期限及候选预算迁中立API 6/6；原整文件及真实SimpleSFTP门禁保留未测。

派发审核期间MCP授权/Worker变化在真实宿主复核，拒绝派发并释放预留；假端口5/5、无MCP上下文的队列14/14均exit0。工具目录补充所需参数及条件，派发5/5复验exit0。

原Windows工作流四项Host源码身份/预检/回执断言迁中立绑定，假宿主4/4；原混合文件及CLI部分保留。

MCP预检经实际Gateway及Host假端口核原任务身份、能力拒绝、操作ID与精确取消，2/2 exit0；未访问Worker，旧CLI外层行为待审。

MCP远端产物精确身份/越界拒绝、结果缺参/缺文件及主指标方向：新增缺文件断言首14/16 exit1（实际ENOENT而非not found），更正后16/16及方向补验16/16 exit0；假RPC无Worker。

MCP GPU观测与任务分别保留Worker/GPU0/command并显式传播失败，Gateway假Host 5/5；UI精确导航为既有局部证据，未新造自动匹配视图。

中立客户端保留258记录、定位末尾假监听、双活拒绝/精确pin及缺失发现错误，单文件8/8 exit0；原LocalApiServer生成/关闭未重跑。

MCP PLAN永久删除预览补界面同用confirmed_paths；假Host 6/6 exit0，未生成确认或操作真实文件，后续双页及路径保护不变。

MCP只读观察身份含字符串/数值公开schema，假后端7/7及官方客户端7/7 exit0；登记编辑首断言未匹配exit1未写入，已按实际原文更新。未修改真实文件或共享配置。

Git同步：0aa6b27c普通push exit0，首次fetch exit1（TLS unexpected eof）；经总控单次恢复裁决，核master/HEAD/origin/upstream后fetch exit0，HEAD、origin/master及FETCH_HEAD均为0aa6b27cc0c7f05b46a155486b23cbdb8318b8e0。

旧CLI剩余19项逐项记录业务断言、既有证据及真实缺口；源审不冒测试通过，不删原用例。

中立客户端SFTP发现覆盖及默认路径补验，单文件3/3 exit0；未连接真实服务。

MCP文件上传Gateway/Host核工作区规范路径、精确Worker及越界拒绝，假后端8/8 exit0；未上传。

MCP workspace上传核现有范围manifest、禁止裁剪和撤权拒绝，假后端9/9 exit0；未上传。

MCP服务器配置保存核模拟人工审核、profile及激活参数，假后端10/10 exit0；未改真实配置。

MCP下载范围及handoff核精确Worker、配置参数与撤权，假后端11/11 exit0；未写真实配置。

另10个重复函数体关联原项及边界，辅助实现可能不同，旧测试保留；登记压缩前两次超阈值断言exit1未写。

补发现旧录制Runner外部2项测试：checkpoint及正式PLAN保护须保留；coverage列差异，未运行。登记前两次超阈值断言exit1未写。
