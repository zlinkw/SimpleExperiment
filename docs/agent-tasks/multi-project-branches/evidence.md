# 多项目创新分支：事实与边界

## 已完成
- 宿主 GitHub 最新 master：a9fc3d36629eeeb6bb71b183d59731e209ccac5a；tree 82e27df5dfc87e188e1273a1e8d99b4e1cef5068。
- 用户明确授权以主线覆盖当前目录。原目录原先 detached b65、干净；已备份 raw index/身份，仅祖先 ff 到 a9，并保留本机分支 feat-multi-project-branches-20261025。忽略工具配置及 exclude 字节不变，旧分支/备份未改写。
- 当前实现副本 impl-multi-project-branches-20261025 从同一 a9 创建；主控实施，子代理仅两项只读调查且已完成。
- 实际 Windows 安装及活动 API 均 0.5.409；不是旧版未重载。GitHub 当前无 open PR。

## 两份只读证据
- readers/ui.md / readers/backend.md 均来自冻结 a9，不是原目录旧 b65；仅作导航，关键实现修改前仍读准确正文。
- 现有产品为单工作区项目，计划队列/GPU调度不等于多个科研创新分支统一管理。不存在科研祖先/创新分支注册、选优合并祖先的产品闭环。
- LocalApiClient.ts 的实例 pin 只是固定发现槽的身份拒绝，不是现有多实例目录或任意实例路由；不能假称已可枚举全部项目实例。
- GPU采集有机器级单源，但预留为项目内状态；读者提出的跨项目竞态是源码层缺口，不是已观察撞卡，不自动扩为本轮修复。
- 插件本身的Git/PR开发规约不等于科研项目的分支管理产品功能。

## 原提案与最新用户决定
- 原依次验证提案已撤回（完整原文见archive/r1-before-local-unified-dispatch）；用户明确本机统一排队与统一派发允许分支并行。
- 获准只补本机统一派发及其必要资源占位，不额外设计Worker侧全局账本/服务；不同窗口同插件并不天然共享队列，必须落实真实共同决策入口。
- 尚无业务源码修改、测试、运行版本递增或新PR，不为资料创建空PR。

- 用户已恢复子代理调度；现有两项阅读完成，后续单一实现负责人复用本资料与工作副本，主控负责计划/high审核/宿主及GitHub。

## 块A实施记录（沙箱唯一源负责人，impl 分支，基线 a9fc3d36 未变）

提交链：c1433dc4（功能+测试）→ 0b4411d5（任务文档）→ 49847c30（严格模式返修：save 返回校验后文件供 mutate 返回；实例记录读取改确定赋值安全的有界读取函数）→ e5bb5c30（文档哈希）。验证候选 HEAD=e5bb5c30；下列 blob 为冻结树文件内容（已按 HEAD:path 逐一核对一致）。

冻结验证树（Linux 本地 Git，由源负责人以 node 身份创建，detached，供宿主经既有映射只读使用）：
- 路径 /repos/MCP/zlk-multi-project-branches-win-20261025（创建前核实路径不存在、worktree 列表无同名条目，未覆盖任何内容）。
- HEAD=e5bb5c30e7d993063decfc08bd18404e41734c58，detached（symbolic-ref 无）；tree=26c740393ac8f06937440a2ee6397b0dfdbbda7c。
- gitdir=/repos/MCP/zlk-cluster-orchestrator/.git/worktrees/zlk-multi-project-branches-win-20261025；common-dir=/repos/MCP/zlk-cluster-orchestrator/.git；私有索引 <gitdir>/index 已存在且与 HEAD 一致：status --porcelain 为空、无 staged（dirty=0，staged=0）。
- 九个工作文件 blob 逐一等于本记录所列哈希（GitIdentityProbe d0389ecd…、BranchProjectStore ca221b30…、BranchProjectService 5b41a4be…、LocalApiServer.legacy 6361b43b…、LocalApiClient ece21005…、legacy.ts d87b2167…、PanelHtml.legacy 1fbdf7d7…、branchProjectRegistry.test 8ed37b93…、localApi.test 698167db…）。

### 变更文件（blob sha，工作区内容）
- src/project/GitIdentityProbe.ts（新，d0389ecd60abb6acdf7749c6af9cf698150354a3）：sanitizeGitEnv 清除 GIT_DIR/GIT_WORK_TREE/GIT_COMMON_DIR/GIT_INDEX_FILE/GIT_OBJECT_DIRECTORY/GIT_ALTERNATE_OBJECT_DIRECTORIES/GIT_PREFIX/GIT_NAMESPACE/GIT_CONFIG(_GLOBAL/_SYSTEM)（大小写不敏感）；readGitIdentity（rev-parse --show-toplevel/common-dir、symbolic-ref、rev-parse HEAD、--no-optional-locks status --porcelain、config remote url）全只读；listWorktrees --porcelain；compareAncestorRelation（equal/ahead/diverged/独立仓库如实区分，merge-base 仅在同 common-dir 即 worktree 情形使用，不对独立 clone 猜测）；checkBranchNameFree；唯一写路径 createWorktreeBranch=`git worktree add <path> -b <branch> <base>`，分支占用/路径非法即拒绝，无 reset/rebase/force/stash/删除。
- src/project/BranchProjectStore.ts（新，ca221b30c501260830102e9625eba7a28588b9f4）：AncestorProjectRecord/BranchProjectRecord 模型+严格校验；本机存储 %APPDATA%/SimpleExperiment/branch-projects.json，atomicWriteText 原子写；拒绝未来 schemaVersion、重复目录、孤儿分支；mutate 带预检摘要（跨窗口并发=拒绝重确认，不 last-writer-wins）；createBranchPreviewDigest/branchProjectFileDigest。
- src/project/BranchProjectService.ts（新，5b41a4be251ab1968d936b4446c7048530e925fe）：verifyAll 只读核验投影（登记态 verified/missing/not-a-repository/identity-drift/dirty/detached/error；relation 五态；researchValidated 恒 false——不宣称科研通过）；registerAncestor（拒绝非仓库/漂移/detached）；registerBranch（拒绝祖先自身/detached/重复；worktree 自动识别来源）；previewCreateBranch→confirmCreateBranch（digest 不一致或写前状态变化即拒，创建成功后自动登记）；forget 仅移除登记（祖先有分支时拒绝先删；不删目录/分支/worktree）。
- src/api/LocalApiServer.legacy.ts（6361b43b8e22ae294dbf276a9f82ea93b80b5afb）：新增 workspace 选项；discovery()/capabilities() 增量加 instanceId/workspace（旧字段语义未动）；writeDiscovery 同时写 <discoveryDir>/instances/<pid>_<startedAt>.json 每实例记录；dispose 只重写自身记录（status stopped），不清理他人。默认 api.json 的 last-writer 兼容语义保留。
- src/cli/LocalApiClient.ts（ece210056847f927cf631d6e5d97f2f2d4ae1e1e）：listPluginInstances（枚举实例记录，有界读取，输出行绝不含 token）、resolveInstanceByWorkspace（0 或多匹配都拒绝，不猜）、preflightPluginAt（同握手对任意实例记录；声明期望工作区时 capabilities.workspace 必须匹配，旧版无字段=拒绝）；preflightHandshake 参数化 discoveryPath，默认槽行为逐调用点保持；callPluginRpc 新增可选 target{discoveryPath|workspace}，缺省路径不变。
- src/extension/legacy.ts（d87b216759a37aa84fece769a498f7defe142bc4）：命令 registerAncestorProject/registerBranchProject/createBranchFromAncestor/refreshBranchProjects/openBranchProject/forgetBranchProject/forgetAncestorProject 入 SAFE_WEBVIEW_COMMANDS+UI_BUTTON_ACTION_COMMANDS；payload 键 branchProjectId；startLocalApiServer 传 workspace=当前工作区根；handler 全部走原生对话框（目录选择→身份预览→modal 确认），createBranch 展示分支/基点 commit/目标路径并要求 digest 一致；openFolder forceNewWindow，不改当前窗口；buildState 两路径加 branchProjects 投影（未验证前 pending 如实显示）；webviewReady 后一次性后台核验；本地 API 新增只读 projects.registry、projects.instances（不含 token）。
- src/ui/PanelHtml.legacy.ts（1fbdf7d76a35aa13b3f563c3fc71009b88e39721）：plans 卡内新增“项目与分支”区域（复用现有板块/资源树框架，不新增资源树 section、不动 defaultUiSectionOrder/RESOURCE_TREE_SECTION_ORDER）；renderBranchProjectsCard 如实显示路径/分支/commit/dirty/关系/状态与“科研验证未在本卡自动执行”；按钮 data-branch-project-id；webviewHandledCommands、payload 采集（payloadFromButton/BUTTON_PAYLOAD_ATTRIBUTE_NAMES/pendingKey 数组）同步；未验证不显示“已通过”。

### 缺失行为→新断言（测试）
- 缺失：无登记模型/带继承 GIT_* 清理的探针/预览-确认拒绝路径；实测（Linux 禁跑套件）未做，改由 Windows 验证。新增 test/project/branchProjectRegistry.test.js（新域单文件，理由：无现有 home；需真实 git 子进程与临时仓库夹具，内存 fake 不能证明环境清理与不写索引语义，8ed37b930e6d9f0eedd7cd50afc62203d2acb1dc）：sanitizeGitEnv 清全部定位变量且保留其它；诱饵 GIT_DIR/GIT_INDEX_FILE 注入下 readGitIdentity 读真实仓库且诱饵索引逐字节不变；dirty/detached 分类；relation 四态；存储往返/未来版本/重复目录/孤儿分支/摘要漂移拒绝；登记拒绝与成功记录；preview/confirm digest 与占用拒绝、祖先 HEAD/分支集/工作区全程不变；forget 只动登记表；独立 clone 保持 separate-repository 且副本 HEAD 不动。零清理夹具策略与仓库 2026-10-23 策略一致。
- 扩展 test/api/localApi.test.js（698167dbc4b551e20e5e07d9bffd3a36c9acba60）：同发现目录双实例各写自身 instances 记录、默认 api.json 仍可解析（兼容）、枚举行无 token（键与序列化双重检查）、按工作区唯一路由、未知/歧义拒绝、preflightPluginAt 工作区不符拒绝、dispose 后仅自身记录 stopped 且对方记录逐字节不变。
- 白名单双向一致性测试（webviewCommandWhitelistConsistency 正反两向）已同步：新命令同时进入面板 webviewHandledCommands 与宿主两白名单；未新增资源树 section，uiLayoutSectionLookup/workbenchResourceTree 锚点未触碰。

### 平台/流程事实
- Linux 端仅源码编辑+本地检查；仓库内 node --check 被 PI_NATIVE_PLATFORM_REQUIRED hook 在执行前拒绝（未运行、未绕过），TS 编译与全部测试须由主控 Windows 原生阶段执行（tsc 未在此运行）。
- 已知风险/待原生验证：tsc 编译新模块（legacy.ts @ts-nocheck 但新模块受检）；面板内联 JS 由既有 panelInlineScriptSyntax/panelWebviewScriptHealth 覆盖（新增渲染函数已在本地对抽出函数体 node --check 通过，属 /tmp 抽出函数体检查，非产品套件）；git fixture 用 checkout -B main 保证旧 git 默认分支差异不影响。
- 保护区确认：未动 WorkflowWorkspaceBinding、调度 tickDistributedQueueCore/allocate*、GPU 采集、科研项目目录；未跑任何 MultiModal 等真实科研仓；未做远程 GitHub 操作。
