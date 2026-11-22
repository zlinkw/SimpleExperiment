# G004 执行登记

519重载：专用根默认profile实测519 PID29888，离线、低流量、5配置/1启用、PLAN、任务选择、结果目录、离线包和授权保持；识别原值与现值均未完成。默认发现曾指向稿件且未调用；流程读错可致覆盖，首1/2 exit1，`g004-519-flow-real-workflow-ff08.log`，无真实损失。A1错误可见、11/11 exit0，`g004-r519-a1-project-state-ff08.log`。细节见coverage.g004U04RemainingInventory.g004Reload519LocalAudit。

布局并行清旧键可能丢值，首0/2 exit1，`g004-519-layout-legacy-failure-ff08.log`，无真实损失证据。A2成功保存后清旧键；状态13/13、布局3/3、上下文20/20 exit0，日志 `g004-r519-a2-project-state-ff08.log`、`g004-r519-a2-layout-ff08.log`、`g004-r519-a2-context-ff08.log`。拓扑假对象3/3 exit0，未动真实设置。

519指标语义合并，两次各0/1 exit1，`g004-519-metric-identity-ff08.log`、`g004-519-metric-collision-ff08.log`。A4保留语义及显式别名；CSV/JSON、预览、schema、0/空6/6 exit0，`g004-r519-a4-metric-final-ff08.log`。未写真实项目。

R519 A5按输入列选择默认长宽预设，保留显式和自定义预设；解析器/CLI及MCP目录各8/8 exit0，日志 `g004-r519-a5-parser-final-ff08.log`、`g004-r519-a5-mcp-ff08.log`，未调用Worker。

R519 A6历史结果读错/坏JSON反馈原因，缺失仍允许；内存fs联验1/1 exit0，同目录 `g004-r519-a6-history-final-ff08.log`，未调用Worker。

R519 B2选择等待保存并反馈跨项目/持久化失败；已写PLAN失败明确提示。假对象动作46/46、迁移13/13、上下文20/20 exit0，日志 `g004-r519-b2-actions-complete-ff08.log`、`g004-r519-b2-migration-ff08.log`、`g004-r519-b2-context-ff08.log`。首44/45 exit1因抽取夹具缺`selectResultPreset`，已补依赖，`g004-r519-b2-actions-first-ff08.log`。

R519 B3手动刷新/重连失败可见，后台容错保留。假对象4/4、低流量16/16、关闭决策14/14 exit0；日志 `g004-r519-b3-network-final-ff08.log`、`g004-r519-b3-traffic-ff08.log`、`g004-r519-b3-closure-ff08.log`。

R519 B4调试包缺失、取消和失败不冒成功；假UI/传输/文件1/1 exit0，`g004-r519-b4-debug-first-ff08.log`，无实际下载。

R519 C1修复14项API本地路由，保留确认、资源租约及业务门禁；真实入口配假handler 47/47 exit0，同目录 `g004-r519-c1-actions-first-ff08.log`，未执行远端动作。

R519 C2设置global不误落项目；源码48/48、内存配置49/49 exit0，`g004-r519-c2-actions-first-ff08.log`、`g004-r519-c2-consumers-ff08.log`，未改真实设置。

R519 C3五个Git命令返回Promise，假对象4/4 exit0；首3/4 exit1为测试误判注册顺序，日志 `g004-r519-c3-git-first-ff08.log`、`g004-r519-c3-git-final-ff08.log`，未动真实hook或发布。

R519 C4旧CLI参数曾在进入shim前被解释管道，exit255；对照exit0，TEMP夹具 `g004-c4-cmd-fixture-1a624cb400094bdca5c67bf46b5f57c9`。用户现退役业务CLI，不更改结果ID。

B1末尾通知租约返修先验：原方法未释放的断言失败；新增夹具未恢复通知替身致后续用例超时20秒、单文件exit1，已停止不重试，日志 `g004-r519-b1-lease-before-ff08.log`；非真实Host操作。异步通知及夹具清理候选未运行验证，待总控裁决。

T1实例发现/RPC与错误类型移至中立API位置，Server/面板/分支调用接入；假回环1/1 exit0，首0/1 exit1因误以为旧unavailable是CliError，日志 `g004-r519-t1-client-first-ff08.log`、`g004-r519-t1-client-final-ff08.log`，未连接真实实例。

T2中立MCP版本解析器假对象1/1 exit0，`g004-r519-t2-resolver-missing-ff08.log`。新启动器/安装器仅写MCP入口，假进程及隔离目录2/2 exit0，首1/2 exit1因测试原位sort改了对照数组，日志 `g004-r519-t2-entry-first-ff08.log`、`g004-r519-t2-entry-final-ff08.log`；生产入口尚未切换。

T3查询上下文与RPC/结构化输出支持迁出，真实queryProject并发及假RPC2/2 exit0；首1/2 exit1因替身用普通Error冒充业务错误，日志 `g004-r519-t3-support-first-ff08.log`、`g004-r519-t3-support-final-ff08.log`。其余消费者待迁。

T3补项目路径读取及结构化精简，限定查询上下文、不退回cwd；源码查询8/8 exit0，`g004-r519-t3-compact-first-ff08.log`，消费者待切换。

T4迁出MCP解析、结果、指标和比较；真实查询配合成数据与旧消费者逐值对照，0/中文/特殊键/排行/缺参5/5 exit0，`g004-r519-t4-compare-final-ff08.log`；真实Worker未测。

T5提取runtime及实验查询，保留既有结构化输出；12项真实queryProject配假RPC与旧消费者对照，含空结果/失败9/9 exit0，`g004-r519-t5-experiment-complete-ff08.log`；补默认精简输出对照后同文件9/9 exit0；未请求Worker，日志等消费者待迁。

T5日志查询迁出；真实queryProject对照旧消费者的全部与尾部记录、缺失实验，单文件9/9 exit0；未联系Worker。

T6迁出server_list及PLAN构建/矩阵，真实查询假RPC与旧消费者对照、空矩阵/seed0 6/6 exit0，`g004-r519-t6-plans-first-ff08.log`；未查询真实服务器。

T6资源可用查询迁出；真实queryProject假RPC对照旧消费者，GPU零利用及进程占用保持，单文件10/10 exit0；未查询真实Worker。

T6产物列表和检查迁出；真实queryProject假RPC及合成文件对照原消费者，含空/非空列表、精确ID、文件检查和缺失错误，单文件11/11 exit0；未查询真实Worker。

T7公开入口与安装改为独立MCP，排除旧CLI包内容；入口3/3、内容策略12/12 exit0，尚未构建或实际安装。

T7主指南改用界面/MCP；配置文档保留旧CLI历史并标明退役。

MCP训练进度、健康、失败告警、详情、树摘要、查询schema、原生生命周期、活动快照及已存运行迁测分别9/9、6/6、6/6、6/6、8/8、4/4、3/3、6/6、4/4 exit0；告警首exit1为TS加载器顺序错误，调整后通过（chunk 9a5c16/a38600）。资源拒绝和产物精确归属补验11/11；旧测试保留，CLI专用/剩余断言尚待映射裁决。

运行身份迁测首6/8 exit1（旧CLI专属resolveRuntimeObservation未迁出），移除新测试中该旧助手调用后8/8、补捕获后13/13 exit0（chunk ee595e/7f85ac/105c6d）；此两旧用例仅部分迁覆，MCP引用选择另见mcpQuerySchema。树摘要补活跃查询后9/9，旧CLI的compact-json组合未迁；旧断言及矩阵未改。

MCP终态身份10/10、结果精确身份及导出1/1、日志与配置1/1、合成本机端点的运行观察1/1 exit0；后者不是真实Worker。包排除旧runner并补动态MCP闭包清单，入口3/3、策略12/12 exit0，尚无实际VSIX验证。

519识别未完成及同窗冲突不能认定锁死；原识别不记完成首0/1 exit1，`g004-519-bootstrap-recognition-ff08.log`。B1保存PLAN及识别事实；假对象2/2、快速9/9、上下文20/20、命令3/3、持久化3/3、投影6/6 exit0；日志 `g004-r519-b1-` 加 `recognition`、`quick-first`、`context`、`command`、`persistence`、`projection` 及 `-ff08.log`。未改真实标记。

519历史CLI合成查询通过、精确ID经cmd失败，详见coverage。A3 Git hook读错及标记不完整保留原文件，假fs及启动消费者3/3 exit0，`g004-r519-a3-git-hook-ff08.log`。300/137/45/167母集重叠，不相加。

519发行：源码/tag `6932321534f3b0c2df3b1983bfede2f88f7b868f`，[试行Release](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.519)与下载同SHA、Latest483。ReleaseClient首验误期待SFTP Latest120（实际118）exit1，修后exit0，`g004-519-client-after-ff08.log`。唯一安装exit0含DEP0169，`g004-519-install-ff08.log`。实机见顶部。

519唯一package exit0，341/341、13门禁、进程树结束、峰1、按需0及锁释放；输入=end `02a04b0a7ed920361e852dea0e41d4740114b1cefbb1aabb8ab2c4bd71f5560f`，日志 `g004-519-package-ff08.log`，回执 `simple_cluster/reports/test-workflow/2026-11-22T06-35-19-310Z-69208-package/run.json`。新dist识别/Panel/生成脚本VM通过、10890零命中；VSIX闭包326/同源373及内容策略通过。包2,988,831字节，SHA256 `525e235fe7e380bf3684edf5b8bfd3dd7620badefd964dcdcd671b14c0216b33`；完整原文及预检路径误写见Git `48062264:docs/plan-generations/G004-execution.md`。

519交付预检及工具误用见Git `48062264:docs/plan-generations/G004-execution.md`；dry-run exit0，341独占、按需0、max1。

项目识别记忆：globalState单根保存及隔离，API/面板同源。Memento首0/2 exit1、修后3/3，提示1/1、迁移10/10 exit0；日志 `g004-518-onboarding-before-ff08.log`、`g004-518-onboarding-isolation-ff08.log`、`g004-518-onboarding-prompt-final-ff08.log`、`g004-518-onboarding-bootstrap-final-ff08.log`。未改真实标记，原文见Git `48062264:docs/plan-generations/G004-execution.md`。

项目清除状态修复：null/cleared旧值不复活，坏JSON/EACCES报告。内存存储首9/10 exit1、修后及补验各10/10 exit0；TEMP日志 `g004-518-cleared-before-ff08.log`、`g004-518-cleared-after-ff08.log`、`g004-518-cleared-final-ff08.log`。未清真实数据；原文见Git `48062264:docs/plan-generations/G004-execution.md`。

518重载验收：默认profile专用根Host 0.5.518、offline_import、低流量、本人grant及5配置/1启用均实核，未操作Worker。U54公开选择和持久化读回、U55配置保存恢复及MCP合成解析/排行通过；主动results.list/result_export需访问Worker，本轮未测。U56离线包导入/恢复exit0，面板显示2/2及0/中文/引号/空值并标未核实；首次离屏元素、文件框索引和坐标校验失败未输入。完整原证据见 `89498eff:docs/plan-generations/G004-execution.md`，517旧证仅按原范围复用。

518时持久化身份及未识别状态原始调查见 `89498eff:docs/plan-generations/G004-execution.md`；其旧workspaceState引导标记描述只适用于当时运行源码，519已按规范项目根存入同profile globalState。不能借其他profile值或虚构已识别，518未含后续持久化源码修复；四跨项目与89旧延期范围未开放。

518项目本地状态返修：损坏或拒绝读取不再当作不存在并覆盖，离线导入/清除保存失败恢复原值；内存测试7/8 exit1→9/9及补验9/9 exit0，TEMP日志 `g004-518-state-read-before-ff08.log`、`g004-518-state-read-after-ff08.log`、`g004-518-state-read-final-ff08.log`。未修改真实旧文件；详细原文见Git `48062264:docs/plan-generations/G004-execution.md`。

518共享连接保存队列失败后可重试且保留旧迁移值；内存测试0/1 exit1→1/1 exit0，TEMP日志 `g004-518-shared-retry-before-ff08.log`、`g004-518-shared-retry-after-ff08.log`。嵌套PowerShell变量展开曾导致解析错误exit1，未启动测试；未改真实连接。原文见Git `48062264:docs/plan-generations/G004-execution.md`。

0.5.518最终交付：源码/tag `20ae86ed32f0baa9106645decb60cf9a299f3518` 已FF同步，[试行Release](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.518)及隔离下载同SHA `703d5ae27781921294ff5eeb0bb7355ec7db8581390b73549420a564045e5624`，2987002字节。客户端确认Latest483、518/SFTP120不降级；安装一次exit0含DEP0169，磁盘518/SFTP120。第二次package 341/341、13门禁、并发1、锁释放，receipt `simple_cluster/reports/test-workflow/2026-11-22T03-36-44-479Z-33768-package/run.json`；Panel和生成脚本VM、内容策略通过。原运行闭包核验丢输出和退出码未知，总控批准实际ZIP等价325闭包/324面板/371同源检查exit0，不覆盖原未知。首次package失败及补验见下，完整交付见Git `1242c55c:docs/plan-generations/G004-execution.md`。

518 精确 `git add` exit1 提示 dist 被忽略；回读状态确认指定13个已跟踪生成文件及8个非生成文件均实际暂存，未强制添加或触碰未跟踪项。

0.5.518首包339/341 exit1、前10门禁通过、并行峰1及锁释放，原回执 `simple_cluster/reports/test-workflow/2026-11-22T03-16-49-272Z-80576-package/run.json`。mcpProject 41/43因夹具共用对象，复制后43/43；serverQuota 9/10因夹具缺`mcpInvocation`，修后10/10，均exit0；补验日志同上临时目录 `g004-518-mcp-project-after-ff08.log`、`g004-518-worker-quota-after-ff08.log`。仅修夹具，后续发行状态见顶部，未动真实权限/Worker。

U54–U56原日志见Git eab27339同路径：U54 42/43→43/43；U55 43/44→44/44、新裁决45/45两轮；U56预览8/8、坏行7/8 exit1→8/8及别名8/8。help不支持exit1，CLI默认绑定不符exit2未重放。
U04排查基线HEAD=origin/master `b7c0b42c27227a8ec49d42d1f21346900a274ae4`、tracked clean；原材料在Git `48062264:docs/plan-generations/G004-execution.md` 和coverage。factory缺四项门禁回退legacy，恢复页VM 5/5 exit0；未重载、写剪贴板或访问服务器。旧静态脚本不能代表完整母集；后续源码见1ff64a81及下文，旧执行聊天已归档。

版本审核13/13、缓存及同步页4/4和3/3 exit0；U04-01夹具首失败、U04-02延期，见4a80c627及coverage；无真实删除。

登记上限12000、90%时归并；完整旧记录在Git 10c0689e及4a80c627同路径。范围单机最多两个项目；保护真实Worker、训练、消费项目、共享配置、原窗口及夹具。源码、旧dist、安装及远端效果分记。

既有G004/U01–U02原始细节及首失败在 Git `10c0689e:docs/plan-generations/G004-execution.md`，U03/516在 `b7c0b42c` 同文件及计划，历史数字不作当前按钮分母。A组首0/3含缺VS Code夹具，修夹具仍0/3、修逻辑3/3、限定实际入口4/4；空seed/cases和reset首失败后修复。MCP43/43、旧断言修后15/15；build首并发中止exit1、夹具6/7→7/7，最终回执 `simple_cluster/reports/test-workflow/2026-11-21T04-18-18-128Z-69044-build/run.json` 为285/285、10门禁、并发1、按需未跑6。唯一旧锁经本人精确授权删除。

0.5.514/515安装、发行及实际失败见10c0689e与G004-plan，Latest仍0.5.483。

U01/U02/U03分别2/8/10项已修；U03末轮42/42 exit0。J01宿主缺GIT_CONFIG_VALUE_0/5且传递未知；simpleex --version绑定不符exit2。完整记录见b7c0b42c及计划。

0.5.516 package首轮340/341 exit1，断言修后22/22及341/341 exit0；安装一次、未获用户Reload确认，证据见计划及b7c0b42c。
U04逐项调查、原始退出码与受控证据保留于 Git f72d0066 的本登记及 coverage.g004U04RemainingInventory。确认43项：单项目39、跨项目02/05/06/07延期4；20、33–36、40–44撤回并保留编号与证据。安全拦截后未重放专项；没有真实Worker、任务、文件删除或窗口操作。

旧关键失败保留于Git b3c3926c同文件及coverage：日志导航12/13、VM首夹具失败、U04-03假错误类型、U04-10时间戳比较、CLI绑定不符与yaml依赖缺失；后续通过不覆盖首失败。
最终逻辑母集300项：界面279（限定结论204、延期75），独立VSCode命令21（限定结论7、延期14）；合计限定结论211、剩余89均延期。GPU两合成行合并/打散及假持久化、TMUX三种合成导航和all筛选、端点清单假编辑器正常/错误均exit0；真实Worker、剪贴板、网络未测。资源导航6精确/2回退exit0，首次探针语法错误exit1未写。13项旧工具证据适用边界及全部映射见coverage.logicalActionCensus，实际控件实例数未知。

B1/B2/B3 39项分组修复、各项受控结果和首失败详见 Git `c37827c8:docs/plan-generations/G004-execution.md`，不将受控结果扩称真实Worker通过；U04-30特殊键、日志导航首12/13及后13/13证据见 `eab27339` 同路径。4跨项目与89入口未开放。
0.5.517历史原材见 Git `871ea78e:docs/plan-generations/G004-execution.md` 及89498eff：首package 337/341 exit1、stdin关闭取消失败，修夹具后341/341及13门禁通过；生成脚本首转义错误和日志导航首12/13均保留。试行Release绑定a7d2a727、VSIX SHA256 2fa2ecb3e0d890d47653ee8b7f5ffe29317c22d692659ae4cd8d34336a6989e5，安装一次exit0；Latest仍483。旧时未重载以随后518实机记录为准。

T7收包策略：排除旧业务CLI及依赖它的旧MCP启动器，要求独立MCP启动器、resolver、服务及客户端；packageContentPolicy 12/12、mcpEntry 3/3均exit0，尚未实际打包。

T7矩阵：19个已定向验过的MCP迁移、连接和收包测试加入build/check:full/package/smoke，四profile只读规划各19项独占、均非按需；原项目全树输入指纹保持，旧项未减。test/features及acceptance原glob也涵盖新项。B1未纳入上述显式组，仍未运行验证且是交付阻断。训练进度旧文件误重写但内容已恢复，复验9/9 exit0；生成命令首引号错误exit1未写入。

MCP Worker生命周期迁测：queryProject配独立本机合成API/Worker，4/4 exit0（chunk 252e84）；限流、来源和父级3/3 exit0（702b10）；旧8项的无API离线历史剩1项属CLI专有回退，MCP仍需Host、不新造history，原用例保留待裁决。两新测试纳入四个交付profile。

迁移期mcpQueryContext已脱离全部CLI引用：以旧实现实测结果固定MCP输入、输出、身份和错误断言，实验视图fixture排除动态快照字段；11/11 exit0（0eaa05）。转换时metric及compare的null原型两次10/11 exit1（f7c9b7、2eba9b），修期望后通过；旧CLI测试未动。

MCP普通结果契约8项已切换中立实现，保留资源拒绝、零值、空结果、schema、预设、日志级别、歧义和产物身份断言；8/8 exit0（e1771b），加入四个交付profile。

空PLAN矩阵断言迁至MCP计划实现，空种子/空case及正常矩阵1/1 exit0（b4464e）；纳入交付profile。
