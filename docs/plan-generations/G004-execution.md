# G004 执行登记

0.5.518 第二次 package exit0，341/341、13 gates、并发1、锁释放，receipt `simple_cluster/reports/test-workflow/2026-11-22T03-36-44-479Z-33768-package/run.json`；VSIX 2987002字节 SHA256 `703d5ae27781921294ff5eeb0bb7355ec7db8581390b73549420a564045e5624`。真实 Panel 模块及2个生成脚本 VM、实际 VSIX 内容策略验证均 exit0；运行闭包核验进程自然结束但工具丢失输出及退出码，状态未知。总控批准等价实际 ZIP 核验：325闭包、324面板文件均存在，371运行文件与构建输出逐字节摘要一致，身份/version/engine正确，exit0；原未知不覆盖。

518 精确 `git add` exit1 提示 dist 被忽略；回读状态确认指定13个已跟踪生成文件及8个非生成文件均实际暂存，未强制添加或触碰未跟踪项。

0.5.518 首次 package exit1：341 项中339通过、2失败，前10门禁通过，maxParallel/maxObserved=1、锁已释放，未进入 post/assemble；完整 `simple_cluster/reports/test-workflow/2026-11-22T03-16-49-272Z-80576-package/run.json`。mcpProject 41/43：旧授权夹具与当前 Worker 共用可变对象，无法模拟历史快照；改用副本后实际新 dist 43/43 exit0（`C:/Users/ZLK/AppData/Local/Temp/g004-518-mcp-project-after-ff08.log`）。serverQuotaPersistence 9/10：源码抽取夹具缺 `mcpInvocation`，接入真实模块后10/10 exit0（`C:/Users/ZLK/AppData/Local/Temp/g004-518-worker-quota-after-ff08.log`）。两项仅改测试夹具，首失败日志见该 run 的 job 日志；待总控裁决组装/重跑，未发行、安装或修改真实权限/Worker。

U04-56：隔离517导入成功但结果区优先旧主动查询报告，未展示新离线摘要。源码将 bundle 的结果经现有30行/字段压缩单独传为只读预览，明确归属/版本未核，不改变当前 PLAN 完成/归档证据；离线预览时结果区不把旧同步报告当本次结果，实时视图保留真实报告。真实源生成的 HTML 内脚本 VM 编译及定向 `node --test --test-force-exit --test-timeout 20000 test/features/resultsSummaryWebviewCache.test.js` 首次8/8 exit0；补充真实指标压缩和异 PLAN 预览后8/8 exit0，完整后一轮日志 `C:/Users/ZLK/AppData/Local/Temp/g004-56-offline-preview-ff08.log`。原517仍未包含修复，未 build、安装或新版实机验收。

U56 源审返修：非对象离线行显示行号及错误、保留其余行；指标和维度压缩保留 `__proto__`、`constructor` 与零值。上述单文件增加真实压缩及生成脚本消费断言，修前 7/8 exit1（null 读取 experimentId），修后 8/8 exit0；完整日志分别为 `C:/Users/ZLK/AppData/Local/Temp/g004-56-edge-before-ff08.log` 和 `C:/Users/ZLK/AppData/Local/Temp/g004-56-edge-after-ff08.log`。

补齐既有 final_results 与 pending_review_records 消费，显式空 results 不回退；同文件8/8 exit0，日志 `C:/Users/ZLK/AppData/Local/Temp/g004-56-alias-final-ff08.log`。

517 离线导入：专用零 Worker 窗口实际选择原 synthetic `offline-fixture.json`，`invoke offline` exit0，持久包读回两行 AP 0.11/0.44；原包缺 PLAN 归属/版本时选中 PLAN 的摘要被门禁隐藏。新建并保留 `g004_0517_offline_scoped_ff08.json`，明确 synthetic、display-only、未运行，将当前空 PLAN 及实际 revision 作为合成显示身份；再次经实际文件选择导入后，state `__offlineImport=true`、两行及 AP 均正确。随后用相同入口恢复原合成包并核持久 source/两行；导入更新时间变化，原输入未覆盖。结果区仍显示之前主动查询失败提示及既有两行表，计划卡未证明显示此次摘要，界面展示语义待总控裁决，不冒通过。准备查工具帮助 `node scripts/test-workflow.js --help` 实际 exit1，因 runner 不支持该选项；未启动测试或打包，随后只读源码确认参数。

U04-55 后续用户裁决替换此前零 Worker 仅配置方案：本人选择授权当前项目即授现有全部操作类别，不选 Worker 或范围；新 grant 不存 Worker，旧细分/绑定 grant 保留旧约束直到本人重授。设置入口 `worker_configure` 可选已禁用的已配置 Worker 并修改/读回 enabled，执行入口仍限启用目标；共享设置提示其影响所有项目。真实源码转译及内存 UI/store/Gateway/配置保存回归 `node --test --test-force-exit --test-timeout 20000 test/ui/actionLifecycle.test.js` 首轮45/45 exit0；补充保存前目标重核及变更夹具后45/45 exit0，日志 `C:/Users/ZLK/AppData/Local/Temp/g004-55-project-grant-first-ff08.log` 与 `C:/Users/ZLK/AppData/Local/Temp/g004-55-project-grant-final-ff08.log`；旧窄方案的首失败和通过记录保留于下段。未操作真实授权、共享 Worker 或远端；旧 dist 测试文件同步了新签名，未以旧 dist 测新源码；尚未 build、安装、实机复验。

517 隔离实例 MCP 本地业务补证：实际 discovery/health 为 Host 22928、0.5.517、专用根，live catalog 中 result_parse/metric_leaderboard 无权限要求，真实 mcp.call 未拒绝。原 synthetic/final.csv 按默认长表解析返回空数组；新建并保留 `experiments/results/synthetic/g004_0517_mcp_long_ff08.csv` 与 `g004_0517_mcp_metrics_ff08.csv`，前者解析两行结果，保留带逗号 run key、DSC=0，跳过空 HD95；后者排行两组，保留 accuracy=0 与引号内逗号，空 loss 不计指标，另一组 accuracy=0.8/loss=0.4。此证修正此前“所有 MCP 解析未测”的记载；result_export 等 results 权限链及新授权版本实机仍未测。

U04-55 旧窄方案：517 零 Worker 无法授权，非用户未操作；首43/44 exit1、修后44/44 exit0，日志及完整记录见 Git `156f060b`；后被本人新裁决替换。未操作真实权限或 Worker。

U04-54 原 B3 局部返修：已装 0.5.517 的 `selectPlan` 实机失败保留；同属公开目录和 uiActionCommands 的 `selectExperiment` 也无 actionCommandMap 映射。源码 `invokeApi` 在原授权及确认之后将两项转回既有 `handleMessageCore` 本地选择分支，远端动作路径和确认不变。`node --test --test-force-exit --test-timeout 20000 test/ui/actionLifecycle.test.js` 首次 42/43 exit 1（两个选择未到本地 handler），修后 43/43 exit 0；完整日志分别为 `C:/Users/ZLK/AppData/Local/Temp/g004-54-action-before-ff08.log` 和 `C:/Users/ZLK/AppData/Local/Temp/g004-54-action-after-ff08.log`。测试使用真实 invoke/消息路由和内存 handler，覆盖未公开/缺命令拒绝、远端动作确认及原路由；未运行真实任务。修复仅源码，未 build、打包、安装或实机重验。

0.5.517 重载后隔离实机：专用项目原有离线包、无 `.vscode/sftp.json`；普通共享配置有启用 Worker，源码激活后自动版本探测，未在普通 profile 启动或请求 Worker。经总控裁决新建并保留 `C:/Users/ZLK/AppData/Local/Temp/g004-vscode-0517-acceptance-20261122-ff08`，仅启用已安装 SimpleExperiment/SimpleSFTP、允许既有公开 GitHub 更新检查和自然发现注册。首次误禁必需 SimpleSFTP 导致业务插件未激活；仅关闭隔离窗口后正确重开。真实 Host PID 22928、父进程 77780，health/capabilities 版本 0.5.517、专用项目根，offline_import、启用 Worker 0；界面打开低流量并由 state 读回 enabled/effective=true。SimpleSFTP 状态读取既有共享服务器配置，但本项目无 SFTP 连接配置；未连接服务器。原共享 profile 自动探测问题未执行、未修复。

实际 UI 选择 `ui_u01_cases_515.yaml` 显示 2×2=4；`plans.list` 刷新后原空 cases 为 0 且 seed 0 保留。启动最初 state 曾返回旧缓存空 cases jobCount=2，刷新变 0，不把旧缓存当当前结果。新增并保留 `experiments/plans/g004_0517_acceptance_ff08.yaml`，API `savePlan` 写入后原文、空行和 seed 0 读回，空 cases 为 0。向导实际生成并保留 `experiments/plans/guided_plan.yaml`，1 case/1 seed、合成路径，仅生成未运行；再次生成时 UI Esc，API 返回 USER_CANCELLED。结果目录 `experiments/results` 临时改为 `experiments/results/synthetic`、读回并恢复原值。空计划保存请求返回明确缺参错误。

实际失败：`actions.list` 声明 `selectPlan`，`invoke` 同名返回 -32000「未知或未放行的动作：selectPlan」；UI 已恢复原选择 `ui_u01_empty_515.yaml`。offline_import 下 `results.list` 返回 active_query 空结果、memoryRequests=0、无法核实 PLAN，之后面板显示本轮查询失败而不是原离线摘要；不将该观察扩称根因或修复。隔离 profile 的 `mcp.authorization` 返回 null，未取得 configuration-only；未操作权限设置、未绕过，MCP 解析/导出尚未测。离线结果导入解析及相关剩余修复验证未完成；无真实 Worker/训练、删除、再安装、构建或发行。

补充：本地已有合成结果表在 UI 显示 synthetic 总表 2 行、2 方法；通过 `invoke splitProjectResultTable` 按 AP 拆分，预先确认新目录不存在，新建并保留 `experiments/results/synthetic/by_AP/0.11.csv` 与 `0.44.csv`，回读列和值正确，UI 显示生成 2 张子表。UI 取消全部拆分值后生成，显示「请选择 1 至 100 个拆表值」错误；点击查看日志，输出通道显示时间、操作及错误。随后 UI 选择 dataset 的 synthetic 值，确认新目录不存在后生成并保留 `experiments/results/synthetic/by_dataset/synthetic.csv`，成功提示及回读两行正确。此为本地既有表拆分，不代表 MCP 结果导出。`selectPlan` 必要调用链核对：`actions.list` 使用 `API_EXECUTABLE_COMMANDS`；`invokeApi` 将其归入 `uiActionCommands`，`runActionCommandCore` 依 `actionCommandMap` 拒绝缺项，未到 `handleMessageCore` 的 `selectPlanFromUi`；属实际入口矛盾候选，未修。`results.list` 是主动核实与汇总，不作为读取离线摘要的替代。

U04排查阶段基线HEAD及origin/master为b7c0b42c27227a8ec49d42d1f21346900a274ae4，开始时tracked clean；计划由总控独占。legacy、辅助页和MCP入口证据见coverage.g004U04RemainingInventory；旧静态脚本不能代表完整母集。factory实际输出缺四项门禁并回退legacy；恢复页VM消息5/5 exit0，未实际重载或写剪贴板。当时按钮总数及剩余未知，排查阶段未改产品、构建、安装或访问服务器；后续三批源码包见1ff64a81及下文。旧执行聊天已归档。

版本审核13/13、缓存及同步页4/4和3/3 exit0；U04-01首夹具失败、U04-02跨项目延期，完整细节见4a80c627及coverage；无真实删除。

本登记上限12000字符、90%时语义归并；原完整逐项记录保留于 Git 10c0689e:docs/plan-generations/G004-execution.md，U04中途记录另见4a80c627同路径，项目计划与代次索引为总控独占。执行范围为本人日常单机最多两个项目，不做多项目压力、无入口参数突变或新锁队列；保护真实Worker、训练、消费项目、共享配置、原窗口、未保存文档及全部夹具。源码、旧dist、已安装版本及远端效果分开记录。

既有G004、U01–U02细节及首次失败保留于 Git `10c0689e:docs/plan-generations/G004-execution.md`，U03及0.5.516记录保留于 `b7c0b42c:docs/plan-generations/G004-execution.md` 和 G004-plan；不把历史测试、修复数当当前按钮分母。原12项受控验证中，A组先0/3含缺VS Code夹具，修后原范围仍0/3、修逻辑后3/3、排除无入口内部参数突变后4/4；日志、空seed/cases及配置reset首次失败后修复。MCP43/43、experimentPlatform旧断言修正后15/15；build先被并发中止exit1，后夹具6/7失败、修后7/7，最终回执 `simple_cluster/reports/test-workflow/2026-11-21T04-18-18-128Z-69044-build/run.json` 为285任务/10门禁通过、并发1，6项按需未运行。唯一旧锁文件经本人精确授权删除，未扩大清理。

0.5.514/515安装、发行及实际失败见10c0689e与G004-plan，Latest仍0.5.483。

U01/U02/U03分别2/8/10项已修；U03末轮42/42 exit0。J01宿主缺GIT_CONFIG_VALUE_0/5且传递未知；simpleex --version绑定不符exit2。完整记录见b7c0b42c及计划。

0.5.516 package首轮340/341 exit1，断言修后22/22及341/341 exit0；安装一次、未获用户Reload确认，证据见计划及b7c0b42c。
U04逐项调查、原始退出码与受控证据保留于 Git f72d0066 的本登记及 coverage.g004U04RemainingInventory。确认43项：单项目39、跨项目02/05/06/07延期4；20、33–36、40–44撤回并保留编号与证据。安全拦截后未重放专项；没有真实Worker、任务、文件删除或窗口操作。

关键失败保留：日志导航目标文件12/13 exit1（夹具缺setNativeTitle），另行VM补测3/3 exit0（首次夹具缺nativeTitleMutationVersion exit1）；U04-03首次假错误类型不符exit1后修正；U04-10完整对象比较因时间戳不同exit1，业务字段比较exit0；CLI --version API_WORKSPACE_MISMATCH exit2。U04-51的yaml及js-yaml模块均缺失各exit1；其他夹具和整理脚本首次失败见原记录及coverage。原失败不被后续通过覆盖。
最终逻辑母集300项：界面279（限定结论204、延期75），独立VSCode命令21（限定结论7、延期14）；合计限定结论211、剩余89均延期。GPU两合成行合并/打散及假持久化、TMUX三种合成导航和all筛选、端点清单假编辑器正常/错误均exit0；真实Worker、剪贴板、网络未测。资源导航6精确/2回退exit0，首次探针语法错误exit1未写。13项旧工具证据适用边界及全部映射见coverage.logicalActionCensus，实际控件实例数未知。

B1 U04-25/26受控检查7/7、20/20 exit0，详见 Git `c37827c8:docs/plan-generations/G004-execution.md`；未操作实际 VS Code 状态。

B1 U04-49/50、28、32完整修复及定向结果保留于 Git `c37827c8:docs/plan-generations/G004-execution.md`；49/50 首次1/2 exit1（夹具沿用长表预设），修正预设后2/2 exit0。

B1 U04-29/30/31及19/21汇总链证据见 Git `c37827c8:docs/plan-generations/G004-execution.md`；对应合成和替身回归3/3、21/21、10/10、1/1 exit0。

B1 U04-21其余链内存回归5/5、4/4、3/3 exit0，详见 Git `c37827c8:docs/plan-generations/G004-execution.md`。

B1 U04-22/45 的实现及22/22、1/1、4/4 exit0证据见 Git `c37827c8:docs/plan-generations/G004-execution.md`；无真实迁移或配置写入。

B2 U04-13/15/17、16、39/51、24/38 的实现与5/5、6/6、1/1、1/1 exit0合成检查见 Git `c37827c8:docs/plan-generations/G004-execution.md`；未访问或保存真实 PLAN。

B2 U04-47/52/53及12/37/46受控检查3/3、4/4 exit0，详见 Git `c37827c8:docs/plan-generations/G004-execution.md`；无真实报告、剪贴板、草稿或历史操作。

B2 U04-27/48 合成回归4/4 exit0，无真实归档或网络；详情见 Git `c37827c8:docs/plan-generations/G004-execution.md`。

B2 U04-23及B3 U04-03/04/11、10/14、18、09的14/14、4/4、6/6、5/5、8/8、42/42、5/5受控回归及完整实现见 Git `c37827c8:docs/plan-generations/G004-execution.md`；无真实Worker查询或派发。

B3 U04-01/08 两处TS转译 exit0；完整实现见 Git `c37827c8:docs/plan-generations/G004-execution.md`。未重放平台拦截、授权撤销或Agent生命周期专项；4项跨项目和89项入口延期。

首次源审返修：U04-30只过滤平面行的维度，显式metrics桶保留seed、epoch、0及特殊自有键；metricLeaderboardInput 5/5 exit0。日志导航夹具加载真实setNativeTitle及初始状态，原套件在既有516 dist上13/13 exit0；原12/13 exit1和另行3/3补测保留，新生成脚本尚待集中构建后门禁。

0.5.517首轮package exit1，337/341作业通过、4失败，10前置门禁通过，输入与结束指纹一致，锁已释放；未执行post/assemble。完整日志及receipt见`simple_cluster/reports/test-workflow/2026-11-21T14-48-56-521Z-480-package/run.json`。合作取消因执行会话stdin已关闭失败，原runner自然结算。四处仅修现有测试断言/夹具：MCP 42/43→43/43，CLI 18/19→19/19，历史取消12/13→13/13，Agent夹具9/10→首补后9/10（VM跨realm对象原型比较差异）→标准库克隆归一后10/10；均保留真实退出码及业务断言。未改产品源码、依赖或运行配置；原337项证据与补测分别记录，runner不接受失败receipt或改变后的输入直接组装，待总控决定门禁。

总控授权后第二次package exit0，341/341、13门禁通过，实际并发1、按需0、锁释放，输入与结束指纹相同；receipt `simple_cluster/reports/test-workflow/2026-11-21T15-08-06-325Z-28880-package/run.json`。生成0.5.517 VSIX大小2986729、SHA256 `2fa2ecb3e0d890d47653ee8b7f5ffe29317c22d692659ae4cd8d34336a6989e5`；身份simple-local.simple-experiment，universal包由更新客户端识别为Windows兼容，engine ^1.100.0；ZIP中370项dist/bin/vendor与本机相同，禁止项路径检查无命中。Panel模块及3个生成脚本VM通过；首个VM命令转义错误exit1后修正exit0；业务src/dist搜索10890无命中（rg exit1）。日志导航不在本次package矩阵，另对新dist定向13/13 exit0；首轮12/13及旧dist补测保留。上述打包核验时发行安装尚未完成，最终状态如下。

0.5.517试行发行与安装完成，总控最终一致性核验通过：[试行Release](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.517) 为prerelease，远端tag绑定源码及生成物提交 `a7d2a7275c5d9ea455c2e369cdddaa8e33a198e2`，非最新权威版。隔离下载包2986729字节、SHA256与上列包及同名sha一致。实际更新客户端确认0.5.482可见0.5.483，0.5.517及SFTP 0.2.120均不降级；Latest仍0.5.483。`npm run install:latest` 一次exit0并输出DEP0169 warning；磁盘已装SimpleExperiment 0.5.517、SFTP 0.2.120，simpleex及simpleex-mcp稳定入口存在。用户尚未Reload，当前Extension Host版本未知；CLI默认绑定不符exit2及J01宿主环境缺项仍未解决，真实界面、Worker及外部效果未测。
