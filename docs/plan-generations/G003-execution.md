# G003 全入口补验执行登记

## 最终结论与交付

总控B01–B03通过既有插件范围：已识别支持入口逻辑及同一项目、PLAN、job、Worker、commandId和路径贯通预检、入队、派发、协议2完成证据、收集、汇总、catalog和导出的受控链路。未发现当前支持逻辑待查缺口；动态实例总数未知，真实外部效果未测，不称全部按钮实机通过。旧R13配置提示终态未知，R12-I服务器隔离准备退出范围而非通过。真实UI、受控测试、预览、历史与未测分别见 `docs/windows-entry-coverage.json`、`docs/manual-acceptance-checklist.md`；G001/G002已交付。

功能候选buildId `073a6126df30b334a3d2e26a95e6ff67f9bb32f9047cf9c15f4dd50c5791fb86`：291/291、10门禁、exit0、实际并发1、锁释放，日志 `simple_cluster/reports/test-workflow/2026-11-20T07-38-05-835Z-6712-build/run.json`；Panel模块及三个生成script VM通过、10890零命中。该功能候选与下述0.5.513版本包检查分别计，不混为一次build。

R16版本包：`npm run package -- --max-parallel 1` 341/341、exit0、并发1、锁释放，日志 `simple_cluster/reports/test-workflow/2026-11-20T08-03-38-838Z-82536-package/run.json`。源码及生成物分组提交并push/fetch，版本源码提交 `8c8090d5368ca3e0745f149960ebc8955e73da96`；三处版本均0.5.513，发布前运行生成器无源码/runtime差异。

试行 [v0.5.513](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.513) 的tag绑定该源码提交，prerelease=true、draft=false，VSIX `simple-experiment-0.5.513.vsix` 为2982124字节，SHA256 `84ce03a081621cadef694e7e7013953f23a4546a9cb4bb527d759e437c48e2f9`，同名sha256资产绑定精确文件名；API摘要及实际下载副本一致。包内377项、清单/秘密策略缺项和泄漏均0、ZIP通过，publisher simple-local、扩展名 simple-experiment、engine ^1.100.0、依赖 simple-local.simple-sftp。

`npm run verify:package-runtime` 两次因 `vsce ls` 30秒 ETIMEDOUT、exit1，不能记该命令通过。替代核验使用同源 `collectLocalRuntimeClosure`、入口和spawn候选、panel manifest及MCP必需项，对真实VSIX逐项比较326个文件，零缺失且与本地字节一致；第一次因未规范化`./`误报3项，修正后通过。原 `verify-vsix-manifest.js` exit0独立覆盖内容与README策略，总控接受替代核验证据，未调整超时或缩减覆盖。

正式Latest仍为SimpleExperiment 0.5.483、SimpleSFTP 0.2.118；实际更新客户端验证0.5.482可发现0.5.483，0.5.513不降级。旧版查询首次fetch failed、重试通过。`npm run install:latest` 显式运行一次成功，VS Code列出simple-local.simple-experiment@0.5.513、simple-local.simple-sftp@0.2.120；`simpleex`入口位于 `C:/Users/ZLK/AppData/Roaming/npm`。安装目录核心文件与包一致，package.json仅由VS Code追加 `__metadata`。未再操作面板；需本人保存未保存内容后执行 **Developer: Reload Window**，安装后UI尚未验收。未更新Worker、训练、科研数据或远端Agent。

## 范围、角色与保护

本人要求仅查插件功能、按钮逻辑及完整PLAN和结果链，不以服务器健康或真实训练为前置；直接复用既有中英文记录、源码位置及有效测试，不重复有效实点。总控《项目总控与长期规划 · C方案接替》01a1e412-ead7-7710-acd7-c475abb8b41a/local 独占计划、索引和B01–B03；Terra 01a1e793-a4a0-7630-8157-24c920746d1a/local 独占执行登记、coverage、manual及授权scoped Git，检查/UI互斥、测试串行。接管时Terra实核 gpt-6.1-terra/high/default、match、continue；旧Terra 01a1e428-ce3e-7542-a6bd-0e4b7ca7ba4a/local 已交班归档，6次压缩及第五次后峰值447303；旧总控、Sol、Luna、R01–R10、R13旧角色已归档，不唤醒。

保护原MM final.md、Generic Untitled-1未保存稿、GPU7及旧任务、结果和日志、旧验收根及拒删 `D:/GitRepo/SimpleMcpAcceptance/acceptance_files/cleanup_20261111.txt`（49字节，SHA256 `b2abf3f4fd027aaa463ae58c18d89b59d1f3bebfa847459b43dbc7d41b74cd7b`）；不保存/重载原窗口，不清理或覆盖对象。约60个无关VSIX摘要不stage或删除。此前一次只读远端查询获精确授权；R12-I旧隔离授权不扩大当前范围。validate/dryRun包含同步写入，不能称只读。

历史唯一启用rjj8为root@127.0.0.1:15791，forward localhost:18770→remote localhost:18765；旧验收根 `/root/autodl-tmp/zlk/SimpleMcpAcceptance`，MM为 `/root/autodl-tmp/zlk/MultiModal`、Agent原0.5.512，专用tmux `zlk-worker-rjj8-agent/@54`；Scheduler absent不证明训练停止。旧验收 `agent_inspect` 返回 `AGENT_TMUX_WINDOW_MISSING`、`task_list` 返回 `AGENT_PROJECT_MISMATCH`，无写请求。旧mcp__simple_generic_acceptance为0.5.512/PID15552，端点在线不证明Agent身份；历史队列EPERM最近17:35:39。原安装Agent/Scheduler SHA分别为 `55cd300460f2b2aee184c78934e2d8210f7434c6bcbf163240f8c492894078bf`、`870e733728aa8d68bc1b92863b1ea133a6bb6ef0139f60772fe91dbec7d76f92`，旧远端仅有大小1349575/291630，不证版本。共享globalState不能擅改。

R12-I原批准本机候选 `C:/Users/ZLK/AppData/Local/Temp/simpleex-r12-isolated-20261116-83e670c4` 及远端 `/root/autodl-tmp/zlk/SimpleMcpAcceptance_G003`；此前查本机不存在、新远端根未创建。后本人停止服务器排查部署，本轮未继续。SimpleSFTP 0.2.120 discovery/health/capabilities/OpenAPI及rjj8身份核对成功；首次列 `/root/autodl-tmp/zlk` 为2001 `CONFIRM_REQUIRED`，本人精确授权后confirm/pathConfirmed返回ok和9个目录，未列新验收目录，不证明文件/链接不存在或隔离，无远端写入。曾只列配置根，sftp_target报无sftp.json。

## 最终功能证据与失败保留

P/Q/R目标分别13/13、26/26、11/11，入口4/4、21/21；同一合成commandId从预检贯通实际队列、分配、受控观察及真实采集导出，错command/结果路径拒收；两PLAN两seed三指标核均值、样本SD及拆表。具体断言和所有入口family见coverage `g003WorkflowAndConditionalLogicReconciliation`。S/T夹具异步污染先4/5后5/5，分支登记错误提示修复。Z空Worker脚本先1/2后2/2；登录确认期间目标漂移先9/10后10/10。归档恢复先3/4后5/5；真实文件系统无覆盖3/3；workspace隔离先19/20后20/20；归档bundle先11/12后12/12。路径确认先6/7后8/8；远端根策略两次先2/3后各3/3；布局与端口各3/3。无覆盖成功保留`.writing`硬链接，失败暂存可能保留，不自动清理。

阶段build 285/285、6按需未运行：`2026-11-20T06-52-31-290Z-80984-build/`；补身份贯通与无覆盖后291/291：`2026-11-20T07-10-36-534Z-612-build/`；最终功能build见首节。日志均位于 `simple_cluster/reports/test-workflow/`。首次G001完整build 286项284通过/2失败、10门禁通过，后续按输入替换/补充组合291身份通过，不冒一次全绿；JSON及history消费者原证据分别为 `08-37-02-776Z-41728-test/`、`08-37-24-119Z-57944-test/`、`08-55-54-117Z-67916-test/`、`08-56-28-732Z-66492-test/`，history共43子测试。

早期构建 `2026-11-16T12-34-03-480Z-20800-build/` Ctrl+C退出1，job001失败、002–004通过、005无汇总；MCP事件断言修后26/26，遗留 `BUILD_LOCK_UNSETTLED` 致compile退出1。本人仅批准旧锁 `simple_cluster/locks/simple-experiment/test-workflow/process-owner.json`，总控核身份及直接父目录后删除并确认不存在，其他锁未授权。D2旧dist摘要失败后读源码6/6；移除默认主指标后旧断言1/2、修语义后2/2；`applyProjectAdapterRulesPatch` 仅定义无调用。指南测试12/13后12/12；首次完整build `2026-11-16T14-52-42-010Z-69916-build/` 284/286、exit1，映射文案及普通配置项目根问题修后分别15/15、7/7；旧候选 `2026-11-16T15-03-36-550Z-61468-build/` 286/286，VM首次引号错误退出1后修正。

R14 D1/D2实现MCP配置保存回读、项目隔离与同步状态，只读展示映射和derivedMetric、保留PLAN归类及结果、移除PPT专属转发。MCP 31/31含受控替身和CSV解析，不冒真实实例回执；AP/AUPRC、macro_f1/weighted_f1独立。计划/边界提交ce9f813、ab6a80a、73087d2、71c7e4c、64bc4d4、f8e915d；源码136aac7f、e9b88f32及dist 86bafbcc已push/fetch，首次暂存dist忽略提示后用 `git add -u`。旧PID54144配置写返回 `MCP_AUTHORIZATION_REQUIRED: configuration`、零写；2026-11-17本人仅授权configuration后，专用Temp项目PID86804经 `configuration_set/get` 保存并回读generic、synthetic/final.csv及dataset/method/seed映射，derivedMetric空、sync=pending；两行三指标独立，无case不虚构。首次MCP误填name返回 `MCP_TOOL_UNAVAILABLE: undefined`，正确请求成功。

R14E配置取消误保存先3/4后4/4，build `2026-11-16T15-28-00-415Z-16188-build/` 286/286，源码6228baf；GUI首层Esc无保存提示，零保存由受控测试证明。F手填引导改AI/MCP先6/8后8/8、缓存5/5/门禁3/3，提交d321af2f；G移除自动模板与手编必经，测试首次变量重名SyntaxError退出1，修后9/9、命令3/3、隔离20/20，提交39dbb53f；H离线包/错误反馈7/7，提交8aaeab75；F/G/H build `2026-11-16T16-59-25-115Z-35692-build/` 286/286，生成物a54833be，实点仅有包刷新。A刷新提示、7/7及build `2026-11-16T17-14-35-679Z-33128-build/` 286/286，cf11daf8；首次诊断日期自动转换致实例头不匹配，原字符串只读重试成功，dist忽略提示后精确暂存。

I复制任务/指南使用插件API，compile八门禁、指南12/12、build `2026-11-16T17-39-39-973Z-44100-build/` 280/280及6按需未运行，提交1c1895f2，实际复制回读；J catalog截100先11/12后12/12、build `2026-11-16T17-57-49-770Z-36476-build/` 286/286、提交267161c0，合成101行实选case-101正确；K离线GPU/调度刷新先4/5后5/5、build `2026-11-16T18-27-31-858Z-24744-build/` 280/280、6按需未运行，d5f229a9；L tmux未知/失败/不可用/空状态先7/8后8/8，首次build消费者17/19退出1，修后19/19及build `2026-11-16T19-04-54-843Z-56564-build/` 286/286，提交ec58414a；失败build日志 `2026-11-16T18-52-52-630Z-26264-build/`。上述旧build模块/script VM通过、10890无命中，离线实点不证明远端效果。

旧布局过滤缺uiCapabilityMap、目标2/4后4/4，消费者3/3及build `2026-11-17T04-41-10-623Z-26892-build/` 286/286、提交1550f583；资源树锚点误高亮先1/2后2/2，消费者3/3和9/9、build `2026-11-17T05-10-33-780Z-52856-build/` 286/286、提交b225fdf2；GPU刷新及tmux提示先4/5后5/5，消费者3/3，build `2026-11-17T05-36-15-253Z-39956-build/` 和 `2026-11-17T05-49-58-655Z-40444-build/` 均286/286、提交0b484088。合成宿主的限定实点及running/disk/manifest身份见manual/coverage；无真实GPU行或远端操作。

M/N/O修复导入、删除配置和隧道启动取消误报completed；删除取消先16/17退出1后修正，总控另核失败/待确认也误报，手动反馈按failed/cancelled/submitted，自动调用保留布尔契约。相关受控测试panelMessageDispatch 20/20、serverConfigSaveContinuation 3/3、backgroundTunnelHost 9/9、panelWebviewScriptHealth 13/13、datasetResultCatalog 10/10；build `2026-11-17T07-21-58-237Z-59720-build/` 280/280、6按需未运行，功能子范围源码ad31204a、buildId `1a33b6e4a9c9ca5642ddcdce4c5c81ad3f5fb581dca96bc1d7b749787218df7a` 经当时总控B01–B03通过，不代替本轮总体结论。

## 合成夹具、历史界面与未测

唯一保留合成根 `C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f`，非Git/科研数据；README/config/train.py/.vscode、results及synthetic/final.csv，train只print。final两行synthetic_a/b、seed42、三指标.11/.22/.33与.44/.55/.66；offline-fixture由真实解析器生成2records/6cols再包装公开OfflineImport，经公开命令导入为offline_import，不含真实Worker/任务状态。selection.csv为synthetic/synthetic_selector/43/.77/.88/.99，真实写入与Markdown后追加catalog，原final保留；final CSV/MD为127/204字节，selection为93/157，by_method两子表各86，生成文件保留。首次静态检查新建 `check_reports/check-static-latest.md`，passed、errors0/warnings1/no_plan_files，未见子进程退出码，不冒实验通过。初始ui_layout保留syncPendingPlanArtifacts与合成退役动作，未同步；trust及原MM/Generic未改。

R10仅签授权合成对象本机子集，十八条见 `g003R10SyntheticObservation`；generic右键非结果专用动作，无GUI JSON producer，CLI不冒GUI导出；任务卡/批量/跨dataset共享/人工Plan归类缺对象，实时Worker链缺隔离，sync未执行。唯一application例外showAdvancedCommands经批准启用、离线导入映射保存后复位；Code/User/settings.json无键/UI未勾选。R13仅签10位置本机子集，原第10见 `g003R13ReportListFollowup`；通知独立复制因对象消失未测，不重造通知，旧提示终态未知，不把重载后的不同四选项引导当旧提示完成。R10/R13非整代签核。

五张Worker卡各四入口：五个导入仅预览取消，十五个保存/启动/删除未执行；20仅是未完成实机流程实例举例，不是剩余逻辑总数。164处静态命令文本均已关联证据/条件/未知，静态位置待关联0不等于全部实例实机通过；动态实例分组见 `g003DynamicEvidenceReconciliation`。旧服务器/trace/草稿无当前producer及退役PPT不复活。空PLAN导航、筛选、设置和离线诊断的限定观察见coverage对应 `g003C*`；audit 101/70非分母。GUI用户输入中断的点击未执行且不重放。选择行、设置、诊断、资源树、分支和归档的历史实点/仅预览边界保留coverage，不扩成真实Worker结论。
