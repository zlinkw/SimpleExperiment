# 原生界面与通知入口索引

本表补充 [产品流程覆盖表](product-ui-coverage.md)，源码基准以本次最终提交为准。列出的 332 处是直接调用位置，不代表 332 个独立页面或已完成实机验收。主 Webview、抽屉、状态卡片菜单、曲线页、设置表单及恢复页另见主表。

仅定位源码不能证明旧 helper 当前可达。未实际走通的入口、原生弹窗键盘与多窗口现场交互均为 **待验证**；本轮不因此调用服务器或执行科研、传输、停止、部署和清理。动态封装的最终弹窗以调用者及实际生产分支为准，运行覆盖确认已核实为 VS Code 原生路径。

## 流程约定

各索引行与下面同名流程共同给出入口、目的、读取来源、对象范围、写入、成功依据、失败反馈和恢复方式。最终执行仍须展示实际选择的完整目标；本索引里的识别文本不是授权目标。

| 流程 | 使用目的与读取来源 | 对象及作用范围 | 是否写入 | 成功依据 | 失败反馈与恢复 |
| --- | --- | --- | --- | --- | --- |
| 运行 | PLAN/队列/当前选择、原 job 和主动状态；选择、校验、预演、提交、停止与恢复 | 明确 PLAN 列表、项目、Worker、commandId、真实窗口 | 提交/意图可能写本机及服务器；完整校验含同步准备写入 | 接收、执行、完成确证分别判断；停止须主动核实精确窗口与取消围栏 | 保留原任务及未确认意图；用户回到精确 job，不自动重跑 |
| 审核 | 当前声明、即时文件/窗口查询及冻结审核批次 | 每节点完整路径、固定类型；精确隔离批次/版本 | 仅用户主动选择并完成适用双确认后写入 | 路径/类型/目标变化核验与真实文件结果；旧回执不证明仍存在 | 取消保留；未知可重查，不重复未知执行器；本轮未执行清理 |
| 传输 | 当前项目、本机及启用 Worker 的范围树/文件元数据 | 明确源、目标、用户勾选范围；job 产物与当前范围交集 | 仅通过 SimpleSFTP/插件接口进行用户所选传输 | 逐目标实际传输/完整性结果；部分与未知分开 | 保留错误及精确范围，主动重查/重试；不擅自扩大或补回范围 |
| 产物 | 结果摘要、CSV 列来源、显式分析结果、PPT 配置及文件选择 | 当前项目全部 PLAN 或显式 API 选择；精确结果文件/PPT | 读取仅内存；设置/导出/分析/绘图各由用户主动执行 | 任务完成、产物完整、同步、汇总、导出各自证据 | 未就绪/缺失/读取失败分别反馈；取消与保存失败保留草稿 |
| 设置 | schema、项目存储、全局用户默认、Worker/逐卡覆盖及未保存输入 | 前缀仅全局；连接/环境/路径/规则按明确项目 scope | 用户保存；接入规则保存还请求启用 Worker 保存策略 | 本机保存回执与远端待同步/生效回执分开 | 校验定位，失败/取消保留输入；新草稿不被旧成功回包清除 |
| 服务器 | 启用端点、动态隧道配置、当前 Agent/GPU/tmux 观测 | 精确服务器、项目及服务/任务窗口；无目标不补历史目标 | 连接/准备/服务动作由用户主动执行；不自动修科研环境 | 实际连接、稳定归属、真实窗口/监听状态及源时间 | 禁用、未核实、离线、失败分开；精确目标重查，不按前缀批量停止 |
| 项目 | 项目登记、本机目录/Git、明确 GitHub 目标与当前候选 | 当前项目、显式分支/祖先/远端/PR | 登记或用户确认的 Git 操作；不隐式变更历史 | 精确项目身份、Git/远端真实回执及提交包含关系 | 取消不写入；结果未知先只读对账，不自动重发或改远端 |
| 历史 | 本机可隐藏操作记录及其当前状态 | 用户选中的已结束记录或明确 PLAN 历史 | 本机隐藏/截止值；不删除任务、审计、日志或科研产物 | 本机存储及刷新后的展示；确认时重新核对当前记录 | 活动/变化记录拒绝；取消保留，原任务精确证据不消失 |
| 更新 | 既有 GitHub 稳定更新源、资产及校验清单 | 两个既有插件身份、平台及精确版本 | 用户主动安装；本轮最终试行仅安装一次，不提升 Latest | 真实发行元数据、下载字节、SHA、版本/平台与安装状态 | 限流/网络/校验失败明确保留；不 force、不降级、不部署远端 Agent |
| 诊断 | 当前探测、精确日志、错误详情、离线显式导入或用户所选报告 | 当前项目及明确文件/操作；历史不冒充本轮 | 查看/复制不写；导出及显式诊断按其原有接口 | 原日志源、时间、具体回执；未检查不冒充通过 | 保留错误原因；完整日志入口与主动重查，不隐式科研分析 |
| 通知 | 调用方法当前上下文及其真实操作结果 | 同一调用目标；通知本身不授权新范围 | 纯通知不产生额外写入；可选动作须沿对应流程 | 对应操作证据；不能仅因通知关闭而判成功 | 根据实际可选动作恢复；未验证旧调用可达性不算已证缺陷 |

## 逐调用位置

“普通”包括通知及非模态选择动作；“模态”来自源码明确的 modal=true。动态参数不能仅凭静态索引确定模式，仍待真实入口核实。所有源码链接均可查看实际参数、选择列表、取消分支和写入调用。

| # | 类型 | 入口与识别文本 | 流程 | 源码位置 | 覆盖 |
| --- | --- | --- | --- | --- | --- |
| 1 | 审核/选择页面 | openPlanCleanupPanel："simpleExperiment.planCleanup" | 审核 | [src/extension/PlanCleanupPanel.ts:9](../src/extension/PlanCleanupPanel.ts#L9) | 源码定位；可达性/实机待验证 |
| 2 | 错误反馈 | openPlanCleanupPanel："独立删除审核关闭留痕失败：" + String(error.message ／／ error) + "；请重新打开审核查询原请求，勿重复执行。" | 审核 | [src/extension/PlanCleanupPanel.ts:134](../src/extension/PlanCleanupPanel.ts#L134) | 源码定位；可达性/实机待验证 |
| 3 | 通知/可选动作 | openIsolatedBatchReviewFlow："暂无已核实全部初始 PLAN 启动且仍待审核的隔离产物；未删除任何文件。" | 审核 | [src/extension/PlanCleanupIsolatedReviews.ts:85](../src/extension/PlanCleanupIsolatedReviews.ts#L85) | 源码定位；可达性/实机待验证 |
| 4 | 候选选择 | openIsolatedBatchReviewFlow："隔离产物独立永久删除审核" | 审核 | [src/extension/PlanCleanupIsolatedReviews.ts:86](../src/extension/PlanCleanupIsolatedReviews.ts#L86) | 源码定位；可达性/实机待验证 |
| 5 | 候选选择 | openIsolatedBatchReviews："选择永久删除审核范围" | 审核 | [src/extension/PlanCleanupHost.ts:458](../src/extension/PlanCleanupHost.ts#L458) | 源码定位；可达性/实机待验证 |
| 6 | 警告/确认 | openIsolatedBatchReviews：text | 审核 | [src/extension/PlanCleanupHost.ts:463](../src/extension/PlanCleanupHost.ts#L463) | 源码定位；可达性/实机待验证 |
| 7 | 通知/可选动作 | openIsolatedBatchReviews：text | 审核 | [src/extension/PlanCleanupHost.ts:463](../src/extension/PlanCleanupHost.ts#L463) | 源码定位；可达性/实机待验证 |
| 8 | 候选选择 | dispatch："手动派发：选择服务器" | 运行 | [src/extension/ManualDispatchHost.ts:73](../src/extension/ManualDispatchHost.ts#L73) | 源码定位；可达性/实机待验证 |
| 9 | 候选选择 | dispatch："选择此服务器自动派发或指定 GPU" | 运行 | [src/extension/ManualDispatchHost.ts:82](../src/extension/ManualDispatchHost.ts#L82) | 源码定位；可达性/实机待验证 |
| 10 | 警告/确认 | refreshUnifiedDispatchPolicyFromUi：无法预览统一策略：${errorMessage(error)} | 运行 | [src/extension/legacy.ts:1849](../src/extension/legacy.ts#L1849) | 源码定位；可达性/实机待验证 |
| 11 | 通知/可选动作 | refreshUnifiedDispatchPolicyFromUi："没有可登记的服务器策略：请先在设置中配置 Worker。" | 运行 | [src/extension/legacy.ts:1863](../src/extension/legacy.ts#L1863) | 源码定位；可达性/实机待验证 |
| 12 | 警告/确认（模态） | refreshUnifiedDispatchPolicyFromUi："显式刷新统一派发策略" | 运行 | [src/extension/legacy.ts:1864](../src/extension/legacy.ts#L1864) | 源码定位；可达性/实机待验证 |
| 13 | 通知/可选动作 | refreshUnifiedDispatchPolicyFromUi：统一派发策略已保存：替换/新增 ${result.replaced.length} 台${result.conflicts.length ? ；${result.conflicts.length} 项… | 运行 | [src/extension/legacy.ts:1869](../src/extension/legacy.ts#L1869) | 源码定位；可达性/实机待验证 |
| 14 | 选文件/目录 | pickBranchProjectDirectory：{ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, title, openLabel: "选择目录" } | 项目 | [src/extension/legacy.ts:2009](../src/extension/legacy.ts#L2009) | 源码定位；可达性/实机待验证 |
| 15 | 候选选择 | pickBranchProject：items.map((item) =&gt; ({ label: item.label, description: item.detail, id: item.id, kind: item.kind })) | 项目 | [src/extension/legacy.ts:2028](../src/extension/legacy.ts#L2028) | 源码定位；可达性/实机待验证 |
| 16 | 通知/可选动作（模态） | registerAncestorProjectFromUi：detail | 项目 | [src/extension/legacy.ts:2039](../src/extension/legacy.ts#L2039) | 源码定位；可达性/实机待验证 |
| 17 | 通知/可选动作 | registerAncestorProjectFromUi：已登记祖先项目：${identity.toplevel} | 项目 | [src/extension/legacy.ts:2045](../src/extension/legacy.ts#L2045) | 源码定位；可达性/实机待验证 |
| 18 | 通知/可选动作（模态） | registerBranchProjectFromUi：detail | 项目 | [src/extension/legacy.ts:2055](../src/extension/legacy.ts#L2055) | 源码定位；可达性/实机待验证 |
| 19 | 通知/可选动作 | registerBranchProjectFromUi：已登记创新分支副本：${identity.toplevel} | 项目 | [src/extension/legacy.ts:2060](../src/extension/legacy.ts#L2060) | 源码定位；可达性/实机待验证 |
| 20 | 输入 | createBranchFromAncestorFromUi：{ prompt: "新分支名（例如 innovation/lr-sweep-01）", validateInput: (value) =&gt; /^[A-Za-z0-9][A-Za-z0-9._\-/]… | 项目 | [src/extension/legacy.ts:2064](../src/extension/legacy.ts#L2064) | 源码定位；可达性/实机待验证 |
| 21 | 警告/确认（模态） | createBranchFromAncestorFromUi：detail | 项目 | [src/extension/legacy.ts:2077](../src/extension/legacy.ts#L2077) | 源码定位；可达性/实机待验证 |
| 22 | 通知/可选动作 | createBranchFromAncestorFromUi：result.message | 项目 | [src/extension/legacy.ts:2083](../src/extension/legacy.ts#L2083) | 源码定位；可达性/实机待验证 |
| 23 | 通知/可选动作 | openBranchProjectFromUi："当前窗口已经打开了这个项目。" | 项目 | [src/extension/legacy.ts:2105](../src/extension/legacy.ts#L2105) | 源码定位；可达性/实机待验证 |
| 24 | 通知/可选动作（模态） | openBranchProjectFromUi：将在新窗口打开：${root}\n（新窗口启动该项目的独立插件实例，不改变当前窗口工作区。） | 项目 | [src/extension/legacy.ts:2108](../src/extension/legacy.ts#L2108) | 源码定位；可达性/实机待验证 |
| 25 | 警告/确认（模态） | forgetBranchProjectRegistrationFromUi：仅移除插件内的登记：${label}\n不会删除目录、分支、worktree 或任何提交；之后可重新登记。 | 项目 | [src/extension/legacy.ts:2122](../src/extension/legacy.ts#L2122) | 源码定位；可达性/实机待验证 |
| 26 | 通知/可选动作 | forgetBranchProjectRegistrationFromUi："已移除登记（目录与 Git 内容未做任何修改）。" | 项目 | [src/extension/legacy.ts:2127](../src/extension/legacy.ts#L2127) | 源码定位；可达性/实机待验证 |
| 27 | 通知/可选动作 | submitBranchPlanRunFromUi：该分支项目（${labelName}）未发现可用 PLAN；请在该分支窗口确认 PLAN 目录后重试。 | 项目 | [src/extension/legacy.ts:2152](../src/extension/legacy.ts#L2152) | 源码定位；可达性/实机待验证 |
| 28 | 候选选择 | submitBranchPlanRunFromUi：选择要提交的 PLAN（${labelName}） | 项目 | [src/extension/legacy.ts:2153](../src/extension/legacy.ts#L2153) | 源码定位；可达性/实机待验证 |
| 29 | 警告/确认（模态） | submitBranchPlanRunFromUi：分支窗口判定当前不可直接提交：${preview.guidance} | 项目 | [src/extension/legacy.ts:2161](../src/extension/legacy.ts#L2161) | 源码定位；可达性/实机待验证 |
| 30 | 警告/确认（模态） | submitBranchPlanRunFromUi："向该分支实例提交运行此 PLAN？" | 项目 | [src/extension/legacy.ts:2165](../src/extension/legacy.ts#L2165) | 源码定位；可达性/实机待验证 |
| 31 | 通知/可选动作 | submitBranchPlanRunFromUi：已请求分支实例启动（操作 ${outcome.operationId}）；进度可在「项目与分支 → 刷新运行状态」或该分支窗口查看。 | 项目 | [src/extension/legacy.ts:2170](../src/extension/legacy.ts#L2170) | 源码定位；可达性/实机待验证 |
| 32 | 警告/确认 | submitBranchPlanRunFromUi：分支窗口未启动该 PLAN：${outcome.reason} | 项目 | [src/extension/legacy.ts:2175](../src/extension/legacy.ts#L2175) | 源码定位；可达性/实机待验证 |
| 33 | 警告/确认（模态） | submitBranchPlanRunFromUi："提交结果未知：工作流可能已在分支窗口继续。" | 项目 | [src/extension/legacy.ts:2179](../src/extension/legacy.ts#L2179) | 源码定位；可达性/实机待验证 |
| 34 | 通知/可选动作 | refreshBranchRunsFromUi："尚未登记任何项目，没有运行状态可刷新。" | 项目 | [src/extension/legacy.ts:2210](../src/extension/legacy.ts#L2210) | 源码定位；可达性/实机待验证 |
| 35 | 通知/可选动作 | compareBranchResultsFromUi："尚未登记任何项目，没有可比对的结果。" | 项目 | [src/extension/legacy.ts:2275](../src/extension/legacy.ts#L2275) | 源码定位；可达性/实机待验证 |
| 36 | 警告/确认（模态） | verifyBranchHeadBindingFromUi：该分支队列内没有带已验源码清单（executionSource）的 PLAN，无法证明任何 HEAD。 | 项目 | [src/extension/legacy.ts:2285](../src/extension/legacy.ts#L2285) | 源码定位；可达性/实机待验证 |
| 37 | 候选选择 | verifyBranchHeadBindingFromUi：选择要核对 HEAD 绑定的 PLAN（${labelName}） | 项目 | [src/extension/legacy.ts:2289](../src/extension/legacy.ts#L2289) | 源码定位；可达性/实机待验证 |
| 38 | 通知/可选动作（模态） | verifyBranchHeadBindingFromUi：此 HEAD 可由已验清单证明（${plan.planFile}） | 项目 | [src/extension/legacy.ts:2326](../src/extension/legacy.ts#L2326) | 源码定位；可达性/实机待验证 |
| 39 | 警告/确认（模态） | verifyBranchHeadBindingFromUi：无法证明此 HEAD 等于已验源码（${plan.planFile}） | 项目 | [src/extension/legacy.ts:2331](../src/extension/legacy.ts#L2331) | 源码定位；可达性/实机待验证 |
| 40 | 候选选择 | branchResearchCandidateFlow：选择作为推送/PR 科研候选的 PLAN（${path.basename(String(root).replace(/[\\/]+$/, ""))}，必选非空；不自动判优） | 项目 | [src/extension/legacy.ts:2372](../src/extension/legacy.ts#L2372) | 源码定位；可达性/实机待验证 |
| 41 | 警告/确认（模态） | createBranchPrFromUi：推送并创建 PR？${preview.target.displayUrl} ← ${identity.branch} | 项目 | [src/extension/legacy.ts:2461](../src/extension/legacy.ts#L2461) | 源码定位；可达性/实机待验证 |
| 42 | 通知/可选动作（模态） | createBranchPrFromUi：已创建 PR #${result.prNumber} | 项目 | [src/extension/legacy.ts:2476](../src/extension/legacy.ts#L2476) | 源码定位；可达性/实机待验证 |
| 43 | 通知/可选动作（模态） | createBranchPrFromUi：按身份复用既有 PR #${result.prNumber}（未推送、未新建）。${result.note ／／ ""} | 项目 | [src/extension/legacy.ts:2477](../src/extension/legacy.ts#L2477) | 源码定位；可达性/实机待验证 |
| 44 | 警告/确认（模态） | createBranchPrFromUi：PR 操作未完成（${result.status === "failed" ? "被远端拒绝" : result.status === "blocked-verification" ? "科研确证复核… | 项目 | [src/extension/legacy.ts:2478](../src/extension/legacy.ts#L2478) | 源码定位；可达性/实机待验证 |
| 45 | 通知/可选动作（模态） | mergeBranchPrFromUi：PR #${pr.number} 已是 MERGED（只读重查） | 项目 | [src/extension/legacy.ts:2495](../src/extension/legacy.ts#L2495) | 源码定位；可达性/实机待验证 |
| 46 | 警告/确认（模态） | mergeBranchPrFromUi：只读恢复未通过：${recovered.reason ／／ recovered.status}。未发送任何合并指令，也未快进祖先。 | 项目 | [src/extension/legacy.ts:2502](../src/extension/legacy.ts#L2502) | 源码定位；可达性/实机待验证 |
| 47 | 警告/确认（模态） | mergeBranchPrFromUi：合并 PR #${pr.number} 到 ${ancestor.targetBranch}？ | 项目 | [src/extension/legacy.ts:2525](../src/extension/legacy.ts#L2525) | 源码定位；可达性/实机待验证 |
| 48 | 警告/确认（模态） | mergeBranchPrFromUi：合并未确认成功（${merge.status === "not-merged" ? "未合并" : "结果未知"}）：${merge.reason ／／ ""} | 项目 | [src/extension/legacy.ts:2533](../src/extension/legacy.ts#L2533) | 源码定位；可达性/实机待验证 |
| 49 | 通知/可选动作（模态） | mergeBranchPrFromUi："科研仓 PR 已合并" | 项目 | [src/extension/legacy.ts:2539](../src/extension/legacy.ts#L2539) | 源码定位；可达性/实机待验证 |
| 50 | 警告/确认（模态） | confirmAndFastForwardAncestor："缺少已确认的合并提交 SHA，暂缓祖先更新（可稍后重查 PR 后恢复）。" | 项目 | [src/extension/legacy.ts:2550](../src/extension/legacy.ts#L2550) | 源码定位；可达性/实机待验证 |
| 51 | 警告/确认（模态） | confirmAndFastForwardAncestor：更新本机祖先主线到已合并提交？ | 项目 | [src/extension/legacy.ts:2553](../src/extension/legacy.ts#L2553) | 源码定位；可达性/实机待验证 |
| 52 | 选文件/目录 | openWorkspaceFolderForContinuation：${operation}：选择本地实验项目文件夹 | 通知 | [src/extension/legacy.ts:4558](../src/extension/legacy.ts#L4558) | 源码定位；可达性/实机待验证 |
| 53 | 警告/确认 | resumePendingWorkspaceContinuation：已打开 ${folders.length} 个工作区文件夹，${String(pending.operation ／／ "原操作")}未继续。请在独立 VS Code 窗口中只打开目标实验项目。 | 通知 | [src/extension/legacy.ts:4600](../src/extension/legacy.ts#L4600) | 源码定位；可达性/实机待验证 |
| 54 | 警告/确认 | resumePendingWorkspaceContinuation：${String(pending.operation ／／ "原操作")}自动续接失败：${message} | 通知 | [src/extension/legacy.ts:4631](../src/extension/legacy.ts#L4631) | 源码定位；可达性/实机待验证 |
| 55 | 通知/可选动作 | handleConfigurationChanged："面板隐藏时的上下文保留策略将在 Reload Window 后生效。默认释放隐藏面板的 Webview 上下文以控制长期内存占用。" | 设置 | [src/extension/legacy.ts:4841](../src/extension/legacy.ts#L4841) | 源码定位；可达性/实机待验证 |
| 56 | 通知/可选动作 | handleConfigurationChanged："SimpleExperiment 已切换为 Xshell 实时隧道模式，连接状态已立即刷新。" | 设置 | [src/extension/legacy.ts:4869](../src/extension/legacy.ts#L4869) | 源码定位；可达性/实机待验证 |
| 57 | 通知/可选动作 | resetPptPathConfirmationsFromUi："当前项目没有已关闭提醒的 PPT 目标路径。" | 产物 | [src/extension/legacy.ts:5158](../src/extension/legacy.ts#L5158) | 源码定位；可达性/实机待验证 |
| 58 | 警告/确认（模态） | resetPptPathConfirmationsFromUi：将清除当前项目已记住的 ${count} 个 PPT 目标路径。后续绘图会重新显示完整确认；PPT 文件、结果文件和绘图配置不会改变。 | 产物 | [src/extension/legacy.ts:5161](../src/extension/legacy.ts#L5161) | 源码定位；可达性/实机待验证 |
| 59 | 通知/可选动作 | resetPptPathConfirmationsFromUi：已恢复当前项目 ${count} 个 PPT 目标路径的确认提醒。 | 产物 | [src/extension/legacy.ts:5169](../src/extension/legacy.ts#L5169) | 源码定位；可达性/实机待验证 |
| 60 | 通知/可选动作 | resetRemotePathConfirmationsFromUi："当前项目没有已关闭提醒的远端路径。" | 通知 | [src/extension/legacy.ts:5179](../src/extension/legacy.ts#L5179) | 源码定位；可达性/实机待验证 |
| 61 | 警告/确认（模态） | resetRemotePathConfirmationsFromUi：将清除当前项目已记住的 ${count} 个远端路径。后续代码、Agent runtime 或忽略规则写入会重新显示完整路径确认；服务器配置、SimpleSFTP 配置和远端文件不会改变。 | 通知 | [src/extension/legacy.ts:5182](../src/extension/legacy.ts#L5182) | 源码定位；可达性/实机待验证 |
| 62 | 通知/可选动作 | resetRemotePathConfirmationsFromUi：已恢复当前项目 ${count} 个远端路径的上传确认提醒。 | 通知 | [src/extension/legacy.ts:5191](../src/extension/legacy.ts#L5191) | 源码定位；可达性/实机待验证 |
| 63 | 错误反馈 | resolveWebviewView：errorMessage(error) | 通知 | [src/extension/legacy.ts:5370](../src/extension/legacy.ts#L5370) | 源码定位；可达性/实机待验证 |
| 64 | 错误反馈 | resolveWebviewView：String(e?.message ／／ e) | 通知 | [src/extension/legacy.ts:5382](../src/extension/legacy.ts#L5382) | 源码定位；可达性/实机待验证 |
| 65 | 错误反馈 | resolveWebviewView：errorMessage(error) | 通知 | [src/extension/legacy.ts:5392](../src/extension/legacy.ts#L5392) | 源码定位；可达性/实机待验证 |
| 66 | 错误反馈（模态） | withHostOperationLease：error.message | 运行 | [src/extension/legacy.ts:5633](../src/extension/legacy.ts#L5633) | 源码定位；可达性/实机待验证 |
| 67 | 警告/确认 | migrateLegacyConfigOnce：legacy.warning | 设置 | [src/extension/legacy.ts:5691](../src/extension/legacy.ts#L5691) | 源码定位；可达性/实机待验证 |
| 68 | 警告/确认（模态） | showFirstRunSetupPromptOnceCore：SimpleExperiment 已就绪，当前项目为 ${path.basename(root)}，但尚未完成工作区识别。识别后，首次上传前会再次确认本地与远端预期位置。 | 设置 | [src/extension/legacy.ts:5708](../src/extension/legacy.ts#L5708) | 源码定位；可达性/实机待验证 |
| 69 | 警告/确认 | showFirstRunSetupPromptOnceCore："检测到旧版 SFTP 插件仍已安装。新版 SimpleSFTP 已可用；若看到旧版状态栏按钮，请先卸载旧版，再执行 Developer: Reload Window。" | 设置 | [src/extension/legacy.ts:5718](../src/extension/legacy.ts#L5718) | 源码定位；可达性/实机待验证 |
| 70 | 通知/可选动作 | showFirstRunSetupPromptOnceCore：message | 设置 | [src/extension/legacy.ts:5735](../src/extension/legacy.ts#L5735) | 源码定位；可达性/实机待验证 |
| 71 | 通知/可选动作 | showFirstRunSetupPromptOnceCore：message | 设置 | [src/extension/legacy.ts:5737](../src/extension/legacy.ts#L5737) | 源码定位；可达性/实机待验证 |
| 72 | 通知/可选动作 | showFirstRunSetupPromptOnceCore：message | 设置 | [src/extension/legacy.ts:5738](../src/extension/legacy.ts#L5738) | 源码定位；可达性/实机待验证 |
| 73 | 警告/确认 | ensureSimpleSftpReadyForSetup：SimpleSFTP 已安装但当前窗口尚未注册编排命令：${missing.join("、")}。请先重载 VS Code 窗口。 | 设置 | [src/extension/legacy.ts:5775](../src/extension/legacy.ts#L5775) | 源码定位；可达性/实机待验证 |
| 74 | 警告/确认 | ensureSimpleSftpReadyForSetup："无法确认当前窗口是否已注册 SimpleSFTP 编排命令，请先重载 VS Code 窗口。" | 设置 | [src/extension/legacy.ts:5785](../src/extension/legacy.ts#L5785) | 源码定位；可达性/实机待验证 |
| 75 | 警告/确认 | ensureSimpleSftpReadyForSetup：${operation}暂不能开始：${simpleSftp.message} | 设置 | [src/extension/legacy.ts:5791](../src/extension/legacy.ts#L5791) | 源码定位；可达性/实机待验证 |
| 76 | 警告/确认 | quickSetup：请在“设置 &gt; 服务器”手动补全后再继续：缺少 ${missingServerSetup.join("、")}。插件不会在这里从零初始化服务器配置。 | 设置 | [src/extension/legacy.ts:5804](../src/extension/legacy.ts#L5804) | 源码定位；可达性/实机待验证 |
| 77 | 通知/可选动作 | quickSetup："Xshell 会话和服务器项目父目录已保存。下一步选择要运行实验的本地项目；插件会自动追加项目名、生成 SimpleSFTP 目标并继续配置。" | 设置 | [src/extension/legacy.ts:5812](../src/extension/legacy.ts#L5812) | 源码定位；可达性/实机待验证 |
| 78 | 警告/确认 | completeQuickSetupAfterWorkspace：一键配置续接已停止：服务器配置缺少 ${missingServerSetup.join("、")}。尚未生成当前项目 SimpleSFTP 目标或准备 Agent。 | 设置 | [src/extension/legacy.ts:5827](../src/extension/legacy.ts#L5827) | 源码定位；可达性/实机待验证 |
| 79 | 警告/确认 | completeQuickSetupAfterWorkspace："当前尚无启用的 Worker。请在“设置 &gt; 服务器”添加并启用执行服务器。" | 设置 | [src/extension/legacy.ts:5834](../src/extension/legacy.ts#L5834) | 源码定位；可达性/实机待验证 |
| 80 | 通知/可选动作 | completeQuickSetupAfterWorkspace：连接配置已保存，当前项目有 ${hubProfileResult.targetCount} 个 SimpleSFTP 目标；添加并启用 Worker 后才能准备 Agent 和提交实验。 | 设置 | [src/extension/legacy.ts:5838](../src/extension/legacy.ts#L5838) | 源码定位；可达性/实机待验证 |
| 81 | 警告/确认 | completeQuickSetupAfterWorkspace：服务器配置尚未形成完整的 SimpleSFTP 目标：需要 ${expectedTargets} 个，当前 ${profileResult.targetCount} 个。请检查 Worker 的主机、… | 设置 | [src/extension/legacy.ts:5846](../src/extension/legacy.ts#L5846) | 源码定位；可达性/实机待验证 |
| 82 | 警告/确认 | completeQuickSetupAfterWorkspace：服务器配置已保存，但 Agent 准备尚未开始：${preparationBlockers.join("；")} | 设置 | [src/extension/legacy.ts:5854](../src/extension/legacy.ts#L5854) | 源码定位；可达性/实机待验证 |
| 83 | 通知/可选动作 | completeQuickSetupAfterWorkspace：Xshell 会话和服务器项目父目录已保存。执行环境：${environmentSummary}。${profileSummary} 首次使用建议一次完成 Agent 部署、自启动命令、会话启动和连接… | 设置 | [src/extension/legacy.ts:5862](../src/extension/legacy.ts#L5862) | 源码定位；可达性/实机待验证 |
| 84 | 警告/确认 | writeXshellAgentStartupCommands："没有可写入的 Xshell Agent 会话。请先配置或复用 Worker 会话。" | 服务器 | [src/extension/legacy.ts:5884](../src/extension/legacy.ts#L5884) | 源码定位；可达性/实机待验证 |
| 85 | 警告/确认（模态） | writeXshellAgentStartupCommands：agentStartupWriteConfirmationDetail(targets, runtimeTargets, false) | 服务器 | [src/extension/legacy.ts:5890](../src/extension/legacy.ts#L5890) | 源码定位；可达性/实机待验证 |
| 86 | 通知/可选动作 | writeXshellAgentStartupCommands：Xshell Agent 自启动命令写入完成：${results.map((item) =&gt; item.summary).join("；")} | 服务器 | [src/extension/legacy.ts:5911](../src/extension/legacy.ts#L5911) | 源码定位；可达性/实机待验证 |
| 87 | 警告/确认 | openAllXshellSessions："没有可启动的 Xshell 会话。请先配置 Worker 隧道会话。" | 服务器 | [src/extension/legacy.ts:5937](../src/extension/legacy.ts#L5937) | 源码定位；可达性/实机待验证 |
| 88 | 警告/确认（模态） | openAllXshellSessions：将打开 ${uniqueCount} 个唯一 Xshell 会话供手动操作；同一个 .xsh 只打开一次，并保留会话原有的登录命令与设置。后台隧道和 Agent 部署由各自入口管理。\n\n${lau… | 服务器 | [src/extension/legacy.ts:5942](../src/extension/legacy.ts#L5942) | 源码定位；可达性/实机待验证 |
| 89 | 通知/可选动作 | openAllXshellSessions：Xshell 打开请求：${results.join("；")}。连接状态请在 Xshell 中查看。 | 服务器 | [src/extension/legacy.ts:5947](../src/extension/legacy.ts#L5947) | 源码定位；可达性/实机待验证 |
| 90 | 警告/确认（模态） | prepareAgentsForFirstRun：agentStartupWriteConfirmationDetail(targets, runtimeTargets, true) | 设置 | [src/extension/legacy.ts:5979](../src/extension/legacy.ts#L5979) | 源码定位；可达性/实机待验证 |
| 91 | 通知/可选动作 | prepareAgentsForFirstRun：Agent 首次准备完成：${topologySummary} 已部署、启动并通过检测。下一步可直接识别工作区。 | 设置 | [src/extension/legacy.ts:6012](../src/extension/legacy.ts#L6012) | 源码定位；可达性/实机待验证 |
| 92 | 候选选择 | configureWorkerTunnels："配置 Worker 隧道" | 设置 | [src/extension/legacy.ts:6030](../src/extension/legacy.ts#L6030) | 源码定位；可达性/实机待验证 |
| 93 | 候选选择 | configureWorkerTunnels：Worker: ${current.displayName ／／ current.id} | 设置 | [src/extension/legacy.ts:6049](../src/extension/legacy.ts#L6049) | 源码定位；可达性/实机待验证 |
| 94 | 警告/确认（模态） | configureWorkerTunnels：删除 Worker ${current.displayName ／／ current.id}？ | 设置 | [src/extension/legacy.ts:6065](../src/extension/legacy.ts#L6065) | 源码定位；可达性/实机待验证 |
| 95 | 通知/可选动作 | configureWorkerTunnels：Worker 隧道配置已保存：${workers.filter((worker) =&gt; worker.enabled !== false).length} 个启用。 | 设置 | [src/extension/legacy.ts:6075](../src/extension/legacy.ts#L6075) | 源码定位；可达性/实机待验证 |
| 96 | 通知/可选动作 | repairTunnelPorts："未检测到隧道端口冲突。" | 服务器 | [src/extension/legacy.ts:6098](../src/extension/legacy.ts#L6098) | 源码定位；可达性/实机待验证 |
| 97 | 警告/确认（模态） | repairTunnelPorts：检测到 ${conflicts.length} 个隧道端口冲突：\n\n${conflictSummary}\n\n插件不会自动改写 Xshell 会话。调整端口范围后，请在 Xshell 中核对并保… | 服务器 | [src/extension/legacy.ts:6108](../src/extension/legacy.ts#L6108) | 源码定位；可达性/实机待验证 |
| 98 | 警告/确认 | startWorkerTunnel："没有已启用的 Worker 实时观测隧道。" | 服务器 | [src/extension/legacy.ts:6118](../src/extension/legacy.ts#L6118) | 源码定位；可达性/实机待验证 |
| 99 | 候选选择 | startWorkerTunnel："启动 Worker 实时观测隧道" | 服务器 | [src/extension/legacy.ts:6121](../src/extension/legacy.ts#L6121) | 源码定位；可达性/实机待验证 |
| 100 | 警告/确认（模态） | startBackgroundTunnels：将后台启动 ${endpoints.length} 个 Worker SSH 隧道，使用与 SimpleSFTP 相同的系统密钥或 ssh-agent 认证。\n\n${endpoints.map(i… | 服务器 | [src/extension/legacy.ts:6169](../src/extension/legacy.ts#L6169) | 源码定位；可达性/实机待验证 |
| 101 | 警告/确认 | startBackgroundTunnels：summary | 服务器 | [src/extension/legacy.ts:6188](../src/extension/legacy.ts#L6188) | 源码定位；可达性/实机待验证 |
| 102 | 通知/可选动作 | startBackgroundTunnels：summary | 服务器 | [src/extension/legacy.ts:6189](../src/extension/legacy.ts#L6189) | 源码定位；可达性/实机待验证 |
| 103 | 通知/可选动作 | manualSnapshot："离线模式不会访问网络。请导入离线 bundle。" | 通知 | [src/extension/legacy.ts:6453](../src/extension/legacy.ts#L6453) | 源码定位；可达性/实机待验证 |
| 104 | 警告/确认 | manualSnapshot：text | 通知 | [src/extension/legacy.ts:6482](../src/extension/legacy.ts#L6482) | 源码定位；可达性/实机待验证 |
| 105 | 通知/可选动作 | manualSnapshot：text | 通知 | [src/extension/legacy.ts:6483](../src/extension/legacy.ts#L6483) | 源码定位；可达性/实机待验证 |
| 106 | 通知/可选动作 | manualSnapshot：已刷新调度状态（${count} 条）。 | 通知 | [src/extension/legacy.ts:6514](../src/extension/legacy.ts#L6514) | 源码定位；可达性/实机待验证 |
| 107 | 错误反馈 | generateTunnelScript：${errors.join(" ")} 请先配置隧道。 | 服务器 | [src/extension/legacy.ts:6681](../src/extension/legacy.ts#L6681) | 源码定位；可达性/实机待验证 |
| 108 | 选保存位置 | generateTunnelScript："保存 Xshell 会话启动脚本" | 服务器 | [src/extension/legacy.ts:6684](../src/extension/legacy.ts#L6684) | 源码定位；可达性/实机待验证 |
| 109 | 选文件/目录 | importOffline："选择离线 bundle JSON 或目录" | 诊断 | [src/extension/legacy.ts:6704](../src/extension/legacy.ts#L6704) | 源码定位；可达性/实机待验证 |
| 110 | 错误反馈 | importOffline：result.error ／／ "离线 bundle 导入失败。" | 诊断 | [src/extension/legacy.ts:6720](../src/extension/legacy.ts#L6720) | 源码定位；可达性/实机待验证 |
| 111 | 警告/确认（模态） | handleMessageCore：detail | 通知 | [src/extension/legacy.ts:6933](../src/extension/legacy.ts#L6933) | 源码定位；可达性/实机待验证 |
| 112 | 输入 | handleMessageCore："标记 job 不可用" | 通知 | [src/extension/legacy.ts:6937](../src/extension/legacy.ts#L6937) | 源码定位；可达性/实机待验证 |
| 113 | 警告/确认（模态） | handleMessageCore：detail | 通知 | [src/extension/legacy.ts:6941](../src/extension/legacy.ts#L6941) | 源码定位；可达性/实机待验证 |
| 114 | 通知/可选动作 | withUiCommandStatus：result.message ／／ "已取消" | 通知 | [src/extension/legacy.ts:7447](../src/extension/legacy.ts#L7447) | 源码定位；可达性/实机待验证 |
| 115 | 警告/确认 | withUiCommandStatus：result.message | 通知 | [src/extension/legacy.ts:7464](../src/extension/legacy.ts#L7464) | 源码定位；可达性/实机待验证 |
| 116 | 错误反馈 | withUiCommandStatus：${hostOperationLeaseActionLabel(command) ／／ command}未完成：${compactSensitiveText(result.message ／／ "操作… | 通知 | [src/extension/legacy.ts:7469](../src/extension/legacy.ts#L7469) | 源码定位；可达性/实机待验证 |
| 117 | 警告/确认 | withUiCommandStatus：result.message | 通知 | [src/extension/legacy.ts:7474](../src/extension/legacy.ts#L7474) | 源码定位；可达性/实机待验证 |
| 118 | 通知/可选动作 | notifyLocalActionStarted：${title} 已开始：${detail} | 通知 | [src/extension/legacy.ts:7525](../src/extension/legacy.ts#L7525) | 源码定位；可达性/实机待验证 |
| 119 | 警告/确认（模态） | runActionCommandCore："停止当前 Plan 并重新运行？" | 运行 | [src/extension/legacy.ts:7857](../src/extension/legacy.ts#L7857) | 源码定位；可达性/实机待验证 |
| 120 | 警告/确认（模态） | confirmPlanExistingOutputsFromValidation：detail | 运行 | [src/extension/legacy.ts:8601](../src/extension/legacy.ts#L8601) | 源码定位；可达性/实机待验证 |
| 121 | 警告/确认（模态） | confirmPlanExistingOutputsFromValidation：detail | 运行 | [src/extension/legacy.ts:8602](../src/extension/legacy.ts#L8602) | 源码定位；可达性/实机待验证 |
| 122 | 警告/确认（模态） | showNativeRunConfirmation：String(payload.title ／／ "确认运行范围") | 运行 | [src/extension/legacy.ts:8634](../src/extension/legacy.ts#L8634) | 源码定位；可达性/实机待验证 |
| 123 | 警告/确认（模态） | confirmPlanRunSubmission：planRunConfirmationDetail(command, { ...(plan ／／ {}), debugMode, schedulerOwnerWorkerId: this.planSc… | 运行 | [src/extension/legacy.ts:8675](../src/extension/legacy.ts#L8675) | 源码定位；可达性/实机待验证 |
| 124 | 警告/确认（模态） | confirmPlanBatchRunSubmission：planBatchRunConfirmationDetail(confirmationPlans, remoteTargets) | 运行 | [src/extension/legacy.ts:8772](../src/extension/legacy.ts#L8772) | 源码定位；可达性/实机待验证 |
| 125 | 通知/可选动作 | openSetupGuide：next.message | 设置 | [src/extension/legacy.ts:8900](../src/extension/legacy.ts#L8900) | 源码定位；可达性/实机待验证 |
| 126 | 候选选择 | ensureManualStopReason：[ { label: "代码有误或效果不好，停止后不再自动重跑", value: "manual_stop_bad_code_or_no_effect" }, { label: "模型已收敛，停止后作… | 运行 | [src/extension/legacy.ts:9002](../src/extension/legacy.ts#L9002) | 源码定位；可达性/实机待验证 |
| 127 | 警告/确认（模态） | postMultiWorkerTunnelAction：workerRemoteActionConfirmationDetail(options.title, action, body, ids) | 服务器 | [src/extension/legacy.ts:9047](../src/extension/legacy.ts#L9047) | 源码定位；可达性/实机待验证 |
| 128 | 通知/可选动作 | installPluginUpdatesOwned：plan.message ／／ "当前插件已是最新版本。" | 更新 | [src/extension/legacy.ts:9275](../src/extension/legacy.ts#L9275) | 源码定位；可达性/实机待验证 |
| 129 | 警告/确认（模态） | installPluginUpdatesOwned：安装并重载窗口以应用配套插件更新？\n\n${detail} | 更新 | [src/extension/legacy.ts:9287](../src/extension/legacy.ts#L9287) | 源码定位；可达性/实机待验证 |
| 130 | 通知/可选动作 | installPluginUpdatesOwned：plan.message ／／ "两个插件均已是最新版本。" | 更新 | [src/extension/legacy.ts:9312](../src/extension/legacy.ts#L9312) | 源码定位；可达性/实机待验证 |
| 131 | 通知/可选动作 | installPluginUpdatesOwned：current.message | 更新 | [src/extension/legacy.ts:9329](../src/extension/legacy.ts#L9329) | 源码定位；可达性/实机待验证 |
| 132 | 错误反馈（模态） | publishPreparedGitBranch：未检测到 gh CLI（GitHub 官方命令行）。首次发布需要它创建仓库。请先安装 gh 并执行 \gh auth login\，然后重试。 | 项目 | [src/extension/legacy.ts:9422](../src/extension/legacy.ts#L9422) | 源码定位；可达性/实机待验证 |
| 133 | 通知/可选动作 | syncToGitHub：GitHub 同步完成：${prepared.message} | 项目 | [src/extension/legacy.ts:9439](../src/extension/legacy.ts#L9439) | 源码定位；可达性/实机待验证 |
| 134 | 通知/可选动作 | publishToGitHub：GitHub 已发布；${workerResult.upload.message} | 项目 | [src/extension/legacy.ts:9480](../src/extension/legacy.ts#L9480) | 源码定位；可达性/实机待验证 |
| 135 | 错误反馈 | publishToGitHub：GitHub 已发布，但 Worker 上传失败：${errorMessage(workerResult.error)}。可单独使用「上传到 Worker」入口重试。 | 项目 | [src/extension/legacy.ts:9482](../src/extension/legacy.ts#L9482) | 源码定位；可达性/实机待验证 |
| 136 | 错误反馈 | publishToGitHub：GitHub 发布失败：${errorMessage(gitResult.error)}；Worker 上传已完成（${workerResult.upload.message}），成功目标未回滚。请单… | 项目 | [src/extension/legacy.ts:9485](../src/extension/legacy.ts#L9485) | 源码定位；可达性/实机待验证 |
| 137 | 错误反馈 | publishToGitHub：GitHub 与 Worker 均失败：GitHub ${errorMessage(gitResult.error)}；Worker ${errorMessage(workerResult.error… | 项目 | [src/extension/legacy.ts:9488](../src/extension/legacy.ts#L9488) | 源码定位；可达性/实机待验证 |
| 138 | 通知/可选动作 | overwriteFromGitHub："已从 GitHub 覆盖本地工作区。" | 项目 | [src/extension/legacy.ts:9500](../src/extension/legacy.ts#L9500) | 源码定位；可达性/实机待验证 |
| 139 | 通知/可选动作 | uploadProjectToWorkers：result.message | 传输 | [src/extension/legacy.ts:9513](../src/extension/legacy.ts#L9513) | 源码定位；可达性/实机待验证 |
| 140 | 通知/可选动作 | distributeCodeToWorkers：result.message | 传输 | [src/extension/legacy.ts:9521](../src/extension/legacy.ts#L9521) | 源码定位；可达性/实机待验证 |
| 141 | 警告/确认（模态） | deployLatestAgentRuntime：核对旧 Agent 归属迁移\n${detail}\n\n仅绑定此状态的当前容器归属，关闭指定 Agent 窗口；保留所有任务、日志和结果，不关闭其他窗口或平台进程。 | 服务器 | [src/extension/legacy.ts:9600](../src/extension/legacy.ts#L9600) | 源码定位；可达性/实机待验证 |
| 142 | 警告/确认 | deployLatestAgentRuntime：Agent runtime 已部署，但部分目标未校验：${verifyIssues.warnings.join("；")} | 服务器 | [src/extension/legacy.ts:9697](../src/extension/legacy.ts#L9697) | 源码定位；可达性/实机待验证 |
| 143 | 通知/可选动作 | deployLatestAgentRuntime：Agent 独立服务 ${_verifyOk ? "运行版本已验证" : "隧道尚待验证"}：${targets.map((target) =&gt; target.id).join("、")}。${sha… | 服务器 | [src/extension/legacy.ts:9722](../src/extension/legacy.ts#L9722) | 源码定位；可达性/实机待验证 |
| 144 | 通知/可选动作 | checkRemoteAgentVersionAndNotify：未配置远端目标或隧道未建立：${msg}；请先配置服务器并启动 tunnel。 | 服务器 | [src/extension/legacy.ts:10000](../src/extension/legacy.ts#L10000) | 源码定位；可达性/实机待验证 |
| 145 | 通知/可选动作 | checkRemoteAgentVersionAndNotify："未配置远端目标或隧道未建立（targets 为空），请先配置服务器并启动 tunnel 后再校验 Agent 版本。" | 服务器 | [src/extension/legacy.ts:10004](../src/extension/legacy.ts#L10004) | 源码定位；可达性/实机待验证 |
| 146 | 警告/确认 | checkRemoteAgentVersionAndNotify：detail | 服务器 | [src/extension/legacy.ts:10012](../src/extension/legacy.ts#L10012) | 源码定位；可达性/实机待验证 |
| 147 | 错误反馈 | checkRemoteAgentVersionAndNotify：String(err && (err as any).message ／／ err) | 服务器 | [src/extension/legacy.ts:10014](../src/extension/legacy.ts#L10014) | 源码定位；可达性/实机待验证 |
| 148 | 警告/确认 | checkRemoteAgentVersionAndNotify：Agent 版本校验警告：${result.warnings.join("；")} | 服务器 | [src/extension/legacy.ts:10019](../src/extension/legacy.ts#L10019) | 源码定位；可达性/实机待验证 |
| 149 | 通知/可选动作 | checkRemoteAgentVersionAndNotify：Agent 版本一致：本地 plugin=${pluginVersion} runtime=${runtimeVersion} | 服务器 | [src/extension/legacy.ts:10022](../src/extension/legacy.ts#L10022) | 源码定位；可达性/实机待验证 |
| 150 | 通知/可选动作 | checkRemoteAgentVersionAndNotify：未配置远端目标或隧道未建立：${msg}；请先配置服务器并启动 tunnel。 | 服务器 | [src/extension/legacy.ts:10028](../src/extension/legacy.ts#L10028) | 源码定位；可达性/实机待验证 |
| 151 | 通知/可选动作 | verifyAgentVersionManually：msg | 服务器 | [src/extension/legacy.ts:10217](../src/extension/legacy.ts#L10217) | 源码定位；可达性/实机待验证 |
| 152 | 通知/可选动作 | verifyAgentVersionManually：校验完成（有警告）：${result.warnings.join("；")}。${localInfo} vs ${remoteInfo} | 服务器 | [src/extension/legacy.ts:10220](../src/extension/legacy.ts#L10220) | 源码定位；可达性/实机待验证 |
| 153 | 通知/可选动作 | verifyAgentVersionManually：Agent 版本一致：${localInfo} vs ${remoteInfo} | 服务器 | [src/extension/legacy.ts:10222](../src/extension/legacy.ts#L10222) | 源码定位；可达性/实机待验证 |
| 154 | 候选选择 | configureDownloadScope："选择要设置下载范围的服务器" | 传输 | [src/extension/legacy.ts:10256](../src/extension/legacy.ts#L10256) | 源码定位；可达性/实机待验证 |
| 155 | 通知/可选动作 | configureCodeSyncIncludes：本机与服务器同步范围已保存：${normalized.length} 条路径。 | 传输 | [src/extension/legacy.ts:10340](../src/extension/legacy.ts#L10340) | 源码定位；可达性/实机待验证 |
| 156 | 通知/可选动作 | configureCodeSyncIncludes：服务器之间同步范围已保存：${normalized.includes(".") ? "整个项目" : ${normalized.length} 条路径}。 | 传输 | [src/extension/legacy.ts:10371](../src/extension/legacy.ts#L10371) | 源码定位；可达性/实机待验证 |
| 157 | 候选选择 | runSyncScopeTreeBatch：为 ${work.length} 条路径选择统一来源 | 传输 | [src/extension/legacy.ts:11230](../src/extension/legacy.ts#L11230) | 源码定位；可达性/实机待验证 |
| 158 | 候选选择 | runSyncScopeTreeBatch："选择批量同步目标" | 传输 | [src/extension/legacy.ts:11237](../src/extension/legacy.ts#L11237) | 源码定位；可达性/实机待验证 |
| 159 | 候选选择 | runSyncScopeTreeBatch："选择批量删除位置" | 传输 | [src/extension/legacy.ts:11246](../src/extension/legacy.ts#L11246) | 源码定位；可达性/实机待验证 |
| 160 | 警告/确认 | removeSyncScopePath："删除未完成，自动补回仍暂停。具体原因已显示在同步范围页面。" | 传输 | [src/extension/legacy.ts:11609](../src/extension/legacy.ts#L11609) | 源码定位；可达性/实机待验证 |
| 161 | 警告/确认（模态） | reconcileChosenDirectories：第一次确认\n${preview} | 传输 | [src/extension/legacy.ts:11803](../src/extension/legacy.ts#L11803) | 源码定位；可达性/实机待验证 |
| 162 | 警告/确认（模态） | reconcileChosenDirectories：第二次确认\n${preview} | 传输 | [src/extension/legacy.ts:11804](../src/extension/legacy.ts#L11804) | 源码定位；可达性/实机待验证 |
| 163 | 警告/确认（模态） | askCodeUploadStaleOverwriteLocal："存在未完成传输，是否完全覆盖后继续？" | 传输 | [src/extension/legacy.ts:12764](../src/extension/legacy.ts#L12764) | 源码定位；可达性/实机待验证 |
| 164 | 警告/确认（模态） | confirmRemoteWriteTargets：remoteWriteConfirmationDetail(operation, normalized, localProjectRoot) | 通知 | [src/extension/legacy.ts:13667](../src/extension/legacy.ts#L13667) | 源码定位；可达性/实机待验证 |
| 165 | 通知/可选动作 | showServerConfigSavedNextStep：${message} 下一步选择本地项目后继续生成当前项目目标。 | 设置 | [src/extension/legacy.ts:13891](../src/extension/legacy.ts#L13891) | 源码定位；可达性/实机待验证 |
| 166 | 通知/可选动作 | showServerConfigSavedNextStep：message | 设置 | [src/extension/legacy.ts:13900](../src/extension/legacy.ts#L13900) | 源码定位；可达性/实机待验证 |
| 167 | 通知/可选动作 | showServerConfigSavedNextStep：${message} 仍有服务器配置待修复，请按当前页面提示补齐。 | 设置 | [src/extension/legacy.ts:13918](../src/extension/legacy.ts#L13918) | 源码定位；可达性/实机待验证 |
| 168 | 通知/可选动作 | showServerConfigSavedNextStep：message | 设置 | [src/extension/legacy.ts:13921](../src/extension/legacy.ts#L13921) | 源码定位；可达性/实机待验证 |
| 169 | 候选选择 | selectPlanSubmissionWorker：${label}：选择运行 Worker | 服务器 | [src/extension/legacy.ts:13997](../src/extension/legacy.ts#L13997) | 源码定位；可达性/实机待验证 |
| 170 | 警告/确认（模态） | releaseJobStageBlockSlotsFromUi："确认释放旧文件占用（一次确认，仅作用上面这一个冻结候选）\n" + detail | 运行 | [src/extension/legacy.ts:14968](../src/extension/legacy.ts#L14968) | 源码定位；可达性/实机待验证 |
| 171 | 通知/可选动作 | enqueueDistributedPlan："此 Plan 的任务均已有完成产物，本次选择跳过；未提交新任务。" | 传输 | [src/extension/legacy.ts:15439](../src/extension/legacy.ts#L15439) | 源码定位；可达性/实机待验证 |
| 172 | 通知/可选动作 | retainLatestDistributedPlanOutputs："当前同步或清理尚未结束，请稍后重新审核 Plan 历史产物。" | 审核 | [src/extension/legacy.ts:16852](../src/extension/legacy.ts#L16852) | 源码定位；可达性/实机待验证 |
| 173 | 通知/可选动作 | retainLatestDistributedPlanOutputs："当前没有可安全替换的旧 attempt；请先同步最新完整结果，或等待运行中的任务完成后再审核。" | 审核 | [src/extension/legacy.ts:16873](../src/extension/legacy.ts#L16873) | 源码定位；可达性/实机待验证 |
| 174 | 通知/可选动作 | retainLatestDistributedPlanOutputs：已清理 ${result.retired} 个已审核旧 attempt，回收 ${result.bytes} 字节；其余代码版本及在建产物保留。 | 审核 | [src/extension/legacy.ts:16953](../src/extension/legacy.ts#L16953) | 源码定位；可达性/实机待验证 |
| 175 | 警告/确认 | retainLatestDistributedPlanOutputs：历史产物审核未完成：${this.lastPlanOutputRetention.message} | 审核 | [src/extension/legacy.ts:16957](../src/extension/legacy.ts#L16957) | 源码定位；可达性/实机待验证 |
| 176 | 警告/确认（模态） | retryDistributedJobFromUi：正式 job 仍有遗留文件，尚未重新排队：${plan.planFile} / ${job.case} / seed ${job.seed}\nWorker ${job.workerId}：${job… | 传输 | [src/extension/legacy.ts:17037](../src/extension/legacy.ts#L17037) | 源码定位；可达性/实机待验证 |
| 177 | 警告/确认（模态） | retryDistributedJobFromUi：重新排队正式 job：${plan.planFile} / ${job.case} / seed ${job.seed}\n目录 ${job.outputDir}\n已确认原任务停止、输出为空。 | 传输 | [src/extension/legacy.ts:17048](../src/extension/legacy.ts#L17048) | 源码定位；可达性/实机待验证 |
| 178 | 警告/确认（模态） | retryPulledJob：永久删除该 job 的旧产物（第 1/2 次确认）\n${detail}\n仅影响这一个 job 的声明产物；PLAN、其他 job 与这张卡片本身保留。取消不删除任何文件，也不排队。 | 运行 | [src/extension/legacy.ts:17309](../src/extension/legacy.ts#L17309) | 源码定位；可达性/实机待验证 |
| 179 | 警告/确认（模态） | retryPulledJob：不可恢复：永久删除以上全部路径（第 2/2 次确认）\n${detail} | 运行 | [src/extension/legacy.ts:17312](../src/extension/legacy.ts#L17312) | 源码定位；可达性/实机待验证 |
| 180 | 警告/确认（模态） | retryChangedSourceJobs：重跑使用当前源码和配置\n${plan.planFile} / ${job.case} / seed ${job.seed}\n${sourceChange}\n\n请选择范围。仅重跑当前 job 会… | 运行 | [src/extension/legacy.ts:17417](../src/extension/legacy.ts#L17417) | 源码定位；可达性/实机待验证 |
| 181 | 警告/确认（模态） | recallPlanToLocalQueueFromUi：召回 ${plan.planFile} 的 ${selected.length} 个 job 到本机待派队列；对应运行窗口会被关闭，权重和结果保留。 | 运行 | [src/extension/legacy.ts:17537](../src/extension/legacy.ts#L17537) | 源码定位；可达性/实机待验证 |
| 182 | 通知/可选动作 | recallPlanToLocalQueueFromUi："该 Plan 已切换到本机空闲 GPU 队列；没有仍在服务器排队的 job 需要释放。" | 运行 | [src/extension/legacy.ts:17595](../src/extension/legacy.ts#L17595) | 源码定位；可达性/实机待验证 |
| 183 | 候选选择 | ensureWorkerPoolPlanTarget：${label}：选择调度 Worker | 服务器 | [src/extension/legacy.ts:17772](../src/extension/legacy.ts#L17772) | 源码定位；可达性/实机待验证 |
| 184 | 警告/确认（模态） | postNoHubResultAction：workerRemoteActionConfirmationDetail(command, action, body, workerIds) | 产物 | [src/extension/legacy.ts:17960](../src/extension/legacy.ts#L17960) | 源码定位；可达性/实机待验证 |
| 185 | 警告/确认（模态） | saveTopologyModeFromUi：[ 将当前项目拓扑从“${current.modeLabel}”改为“${next.modeLabel}”。, 调度所有者：${next.schedulerOwner}, 状态与结果位置：${next… | 诊断 | [src/extension/legacy.ts:18010](../src/extension/legacy.ts#L18010) | 源码定位；可达性/实机待验证 |
| 186 | 通知/可选动作 | saveTopologyModeFromUi：当前项目已保存为${next.modeLabel}。 | 诊断 | [src/extension/legacy.ts:18023](../src/extension/legacy.ts#L18023) | 源码定位；可达性/实机待验证 |
| 187 | 候选选择 | reassignWorkerTaskFromUi："选择接管 Worker" | 服务器 | [src/extension/legacy.ts:18047](../src/extension/legacy.ts#L18047) | 源码定位；可达性/实机待验证 |
| 188 | 警告/确认（模态） | reassignWorkerTaskFromUi：detail | 服务器 | [src/extension/legacy.ts:18066](../src/extension/legacy.ts#L18066) | 源码定位；可达性/实机待验证 |
| 189 | 通知/可选动作 | saveSchedulerConfigFromUi："调度与上报策略已保存。" | 设置 | [src/extension/legacy.ts:18121](../src/extension/legacy.ts#L18121) | 源码定位；可达性/实机待验证 |
| 190 | 警告/确认 | saveWorkerConfigCore：未找到 Worker：${endpointId} | 设置 | [src/extension/legacy.ts:18136](../src/extension/legacy.ts#L18136) | 源码定位；可达性/实机待验证 |
| 191 | 错误反馈 | saveWorkerConfigCore：服务器配置已保存，但后续引导失败：${errorMessage(error)} | 设置 | [src/extension/legacy.ts:18205](../src/extension/legacy.ts#L18205) | 源码定位；可达性/实机待验证 |
| 192 | 通知/可选动作 | addWorkerConfigFromUi：${worker.displayName ／／ worker.id} 已导入并保存到当前项目。 | 设置 | [src/extension/legacy.ts:18225](../src/extension/legacy.ts#L18225) | 源码定位；可达性/实机待验证 |
| 193 | 警告/确认（模态） | deleteWorkerConfigFromUi：删除 Worker ${worker.displayName ／／ worker.id}？配置会从全局状态移除。 | 审核 | [src/extension/legacy.ts:18233](../src/extension/legacy.ts#L18233) | 源码定位；可达性/实机待验证 |
| 194 | 警告/确认（模态） | postWorkerTunnelAction：workerRemoteActionConfirmationDetail(command, action, body, [workerId]) | 服务器 | [src/extension/legacy.ts:18343](../src/extension/legacy.ts#L18343) | 源码定位；可达性/实机待验证 |
| 195 | 通知/可选动作 | cleanupDraftsFromUi：已将 ${result.moved.length} 个草稿文件移入 clean_dir，并记录清单。 | 审核 | [src/extension/legacy.ts:19974](../src/extension/legacy.ts#L19974) | 源码定位；可达性/实机待验证 |
| 196 | 警告/确认（模态） | archivePlanCopyFromUi：[ "【当前 Plan 轻量归档副本】", Plan：${planFile}, Worker：${workers.join("、")}, "远端目标：", ...workerTargets, 本地目标… | 运行 | [src/extension/legacy.ts:20048](../src/extension/legacy.ts#L20048) | 源码定位；可达性/实机待验证 |
| 197 | 通知/可选动作 | archivePlanCopyFromUi：当前 Plan 已在 ${completed.join("、")} 和本地复制轻量归档：${archiveRelative} | 运行 | [src/extension/legacy.ts:20130](../src/extension/legacy.ts#L20130) | 源码定位；可达性/实机待验证 |
| 198 | 警告/确认（模态） | archivePlanFromUi：[ "【Plan 归档位置确认】", "", 当前 Plan：${file}, 归档包位置：${bundleRelative}, 结果证据来源：当前本地项目, 最终有效结果：${archiveGate… | 运行 | [src/extension/legacy.ts:20211](../src/extension/legacy.ts#L20211) | 源码定位；可达性/实机待验证 |
| 199 | 通知/可选动作 | archivePlanFromUi：Plan 归档包已创建：${archivedRelative} | 运行 | [src/extension/legacy.ts:20352](../src/extension/legacy.ts#L20352) | 源码定位；可达性/实机待验证 |
| 200 | 警告/确认（模态） | restoreArchivedPlanFromUi：[ "【恢复版本位置确认】", "", 归档来源：${file}, 新 Plan：${restoredFile}, 配置/环境/参数目录：${restoredAssetRoot}, 运行输出命名空间：… | 运行 | [src/extension/legacy.ts:20400](../src/extension/legacy.ts#L20400) | 源码定位；可达性/实机待验证 |
| 201 | 通知/可选动作 | restoreArchivedPlanFromUi：Plan 已恢复为独立版本 v${planVersion}：${restoredFile}；输出使用 ${outputNamespace} 命名空间，结果写入独立 Plan 范围。已恢复配置 ${re… | 运行 | [src/extension/legacy.ts:20527](../src/extension/legacy.ts#L20527) | 源码定位；可达性/实机待验证 |
| 202 | 候选选择 | pickGuidedPlanEntry：choices | 运行 | [src/extension/legacy.ts:20681](../src/extension/legacy.ts#L20681) | 源码定位；可达性/实机待验证 |
| 203 | 候选选择 | pickPlanBaseConfig："选择新 Plan 使用的配置" | 设置 | [src/extension/legacy.ts:20704](../src/extension/legacy.ts#L20704) | 源码定位；可达性/实机待验证 |
| 204 | 候选选择 | pickProjectBootstrapPlan："选择要接入并运行的 Plan" | 运行 | [src/extension/legacy.ts:20717](../src/extension/legacy.ts#L20717) | 源码定位；可达性/实机待验证 |
| 205 | 通知/可选动作 | bootstrapProjectFromUi：已识别到 ${plans.length} 个 Plan，将纳入管理并继续。 | 通知 | [src/extension/legacy.ts:20763](../src/extension/legacy.ts#L20763) | 源码定位；可达性/实机待验证 |
| 206 | 通知/可选动作 | bootstrapProjectFromUi：prerequisite.message | 通知 | [src/extension/legacy.ts:20785](../src/extension/legacy.ts#L20785) | 源码定位；可达性/实机待验证 |
| 207 | 警告/确认 | bootstrapProjectFromUi：新工作区识别仍停留在基础设施配置：${remainingPrerequisite.message} | 通知 | [src/extension/legacy.ts:20802](../src/extension/legacy.ts#L20802) | 源码定位；可达性/实机待验证 |
| 208 | 警告/确认 | bootstrapProjectFromUi：工作区识别仍停留在当前步骤：${completion.message} | 通知 | [src/extension/legacy.ts:20910](../src/extension/legacy.ts#L20910) | 源码定位；可达性/实机待验证 |
| 209 | 通知/可选动作 | bootstrapProjectFromUi：completion.message | 通知 | [src/extension/legacy.ts:20928](../src/extension/legacy.ts#L20928) | 源码定位；可达性/实机待验证 |
| 210 | 通知/可选动作 | bootstrapProjectFromUi：completion.message | 通知 | [src/extension/legacy.ts:20929](../src/extension/legacy.ts#L20929) | 源码定位；可达性/实机待验证 |
| 211 | 通知/可选动作 | generateOutputAdapterFromUi：summary ? 输出接入模板已更新：${summary}。入口：experiments/simple_adapter/result_writer.py。 : "输出接入模板已是最新，无需写入。入口… | 产物 | [src/extension/legacy.ts:21067](../src/extension/legacy.ts#L21067) | 源码定位；可达性/实机待验证 |
| 212 | 通知/可选动作 | saveResultCsvDirFromUi：实验结果 CSV 默认目录已保存：${resultCsvDir} | 产物 | [src/extension/legacy.ts:21093](../src/extension/legacy.ts#L21093) | 源码定位；可达性/实机待验证 |
| 213 | 通知/可选动作 | saveRemoteRootPolicyFromUi：远端根目录安全边界已保存：允许 ${allowedRoots.length} 项，禁止 ${deniedRoots.length} 项。 | 通知 | [src/extension/legacy.ts:21115](../src/extension/legacy.ts#L21115) | 源码定位；可达性/实机待验证 |
| 214 | 选文件/目录 | chooseResultCsvDirFromUi："选择当前项目内的实验结果 CSV 文件夹" | 产物 | [src/extension/legacy.ts:21126](../src/extension/legacy.ts#L21126) | 源码定位；可达性/实机待验证 |
| 215 | 通知/可选动作 | chooseResultCsvDirFromUi：实验结果 CSV 默认目录已保存：${resultCsvDir} | 产物 | [src/extension/legacy.ts:21145](../src/extension/legacy.ts#L21145) | 源码定位；可达性/实机待验证 |
| 216 | 通知/可选动作 | savePptPlotConfigFromUi：presentationPath ? "PPT 绘图配置已保存到当前项目：将追加到指定 PPT。" : "PPT 绘图配置已保存到当前项目：空路径会新建 PPT。" | 产物 | [src/extension/legacy.ts:21162](../src/extension/legacy.ts#L21162) | 源码定位；可达性/实机待验证 |
| 217 | 选文件/目录 | choosePptPathFromUi："从资源管理器选择 PPT 文件" | 产物 | [src/extension/legacy.ts:21168](../src/extension/legacy.ts#L21168) | 源码定位；可达性/实机待验证 |
| 218 | 选保存位置 | chooseNewPptPathFromUi："选择新 PPT 保存位置" | 产物 | [src/extension/legacy.ts:21187](../src/extension/legacy.ts#L21187) | 源码定位；可达性/实机待验证 |
| 219 | 通知/可选动作 | updatePptPresentationPath：PPT 路径已更新到当前项目：${presentationPath} | 更新 | [src/extension/legacy.ts:21213](../src/extension/legacy.ts#L21213) | 源码定位；可达性/实机待验证 |
| 220 | 通知/可选动作 | openPptAutomationGuide："PPT automation 修复说明已打开。请按“结果绘图与 PPT 插件”检查安装、PowerPoint 进程和 schemaVersion=1。" | 产物 | [src/extension/legacy.ts:21258](../src/extension/legacy.ts#L21258) | 源码定位；可达性/实机待验证 |
| 221 | 警告/确认 | showSetupGuideDocument：无法打开配置指南链接，请手动访问：${guide.url} | 设置 | [src/extension/legacy.ts:21276](../src/extension/legacy.ts#L21276) | 源码定位；可达性/实机待验证 |
| 222 | 警告/确认（模态） | confirmPptPlotTarget：pptPlotConfirmationDetail(input, target) | 产物 | [src/extension/legacy.ts:21290](../src/extension/legacy.ts#L21290) | 源码定位；可达性/实机待验证 |
| 223 | 通知/可选动作 | plotResultsToPptFromUi：绘图到 PPT 已提交：${result.requestId}。最近一次请求审计：${requestAuditPath}；响应：${responseAuditPath} | 产物 | [src/extension/legacy.ts:21373](../src/extension/legacy.ts#L21373) | 源码定位；可达性/实机待验证 |
| 224 | 错误反馈 | plotResultsToPptFromUi：打开 PPT 绘图审计失败：${errorMessage(error)} | 产物 | [src/extension/legacy.ts:21384](../src/extension/legacy.ts#L21384) | 源码定位；可达性/实机待验证 |
| 225 | 通知/可选动作 | saveProjectAdapterRulesFromUi：syncErrors.length ? 接入规则已保存到插件工作区设置；以下 Agent 待同步：${syncErrors.join("；")} : "接入规则已保存到插件工作区设置，并同步到 Age… | 产物 | [src/extension/legacy.ts:21414](../src/extension/legacy.ts#L21414) | 源码定位；可达性/实机待验证 |
| 226 | 通知/可选动作 | autoMatchPlanDatasetsFromUi："已按现有可信 registry 元数据自动恢复 " + catalog.autoRecoverableCount + " 个 Plan；仍有 " + catalog.unassignedPlans.… | 运行 | [src/extension/legacy.ts:21426](../src/extension/legacy.ts#L21426) | 源码定位；可达性/实机待验证 |
| 227 | 通知/可选动作 | applyPlanDatasetMappingFromUi：changed ? "已保存 " + count + " 个 Plan 的数据集映射，并从本地逐 seed 结果重新整理总表；不会重新训练。" : "已保存 " + count + " 个 Plan … | 运行 | [src/extension/legacy.ts:21458](../src/extension/legacy.ts#L21458) | 源码定位；可达性/实机待验证 |
| 228 | 通知/可选动作 | saveResultColumnMappingFromUi：syncErrors.length ? 列映射已保存；Agent 待同步：${syncErrors.join("；")} : "列映射已保存到插件设置并同步到 Agent，可点击“重建汇总”。" | 产物 | [src/extension/legacy.ts:21496](../src/extension/legacy.ts#L21496) | 源码定位；可达性/实机待验证 |
| 229 | 通知/可选动作 | clearLegacyTasksFromUi：已从本机面板隐藏 ${taskUiKeys.length} 条旧任务残留；未删除任何远端文件。 | 通知 | [src/extension/legacy.ts:21783](../src/extension/legacy.ts#L21783) | 源码定位；可达性/实机待验证 |
| 230 | 警告/确认（模态） | clearOperationHistoryFromUi：unknownOutcome ? 从本机面板隐藏 ${operationIds.length} 条记录？其中含“执行结果待确认”的旧记录：隐藏只表示本机面板不再显示，不代表远端已结束。当前运行的 Pl… | 历史 | [src/extension/legacy.ts:21889](../src/extension/legacy.ts#L21889) | 源码定位；可达性/实机待验证 |
| 231 | 警告/确认（模态） | clearOperationHistoryFromUi：清除 ${label} 的已结束运行历史？运行中的任务继续显示；远端审计、日志和训练产物保留。 | 历史 | [src/extension/legacy.ts:21909](../src/extension/legacy.ts#L21909) | 源码定位；可达性/实机待验证 |
| 232 | 通知/可选动作 | clearOperationHistoryFromUi：已清除 ${label} 的本机历史视图；远端审计和产物保留。 | 历史 | [src/extension/legacy.ts:21922](../src/extension/legacy.ts#L21922) | 源码定位；可达性/实机待验证 |
| 233 | 警告/确认（模态） | stopAndClearPlansFromUi：preview | 运行 | [src/extension/legacy.ts:22017](../src/extension/legacy.ts#L22017) | 源码定位；可达性/实机待验证 |
| 234 | 警告/确认 | stopAndClearPlanFromUi：text | 运行 | [src/extension/legacy.ts:22093](../src/extension/legacy.ts#L22093) | 源码定位；可达性/实机待验证 |
| 235 | 通知/可选动作 | stopAndClearPlanFromUi：text | 运行 | [src/extension/legacy.ts:22127](../src/extension/legacy.ts#L22127) | 源码定位；可达性/实机待验证 |
| 236 | 警告/确认（模态） | stopAndClearPlanFromUi：preview | 运行 | [src/extension/legacy.ts:22172](../src/extension/legacy.ts#L22172) | 源码定位；可达性/实机待验证 |
| 237 | 警告/确认（模态） | stopAndClearPlanFromUi：第二次确认：\n${preview} | 运行 | [src/extension/legacy.ts:22180](../src/extension/legacy.ts#L22180) | 源码定位；可达性/实机待验证 |
| 238 | 警告/确认 | stopAndClearPlanFromUi：${summary} 未完成：${failures.join("；")} | 运行 | [src/extension/legacy.ts:22468](../src/extension/legacy.ts#L22468) | 源码定位；可达性/实机待验证 |
| 239 | 通知/可选动作 | stopAndClearPlanFromUi：${summary}${retained ? " 仍未确认的条目保持可见。" : " 该 Plan 已无待停止或待提交条目。"} | 运行 | [src/extension/legacy.ts:22469](../src/extension/legacy.ts#L22469) | 源码定位；可达性/实机待验证 |
| 240 | 警告/确认（模态） | clearEndedPlanHistoryFromUi：preview | 历史 | [src/extension/legacy.ts:22516](../src/extension/legacy.ts#L22516) | 源码定位；可达性/实机待验证 |
| 241 | 警告/确认（模态） | clearEndedPlanHistoryFromUi：第二次确认：\n${preview} | 历史 | [src/extension/legacy.ts:22521](../src/extension/legacy.ts#L22521) | 源码定位；可达性/实机待验证 |
| 242 | 选保存位置 | downloadDebugBundle："保存调试包" | 传输 | [src/extension/legacy.ts:22611](../src/extension/legacy.ts#L22611) | 源码定位；可达性/实机待验证 |
| 243 | 候选选择 | downloadDebugBundle："选择调试包所在的 Worker" | 传输 | [src/extension/legacy.ts:22631](../src/extension/legacy.ts#L22631) | 源码定位；可达性/实机待验证 |
| 244 | 警告/确认（模态） | downloadRemoteResultFromUi：[ "【远端结果查看确认】", "", 当前 Plan：${planFile}, 远端来源：${remotePath}, "仅临时读取到内存，关闭查看后不保留原始文件。", "大小上限：4 MB", … | 传输 | [src/extension/legacy.ts:22707](../src/extension/legacy.ts#L22707) | 源码定位；可达性/实机待验证 |
| 245 | 警告/确认（模态） | openResultArtifactFromUi：[ "【结果文件位置确认】", "", 当前 Plan：${planFile}, 远端来源：${artifactPath}, "只读内存查看，不保存或覆盖原始结果文件。", "大小上限：4 MB", … | 产物 | [src/extension/legacy.ts:22791](../src/extension/legacy.ts#L22791) | 源码定位；可达性/实机待验证 |
| 246 | 警告/确认（模态） | confirmMappedResultDownloads：[ metricsOnly ? "【同步结果指标确认】" : "【批量同步结果确认】", Plan：${plans.join("、")}, 来源：${batches.map((batch) =&gt; ${… | 传输 | [src/extension/legacy.ts:23243](../src/extension/legacy.ts#L23243) | 源码定位；可达性/实机待验证 |
| 247 | 通知/可选动作 | confirmMappedResultDownloads：${entries.length} 个${metricsOnly ? "指标" : "结果"}文件已有本地副本。 | 传输 | [src/extension/legacy.ts:23265](../src/extension/legacy.ts#L23265) | 源码定位；可达性/实机待验证 |
| 248 | 警告/确认 | downloadMappedResultBatch：${summaryText}\n${failures.slice(0, 5).join("\n")} | 传输 | [src/extension/legacy.ts:23448](../src/extension/legacy.ts#L23448) | 源码定位；可达性/实机待验证 |
| 249 | 通知/可选动作 | downloadMappedResultBatch：summaryText | 传输 | [src/extension/legacy.ts:23450](../src/extension/legacy.ts#L23450) | 源码定位；可达性/实机待验证 |
| 250 | 通知/可选动作 | syncPendingPlanArtifacts：pending.length ? 仍有 ${pending.length} 条待同步记录；请重新启用并连接对应 Worker。 : "已检查各 Worker 的项目文件。 " | 传输 | [src/extension/legacy.ts:24066](../src/extension/legacy.ts#L24066) | 源码定位；可达性/实机待验证 |
| 251 | 警告/确认（模态） | syncPendingPlanArtifacts：同步 Plan ${item.entry.planFile}\n来源：${source.user}@${source.host}:${source.port}\n目标：${destination.us… | 传输 | [src/extension/legacy.ts:24089](../src/extension/legacy.ts#L24089) | 源码定位；可达性/实机待验证 |
| 252 | 通知/可选动作 | syncPendingPlanArtifacts：Plan ${item.entry.planFile} 已从 ${source.id} 直连同步 ${result.paths} 个产物路径到 ${destination.id}。 | 传输 | [src/extension/legacy.ts:24100](../src/extension/legacy.ts#L24100) | 源码定位；可达性/实机待验证 |
| 253 | 警告/确认（模态） | reconcileProjectFilesAcrossWorkers：补齐项目文件：${source.user}@${source.host}:${source.port}${source.remotePath} → ${destination.user}@${dest… | 服务器 | [src/extension/legacy.ts:24152](../src/extension/legacy.ts#L24152) | 源码定位；可达性/实机待验证 |
| 254 | 通知/可选动作 | rebuildProjectResultTablesFromUi："本次结果查询已取消；其他入口仍在使用的查询可以继续，已有导出文件保留。" | 产物 | [src/extension/legacy.ts:24216](../src/extension/legacy.ts#L24216) | 源码定位；可达性/实机待验证 |
| 255 | 通知/可选动作 | rebuildProjectResultTablesFromUi：message | 产物 | [src/extension/legacy.ts:24219](../src/extension/legacy.ts#L24219) | 源码定位；可达性/实机待验证 |
| 256 | 警告/确认 | rebuildProjectResultTablesFromUi：message | 产物 | [src/extension/legacy.ts:24220](../src/extension/legacy.ts#L24220) | 源码定位；可达性/实机待验证 |
| 257 | 警告/确认（模态） | splitProjectResultTableFromUi："将生成 " + targets.length + " 张子表，其中 " + existing + " 张已有同名文件。目标目录：" + path.posix.join(path.posix.dirn… | 产物 | [src/extension/legacy.ts:24265](../src/extension/legacy.ts#L24265) | 源码定位；可达性/实机待验证 |
| 258 | 通知/可选动作 | splitProjectResultTableFromUi："已生成 " + paths.length + " 张子表，目录：" + path.posix.join(path.posix.dirname(table.path), "by_" + folder) | 产物 | [src/extension/legacy.ts:24274](../src/extension/legacy.ts#L24274) | 源码定位；可达性/实机待验证 |
| 259 | 警告/确认 | abortSchedulerFromUi：msg | 通知 | [src/extension/legacy.ts:24329](../src/extension/legacy.ts#L24329) | 源码定位；可达性/实机待验证 |
| 260 | 警告/确认 | abortSchedulerFromUi："中止后仍有活动证据未确认（" + (remainingSummary ／／ JSON.stringify(remaining)) + "）。请检查对应 Worker 的精确进程或 tmux 身份。" | 通知 | [src/extension/legacy.ts:24392](../src/extension/legacy.ts#L24392) | 源码定位；可达性/实机待验证 |
| 261 | 通知/可选动作 | abortSchedulerFromUi："已中止 " + operationId + " / " + planFile + "（tmux/pid 已确认终止）。" + (tempCleanup.message ／／ "") | 通知 | [src/extension/legacy.ts:24394](../src/extension/legacy.ts#L24394) | 源码定位；可达性/实机待验证 |
| 262 | 错误反馈 | abortSchedulerFromUi："中止失败：" + msg | 通知 | [src/extension/legacy.ts:24398](../src/extension/legacy.ts#L24398) | 源码定位；可达性/实机待验证 |
| 263 | 通知/可选动作 | openTensorBoardFromUi：TensorBoard 已就绪：${url}（远端 ${status.port} ${status.tmuxSession} ${status.windowId} @ ${endpointId}，日志… | 通知 | [src/extension/legacy.ts:24621](../src/extension/legacy.ts#L24621) | 源码定位；可达性/实机待验证 |
| 264 | 错误反馈 | openTensorBoardFromUi：启动 TensorBoard 失败：${msg} | 通知 | [src/extension/legacy.ts:24627](../src/extension/legacy.ts#L24627) | 源码定位；可达性/实机待验证 |
| 265 | 通知/可选动作 | copyTensorBoardUrlFromUi：已复制当前项目 TensorBoard 链接（${endpointId}）：请在 60 秒内首次打开，并保持本机插件窗口运行。复制不会启动服务。 | 通知 | [src/extension/legacy.ts:24686](../src/extension/legacy.ts#L24686) | 源码定位；可达性/实机待验证 |
| 266 | 通知/可选动作 | copyTextFromUi：已核实并复制 ${workerId} 的窗口 ${identity.windowId}：${command} | 通知 | [src/extension/legacy.ts:24707](../src/extension/legacy.ts#L24707) | 源码定位；可达性/实机待验证 |
| 267 | 警告/确认 | copyTextFromUi："没有可复制的内容" | 通知 | [src/extension/legacy.ts:24712](../src/extension/legacy.ts#L24712) | 源码定位；可达性/实机待验证 |
| 268 | 通知/可选动作 | copyTextFromUi：已复制：${text.slice(0, 120)}${text.length &gt; 120 ? "..." : ""} | 通知 | [src/extension/legacy.ts:24716](../src/extension/legacy.ts#L24716) | 源码定位；可达性/实机待验证 |
| 269 | 通知/可选动作 | copyLastCheckStaticReportFromUi：已复制静态检查报告（${rel}，${text.length} 字符） | 服务器 | [src/extension/legacy.ts:24790](../src/extension/legacy.ts#L24790) | 源码定位；可达性/实机待验证 |
| 270 | 通知/可选动作 | runCheckStaticCore：静态检查完成（${overall}，${report.plans} 个 Plan），报告：${rel} | 运行 | [src/extension/legacy.ts:24843](../src/extension/legacy.ts#L24843) | 源码定位；可达性/实机待验证 |
| 271 | 警告/确认（模态） | clearTmuxTaskTabsOnce：确定关闭 ${workerId} 的 GPU 会话 ${session} 中 ${verified.targets.length} 个任务标签？只关闭这些任务窗口，不会关闭 GPU 会话本身。 | 服务器 | [src/extension/legacy.ts:25080](../src/extension/legacy.ts#L25080) | 源码定位；可达性/实机待验证 |
| 272 | 警告/确认（模态） | killTmuxWindowFromUi：description | 服务器 | [src/extension/legacy.ts:25159](../src/extension/legacy.ts#L25159) | 源码定位；可达性/实机待验证 |
| 273 | 警告/确认（模态） | killTmuxWindowFromUi：description | 服务器 | [src/extension/legacy.ts:25168](../src/extension/legacy.ts#L25168) | 源码定位；可达性/实机待验证 |
| 274 | 警告/确认（模态） | killTmuxWindowFromUi：确定关闭 ${workerId} 的 tmux 窗口 ${identity.target}（${identity.windowName}，${identity.windowId ／／ identity… | 服务器 | [src/extension/legacy.ts:25182](../src/extension/legacy.ts#L25182) | 源码定位；可达性/实机待验证 |
| 275 | 候选选择 | showLogHistoryFromUi：历史记录 ${lines.length} 条（仅最新50） | 诊断 | [src/extension/legacy.ts:25319](../src/extension/legacy.ts#L25319) | 源码定位；可达性/实机待验证 |
| 276 | 候选选择 | openFullLogFromUi："选择完整日志文件" | 诊断 | [src/extension/legacy.ts:25331](../src/extension/legacy.ts#L25331) | 源码定位；可达性/实机待验证 |
| 277 | 通知/可选动作 | openFullLogFromUi："未找到 simple_cluster/console_logs/baseline-* 完整日志，请检查远端同步或本地 simple_cluster 目录。" | 诊断 | [src/extension/legacy.ts:25333](../src/extension/legacy.ts#L25333) | 源码定位；可达性/实机待验证 |
| 278 | 错误反馈 | notifyPanelFailureOnce：message | 通知 | [src/extension/legacy.ts:25862](../src/extension/legacy.ts#L25862) | 源码定位；可达性/实机待验证 |
| 279 | 通知/可选动作 | copyPanelDiagnosticsFromUi："Panel 诊断已复制到剪贴板。可能包含本机路径和版本信息，分享前请先检查。" | 诊断 | [src/extension/legacy.ts:25872](../src/extension/legacy.ts#L25872) | 源码定位；可达性/实机待验证 |
| 280 | 警告/确认 | remindDefaultResourcePrefix："全局资源前缀仍为默认 simple，请修改为自己稳定且有区分度的名称。前缀用于命名远端插件目录及 tmux 服务，帮助共享服务器或账号的用户区分归属、降低名称冲突和误操作风险；项目隔离与精确目标校验… | 设置 | [src/extension/legacy.ts:26070](../src/extension/legacy.ts#L26070) | 源码定位；可达性/实机待验证 |
| 281 | 输入 | remindDefaultResourcePrefix："全局远端资源前缀" | 设置 | [src/extension/legacy.ts:26072](../src/extension/legacy.ts#L26072) | 源码定位；可达性/实机待验证 |
| 282 | 错误反馈（模态） | notifyPlanFailureOnce：${message}。调度已停止派发新任务；已运行任务继续完成，失败 tmux 窗口保留。 | 运行 | [src/extension/legacy.ts:26558](../src/extension/legacy.ts#L26558) | 源码定位；可达性/实机待验证 |
| 283 | 通知/可选动作 | showTunnelTestToast：completion.message | 服务器 | [src/extension/legacy.ts:28630](../src/extension/legacy.ts#L28630) | 源码定位；可达性/实机待验证 |
| 284 | 警告/确认 | showTunnelTestToast：${completion.message}。${completion.issues.join("；")}.trim() | 服务器 | [src/extension/legacy.ts:28633](../src/extension/legacy.ts#L28633) | 源码定位；可达性/实机待验证 |
| 285 | 警告/确认（模态） | confirmArtifactDeletionFromUi：[ 【第一次确认】${remoteActionDisplayName(command, action)}，共 ${paths.length} 个精确目标。, route, "请逐项核对以下完整路径。下… | 审核 | [src/extension/legacy.ts:35812](../src/extension/legacy.ts#L35812) | 源码定位；可达性/实机待验证 |
| 286 | 警告/确认（模态） | confirmArtifactDeletionFromUi：[ 【第二次确认】永久删除以上 ${paths.length} 个完整路径。, "此操作不可撤销，只影响上面逐项列出的目标。", pathText, ].join("\n\n") | 审核 | [src/extension/legacy.ts:35821](../src/extension/legacy.ts#L35821) | 源码定位；可达性/实机待验证 |
| 287 | 候选选择 | pickGuidedPlanMode："选择 Plan 运行模式" | 运行 | [src/extension/legacy.ts:36104](../src/extension/legacy.ts#L36104) | 源码定位；可达性/实机待验证 |
| 288 | 警告/确认（模态） | confirmGuidedPlanCreation：detail | 运行 | [src/extension/legacy.ts:36130](../src/extension/legacy.ts#L36130) | 源码定位；可达性/实机待验证 |
| 289 | 通知/可选动作（模态） | confirmGuidedPlanCreation：detail | 运行 | [src/extension/legacy.ts:36131](../src/extension/legacy.ts#L36131) | 源码定位；可达性/实机待验证 |
| 290 | 输入 | inputExistingWorkspaceConfig："填写训练或评估使用的配置文件" | 设置 | [src/extension/legacy.ts:36168](../src/extension/legacy.ts#L36168) | 源码定位；可达性/实机待验证 |
| 291 | 警告/确认 | previewAndConfirmWorkspaceWrites：${title} 将写入 ${changed.length} 个文件。请先查看刚打开的预览，再确认是否继续。 | 通知 | [src/extension/legacy.ts:37399](../src/extension/legacy.ts#L37399) | 源码定位；可达性/实机待验证 |
| 292 | 候选选择 | pickXshellSession：items | 服务器 | [src/extension/legacy.ts:38886](../src/extension/legacy.ts#L38886) | 源码定位；可达性/实机待验证 |
| 293 | 候选选择 | pickXshellSessionForward：items | 服务器 | [src/extension/legacy.ts:38935](../src/extension/legacy.ts#L38935) | 源码定位；可达性/实机待验证 |
| 294 | 候选选择 | pickXshellForward：forwards.map((forward) =&gt; ({ label: ${forward.localHost}:${forward.localPort} -&gt; ${forward.remoteHos… | 服务器 | [src/extension/legacy.ts:38960](../src/extension/legacy.ts#L38960) | 源码定位；可达性/实机待验证 |
| 295 | 候选选择 | pickAgentSessionPath：items | 服务器 | [src/extension/legacy.ts:39005](../src/extension/legacy.ts#L39005) | 源码定位；可达性/实机待验证 |
| 296 | 选文件/目录 | pickOptionalXshellSession：{ canSelectFiles: true, canSelectFolders: false, canSelectMany: false, title, defaultUri: defaultDir… | 服务器 | [src/extension/legacy.ts:39013](../src/extension/legacy.ts#L39013) | 源码定位；可达性/实机待验证 |
| 297 | 候选选择 | pickAuthMethod："认证方式" | 服务器 | [src/extension/legacy.ts:39047](../src/extension/legacy.ts#L39047) | 源码定位；可达性/实机待验证 |
| 298 | 选文件/目录 | pickPrivateKeyPath："选择私钥文件" | 服务器 | [src/extension/legacy.ts:39055](../src/extension/legacy.ts#L39055) | 源码定位；可达性/实机待验证 |
| 299 | 输入 | input：{ title, value, placeHolder, prompt, ignoreFocusOut: true } | 设置 | [src/extension/legacy.ts:39083](../src/extension/legacy.ts#L39083) | 源码定位；可达性/实机待验证 |
| 300 | 输入 | inputRequired：{ title, value: String(value ／／ ""), placeHolder, prompt, ignoreFocusOut: true, validateInput: (text… | 设置 | [src/extension/legacy.ts:39086](../src/extension/legacy.ts#L39086) | 源码定位；可达性/实机待验证 |
| 301 | 输入 | inputActualWorkRoot：{ title, value: current, placeHolder: "/home/your_name/projects", prompt: "填写项目父目录。SimpleSFTP 会自动追加当… | 设置 | [src/extension/legacy.ts:39100](../src/extension/legacy.ts#L39100) | 源码定位；可达性/实机待验证 |
| 302 | 警告/确认（模态） | inputActualWorkRoot：warning | 设置 | [src/extension/legacy.ts:39116](../src/extension/legacy.ts#L39116) | 源码定位；可达性/实机待验证 |
| 303 | 输入 | inputPlanResultPath：{ title, value: String(value ／／ ""), placeHolder, prompt, ignoreFocusOut: true, validateInput: (inpu… | 产物 | [src/extension/legacy.ts:39127](../src/extension/legacy.ts#L39127) | 源码定位；可达性/实机待验证 |
| 304 | 输入 | inputPort：{ title, value: String(value), placeHolder: min &lt;= 22 ? "例如 22" : "例如 18765", prompt: options.prompt… | 设置 | [src/extension/legacy.ts:39153](../src/extension/legacy.ts#L39153) | 源码定位；可达性/实机待验证 |
| 305 | 警告/确认（模态） | confirmActualWorkRootAmbiguity：warning | 通知 | [src/extension/legacy.ts:39756](../src/extension/legacy.ts#L39756) | 源码定位；可达性/实机待验证 |
| 306 | 警告/确认 | confirmUiCommand：${title}\n\n${detail} | 通知 | [src/extension/legacy.ts:39844](../src/extension/legacy.ts#L39844) | 源码定位；可达性/实机待验证 |
| 307 | 通知/可选动作 | showSetupGuide："启用自动备份需要：1) 工作区是 Git 仓库 2) 已配置 remote 3) git push 凭据可用。" | 设置 | [src/extension/GitBackupSetup.ts:134](../src/extension/GitBackupSetup.ts#L134) | 源码定位；可达性/实机待验证 |
| 308 | 警告/确认 | confirmRemoteAccess：SimpleExperiment：无法访问远程 ${inspection.remoteName}，暂未启用自动备份。请先配置 Git 凭据（PAT 或 SSH key）。 | 通知 | [src/extension/GitBackupSetup.ts:162](../src/extension/GitBackupSetup.ts#L162) | 源码定位；可达性/实机待验证 |
| 309 | 警告/确认 | confirmRemoteAccess：无法访问远程 ${inspection.remoteName}：${detail ／／ "认证失败或网络不可达"}。仍要安装 hook 吗？ | 通知 | [src/extension/GitBackupSetup.ts:168](../src/extension/GitBackupSetup.ts#L168) | 源码定位；可达性/实机待验证 |
| 310 | 通知/可选动作 | applyBackup：SimpleExperiment：${result.reason} | 通知 | [src/extension/GitBackupSetup.ts:189](../src/extension/GitBackupSetup.ts#L189) | 源码定位；可达性/实机待验证 |
| 311 | 通知/可选动作 | applyBackup：SimpleExperiment：自动备份已启用${note}\n提交后将推送到 ${describeRemote(inspection)} | 通知 | [src/extension/GitBackupSetup.ts:195](../src/extension/GitBackupSetup.ts#L195) | 源码定位；可达性/实机待验证 |
| 312 | 警告/确认 | maybeAutoInstallGitBackup："SimpleExperiment：当前仓库未配置 git remote，无法启用提交自动备份。" | 通知 | [src/extension/GitBackupSetup.ts:232](../src/extension/GitBackupSetup.ts#L232) | 源码定位；可达性/实机待验证 |
| 313 | 警告/确认 | setupGitBackupCommand："SimpleExperiment：请先打开一个工作区文件夹。" | 设置 | [src/extension/GitBackupSetup.ts:250](../src/extension/GitBackupSetup.ts#L250) | 源码定位；可达性/实机待验证 |
| 314 | 警告/确认 | setupGitBackupCommand："SimpleExperiment：当前工作区不是 Git 仓库，无法配置自动备份。" | 设置 | [src/extension/GitBackupSetup.ts:258](../src/extension/GitBackupSetup.ts#L258) | 源码定位；可达性/实机待验证 |
| 315 | 通知/可选动作 | setupGitBackupCommand：自动备份已启用（${describeRemote(inspection)}）。 | 设置 | [src/extension/GitBackupSetup.ts:267](../src/extension/GitBackupSetup.ts#L267) | 源码定位；可达性/实机待验证 |
| 316 | 警告/确认 | removeGitBackupCommand："SimpleExperiment：当前工作区不是 Git 仓库。" | 通知 | [src/extension/GitBackupSetup.ts:292](../src/extension/GitBackupSetup.ts#L292) | 源码定位；可达性/实机待验证 |
| 317 | 通知/可选动作 | removeGitBackupCommand：SimpleExperiment：${result.reason} | 通知 | [src/extension/GitBackupSetup.ts:296](../src/extension/GitBackupSetup.ts#L296) | 源码定位；可达性/实机待验证 |
| 318 | 警告/确认 | showGitBackupStatusCommand："SimpleExperiment：请先打开一个工作区文件夹。" | 通知 | [src/extension/GitBackupSetup.ts:304](../src/extension/GitBackupSetup.ts#L304) | 源码定位；可达性/实机待验证 |
| 319 | 通知/可选动作 | showGitBackupStatusCommand："SimpleExperiment：当前工作区不是 Git 仓库，自动备份不适用。" | 通知 | [src/extension/GitBackupSetup.ts:312](../src/extension/GitBackupSetup.ts#L312) | 源码定位；可达性/实机待验证 |
| 320 | 通知/可选动作 | showGitBackupStatusCommand：lines.join("\n") | 通知 | [src/extension/GitBackupSetup.ts:324](../src/extension/GitBackupSetup.ts#L324) | 源码定位；可达性/实机待验证 |
| 321 | 通知/可选动作 | checkCore：lastPlan.message | 通知 | [src/updates/Bootstrap.ts:113](../src/updates/Bootstrap.ts#L113) | 源码定位；可达性/实机待验证 |
| 322 | 通知/可选动作 | checkCore：lastPlan.message + " 可通过命令面板“安装或补装配套更新并重载”操作。" | 通知 | [src/updates/Bootstrap.ts:114](../src/updates/Bootstrap.ts#L114) | 源码定位；可达性/实机待验证 |
| 323 | 通知/可选动作 | checkCore：lastPlan.message | 通知 | [src/updates/Bootstrap.ts:115](../src/updates/Bootstrap.ts#L115) | 源码定位；可达性/实机待验证 |
| 324 | 警告/确认 | checkCore：deferred | 通知 | [src/updates/Bootstrap.ts:127](../src/updates/Bootstrap.ts#L127) | 源码定位；可达性/实机待验证 |
| 325 | 错误反馈 | checkCore：status.message | 通知 | [src/updates/Bootstrap.ts:131](../src/updates/Bootstrap.ts#L131) | 源码定位；可达性/实机待验证 |
| 326 | 警告/确认（模态） | installCore：安装并重载窗口以应用配套插件更新？\n\n${detail} | 更新 | [src/updates/Bootstrap.ts:147](../src/updates/Bootstrap.ts#L147) | 源码定位；可达性/实机待验证 |
| 327 | 错误反馈 | installCore：error.message | 更新 | [src/updates/Bootstrap.ts:158](../src/updates/Bootstrap.ts#L158) | 源码定位；可达性/实机待验证 |
| 328 | 错误反馈 | activateWithBusiness：业务面板启动失败，独立更新命令仍可用：${error.message} | 通知 | [src/updates/Bootstrap.ts:177](../src/updates/Bootstrap.ts#L177) | 源码定位；可达性/实机待验证 |
| 329 | 审核/选择页面 | openCacheCleanupPanel："simpleExperimentCacheCleanup" | 审核 | [src/extension/CacheCleanupPanel.ts:276](../src/extension/CacheCleanupPanel.ts#L276) | 源码定位；可达性/实机待验证 |
| 330 | 审核/选择页面 | confirmSyncScopePaths："simpleExperiment.syncScopeConfirmation" | 传输 | [src/features/SyncScopeConfirmation.ts:13](../src/features/SyncScopeConfirmation.ts#L13) | 源码定位；可达性/实机待验证 |
| 331 | 审核/选择页面 | reviewPlanVersionResults："simpleExperiment.planVersionReview" | 产物 | [src/features/SyncScopeConfirmation.ts:49](../src/features/SyncScopeConfirmation.ts#L49) | 源码定位；可达性/实机待验证 |
| 332 | 审核/选择页面 | openSyncScopeTree："simpleExperiment.syncScopeTree" | 传输 | [src/features/SyncScopeTree.ts:30](../src/features/SyncScopeTree.ts#L30) | 源码定位；可达性/实机待验证 |

本索引不将通知、静态检查、隔离 UI 或包校验等同于服务器验收。无项目/无 PLAN/无 Worker、单/多 Worker、部分离线、运行/停止/完成、产物缺失、同步失败、低流量与重载场景的证据及未验证项见主覆盖表。

