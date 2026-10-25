# UI 侧只读证据：多"创新分支"项目→分别验证→统一队列/GPU→合并优秀分支到祖先
冻结 master=a9fc3d36629eeeb6bb71b183d59731e209ccac5a (tree 82e27df5)，读取用 git show/grep <a9>:path（未读旧工作区b65）。
SimpleExperiment 扩展 v0.5.409。仅界面范围；后台调度另 reader。

## 结论：没有。无任何可见入口实现该整套流程。
- 面板=单 webview「集群」，模型=一次一个已接入项目(VS Code 工作区首文件夹 vscode.workspace.workspaceFolders[0])。
- "统一计划/队列/GPU 调度"=单项目内多 Plan 跨 GPU Worker 排队，非跨多"创新分支项目"。
- "创新分支/候选分支卡/合并优秀分支到祖先并更新祖先" 产品源码+UI+配置全无（非隐藏入口、非仅后端）。

## 界面入口（锚点）
- package.json contributes.views 仅 simpleExperiment.panel「集群」webview；menus 仅 commandPalette（无 explorer 项目树/分支右键）。
- 板块 src/factories/PanelSectionFactory.ts + src/ui/sections/index.ts：sync运行环境准备/plans计划/gpu/tmux/execution执行/results结果/diagnostics诊断/settings设置(servers,operations=废弃90/91)。无项目树/候选卡/合并祖先板块。
- 可见动作全集 src/extension/legacy.ts:556 uiActionCommands, :610 SAFE_WEBVIEW_COMMANDS, :638 API_EXECUTABLE_COMMANDS, :651 UI_BUTTON_ACTION_COMMANDS：全是 plan/experiment/结果验证/runQualityGate/runStatistics/checkClaimEvidence/compareWithBestConfig/GPU调度/sync/tmux/draft。无 innovation/branch/candidate-branch/ancestor/merge。

## 项目模型（非多分支并列）
- 绑定 workspaceFolders[0] (legacy.ts:2580,3406)；PlansSection.ts:20 按钮"接入当前项目"→bootstrapProjectFromUi(legacy.ts:844)。面板内无 switchProject/项目树/多项目并列。
- ADR 023-all-plan-auto-queue.md：统一队列/自动排队=一个项目的多 Plan 按调度策略派 Worker；"切换项目"=换活跃工作区,非并列。

## 易误认同名概念
- "合并最新版"mergeLatest/SyncLatestMerge=多 Worker 间按 sha256 同步文件,非分支合并。
- candidate=文件版本来源(manual/plan/candidate/same)/清理候选,非候选分支。
- 祖先/ancestor=Git 安全护栏(清除预览需SFTP Git祖先预检 CHANGELOG:88;同步树校验祖先 ADR015;本仓自维护ff-only祖先副本),非产品功能。
- compareWithBestConfig(legacy.ts:703)=结果层与最佳配置比较,最接近"选优"但不合并/更新祖先。
- promoteDraft=晋级 Plan 草稿(DraftPlans),非代码分支。
- 全树 git grep 创新=0命中; 创新分支/优秀分支/mergeAncestor/candidateBranch 源码=0; package.json 55 配置键无 branch/innovation/candidate/ancestor/multi-project(全 scheduler/gpu/projectAdapter)→无隐藏开关。

## 用户点击路径/前提
- 无对应按钮/页面可点(诚实:该功能不存在,勿把后台文件或设计文档当已完成界面)。
- 最接近现有(各自独立,非编排流水线):侧栏SimpleExperiment→集群→"接入当前项目"(前提VS Code已开该文件夹+SimpleSFTP已装)→plans逐计划/运行全部计划→gpu看调度→results runQualityGate/runStatistics/compareWithBestConfig→换分支需自行切 VS Code 工作区→"合并到祖先并更新"无一键界面,仅 syncGithub/publishGithub/overwriteGithub(GitHub本机↔远端)及外部Git承担。

## 缺口/最小可验证改动+现有测试域
1 多创新分支并列容器+项目树section→扩 test/features/treeOnboardingDensity,mainColumnScrollAndTreeJump,resourceTreeActiveScope, test/ui/workbenchResourceTree
2 候选分支卡+逐分支验证态→新按钮须进白名单否则 legacy.ts:28610 getSafeCommand 拦；扩 test/ui/webviewButtonsHandled,webviewActionAllowlist,webviewStateShape,test/features/webviewCommandWhitelistConsistency
3 择优合并到祖先并更新祖先新命名命令(actionsCatalog 禁 raw),双确认对齐 overwriteGithub data-danger/confirm + legacy.ts:9649 confirmSyncScopePaths；扩 test/features/panelMessageDispatch,test/extension/workflowPanelNavigation
4 路由/可见性:注册 legacy.ts hostCommand(如:844)、进两白名单;可见性靠 section render+webviewSectionInterest,无 feature flag；扩 test/ui/webviewCommandAuditTraversal,panelWebviewScriptHealth,panelInlineScriptSyntax

## 剩余未知
- Windows 实际渲染截图/日志须主控 host_windows 取;本 reader 未枚举宿主目录。
- 结论基于冻结源码;dist 为同 tree 构建,源码无此功能即不会凭空出现。
- 是否有未合并 GitHub PR 实现此界面:冻结 master 无相关源码/文档;未联网,须主控另查。
