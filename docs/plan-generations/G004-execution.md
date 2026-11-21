# G004 执行登记

基线 `a509fc26e37c2c263d3e0692ece8c1fabafac63a`，原已跟踪文件干净；总控修订计划并提交 `9f8e8cc3621870bffaa53f40565e1f7467e67664`，master=origin/master。[G004-plan.md](G004-plan.md) 为总控独占。唯一执行者与检查/生成租约为 Terra `01a1e793-a4a0-7630-8157-24c920746d1a/local`，身份 high/default、match，接续条件尚未触发。本登记预算12000字符，90%时整体语义压缩。

本代按计划连续核查12项，既有有效证据复用，真实缺口修复。本人原话：“注意不要扩大使用范围，一般来说，单个电脑最多同时开启两个项目使用插件。所以不需要考虑过多的并发情况。”不做多项目/高并发矩阵、压力测试、新锁队列或无真实入口的内部参数突变加固；保留日常双项目切换、撤权、精确目标和现有安全边界。暂不触碰真实Worker、训练、消费项目、共享配置、旧窗口和未保存文档。所有合成夹具、已有摘要及其他受保护对象保留。实际缺陷和首次失败均记录；真实外部效果与受控证据分开。全部项目完成及总控验收后，才统一运行版本构建与试行安装；纯测试/记录无运行变更不造空版本。

| 组 | 项目 | 状态 |
| --- | --- | --- |
| A | 01授权及设置确认、02同步授权 | 已通过受控验证 |
| H | 03 MCP任务日志及游标 | 已通过受控验证 |
| B | 04异步MCP回执 | 已通过受控验证 |
| C | 05比较方向、06精确导出 | 已通过受控验证 |
| D | 07文件解析、08指标排行榜 | 已通过受控验证 |
| E | 09 PLAN生成、10 PLAN矩阵 | 已通过受控验证 |
| F | 11配置重置及读回 | 已通过受控验证 |
| G | 12重建结果表按钮 | 已通过受控验证 |

当前开始A组源码与既有测试对账；未查完12项，不以静态搜索冒完成。测试仅单进程且各文件20秒约束，保护旧执行证据和所有用户文件。

A组已有入口证据为 `mcpProject.test.js` 的授权/撤销后下一次调用、Worker身份校验、SFTP真实Host参数和同项目受控传输；尚未覆盖授权选择、modal及上传准备期间的异步漂移。新增同文件断言，复用现有进程与受控store/VSCode/SFTP替身，先检查零写入及正常路径，不增加性能测试或连接服务器。

A组首次目标测试3项0/3、exit1：确认期间项目变化未拒绝；另两项夹具加载 `SftpCleanupReview` 时缺少VS Code替身（MODULE_NOT_FOUND），先修夹具再辨认实际行为。原输出保留本会话执行记录。

夹具修正后旧范围仍0/3、exit1，分别暴露撤销时切项目、确认时切项目、manifest准备时撤权后仍执行；初步修正并增量编译后旧范围3/3、exit0。用户随后排除无真实入口的内部args任意突变测试及参数快照，已仅移除该未提交改动；修订后目标结果另记。

01/02：撤销及授权选择、modal确认后校验项目；授权保存前核已选Worker身份；文件realpath或manifest准备完成后重新核当前授权及原目标，Worker互传分别绑定两个目标。修订后4/4、现有完整 `node --test --test-force-exit --test-timeout 20000 test/features/mcpProject.test.js` 35/35、互传补充目标1/1，均exit0；首次和正常/取消/空Worker均为受控替身，不连接服务器。增量编译 `node scripts/tsc-cached.js` exit0，输出 `dist/mcp/ProjectGateway.js` 和 `dist/extension/McpHost.js` 对应当前产品源码；无新锁队列或内部参数突变防护。当前完成2项，后续10项待查。

03先复用现有CLI任务日志与Local API证据；补受控MCP到实际host方法的首读、续读、空返回、精确Worker及原始错误断言，检查是否错误使用本地缓存或丢失远端游标。实验日志共享路径的范围与真实缺口另核。

03首测0/1、exit1：远端空文本时返回两条本机缓存，包含另一个runKey；实际行为与精确任务及空结果要求冲突。修正host空响应直接返回并保留远端offset，新增输出schema字段；验证结果待记录。

按修订计划补experiment_log受控测试，首次0/1、exit1：240行本地日志只返回200行。Worker首读实际最多末尾256 KiB，接口须说明该边界；不改远端Agent或将首读误称完整文件。

03修订后：log_read空结果保留原offset、精确Worker与runKey，不回退其他任务缓存；experiment_log本地show完整读取，tail按lines返回，远端读取保留原始错误，其他概览消费者仍沿用旧读取契约。远端首读末尾最多256 KiB并在工具描述中说明，未修改或连接真实Worker。增量编译exit0；首读/续读/空结果/错误、本地240行及指定尾行/0行、远端正确Worker/空结果/错误、输出schema三项目标测试3/3，既有Local API关联检查1/1，均exit0。当前完成3项，剩余9项待查；最终构建、安装与真实Worker验证均未进行。

04复用现有回执、错误详情、重载不可用、删除记录与切项目证据；补嵌套原生running/unknown/failed状态的受控返回及实际operation_get，区分请求完成和实验完成，不重复派发。

04新增目标测试1/1、exit0：三种原生状态随结果原样返回，外层成功仅表示请求结束且明确不证明实验完成，每次仅一次调用。其余重载、失败和跨项目行为复用已有效测试；无生产改动。当前完成4项，剩余8项待查。

05–06复用已有精确ID歧义及200行完整查询证据；补RMSE/显式指标方向和精确选中行的零值、高精度、维度及特殊CSV字符，不增加科研推断或自动写本机指标。

05首测0/1、exit1：RMSE下降被判为退步；显式方向及导出维度/精度随修正继续验证。
首次增量编译exit1：导出行拼接存在TypeScript unknown数组类型错误；修正类型后重编验证。
扩展目标测试曾exit1：测试误把已有分类指标precision当作未知指标；已改用真实未知名称并重新验证。
05–06：比较优先指标声明方向，其次复用内置已知方向；方向缺失或冲突只报告数值差，避免猜测。导出保留原CSV列并补完整维度，保留原数值精度与CSV转义；JSON同步包含原维度。增量编译exit0；MCP目标测试1/1、受影响的现有精确身份/歧义CLI测试1/1，均exit0。当前完成6项，剩余6项待查。

07–08按实际文件入口补未知解析预设及已知loss方向排行榜；不增加性能测试或新数据格式。
首次目标测试0/1、exit1：显式未知解析预设被悄悄替换成默认预设。修正后继续检查排行榜方向。
07–08修正后未知及空预设明确报错，合法预设可用；排行榜复用已知指标方向与JSON明确方向，未知方向不虚报最佳。增量编译exit0；MCP目标测试1/1、既有指标解析兼容目标1/1，均exit0。当前完成8项，剩余4项待查。

09–10核对生成与Scheduler实际支持的case/seed契约，补显式空seed、重复、非法值和生成结果的矩阵计数；不启动任务或更改真实PLAN。
09首次目标测试0/1、exit1：显式空seed被改成默认1；Scheduler以整数解释seed，修正边界后继续验证。
10扩展目标测试0/1、exit1：显式空cases在Scheduler产生0项，预览误报2项；修正并验证。
10再次扩展目标测试0/1、exit1：Scheduler支持无名称case但摘要漏计；按Scheduler的默认case索引补齐，保留嵌套名称。
09–10：显式空、非法及重复seed报错，0与有效整数保留；预览区分空case与具名/无名case，并将范围说明为现有case/seed组合。增量编译exit0；MCP生成/预览目标1/1及既有case解析回归5/5，均exit0。仅合成文件，不保存用户PLAN或派发任务。当前完成10项，剩余2项待查。

11复用现有数据集归类保护及set读回证据，补reset的workspaceFolder范围、继承值、取消、保存失败与双项目切换的受控配置替身。
11首次目标测试0/1、exit1：项目接入配置reset接受workspace范围，可能改动共享设置；修正项目范围和读回后继续验证。
11修正后项目接入配置仅允许workspaceFolder，重置固定原项目、保留分类保护、刷新受影响摘要并返回继承值；普通配置保留其显式scope。取消、保存失败及项目切换有受控覆盖；增量编译exit0，目标及既有分类保护2/2、exit0。当前完成11项，剩余1项待查。

12复用现有真实收集/多PLAN/数据集/旧导出证据，补实际面板重建入口的选中PLAN、项目切换和写入失败受控路径；只使用独立合成目录。
12目标测试1/1、exit0：面板入口从新查询生成两PLAN结果，选中PLAN只返回该范围且不覆盖完整导出；查询中项目变化和写入失败均保留原导出。无生产修改。12项均已完成受控检查，剩余本轮按钮/MCP功能项0；统一验证、总控验收、试行发行安装及用户重载尚未完成。

统一消费者回归：`node --test --test-force-exit --test-timeout 20000 test/features/mcpProject.test.js` 43/43、exit0；`test/experimentPlatform.test.js` 14/15、exit1，旧测试期望排除PLAN显式声明的classification_report.json与output.out，实际均保留；测试及对应输出证据解析函数与基线相同，本轮仅改case解析。此失败未隐藏，已交总控按现行声明规则裁定，不擅退役或修改断言。

总控裁定旧固定basename测试与现行PLAN显式声明契约冲突；仅将该用例期望修正为三条实际声明路径，保留其他拒绝与命令信号断言。完整 `test/experimentPlatform.test.js` 15/15、exit0。首次 `npm run build` 发现执行器默认并发上限2，主动Ctrl+C中止、exit1；前8门禁及9项exclusive测试通过，未推断实际有并发，进程已退出。后续构建/打包显式 `--max-parallel 1`，不改20秒测试限制。

单进程 `npm run build -- --max-parallel 1` exit1：`BUILD_LOCK_UNSETTLED`，本轮中止批的process-owner记录仍为active；仅核实当前无test-workflow或node --test进程，不能据此断言完整子进程树已确认。保留锁记录，不改删、不绕过；已交总控判断合法恢复。独立门禁：PanelHtml模块vm.Script exit0，实际渲染的2个脚本均vm.Script通过；src/dist中10890搜索无匹配（rg exit1）。统一build、最终验收和交付仍未完成。

2026-11-21用户明确批准删除本次唯一残留的 `simple_cluster/locks/simple-experiment/test-workflow/process-owner.json`；总控核对身份、直接父目录及安全根后删除该文件并确认不存在，未扩大清理范围。单进程构建随后成功获取锁。首轮完整执行285个任务，`windowScopeIsolation.test.js` 中配置测试替身缺少新增项目上下文方法，6/7、构建exit1；其他任务通过，锁已释放。补齐该替身及资源URI后，目标文件7/7、exit0。重新执行 `npm run build -- --max-parallel 1 --cancel-stdin`：285个任务通过、exit0，最大并发1，锁已释放；6个按需测试文件未运行，不计为通过。原始回执分别保留于 `simple_cluster/reports/test-workflow/2026-11-21T04-07-52-212Z-67468-build/run.json` 和 `simple_cluster/reports/test-workflow/2026-11-21T04-18-18-128Z-69044-build/run.json`。总体验收、试行发行安装和用户重载仍待完成。

总控完成B01/B02及B03功能候选验收。0.5.514 `npm run package -- --max-parallel 1 --cancel-stdin` exit0，341个任务与13门禁通过、最大并发1、锁释放，回执 `simple_cluster/reports/test-workflow/2026-11-21T04-32-11-634Z-41240-package/run.json`。独立 `npm run verify:package-runtime` exit1，vsce ls在既定30秒超时；未重试或调整时限。对实际VSIX的377条目检查包身份、平台、README、现有内容策略、325个同源闭包模块、必需入口及manifest清单，并逐字节比对包内对应源文件，exit0；总控接受此等价验证，原命令失败保留。

版本提交 `53107d12fc081ecefe5737245eb9ef256f623b37` 已推送并绑定试行Release `v0.5.514`；VSIX 2,983,719字节，实际SHA256为 `e6f643db488daea13d985a0663c8b9be5011e8e6b24020e35d38c99d75f675a6`，与远端VSIX资产摘要一致。但上传的校验清单误写为60位，缺少 `f675`，与包摘要不匹配；总控B03发行验收失败。原Release和错误清单保留，未覆盖。真实更新客户端对0.5.482识别权威0.5.483，对0.5.514不降级。`npm run install:latest` 执行一次、exit0，VS Code当时列出0.5.514，SimpleSFTP仍0.2.120；simpleex入口存在，直接运行版本命令因默认API所属项目不匹配而拒绝、exit1，未执行命令。

修正版0.5.515未增加功能：`npm run package -- --max-parallel 1 --cancel-stdin` exit0，341任务及13门禁通过、最大并发1、锁释放，回执 `simple_cluster/reports/test-workflow/2026-11-21T04-51-48-484Z-62512-package/run.json`。实际VSIX 377条目、325个同源闭包模块、内容策略、README、身份、manifest及包内对应源字节核验通过。版本提交 `5dda9cf240ad6d87915a961d76be8efe2d64c09b` 已推送并绑定试行Release `v0.5.515`；包2,983,720字节，SHA256 `8beb78d1663048e9481d386d26c4b25c9b96ed5f2b2f8194ed4bfca9390c76f3`。清单从实际包计算生成，64位摘要、两个空格和精确文件名于发布前验证；发布后下载远端两个资产，重新计算并确认与清单及本机包一致，验证副本保留于 `simple_cluster/reports/g004-release-verify-0.5.515/`。普通Latest仍0.5.483，真实ReleaseClient确认0.5.482可更新且0.5.515不降级。`npm run install:latest` 对0.5.515执行一次、exit0，VS Code列出0.5.515、SimpleSFTP仍0.2.120，simpleex入口存在。总控B03复验及用户重载尚待完成；真实Worker未测试或更新。
