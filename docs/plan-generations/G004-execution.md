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

R519 C2作用域修正见Git `3f4a165c:docs/plan-generations/G004-execution.md`。

R519 C3首测失败与补验见Git `404aa6cf:docs/plan-generations/G004-execution.md`。

R519 C4旧CLI参数曾在进入shim前被解释管道，exit255；对照exit0，TEMP夹具 `g004-c4-cmd-fixture-1a624cb400094bdca5c67bf46b5f57c9`。用户现退役业务CLI，不更改结果ID。

B1末尾通知租约返修先验：原方法未释放的断言失败；新增夹具未恢复通知替身致后续用例超时20秒、单文件exit1，已停止不重试，日志 `g004-r519-b1-lease-before-ff08.log`；非真实Host操作。异步通知及夹具清理候选未运行验证，待总控裁决。

T1–T7迁移及阶段检查、真实失败与日志详见Git `32d16ac4:docs/plan-generations/G004-execution.md`；原测试和证据保留。

MCP生命周期证据见Git `7803f938:docs/plan-generations/G004-execution.md`。

mcpQueryContext脱离CLI，原业务11/11；首两次10/11 exit1及修后详见Git `8249eb4d:docs/plan-generations/G004-execution.md`。

MCP普通结果8/8，已入profile。

空PLAN矩阵MCP 1/1，已入profile。

原mcpProject并发查询43/43；其余多为旧dist，详见Git `2551787c:docs/plan-generations/G004-execution.md`。

同PLAN不同运行身份及终态不复活，MCP中立测试14/14（937804）；原测试保留。

MCP Worker生命周期无旧CLI依赖4/4；中立错误首0/1 exit1后1/1，详见Git `cc50ceea:docs/plan-generations/G004-execution.md`。

缺失指标、null导出及特殊键比较改核MCP实现，3/3 exit0（2c5e04），已列四交付profile。

结果CSV身份与宽长格式/显式预设断言切换至MCP解析，8/8 exit0（368f81），纳入四交付profile。

动作产物/结果断言改读MCP，假对象49/49（af772e）；纳入交付profile。

MCP排行补全列/零值，12/12（024418）；CLI终端断言待裁决。

旧CLI 302项索引及初期分类见Git `97607ab8:docs/plan-generations/G004-execution.md`；原测试未退役。

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

MCP预检Gateway/Host假端口2/2，旧CLI差异见Git `97607ab8:docs/plan-generations/G004-execution.md`。

MCP远端产物精确身份/越界拒绝、结果缺参/缺文件及主指标方向：新增缺文件断言首14/16 exit1（实际ENOENT而非not found），更正后16/16及方向补验16/16 exit0；假RPC无Worker。

MCP GPU观测与任务分别保留Worker/GPU0/command并显式传播失败，Gateway假Host 5/5；UI精确导航为既有局部证据，未新造自动匹配视图。

中立客户端258记录/绑定8/8，见Git `35056314:docs/plan-generations/G004-execution.md`。

MCP PLAN永久删除预览补界面同用confirmed_paths；假Host 6/6 exit0，未生成确认或操作真实文件，后续双页及路径保护不变。

MCP观察身份schema及官方客户端各7/7；登记编辑首断言exit1未写，详见Git `bf51cffc:docs/plan-generations/G004-execution.md`。

Git同步：0aa6b27c普通push exit0，首次fetch exit1（TLS unexpected eof）；经总控单次恢复裁决，核master/HEAD/origin/upstream后fetch exit0，HEAD、origin/master及FETCH_HEAD均为0aa6b27cc0c7f05b46a155486b23cbdb8318b8e0。

旧CLI剩余19项逐项记录业务断言、既有证据及真实缺口；源审不冒测试通过，不删原用例。

中立客户端SFTP发现覆盖及默认路径补验，单文件3/3 exit0；未连接真实服务。

MCP文件上传Gateway/Host核工作区规范路径、精确Worker及越界拒绝，假后端8/8 exit0；未上传。

MCP workspace上传核现有范围manifest、禁止裁剪和撤权拒绝，假后端9/9 exit0；未上传。

MCP服务器配置保存核模拟人工审核、profile及激活参数，假后端10/10 exit0；未改真实配置。

MCP下载范围及handoff核精确Worker、配置参数与撤权，假后端11/11 exit0；未写真实配置。

另10个重复函数体关联原项及边界，辅助实现可能不同，旧测试保留；登记压缩前两次超阈值断言exit1未写。

补发现旧录制Runner外部2项测试：checkpoint及正式PLAN保护须保留；coverage列差异，未运行。登记前两次超阈值断言exit1未写。

源审返修可选RPC：真实Gateway假Host首7/8 exit1（普通拒绝被吞），修改后8/8；真实未声明方法首7/8 exit1（TypeError），明确-32601后8/8。共享消费mcpQueryContext首14/16 exit1（夹具缺operations/live.output），补真实空响应后16/16；WorkerLifecycle 4/4、mcpProject 43/43 exit0（后者部分旧dist），未测真实Worker。保留失败原工具输出，未build。

产物路径越界首16/17 exit1后17/17；细节见Git `97607ab8:docs/plan-generations/G004-execution.md`。

SimpleSFTP UI创建项目及隔离前判断见Git `35056314:docs/plan-generations/G004-execution.md`。

中立错误模块移除无消费者的CLI JSON包装/成功码，保留错误分类和码；连接3/3、MCP查询17/17 exit0。

MCP查询去除无消费者CLI json/compact开关，默认精简及full语义保留；17/17 exit0。登记首次超阈值断言未写。

正式PLAN替代候选：Gateway缺PLAN及任意command拒绝且零Host调用，合法PLAN绑定授权和工作区；假Host 9/9 exit0，旧安全项保留。登记前两次超阈值断言未写。

旧CLI候选37文件及计数误判exit1见Git `97607ab8:docs/plan-generations/G004-execution.md`，未删。

旧Runner导入仅移至原录制测试内部，同文件checkpoint断言保留；旧dist完整文件2/2 exit0，合成stdout、无Worker；测试及源码未删。

MCP Agent观察入口拒绝调用者token及未知字段，假Host仅收到固定字段；网关10/10 exit0，不代表后端返回内容已脱敏或真实Agent已测。

外部旧CLI待审6项补Host/中立消费者映射及退役差异，旧断言保留；登记首超阈值断言未写。

外部6项同步状态分类，旧测试未退役。

旧入口源码、脚本、模板、清单及测试反向引用核对见coverage；未删目标。登记两次超阈值断言未写。

产物补测：合成远端绝对路径作为元数据保留，不读项目外文件；查询17/17 exit0。

产物节点：同名本地/Worker首16/17 exit1误读本机；按明确本地/Worker/未知分流，旧远端outputDir不作本地，补验17/17。合成本地夹具显式声明endpoint，原断言保留；登记前两次超阈值未写，无Worker。

真实CleanupFileApi+MCP Gateway/Host：首1/4 exit1，move目标字段缺失及观察并发缺省不符引擎；修后4/4、路由11/11、官方客户端10/10 exit0。状态存储/传输/活动/租约纯内存，未真实移动删除或访问Worker，不证明磁盘持久化；新测试显式SIMPLE_TEST_SFTP_ROOT及输入指纹待入矩阵。登记首超阈值未写。

真实清理引擎测试纳入build/check:full/package/smoke四profile，计划各一次且20秒；输入指纹绑定显式SIMPLE_TEST_SFTP_ROOT及package/engine字节，合成更改验证exit0。计划首断言漏--test exit1，修正后四项exit0；只读计划未启动矩阵或B1。

补列旧仓内simpleex-mcp包装为第38项：其依赖旧CLI resolver及旧安装器/测试；新MCP启动器与用户全局shim保留，当前不删。

CLI 302项逐条拟动作及每文件当前计划来源、矩阵候选列coverage；尚未批准或应用任何退役，存在边界缺口者继续保留。只读planner未运行测试、B1或build。

真实CleanupFileApi补无效token、非法类型与跨项目token拒绝，Gateway/Host及内存引擎5/5 exit0；跨项目直接调用引擎，未操作真实Worker或磁盘清理。旧CLI其余usage边界仍待审。

中立客户端SFTP槽位分别遇错误发现名称与错误capabilities均拒绝且零RPC，合成回环3/3 exit0；旧CLI退出码未迁。

产物兼容返修：恢复原索引无endpoint夹具，首15/17 exit1（本地结果空及manifest找不到）；按本地索引、runs目录的内部来源事实保存独立路径，非本地Worker索引/历史不猜节点，修后17/17 exit0，含原索引、零字节、内根/链接、远端同名和历史。未build或访问Worker。

SFTP当前传输工具缺参、多余字段在业务方法前拒绝，真实Gateway假端口12/12 exit0；不承诺零capabilities、不连接Worker。

中立客户端失效默认发现下依据工作区选择真实合成监听实例，实际RPC只到目标且身份固定；歧义拒绝保留，8/8 exit0，未连接真实Host。

SFTP Worker目录和批量变体经Gateway/Host核源/目标、路径及双Worker授权，与fpsync共13/13 exit0；后端路径和确认边界仅只读源码，未真实传输。

外部26项逐项候选动作及3份中立客户端导入未应用diff见coverage；其他混合函数和真实宿主门禁仍须按证据迁移/授权，不改原测试。

按总控裁决细化302项拟执行动作，已裁决的旧history、CLI展示/包装与默认参数单列候选，业务保护与真实缺口保留；原测试/矩阵未修改。

带Worker旧索引来源未知且无有效远端产物首16/17 exit1（错误返回空列表）；修后明确ARTIFACT_LOCATION_UNVERIFIED并携原身份与声明路径，17/17 exit0。已有远端元数据仍按其来源返回；未访问Worker。

SFTP精确路径下载根目录缺口：Gateway假端口首13/14 exit1（空数组未拒绝），首次修复后13/14 exit1（归一化./仍带尾斜线）；补全根路径判定后14/14 exit0，合法子路径保留。伴随后端允许空串归一为根，现入口阻止；未真实下载。

MCP项目/控制固定工具缺参、Hub旧字段及不存在pause在业务方法前拒绝；真实Gateway假方法11/11 exit0，不声称零握手或真实Worker。

空target patch依伴随源码由已有配置及后端规则决定；Gateway保持人工批准/工作区并传播模拟后端拒绝，15/15 exit0，未写真实配置。

七项旧CLI发现/身份用例形成未应用精确diff，逐项关联真实中立消费者业务证据；旧退出/doctor外壳拟退休，其他原测试和矩阵保留。

中立握手的身份/版本/槽位错误补断言凭据不出现在错误栈；合成端点3/3 exit0。

四份候选diff只读git apply --check：首两次exit1，Windows文本管道将补丁LF转CRLF导致上下文不匹配；改UTF8字节输入后4/4 exit0，未应用。

SFTP配置移除仅用假人工提示/假后端核取消不调用、审批后精确ID与拒绝传播，16/16 exit0；未操作真实配置或实点。

五项旧CLI专属表面按裁决重分并关联现清理引擎、UI项目创建及后端负责范围；假端口/源码边界明确，未实际清理或创建。

伴随0.2.120服务器公开字段真实函数经MCP Gateway/Host假端口核模拟凭据不回显：首0/1 exit1（夹具缺capabilities），补后1/1 exit0；未读真实配置。测试纳四profile，指纹绑定明确伴随extension.js。

伴随公开字段测试四profile只读计划各1项、20秒；合成extension字节变化使输入指纹变化，均exit0；未运行整矩阵。

PLAN列表保留原valid-plan输入，实际Host摘要解析与Gateway字段/状态/契约联验11/11 exit0；刷新为假端口，旧CLI字段外壳差异未冒等价。
