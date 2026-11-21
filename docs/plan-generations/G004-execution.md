# G004 执行登记

本登记上限12000字符、90%时语义归并；原完整逐项记录保留于 Git 10c0689e:docs/plan-generations/G004-execution.md，项目计划与代次索引为总控独占。执行范围为本人日常单机最多两个项目，不做多项目压力、无入口参数突变或新锁队列；保护真实Worker、训练、消费项目、共享配置、原窗口、未保存文档及全部夹具。源码、旧dist、已安装版本及远端效果分开记录。

原G004的12项均完成受控检查：授权/撤销及同步目标；精确任务日志与游标；异步回执；结果比较/导出；解析/排行榜；PLAN生成/矩阵；配置重置；结果重建。A组首测0/3、exit1含两个缺VS Code夹具；修夹具后旧范围仍0/3，原逻辑修正后3/3，用户排除内部args任意突变测试后修订范围4/4、互传补充1/1、MCP35/35均exit0。日志首测空远端误返其他run缓存、另本机240行仅返200行，分别exit1后修复；Worker since=0首读最多尾部256KiB并续读，不冒完整。PLAN生成首测空seed改默认、矩阵空cases计2、无名case漏计均exit1，修后目标及原解析回归通过。配置reset首测错误允许共享scope、exit1，修后范围/取消/失败/双项目受控通过。其他详细原始失败与路径见上述Git旧记录及G004计划。

统一回归MCP43/43；experimentPlatform原14/15、exit1因旧固定basename与PLAN显式声明契约冲突，总控裁定仅修旧断言后15/15。首次build因默认并发2主动中止exit1，后续BUILD_LOCK_UNSETTLED；本人明确批准仅删除process-owner.json，总控核直接父目录及身份后删除。再构建windowScopeIsolation夹具缺方法导致6/7、exit1，补夹具后7/7；最终build回执 simple_cluster/reports/test-workflow/2026-11-21T04-18-18-128Z-69044-build/run.json 为285任务/10门禁、exit0、最大并发1、锁释放，6按需未运行不冒通过。原中止与失败记录保留。

0.5.514试行版本提交53107d12，包实际SHA256 e6f643db488daea13d985a0663c8b9be5011e8e6b24020e35d38c99d75f675a6，但上传清单误写60位缺f675，B03失败；包及错误资产保留不可覆盖。独立verify:package-runtime因vsce ls既定30秒超时exit1，等价实际ZIP闭包和同源字节检查获接受，未改超时。本人重载前已安装514一次；直接版本API曾因项目不符exit1。

0.5.515仅版本及生成闭包修正，源码/tag 5dda9cf240ad6d87915a961d76be8efe2d64c09b；package回执 simple_cluster/reports/test-workflow/2026-11-21T04-51-48-484Z-62512-package/run.json 为341任务/13门禁、exit0、并发1、锁释放。试行Release及实际下载包2,983,720字节、SHA256 8beb78d1663048e9481d386d26c4b25c9b96ed5f2b2f8194ed4bfca9390c76f3，两份97字节清单一致；权威Latest保持0.5.483，实际更新客户端确认不降级。515安装一次、本人随后重载并在专用界面确认；SimpleSFTP为0.2.120，真实Worker未检查或更新。

2026-11-21 U01：用户已重载515，总控在专用离线项目复现显式 `cases: []`、两个seed被列表/顶栏/卡片计为2，以及拆表空词条报错后查看操作日志为空。源码级定向复现首测0/2、exit1，分别为计数2而非0和日志0行。正式PLAN与草稿摘要改用已有 `parsePlanSummary` 的case数量：显式空列表为0，隐式单case仍为1；普通UI失败状态写入完整错误及操作ID/命令，已有PLAN和产物命令仍只记原有一次。源代码内存转译及实际摘要解析的完整目标文件 `node --test --test-force-exit --test-timeout 20000 test/ui/actionLifecycle.test.js` 11/11、exit0，覆盖空/隐式/两个case、长错误、查看日志和已有命令不重复；未构建dist或在安装界面实测修复。分支卡 `GIT_CONFIG_VALUE_0` 错误的真实VS Code子进程来源未核清，仅记本机环境受限，未改Git配置。未查服务器，两个源码问题待总控审查，后续统一构建与界面验证尚未执行。

U02进行中：旧验收祖先及分支经当前源码 `readGitIdentity` 只读返回预期根、共同Git目录和分支，祖先dirty、分支clean；工具进程counted配置键和值均存在，部分值为空。受控子进程保留完整配置时Git exit0，移除第0个值复现同一missing错误、exit128；VS Code实际扩展宿主缺失来源未核清，不删配置或把猜测写成修复。MCP状态摘要/完整、state只读/取消零写、操作筛选后分页及原ID、流程更新读回、归档PLAN筛选已做当前源码受控检查；配置scope/双项目隔离、请求原生状态、SDK错误与本机API绑定复用先前有效测试。草稿转正退役入口明确报错。

U02新增真实修正：flow.update原吞持久化异常（首测缺少拒绝，exit1），改为等待并传出失败；原不能用false清状态、blocked转completed仍阻塞（首测true而非false，exit1），现按显式布尔更新并清除冲突。draft_validate缺少schema必需的精确路径（首测undefined，exit1），现返回实际草稿路径；draft_review将普通draft误报ready_for_review（首测不一致，exit1），现读取刷新后的实际状态并如实报告刷新/项目切换问题。plan_filter带archived时未送入独立归档列表（首测0而非1，exit1），现仅在请求包含归档时纳入并标记归档。各项修复后针对性检查exit0；state只读测试首测夹具缺少状态键导致失败，补齐夹具后exit0。其余检查继续，尚未统一构建或安装新源码。

续查发现草稿刷新失败时lookup仍使用旧记录（首测缺少拒绝、exit1），现传播实际刷新错误；MCP plan_filter严格schema未暴露host已有的planId、limit、needsChoice（首测缺字段、exit1），已补输入及needsChoice输出声明。当前共7个真实修改点；全部现有目标文件测试28/28、exit0，其中本轮新路径使用当前源码内存转译，原有依赖dist的测试不作为新源码证据。保存PLAN写失败保留原内容、打开失败不改变选择；表格重建失败不打开旧文件；离线Worker入口在端点请求前拒绝，定向测试均exit0。515包原freshResults 9/9、freshResultHost 26/26及resultDatasetHierarchy 12/12回执复用，用于旧/失败摘要与结果源切换；不代表已验证远端现场。其余项目及Git实际缺失来源仍在核对。

U02整份对账：28项逐项结论与证据见 `docs/windows-entry-coverage.json#g004U02Reconciliation`，27项在注明的本机或受控范围内查清，J01的真实VS Code扩展宿主缺项来源仍未知；28项不是全插件按钮总数，动态入口的剩余总数未知。增加拒绝草稿精确身份断言后，最终目标文件29/29、exit0；新增路径以当前源码内存转译，旧dist依赖断言仅为旧范围证据。7项修复不代表已安装，构建、打包、发行、安装及重载后界面复验均待统一阶段；真实Worker未检查。首次失败及夹具修正保留上文。

源码按相关问题分组提交：流程 `45739e60`、草稿 `1e97d510`、PLAN过滤及MCP声明 `72b63c4f`；本记录及补充覆盖测试另行提交。最终修改后的目标测试29/29、exit0。旧验收仓库只读；没有取得专用窗口扩展宿主的实际环境或错误是否仍为新鲜结果，不将工具父环境当作其环境。

总控复核关联返修：在真实flow更新和原有项目持久化队列的受控测试中，项目A写入挂起时正常切换B，旧请求原返回B流程且ok=true；首次测试缺少拒绝、exit1。现捕获项目上下文，等待持久化后确认原上下文仍有效；若已切换，提示在原项目核查写入结果，不宣称写入成功或失败。成功写入及切换时写入失败两种情况均不返回B状态；同项目正常更新及真实写入失败回归合计3/3、exit0。未新增队列或通用框架。

总控新鲜只读证据更新J01：专用实例56788经capabilities核根后读取projects.registry，2026-11-21T06:55:31.752Z祖先及分支仍报错，排除旧卡缓存。该扩展宿主环境COUNT=10、KEY_0..9均存在，而VALUE_0和VALUE_5缺失，其余8值存在且非空；父Code进程无COUNT，工具子进程对应两个值存在但为空。直接Git及cmd.exe路径只读调用均exit0，不能归罪cmd。真实故障为扩展宿主indexed配置不完整；具体哪个启动或传递环节丢失空值仍未知，Chromium过滤空值源码只是机制线索。未修改进程、全局Git配置或恢复环境，未读取或输出配置值；构建、安装和真实Worker检查仍未执行。

U03 R组两项新增（累计待打包12）：普通configuration_set写入A期间切B，旧代码回读B并报告成功；state_set/reset写连接配置期间切B，旧代码在B加载连接并返回成功。真实host方法及受控store/config复现首测0/2、exit1，均为缺少拒绝；现捕获原项目并在写完后检查上下文，保留原scope并提示写入已完成、切换后需核查；正常回读重新取得原项目配置对象。修正时误改config_get一次导致既有windowScope目标ReferenceError、exit1，已恢复并重跑1/1、exit0。完整actionLifecycle当前源码内存转译32/32、exit0；旧dist相关断言只证明原范围。未修改真实配置或连接。X候选listWorktrees的branch字段会截短，但当前registerBranch仅使用路径判归属，尚无实际消费者缺陷，不计数。

U03 S组两项新增（累计14）：PLAN登记将显式空cases扩成两个虚假实验（首测2而非0、exit1），修正登记计数和记录，保留隐式单case及null优先语义；历史草稿转正预览实际返回targets/conflicts/debugStatus，但MCP输出schema漏声明，首测缺字段exit1，补充真实结构。当前源码定向2/2、exit0；两者均为受控文本及替身，未写用户PLAN或启用退役转正。

U03草稿预览另修两项（累计16）：debug摘要读取权限错误原被当文件不存在（首测缺拒绝exit1）；恰好101行原误标截断（第二次首达该断言true而非false、exit1）。现仅缺文件时继续尝试，真实读取错误传播；仅超101行标截断。受控当前源码测试1/1、exit0，覆盖ENOENT、EACCES及101/102行，未访问真实日志。

U03草稿项目绑定一项（累计17）：查找期间由A切到含同路径的B时，四个草稿入口可能误读或操作B，首测缺少拒绝、exit1。公共查找现检查原项目上下文；审核/拒绝写入A后若切换则提示原项目核查，不刷新B。受控当前源码关联5/5及写后切换1/1、exit0。

U03产物身份一项（累计18）：同一任务不同子目录同名产物原生成相同ID、查找取首项；首测两ID相同、exit1。现ID保留相对路径，旧简称有歧义时明确拒绝，受控源码定向1/1、exit0。

U03结果产物身份一项（累计19）：结果列表原以resultId生成产物ID，详情却按experimentId查询，真实返回ID无法回读；受控首测未找到、exit1。现以所属实验及完整路径生成ID，并保留空文件的0字节；两项产物定向2/2、exit0。无真实远端查询。

U03结果解析一项（累计20）：Windows合法大写.JSON扩展名原误作CSV，首测csv而非json、exit1；现按大小写无关扩展名判定，实际Results解析器受控读取指标0.9，定向1/1、exit0。产物三种身份受控回归3/3、exit0。累计20为独立问题，不是按钮检查总数；仍须补必要调用链回归及总控源审。

U03源码小验收：最终 `node --test --test-force-exit --test-timeout 20000 test/ui/actionLifecycle.test.js` 41/41、exit0；仅以当前源码内存转译/提取及受控替身覆盖新路径，既有少数dist断言仍仅证明旧范围。普通配置读回原windowScope目标1/1、exit0。R/S/T及相关MCP调用链见上文，W复用U01及旧生命周期有效证据；X的listWorktrees分支短名当前仅path被用户流程消费，非已证实用户缺陷。Git缺VALUE_0/5实际故障未恢复、传递环节未知；真实Worker、统一build/package/install/发行及新界面均未执行。现交总控最终源审，不把源码小验收当运行交付。

U03源审必要闭包返修（累计仍20）：真实Scheduler的index_entry_from_manifest受控提取验证保留 `workflow:3` 及目录；真实CLI加载该索引、产物列表及详情回读首测返回错误路径，块式空cases/experiments登记首测2而非0，合计0/2、exit1。详情现由已加载实验身份最长匹配解析，不逐冒号发远端查询；旧唯一简称保留，同名拒绝，native Worker与精确路径保留。空块式及注释按现有摘要的空集合处理，保留隐式case和显式null优先。相关定向5/5、完整当前目标文件42/42，均exit0；仅受控替身及当前源码提取，未运行Scheduler、远端或旧dist来证明新行为。
