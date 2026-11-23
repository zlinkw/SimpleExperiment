# G004 执行登记

压缩前事实及更早原材料引用见 `6f829e1d:docs/plan-generations/G004-execution.md`。逐项receipt/日志/事件/输入见coverage；历史授权、失败、未知和现场保留。本文件cap12000/90%=10800。

## 当前目标与边界

G004 按 identity+argv 冻结增量证据；最终 package 已通过：361 active（125 历史、235 直接、1 新运行）、6 onDemand 未运行。用户批准 219/284 的本任务历史超时例外，原时长分别 20857.309/20119.841ms，不重跑、不放宽未来 20 秒。

不触碰真实 Worker、服务器、SSH、tmux、GPU 或用户配置；新阶段仅授权不抢焦点的现有单项目 UI 检查。真实传输/清理、active results与跨项目未测；本次实际本地UI范围见末节。模拟缺失不证明永久删除。原 26 个脏 dist 中，仅包内 20 项已验证并获准同步，其他 6 项、历史资产及夹具保留。

519重载识别false且缺adapter，未重配重授；341/341及安装为旧版。本人明确业务CLI整体退役，只留UI/MCP；39旧源码已按授权删除并同步，原dist排除而不清理、全局shim不动，仅保留simpleex-mcp。精确范围及六组提交见 `0ff5b277:docs/plan-generations/G004-execution.md`，不得恢复CLI或重放删除。

## 候选、失败与复验

0.5.520 原 compile 8/8 gates exit0/tree confirmed、input=end，receipt `simple_cluster/reports/test-workflow/2026-11-22T18-17-42-383Z-84032-compile/run.json`；Panel模块及三真实script VM通过。生成物保留；该旧证不覆盖当前源码。原完整日志、10890搜索和只读进程短暂重叠及引号失败见 `fc571512:docs/plan-generations/G004-execution.md`。

不利结果保留：B1原失败及20秒timeout后用户准单次复验3/3；tsc首exit2；大删除首遭policy拒、进程未创建；规划、releaseAcceptance、隐私、Worker索引、下载根路径、中立RPC原失败后各自复验，以及CRLF两次失败、fetch TLS失败和恢复，精确结果和日志见 `faffeffc:docs/plan-generations/G004-execution.md`。

runner 增量开发曾有 OOM、解析误拒、临时 JSON 错误、依赖 drift 及旧 mcpWorkerHistory 日志被覆盖；原事件、已修状态与不重跑裁决见 `8ed64825:docs/plan-generations/G004-execution.md`。

actionLifecycle首46/49后修复夹具49/49；接替后误重复已继承job 204/179及误跑onDemand等记录、完整失败与日志见 `170fd06e:docs/plan-generations/G004-execution.md`，误运行不计活动覆盖。

## 审定证据和真实效果

历史job及删锁、runner逐identity+argv审定继承，原日志、未知工具链及284超时例外保留，精确名单见 `52946c4d:docs/plan-generations/G004-execution.md`；不称本轮删除通过或覆盖新G004/289。

旧 Git/UI 夹具、520 与接替后合成验证的逐项输入、结果、失败、工具链和边界见 coverage 与 `6f829e1d`、`9d5cae9f`、`6f14818d` 的本文件；不扩大原证范围或冒称真实 Worker/tmux/删除通过。

旧会话归档后核 session_meta 及原事件，仅修引用路径（`9a69240b` 等），未搬删或重跑；两次逐项数量与待运行结果见 `981fa853:docs/plan-generations/G004-execution.md`。


接替后清理、隔离、同步、tmux、结果及freshResultHost替身检查逐项证据与边界见coverage及 `6afb2ed0:docs/plan-generations/G004-execution.md`，未证明真实删除、Worker或UI。freshResultHost曾20.389秒超时，用户许可修复后原限额复验1/1、7.513秒，原日志保留；旧shell/tmux/GPU等及各job的skip、未知工具链同见该版本，不重跑。

本轮mcpProjectOpsContract 11/11、windowScopeIsolation 8/8及命令包装1/1均exit0；夹具日志见 `c2c60767:docs/plan-generations/G004-execution.md`。

旧67/68/69、91/222/225、226/227/252、141/340/341有限继承，工具链或69根字节未知、340仅现存30项；219/284超时例外与289唯一fresh保留，详见 `6afb2ed0:docs/plan-generations/G004-execution.md`，未证真实外部效果。

历史 dry-run、219/284 用户例外、外层期限修复和脏树 planner 拒绝的逐项细节及原日志保留于 `c2c60767:docs/plan-generations/G004-execution.md`。旧选择不代表当前 build；未运行 planner 拒绝的三项。

## 最终打包与生成物同步

原520 package构建 `f66d3694`，13 gates exit0，包2919747字节、SHA256 `aaf19107996beae86674b16b6c25f110551e74fb70a6bd545c88d334c9b2cdba`；闭包/Panel/10890通过，20生成物分组提交，6旧脏文件保留。首git add exit1但已暂存7项，总控审后提交；完整receipt与原事实见 `49e1cebd:docs/plan-generations/G004-execution.md`，旧包不覆盖后续源码。

试行 Release `v0.5.520` 已发布，`prerelease=true`、`draft=false`，远端 tag 指向 `7bf49ba84802df56821b098b440b289d3d3eb61e`；VSIX 与同名 SHA256 资产已上传，隔离下载的 SHA256 与已验证包一致，manifest 校验 exit0。实际 ReleaseClient 核实 0.5.482 可见权威 0.5.483、0.5.520 不降级，SFTP 0.2.120 不降至权威 0.2.118。

520唯一安装 exit0，安装日志 `%TEMP%/g004-520-install-20261123.log` 保留DEP0169警告；原安装/重载及shim字节证据见 `86e35b7b:docs/plan-generations/G004-execution.md`，当前源码未装。

## 520 单项目界面及只读验收

520专用窗口PID45080、根及SFTP同实例身份和识别后的真实UI/MCP只读证据、初次坐标失败、恢复及日志见 0a662506:docs/plan-generations/G004-execution.md 和coverage；默认稿件未调用，低流量保留、onboarding=true，Worker/GPU/tmux未查询。初始probe pending不是已通过；未真实传输、清理或跨项目。文档压缩两次写前超限失败及恢复保留于原记录。

## 当前预览修复与探针调查

原 `synthetic/final.csv` 合法宽表两行因只按文件名选long误报0；现预览传文本及列映射，并只计含指标记录，保留后行有值场景。原文件及底层解析不变，细节见 `e9ed2a97:docs/plan-generations/G004-execution.md`。

CSV宽/长/JSON原回归及两次首失败日志见 `18f587b2:docs/plan-generations/G004-execution.md`；520仍旧实现。

后补显式 metric/value 列映射、alias 及零值验证，原单文件 6/6 exit0、799.2334ms，日志 `%TEMP%/g004-preview-mapping-zero-20261123.*.log`。

旧母集11缺陷逐ID对账；原失败保留，未审及外部效果不冒通过，实际窗口范围见coverage。

## 当前探针及构建门禁

探针补真实RAF同ID ACK及hidden/generation保护，Host保留pending前停滞计数；原11/13 exit1，修协议和经本人批准的offscreen夹具后13/13及Host 6/6 exit0。日志 `%TEMP%/g004-render-full-current-20261123.*.log`、`g004-render-host-progress-20261123.*.log`；首失败 `g004-render-probe-20261123.*.log` 保留，未构建部署。

原build含禁止重跑场景，未启动；增量build保留原门禁、assemble仅package。先前规划316/367、按需0非构建通过；G004 pattern 1/1日志 `%TEMP%/g004-build-incremental-runner-20261123.*.log`、`g004-build-incremental-aggregate-20261123.*.log`，runner `6afb2ed0`。planner拒绝依赖漂移，需逐项对账及总控审定；总控只读路径/glob错误未触产品，原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

旧执行会话归档后核实60条direct的122个原事件哈希和session身份，仅修coverage路径。新增7项同根520 MCP只读与plan_list合成证据见coverage，真实Worker和跨项目未测；压缩前两稿11639、11331字符均写前断言退出。

## 停止路由候选

停止路由归属与未知保留修复、原假端验证和失败日志见 `c728502f:docs/plan-generations/G004-execution.md`；未访问Worker。

接替期间只读glob两次、覆盖记录写前断言、git-show缓冲及PowerShell引号各一次失败，均未改产品；详见 `49e1cebd:docs/plan-generations/G004-execution.md`。

停止UI未知状态及目标候选、假端验证与原日志见 `a1a638d1:docs/plan-generations/G004-execution.md`；Panel未build。

同根45080 SFTP本地状态与配置只读成功；target.show缺配置及首身份检查失败、敏感日志与边界见 `49e1cebd:docs/plan-generations/G004-execution.md`。未改配置或访问远端。

停止候选保留显式Worker，假端12/12及完整日志见 `0acec74b:docs/plan-generations/G004-execution.md`；Panel未构建部署。

SFTP服务器配置、下载路径、tree/inventory、file_stats、plan_logs及remote_directories逐ID事实、假后端日志、失败及授权边界见coverage和 `49e1cebd:docs/plan-generations/G004-execution.md`；未访问真实Worker、改grant或传输/删除。

静态报告路径及错误VM 3/3 exit0，`%TEMP%/g004-report-read-errors-20261123.*.log`；成功打开/复制未实测。

草稿兼容路由此前误入范围，写后刷新失败修复及假写6/6、生命周期49/49日志见 `%TEMP%/g004-draft-partial-write-final-20261123.*.log`、`g004-draft-action-lifecycle-final-20261123.*.log`；无真实写入，完整原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

草稿机制已退役；先前仅检查预览及兼容路由，未真实写入，详见coverage。

本人指出草稿机制已退役，停止新调查、验证和实现；旧母集/兼容入口不代表当前功能，不删除文件。

MCP task_stop发送前重核授权和Worker快照、未知保留意图；假Gateway/Host 3/3及首两次exit1复现原日志见 `d1d816d2:docs/plan-generations/G004-execution.md`。未访问真实Worker。

SFTP传输观察/取消的假后端18/18 `%TEMP%/g004-mcp-remote-directories-auth-20261123.*.log` 仅证明透传；后续核已装120发现取消按operationId更新账本、却可按不相属transferId选另一传输，静态可达缺陷当时升级总控；后由配套28087f3修复，未实际取消。三次只读rg路径猜错/Windows通配符失败未改产品。

旧attempt文案仅旧/异常Agent可能触发，当前declared路径先走PlanRunHost.replace；未证创建或恢复机制，原分析见 `0f6ea82b:docs/plan-generations/G004-execution.md`。只读glob失败无产品修改。

task_list只复核当前项目归并、取消及unknown源码，禁止真实任务查询，退役CLI证据不冒充现行MCP通过；task_dispatch复用同任务假Gateway 5/5及假Host 11/11，未触真实派发、GPU或Worker。边界见coverage。

本人授权配套SFTP取消身份最小修复及试行交付；源码 `28087f3` 已同步，假handler 8/8、原结算3/3及首2/4失败原日志见 `f02bb042:docs/plan-generations/G004-execution.md`。已装120仍有缺陷，未操作真实传输；压缩补丁曾未匹配、未写入。

配套源diff已审通过；两个消费者各1/1、verify-runtime核23文件exit0，原日志及119/120证据缺口见 `0f6ea82b:docs/plan-generations/G004-execution.md`；SSH为替身。

Experiment增量证据逐job核验、方法切片及日志保留于 coverage 和 0a662506:docs/plan-generations/G004-execution.md；此前 runner 255/256 等原证不等于当前 build。固定 actionLifecycle 包装已按原事件、原日志和外层退出核验，首轮和负例各1/1，历史草稿断言仅为既有事实。source变化须逐项复核，不能批量改快照。

配套120历史包汇总69文件466通过，逐文件原目录现空；119现存56条对应日志、另13条缺逐项原日志，闭包待审；未打包安装发布新版本。

## 当前补充调查

此前逐入口、原日志与未通过项详见 `bcda04ad:docs/plan-generations/G004-execution.md` 与coverage：runner 257/258、260—262通过、259仅跳过；无关glob、缓冲、脚本及压缩尝试失败未写入。打开Plan、结果规则/映射/同步、日志分析、MCP诊断授权与资源新鲜度的定向修复和假消费者证据均按原记录适用，待build；未连接真实Worker。自动匹配、日志尾部及面板候选仍未提交，需P0 build；原首失败和被撤回的缩范围方案保留原Git记录。历史草稿调查和断言仅为已退役功能的事实，不作为当前功能。配套119/120旧测试逐日志缺口及工具链未知仍未消除。

配套120→28087f3旧源码/11测试未变、历史日志和工具链缺口，及实验、项目连接、Plan验证与server_test的已审调用链详见 `82e3093b:docs/plan-generations/G004-execution.md` 和coverage；无真实Agent、Worker、结果查询或传输，增量build待审。

handoff按用户批准修复选定Worker确认、上传和标记，SFTP d4ed002，假消费者4/4与1/1 exit0；日志及限制见coverage，未真实传输或更新安装。

MCP下载按本人授权要求选定Worker有效已存范围，配套b3da0b5；假fs/传输3/3、假Gateway1/1 exit0，日志及真实效果限制见coverage，未安装。

面板Agent入口、结果拆表与映射、主导航及执行导航逐ID源码核对和限制见coverage；完整压缩前记录见 `2a4cc440:docs/plan-generations/G004-execution.md`。异常操作无独立锚时回退执行区，不自动过滤；未操作真实Worker、GPU、tmux、结果、用户窗口或PLAN。

配套b3da0b5后的受影响原消费者：explicitScopedDownload原单文件1/1及workspaceIntegration原单文件4/4均exit0，分别记录 `%TEMP%/g004-sftp-explicit-scope-consumer-20261123.log`、`%TEMP%/g004-sftp-workspace-consumer-20261123.log`。前者为显式范围纯内存与源码契约，后者为假工作区与静态顺序检查；均不证明真实传输、覆盖或删除，不能代替剩余打包覆盖审查。

openXshell、testAll、snapshot入口按实际源码分别核确认、Worker、离线及状态反馈；本轮未启动会话、切模式或查询真实任务/GPU，详见coverage。

缓存确认路径候选未提交：同批全节点只读预核、原请求未知不自动重发、本机文件ID与路径保护见待审源码；`%TEMP%/g004-cache-confirmed-preflight-v15-20261123.log` 8/8 exit0（含只读Windows身份及假执行器），`g004-cache-original-selected-v2-20261123.log` 原单文件两项2/2 exit0。首次Windows时间基准错误 `%TEMP%/g004-cache-confirmed-preflight-v7-20261123.log` 5/6 exit1，修后通过；原文件另含实际临时fixture改动，未全跑。未执行真实删除或Worker，跨Extension Host的本机并发与重启后未知记录仍待审。

当前HEAD 9271a7ec、脏树只读build规划316项，selectionHash `7db4b499442fed600a06741b61d7d4970ca6d1864b694579bb39005f3efb2893`；compile/fullCheck均未运行，该选择非构建通过，后续HEAD或输入变化重算。

clearOperations四个原ID分别核Plan、全部、选中、单项路由与确认；当前invoke走本机处理，旧远程误路由分类不适用，未改真实历史。

缓存持久化候选：同一local_operations.json和文件lease预留完整批次，旧快照保留未决记录，真实执行未知不重发；坏JSON/EACCES拒绝覆盖，原ID明确结束后清路径。Host重启丢本机退出证据则继续unknown；无真实删除或Worker。新旧Agent同路径LIVE互斥和预检已补。假存储/执行器及Windows只读身份 %TEMP%/g004-cache-persistent-v7-20261123.log 11/11 exit0（含启动前失败结清与已启动未退出保留）；v2 9/10 exit1为测试在refresh后才注入错误回调，调整顺序后v3/v4通过。候选待源审和build，非已交付。

Git当前项目仓库绑定候选：仅精确仓库stage/commit/push，项目切换不继续后续效果，已发commit可能完成如实提示；Git溯源写入前复核项目。假Git/写入 %TEMP%/g004-git-project-binding-v2-20261123.log 6/6 exit0，未操作真实产品Git；候选待审。

六个草稿MCP原证保留，仅标retired历史兼容，不计现行通过；coverage JSON及UTF8复读有效，首文本替换count7中止未写。

Git自动备份入口源审发现嵌套工作区会向父仓库安装hook，且等待远端确认时项目可能切换；候选仅接受当前项目精确仓库，并在安装前重核仓库、hook与remote，原异步返回/原hook保护保留。假fs/假UI %TEMP%/g004-git-backup-boundary-20261123.log 5/5 exit0；未触真实hook或远端，候选待构建。

Git绑定与自动备份修复已按审定hunk提交 0a1eb56f 并普通push/fetch一致；上述测试不证明真实外部效果。六个草稿工具为退役历史，非通过数；两个Git面板及五个命令别名适用状态见coverage，原invoke误分类已按本机实际分支纠正。

Git备份确认期间若同名remote的URL改变，现阻止安装；假fs/UI增量 %TEMP%/g004-git-backup-boundary-v2-20261123.log 6/6 exit0，候选待同步与build。

缓存存储旧raw-map、包装和null兼容及错误类型拒绝：%TEMP%/g004-cache-storage-compat-20261123.log 定向1/1 exit0；同一物理目标的不同Worker别名也阻止重叠请求。

原缓存双确认与失败处理消费者在补合成存储后 %TEMP%/g004-cache-original-selected-v3-20261123.log 定向2/2 exit0，未运行其他真实fixture用例。原文件lease仅在回调后确认；候选现于原子rename前核handle，待源审；该检查与OS调用并非不可分割。

缓存handle与原子发布围栏：%TEMP%/g004-cache-fenced-v1-20261123.log 11/11、g004-cache-atomic-fence-20261123.log 1/1 exit0；actionLifecycle仅非草稿持久化单项 g004-local-operation-fence-consumer-v2-20261123.log 1/1 exit0，首验0/1 exit1因新正则漏TS可选参数问号，原日志保留。

Plan恢复stat仅ENOENT计缺失，其他错误可见；假fs原消费者 %TEMP%/g004-plan-restore-read-error-20261123.log 6/6 exit0，候选待构建，未操作真实文件。
