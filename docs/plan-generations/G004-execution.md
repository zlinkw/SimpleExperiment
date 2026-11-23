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

CSV宽/长/JSON回归6/6 `%TEMP%/g004-preview-formats-complete-20261123.*.log`；首夹具及维度误判各5/6 exit1，原日志和中间6/6见 `49e1cebd:docs/plan-generations/G004-execution.md`。520 Host仍旧实现。

后补显式 metric/value 列映射、alias 及零值验证，原单文件 6/6 exit0、799.2334ms，日志 `%TEMP%/g004-preview-mapping-zero-20261123.*.log`。

旧母集11缺陷逐ID对账；原失败保留，未审及外部效果不冒通过，实际窗口范围见coverage。

## 当前探针及构建门禁

探针补真实RAF同ID ACK及hidden/generation保护，Host保留pending前停滞计数；原11/13 exit1，修协议和经本人批准的offscreen夹具后13/13及Host 6/6 exit0。日志 `%TEMP%/g004-render-full-current-20261123.*.log`、`g004-render-host-progress-20261123.*.log`；首失败 `g004-render-probe-20261123.*.log` 保留，未构建部署。

原build含禁止重跑场景，未启动；增量build保留原门禁、assemble仅package。先前规划316/367、按需0非构建通过；G004 pattern 1/1日志 `%TEMP%/g004-build-incremental-runner-20261123.*.log`、`g004-build-incremental-aggregate-20261123.*.log`，runner `6afb2ed0`。planner拒绝依赖漂移，需逐项对账及总控审定；总控只读路径/glob错误未触产品，原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

旧执行会话归档后核实60条direct的122个原事件哈希和session身份，仅修coverage路径。新增7项同根520 MCP只读与plan_list合成证据见coverage，真实Worker和跨项目未测；压缩前两稿11639、11331字符均写前断言退出。

## 停止路由候选

停止路由原猜首Worker、未知时force重发及提前落终态；已修精确归属、单次请求与保留意图，VM 10/10及消费者12/12 exit0，日志 `%TEMP%/g004-stop-routing-terminal-20261123.*.log`、`g004-stop-consumers-terminal-20261123.*.log`；早期日志保留，无真实Worker，原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

接替期间只读glob两次、覆盖记录写前断言、git-show缓冲及PowerShell引号各一次失败，均未改产品；详见 `49e1cebd:docs/plan-generations/G004-execution.md`。

停止组已同步 `fb874de2`；其后修UI把未知误报completed、Plan停止附无关选择和Worker标识/提示，11/11及消费者12/12 exit0 `%TEMP%/g004-stop-ui-outcome-current-20261123.*.log`、`g004-stop-consumers-outcome-current-20261123.*.log`。仅假客户端；Panel仍待build/VM及总控审，不部署或提交。完整原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

同根45080 SFTP本地状态与配置只读成功；target.show缺配置及首身份检查失败、敏感日志与边界见 `49e1cebd:docs/plan-generations/G004-execution.md`。未改配置或访问远端。

停止候选保留显式Worker供人工重试；12/12 exit0 `%TEMP%/g004-stop-ui-identity-20261123.*.log`，Panel未构建部署。

SFTP服务器配置、下载路径、tree/inventory、file_stats、plan_logs及remote_directories逐ID事实、假后端日志、失败及授权边界见coverage和 `49e1cebd:docs/plan-generations/G004-execution.md`；未访问真实Worker、改grant或传输/删除。

静态报告路径及错误VM 3/3 exit0，`%TEMP%/g004-report-read-errors-20261123.*.log`；成功打开/复制未实测。

草稿兼容路由此前误入范围，写后刷新失败修复及假写6/6、生命周期49/49日志见 `%TEMP%/g004-draft-partial-write-final-20261123.*.log`、`g004-draft-action-lifecycle-final-20261123.*.log`；无真实写入，完整原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

草稿机制已退役；先前仅检查预览及兼容路由，未真实写入，详见coverage。

本人指出草稿机制已退役，停止新调查、验证和实现；旧母集/兼容入口不代表当前功能，不删除文件。

MCP task_stop发送前重核授权和Worker快照、未知保留意图；假Gateway/Host 3/3及首两次exit1复现原日志见 `d1d816d2:docs/plan-generations/G004-execution.md`。未访问真实Worker。

SFTP传输观察/取消的假后端18/18 `%TEMP%/g004-mcp-remote-directories-auth-20261123.*.log` 仅证明透传；后续核已装120发现取消按operationId更新账本、却可按不相属transferId选另一传输，静态可达缺陷已升级总控，未修或实际取消。三次只读rg路径猜错/Windows通配符失败未改产品。

旧attempt文案仅旧/异常Agent可能触发，当前declared路径先走PlanRunHost.replace；未证创建或恢复机制，原分析见 `0f6ea82b:docs/plan-generations/G004-execution.md`。只读glob失败无产品修改。

task_list只复核当前项目归并、取消及unknown源码，禁止真实任务查询，退役CLI证据不冒充现行MCP通过；task_dispatch复用同任务假Gateway 5/5及假Host 11/11，未触真实派发、GPU或Worker。边界见coverage。

本人已精确授权配套 simple-sftp 仓最小修复取消身份及试行交付。配套仓src commit `28087f3` 已普通推送抓取一致，真实handler内存替身8/8、原结算3/3 exit0，日志 `%TEMP%/g004-sftp-cancel-identity-final2-20261123.*.log`、`g004-sftp-cancel-settlement-final-20261123.*.log`；首复现2/4 exit1保留 `g004-sftp-cancel-identity-first-20261123.*.log`。源审前未build/package/安装，已装120仍有缺陷，未操作真实传输。一次执行文档压缩补丁未匹配、未写入。

配套源diff已审通过；两个消费者各1/1、verify-runtime核23文件exit0，原日志及119/120证据缺口见 `0f6ea82b:docs/plan-generations/G004-execution.md`；SSH为替身。

Experiment增量证据逐job核验、方法切片及日志保留于 coverage 和 0a662506:docs/plan-generations/G004-execution.md；此前 runner 255/256 等原证不等于当前 build。固定 actionLifecycle 包装已按原事件、原日志和外层退出核验，首轮和负例各1/1，历史草稿断言仅为既有事实。source变化须逐项复核，不能批量改快照。

配套120历史包汇总69文件466通过，逐文件原目录现空；119现存56条对应日志、另13条缺逐项原日志，闭包待审；未打包安装发布新版本。

## 当前补充调查

runner job 257/258、260/261/262 按identity/argv和原日志复核，各1/1、stderr空、receipt exit0；未重跑。259原stdout pass0/skip1，Windows跳过POSIX符号链接，exit0不能证明该行为，未冻结新输入。新源码使部分旧快照再次漂移，须按实际函数复核。

结果目录、复制、高级设置及SFTP服务器/目标/确认重置逐ID审查见coverage；未改配置或共享确认。

MCP诊断取消发送前重核授权及身份；假Gateway/Host 3/3、Host 1/1 exit0，首模式零用例不算验证；完整日志见 `d1d816d2:docs/plan-generations/G004-execution.md`。384f6d5f已同步待build，无真实Worker。

打开Plan时项目可在异步文件检查期间切换；现复用项目绑定打开器，定向3/3 exit0 %TEMP%/g004-open-plan-project-guard-20261123.*.log，6b4e5651已同步、待build；未打开真实编辑器或其他项目。

只读glob与git show缓冲失败及coverage脚本、压缩首稿失败均未写入，详见 `0f6ea82b:docs/plan-generations/G004-execution.md`。

结果规则保存、映射保存及运行前同步绑定原项目，切项目不继续剩余Worker，155d0593已同步待build。假Worker 1/1、VM 1/1、调用链2/2及首夹具语法失败日志见 `d1d816d2:docs/plan-generations/G004-execution.md`；未访问真实Worker或写真实配置。

结果区原自动匹配无实际恢复；首次拟改仅刷新会缩减入口承诺，已撤回、不计通过，VM日志见 `0f6ea82b:docs/plan-generations/G004-execution.md`。不恢复旧registry；未改真实结果。

自动匹配现有候选使用当前导出中未分配PLAN的唯一单值已保存映射，复用现有结果分区写入器并检查项目、目录与映射未变化；多值或归一化重复映射不猜测，不读旧registry。内存真实Host/写入方法7/7 exit0 %TEMP%/g004-auto-dataset-mapping-guarded-20261123.*.log，含指标不变、冲突、改配置与写失败；旧dist消费者断言已适配但须构建后验证。Panel/Host/测试候选未提交、未build、未动真实结果，仍须源审与原P0门禁。

结果表打开原在等待catalog后才读取目录，目录变化可把旧索引和新目录混用；候选固定目录、在异步读取及发布前复核。与自动匹配同一受控文件8/8 exit0 %TEMP%/g004-result-mapping-open-guard-20261123.*.log，覆盖切目录时不写不打开及Markdown精确选择；无真实文件/编辑器，候选待build。

日志历史实际仅显示最多50行，五处按钮原提示“完整日志”不准确；候选更正为“日志尾部”，保留独立完整日志入口，待Panel build。未请求真实日志。

配套agentLifecycle及agentPythonResolution相关测试与源从119到28087f3无变化；120汇总1及12通过但原日志缺失，工具链未知，见 `0f6ea82b:docs/plan-generations/G004-execution.md`；未运行Agent或WSL。

MCP resource_available 原将明确过期、离线或degraded的缓存GPU状态按空闲判可用；现返回unknown。真实查询方法配假RPC 1/1 `%TEMP%/g004-resource-stale-gateway-20261123.*.log`，源码函数1/1 `%TEMP%/g004-resource-degraded-20261123.*.log`，均exit0；首次补丁未匹配、未写入。缺状态或只有旧时间戳仍不能证明新鲜；未查询真实GPU、任务或Worker，待构建。

诊断复制、操作日志、面板恢复和配置说明逐ID源码复核，边界见coverage；未操作真实剪贴板、窗口或重新识别。

日志分析查询跨await切项目后原可继续刷新新项目快照；现查询后和快照后复核原项目。假Worker切换1/1 `%TEMP%/g004-analysis-project-change-20261123.*.log`，原身份及拒绝2/2 `%TEMP%/g004-analysis-existing-20261123.*.log`，均exit0；未查询真实Worker/任务/日志，待build。只读检查错误tag、路径及引号各失败，文档补丁首稿未匹配，均未改产品。

log_read遇无效空响应原可退回模糊匹配缓存，现明确报错；分页、空结果、无效响应及错误假Gateway/Worker 1/1 exit0 `%TEMP%/g004-log-read-invalid-20261123.*.log`，未查询真实日志，待build。

TensorBoard四个MCP入口的目标、授权及终态按源码逐项复核，详见coverage；未启动、查询或停止真实服务。

tmux_list/capture源码和假Gateway路由证据范围见coverage；未访问真实Worker、窗口或日志。

artifact_list/inspect项目边界、精确身份和本地及假远端证据逐ID见coverage；未查询真实任务、活动结果或Worker。

配套120→28087f3中api-server、cleanup-file-api/cleanup-files和以下11个测试均字节未变；120包汇总分别 api 23、apiBackpressure 4、apiUploadProgress 4、batchDeleteApi 24、chunkedTrimGuard 1、cleanupChunkedDelete 1、cleanupConsumerRoot 13、cleanupExecuteSelfBusy 8、cleanupExplicitTarget 1、cleanupFiles 18、cleanupHandle 1通过，但各自原日志缺失。119→当前除api新增下载Host入口相关用例外，上述测试和清理实现未变；其中cleanupExecuteSelfBusy使用假传输控制器，不调用transfers.cancel；api仅列举该方法。汇总不补造具体断言、工具链或逐项运行证据；本次不执行真实清理/WSL，打包覆盖仍待总控审收。

experiment_list/summary/tree按输入合并、过滤与树结构逐项复核，假RPC历史覆盖和未调用真实任务的限制见coverage。

experiment_active/overview/health按源及原合成观察/告警证据逐项复核，真实活动查询仍受限，见coverage。

实验历史日志、诊断和配置原可从记录指向项目外本地文件；现复用产物路径规范及实际路径边界，项目外、父目录和junction拒绝。假RPC路径1/1 `%TEMP%/g004-experiment-path-boundary-20261123.*.log`，原本地、假远端产物及合法历史消费者4/4 `%TEMP%/g004-experiment-path-consumers-20261123.*.log`，均exit0；未读取真实用户文件或查询Worker，待build。

result_compare按左右身份、数值与方向复核，原假RPC及缺失歧义证据见coverage；未查询真实活动结果。
