# G004 执行登记

完整压缩前事实见Git `6f829e1d:docs/plan-generations/G004-execution.md`；该版本保留6f14818d、f66d3694、cb44bd81、f36cb6a3、18dd5614及更早T1–T7完整原材料引用。逐项receipt/日志/事件/输入以docs/windows-entry-coverage.json为准；历史授权、失败、未知和现场均不因压缩消失。本文件cap12000/90%=10800。

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

总控审定历史 job 187/189/240、删锁 264/265/267/268/269/271/274 及 runner 27 项逐 identity+argv 继承，原日志和未知旧工具链保留；不称本轮删除通过，不覆盖新 G004 或289。284原20119.841ms超时仅本任务获用户例外，不重跑；精确名单和原审理由见 `52946c4d:docs/plan-generations/G004-execution.md`。

旧 Git/UI 夹具、520 与接替后合成验证的逐项输入、结果、失败、工具链和边界见 coverage 与 `6f829e1d`、`9d5cae9f`、`6f14818d` 的本文件；不扩大原证范围或冒称真实 Worker/tmux/删除通过。

旧会话归档后核 session_meta 及原事件，仅修引用路径（`9a69240b` 等），未搬删或重跑；两次逐项数量与待运行结果见 `981fa853:docs/plan-generations/G004-execution.md`。


接替后清理、隔离、同步、tmux、结果及freshResultHost替身检查逐项证据与边界见coverage及 `6afb2ed0:docs/plan-generations/G004-execution.md`，未证明真实删除、Worker或UI。freshResultHost曾20.389秒超时，用户许可修复后原限额复验1/1、7.513秒，原日志保留；旧shell/tmux/GPU等及各job的skip、未知工具链同见该版本，不重跑。

本轮 mcpProjectOpsContract 11/11、windowScopeIsolation 8/8 及静态命令包装 pattern 1/1均exit0；仅夹具，无真实Worker。原日志和详情见 `c2c60767:docs/plan-generations/G004-execution.md`。

总控审定旧67/68/69、91/222/225、226/227/252、141/340/341按受限范围继承；旧工具链或69根字节未知，340仅现存30项。219/284超时及用户例外、289唯一fresh 1/1保留，精确事实见 `6afb2ed0:docs/plan-generations/G004-execution.md`，未证真实WSL/tmux/Worker。

历史 dry-run、219/284 用户例外、外层期限修复和脏树 planner 拒绝的逐项细节及原日志保留于 `c2c60767:docs/plan-generations/G004-execution.md`。旧选择不代表当前 build；未运行 planner 拒绝的三项。

## 最终打包与生成物同步

原 package 在构建 HEAD `f66d36946ade4b911a75636d6f2fc1f28c65111b` 完成，receipt `simple_cluster/reports/test-workflow/2026-11-23T02-45-43-277Z-10816-package/run.json`，13 gates exit0、input=end、并发 1、锁释放；原 selection 保持该构建 HEAD，不冒称适用于后续提交。包 `simple-experiment-0.5.520.vsix` 2919747 字节，SHA256 `aaf19107996beae86674b16b6c25f110551e74fb70a6bd545c88d334c9b2cdba`；manifest、运行闭包、实际 ZIP/磁盘、Panel 三个脚本与 10890 检查通过。20 个包内生成物经逐字节核验后分组提交 `fea89fbd`、`18cd5836`、`120b9384`，6 个不入包的脏文件保留。首组普通 git add 返回 exit1（dist ignore 提示）但实际7个已跟踪文件均已暂存；总控核验 index 后批准直接提交，后两组使用精确 tracked update，未 force。

试行 Release `v0.5.520` 已发布，`prerelease=true`、`draft=false`，远端 tag 指向 `7bf49ba84802df56821b098b440b289d3d3eb61e`；VSIX 与同名 SHA256 资产已上传，隔离下载的 SHA256 与已验证包一致，manifest 校验 exit0。实际 ReleaseClient 核实 0.5.482 可见权威 0.5.483、0.5.520 不降级，SFTP 0.2.120 不降至权威 0.2.118。

520唯一安装 exit0，安装日志 `%TEMP%/g004-520-install-20261123.log` 保留DEP0169警告；原安装/重载及shim字节证据见 `86e35b7b:docs/plan-generations/G004-execution.md`，当前源码未装。

## 520 重载后单项目只读验收

专用窗口重载后核实 520 PID45080、startedAt `2026-11-23T05:41:49.812Z`、loopback 19769，SFTP 0.2.120 同 PID/根已激活；默认稿件窗口未调用。原 preflight、health 和 OpenAPI 详情见 `52946c4d:docs/plan-generations/G004-execution.md`。

稳定 MCP SDK 真实 tools/list 返回137项；project_authorization、action_catalog、panel_diagnostics、project_status、state_value 和 project_state 只读成功，launcher exit0/stderr空；完整响应及当时的状态、空任务选择、CSV失败见 `%TEMP%/g004-520-live-mcp-20261123.json`、`g004-520-live-mcp-state-20261123.json` 和 `52946c4d:docs/plan-generations/G004-execution.md`。未调用 Worker 或跨项目方法。

本人新控制许可前，面板 diagnostics 报 ready、运行/安装均 520、无 section failures，但 heartbeat 标记 document-hidden、render health unknown；这不是可见 UI 验收。现有 Computer Use 工具可枚举窗口，但其窗口读取流程和 silent-ui-screenshot 禁止仅为截图使用 Computer Use，且未找到项目现成非激活捕获入口，未切焦点、未截图或操作界面。真实 UI、Worker、远端及跨项目仍未测。

## 用户授权后的真实界面与识别

用户先授权只读快照，后明确允许直接控制电脑；总控激活专用 VS Code 窗口 87954600 并观察真实 520 面板，同根、原 PLAN、低流量开，Worker/GPU/tmux 显示未查询或未核实。计划搜索 `ui_u01_empty_515` 后仅一个匹配、批量选中0、当前 PLAN 不变，随后清空搜索。资源树导航 element 146 点击因坐标越窗失败，未成功操作；随后用滚动条回顶部。

总控核源码边界后仅点一次工作区识别，提示已发现5个 Plan。首次坐标点击未选中继续按钮；等待期间出现 stalled 提示，不能据此判定死锁。通知中心对原继续按钮 element 755 实际点击后出现本地工作区已识别、黄色横幅消失且识别按钮恢复，未再点最终可选通知或重跑识别。Escape 还退出辅助侧栏最大化，总控随后用 element 998 恢复原全宽布局。未改 adapter、PLAN、Worker 或授权。原截图内联，完整事件见总控 rollout `01a2040c-d282-7d92-9542-abcdc0689d37`：失败 `call_b6b1cc14073a4379a34eb71c1279d99a`、通知 `call_ce52cfc3cf994c67b99dbbc4a67536af`、继续 `call_6170ac73209349e7b29ca28a840b40bd`、布局恢复 `call_2ce6b8d367b4476cbaf1117eba34d4c9`；不另造截图文件。

同一 45080 实例经真实稳定 MCP 只读回 `projectOnboardingCompleted=true`、status 520/offline_import；panel ready，heartbeat documentHidden=false、render health unknown（probe pending）、section failures 空。operation_list 返回 total 0，不能单独证明锁释放。新增完整响应 `%TEMP%/g004-520-after-ui-recognition-20261123.json`，launcher exit0、stderr空；未再次识别或清锁。真实 Worker、SSH、Agent、GPU、tmux、训练、删除和跨项目仍未测。

最终记录压缩首稿计算10940触发Python assert、写入前退出，文件未更改；外层因随后命令显示exit0，不当作Python成功。扩大语义压缩后UTF8写回及diff检查通过。总控审原MCP响应的exit0/isError=false及同实例识别true，本地验收完成，render探针未知/非标准CSV/Worker与跨项目等受限如上，不重打包、重装或后台保活。

## 当前预览修复与探针调查

原 `synthetic/final.csv` 合法宽表两行因只按文件名选long误报0；现预览传文本及列映射，并只计含指标记录，保留后行有值场景。原文件及底层解析不变，细节见 `e9ed2a97:docs/plan-generations/G004-execution.md`。

源级局部调用链的宽/长/JSON、空指标及混合行回归最终6/6、exit0、827.5419ms；原日志 `%TEMP%/g004-preview-formats-complete-20261123.out.log`/`.err.log`。首次测试夹具 AST 搜索不到函数，5/6 exit1；修夹具后第二次发现仅维度行被误判成功，5/6 exit1；均保留 `%TEMP%/g004-preview-format-20261123.*.log`、`g004-preview-format-repair-20261123.*.log`。中间回归6/6见 `g004-preview-metrics-20261123.*.log`。原520包和实际Host仍为旧实现，未冒称已部署。

后补显式 metric/value 列映射、alias 及零值验证，原单文件 6/6 exit0、799.2334ms，日志 `%TEMP%/g004-preview-mapping-zero-20261123.*.log`。

旧母集11个 current_defect 按真实修复提交及原受控回归逐ID复核，新增 currentReview=fixed_scoped；原问题与失败保留，未审分支和真实Worker、Git hook等外部效果不冒通过。识别另有520实际窗口成功，详见 coverage 对应行。

## 当前探针及构建门禁

探针补真实RAF同ID ACK及hidden/generation保护，Host保留pending前停滞计数；原11/13 exit1，修协议和经本人批准的offscreen夹具后13/13及Host 6/6 exit0。日志 `%TEMP%/g004-render-full-current-20261123.*.log`、`g004-render-host-progress-20261123.*.log`；首失败 `g004-render-probe-20261123.*.log` 保留，未构建部署。

原build含全量域及禁止重跑删除场景，未启动；总控审定增量支持build且不缩原门禁，assemble仅package。先前脏树只读规划build 316/package 367、按需0，不等于旧520包361/6或构建通过。G004 pattern 1/1 exit0，日志 `%TEMP%/g004-build-incremental-runner-20261123.*.log`、`g004-build-incremental-aggregate-20261123.*.log`，runner提交 `6afb2ed0`。planner因legacy依赖漂移拒绝，需逐项对账及总控审定调度；不改摘要或跑禁区。总控两次只读路径/glob错误未触产品；原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

旧执行会话归档后核实60条direct的122个原事件哈希和session身份，仅修coverage路径。新增7项同根520 MCP只读与plan_list合成证据见coverage，真实Worker和跨项目未测；压缩前两稿11639、11331字符均写前断言退出。

## 停止路由候选

停止路由原猜首Worker、未知时force重发及提前落终态；已按精确归属、单次请求和未知保留意图修复，完整原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。VM 10/10及消费者12/12 exit0，日志 `%TEMP%/g004-stop-routing-terminal-20261123.*.log`、`g004-stop-consumers-terminal-20261123.*.log`；早期 successor/pending/plan/final 原日志保留，未访问真实Worker或Agent。

接替期间另有只读 Windows glob 两次失败、覆盖记录内存断言一次写前失败（外层后续命令显示0）、git-show 默认缓冲不足一次，均未改产品；后者提高只读缓冲后成功。PowerShell 嵌套引号一次解析失败，未执行 rg；随后改用 pwsh7 直接执行。

停止组已同步 `fb874de2`；其后修UI把未知误报completed、Plan停止附无关选择和Worker标识/提示，11/11及消费者12/12 exit0 `%TEMP%/g004-stop-ui-outcome-current-20261123.*.log`、`g004-stop-consumers-outcome-current-20261123.*.log`。仅假客户端；Panel仍待build/VM及总控审，不部署或提交。完整原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

同根45080 SFTP status、空transfers、配置list/get成功；target.show缺 `.vscode/sftp.json` 返回-32000，launcher exit0而外层exit1，敏感响应 `%TEMP%/g004-520-sftp-local-successor-20261123.json` 不公开。首身份检查误要求health的instanceId而exit1，后用PID/capabilities实例与根核实；未改配置或访问远端。只读glob及压缩补丁各一次失败未改产品，完整原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

停止候选保留显式Worker供人工重试；12/12 exit0 `%TEMP%/g004-stop-ui-identity-20261123.*.log`，Panel未构建部署。

SFTP server activate/save/delete源码及假后端范围见coverage；后两项复用17/17 `%TEMP%/g004-520-mcp-sftp-routing-20261123.log`，无真实配置变更或删除。

`sftp_download_paths` 原接受绝对路径并被下游误解释为相对路径；现拒绝绝对、盘符及越界输入。关联上传范围和授权见coverage；假后端17/17 exit0 `%TEMP%/g004-mcp-download-path-validation-20261123.*.log`，无真实传输。一次压缩补丁未匹配、写前退出；原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

SFTP tree、tree_state、inventory源码及假端口范围见coverage；三只读工具未声明权限类别，仅绑定Worker/项目，未访问真实Worker或计算远端哈希。

SFTP file_stats/plan_logs仅源码和假端证据。remote_directories原无条件附确认且缺授权，现按sync授权、根内目标和调用前快照复核；假Gateway/Host 18/18 `%TEMP%/g004-mcp-remote-directories-auth-20261123.*.log`，已装120确认函数VM 3/3 `%TEMP%/g004-sftp120-confirmation-vm-20261123.log`，无真实grant或远端操作。一次压缩补丁未匹配未写入，原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

静态报告打开两处、复制一处及对应invoke/命令别名：路径与错误VM 3/3 exit0，`%TEMP%/g004-report-read-errors-20261123.*.log`；成功打开/复制及链接目标未实测。

草稿审核/拒绝写入后若刷新抛错或保存错误，原UI及拒绝API可能报完成；现UI复用项目绑定API，明确报告“已写入但刷新失败”，不自动重发。方法VM/假写入6/6 exit0 `%TEMP%/g004-draft-partial-write-final-20261123.*.log`，原生命周期49/49 exit0 `%TEMP%/g004-draft-action-lifecycle-final-20261123.*.log`；夹具补齐真实Host已有状态，无真实草稿写入。

草稿提升预览按项目、草稿状态和成功debug校验，复用受控证据；提升本身明确退役。默认草稿渲染已停用，历史自定义保存仍可能经兼容路由进入；审核/拒绝的近期修复是宿主兼容路由，非实际UI点击。各ID范围与日志见coverage，未查询活动结果或写真实草稿。

用户指出草稿机制已移除，立即停止草稿相关新调查、验证和实现；前述检查源自旧母集及保留兼容入口，不能当作当前功能。范围由总控统一裁决，不删除文件。

MCP task_stop 在登记意图期间若撤销授权或更改Worker配置，原实现仍可发送停止；现发送前重核experiment授权及快照，未知保留意图。假Gateway/Host 3/3 exit0 `%TEMP%/g004-task-stop-auth-complete-20261123.*.log`；首次夹具不存在路径ENOENT及随后实际缺少拒绝的复现均exit1，分别保留 `g004-task-stop-auth-first`、`g004-task-stop-auth-repro` 日志。未访问真实Worker。

SFTP传输观察/取消的假后端18/18 `%TEMP%/g004-mcp-remote-directories-auth-20261123.*.log` 仅证明透传；后续核已装120发现取消按operationId更新账本、却可按不相属transferId选另一传输，静态可达缺陷已升级总控，未修或实际取消。三次只读rg路径猜错/Windows通配符失败未改产品。

旧attempt文案只在非declared验证返回且存在产物时进入；当前scheduler验证固定declared、新作业拒绝非declared，当前分支先走PlanRunHost.replace。旧/异常Agent仍可能触发遗留提示，未证实际创建或恢复机制。另一次只读Windows glob失败无产品修改。

task_list只复核当前项目归并、取消及unknown源码，禁止真实任务查询，退役CLI证据不冒充现行MCP通过；task_dispatch复用同任务假Gateway 5/5及假Host 11/11，未触真实派发、GPU或Worker。边界见coverage。

本人已精确授权配套 simple-sftp 仓最小修复取消身份及试行交付；先核该仓规则、版本及Git，审前不构建/安装，不操作真实传输。一次执行文档压缩补丁未匹配、未写入。
