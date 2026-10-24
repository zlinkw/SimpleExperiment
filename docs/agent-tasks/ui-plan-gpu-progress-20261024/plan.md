# ui-plan-gpu-progress-20261024 详细计划

修订 r1；GPT 授权实现；证据 evidence.md r2，冻结基线 f431f3b11ede244fe647a96a82ec7315ea9a6404。唯一实现负责人 bf1588a2-2d16-47d9-93ea-4b2140bf34be。

## 契约与保护区
交付仅用户提出的五项：更新检查限流可理解且尊重退避、旧 runtime 提示降噪、GPU/总览历史正常显示、Plan 列表随既有运行进度及时变化、相关操作进度/日志统一到 VS Code Notification。适用 Windows 当前扩展；Linux 验证不替代 Windows 必验。原目录、现有 worktree/祖先、科研项目和服务器一律保护。不得执行真实实验、SSH 写入、自动 Worker 升级；不得改运行协议、队列生命周期、确认完成事实、删除安全门禁、更新来源或完整性门禁。没有新需求依据不改构建脚本/依赖/无关卡片；复用现有编译缓存和已验产物。

## 实施顺序与详细要求
### T1 GPU（依据 E05-E09/F03/F06）
在 src/ui/PanelHtml.legacy.ts applyGpuWindowSamples 将 collectedAt 毫秒除以1000后存 bucketEpoch，timestamp 仍由原毫秒生成；保留 requestId/worker 身份与过期响应拒绝。
不以固定300秒放宽所有断线。远端原有 boolean gapBefore 权威保留；未知 null 粗段在与细帧合并前，按该远端段自身已有 historyExpectedStep/元数据及现有 GAP_FACTOR 计算边界，物化到本次合并点，不能让合并后的细帧中位数反改粗段判定。环窗按自身采样间隔判定段内断线；粗细边界按两侧已有粒度与现有元数据判断，禁止硬编码 false 跨过两小时空洞。不得补值/零值/连显式缺口；imputed/缺失值原行为保持。只为相关混合分段增加必要局部辅助函数，不全局替换历史算法。
验收现有 GPU 回归及新增 REPRO-1/2/3、CONTROL、CONTRACT-5、SPEC-6/7：单位一致、正常连续段不散点、总览正常、真实断线不连接。REPRO-2 是缺失 gap 元数据的兼容场景，不以其“无true即连续”注释作为真实回包连续依据；补 remote 显式 true、环窗内部空洞、重复刷新断线不丢的需求断言。必要时修正测试调用到真实 merge seam而非伪造期望，保留首次红灯及变更原因，不删除覆盖。

### T2 列表状态（依据 R1/R2、F05）
executionRenderKeysForState 的 planList 投影纳入实际消费的活动提交 stage/message；避免仅为时间戳每帧重绘。executionSubmissionLabel/列表计数说明用同一操作行已有进度生成易读阶段；机器阶段名按现有阶段含义映射，无须新增远端查询。不把已提交当已运行或完成，不改变 revision/command 身份与已确认完成保护。保留开始/成功/失败/取消/排队含义；不改 postState 流控。新增列表滞后复现转绿、四态/revision/reconcileEvidenceActive 基线保持。

### T3 通知与旧提示（依据 E04/E11、§12）
runActionCommand、finishDistributedPlanSubmission、runAllPlans/SelectedPlanBatchHost、实验准备的相关操作共用每操作一个 Notification，已有准备通知应复用，不嵌套制造重复。每阶段 progress.report，移除相关底部 setStatusBarMessage；实验准备及运行进度卡内的重复微小灰色操作进度/日志不再展示，保留卡片标题/状态/任务数/按钮/正常说明及按钮终态门禁。只处理本任务操作面，不重构整个扩展通知。
建立一个订阅生命周期内 OutputChannel 保存全部本次相关操作阶段/日志（带时间/操作身份），通知提供合法“查看日志”入口。withProgress原生不支持按钮，禁止伪造API：可用命令链接并实测支持，否则用现有命令+操作结束的轻量通知动作提供入口；不得每行弹新通知。完整日志不截断、不写秘密，沿用正常VS Code输出管理，不新增自定义任意容量策略。若既有后端完整日志另有来源，复用并可从同一入口查看，不用仅阶段摘要冒充全部日志。
取消按钮仅在接入既有取消语义且不误停远端作业时启用；否则 cancellable:false，保留原取消入口。成功/错误/UiCommandCancelled/外层finally均结束通知，禁止悬挂。日志通道 context.subscriptions释放。
legacySourceFreezeWorkerNames 判断不改；旧语义事实在同会话首现或受影响集合变化时并入本次操作通知并写日志，原告知含义保留、不每次单独提示、不声称升级生效。后续操作仍在完整日志记录该事实，不能隐瞒实际能力。

### T4 更新限流（依据 E01-E03、§11）
ReleaseClient导出 RateLimitedError(retryAt)。Bootstrap对该类显示“限流，延后至本地时间”的真实状态，manual用警告而非普通检查失败且不抛到Extension Host；自动不重复弹错，定时入口遵守retryAt，不能自动高频重试。不得置为已最新、提供陈旧计划安装或吞真实HTTP/解析/来源/校验错误。
用最小可选 retryStore 接口保存退避并在新实例恢复，Bootstrap接globalState；保存必须等待/处理异步错误，不把Promise塞void接口后无人处理。有限有效时间戳按现有退避上限约束，现有注入fetch/clock seam兼容；不宣称globalState跨窗口实时一致，不加锁、不新增认证流程。现有manual不绕退避/HTTP403判定/大小/来源/配套安装验证保持。新增reload退避、manual警告不抛、自动非失败显示、期满可重新请求测试。

## r2 审核返修指导（2026-10-24，绑定 evidence r3/review.diff）
T1/T2 当前diff未见阻塞性逻辑问题，最终验收仍必需；以下T3/T4为必须返修，原负责人完成，不扩大需求。
1. Bootstrap checkCore 在检查前 publish checking，RateLimitedError catch仅写bar并return status，导致API/面板/globalState永远checking。用既有unknown状态+明确延后消息/重试时间发布（不增加新状态枚举需求），随后覆盖bar为限流中；不冒充最新，不抛普通错误。测试同时断言getUpdateStatus/globalState/返回值不是checking/error/latest、manual本地时间警告、到期恢复正常检查。
2. ReleaseClient限流分支的save当前void fire-and-forget，与“持久化完成后可重载”及注释不符：await store保存，处理同步throw与异步reject，保存失败保留内存退避并将持久化未完成事实显式可观察（可附在同一RateLimitedError消息），不可静默丢失。load经Promise.then包装，避免同步throw泄漏；接受的持久化retryAt需处于now至now+86400000既有上限内（当前实现可持久拒绝到任意远期）。测试用可控延迟save证明检查结算前确实等候，并覆盖保存失败/非法远期，不放宽HTTP限流窗口。
3. Notification开始晚于首条reportPlanStage，首阶段会丢；在受保护操作try内先建立通知再产生首阶段，保留现有admission/去重/按钮状态。beginOperationProgressNotice返回后withProgress回调可能延迟，当前finish在session.close未赋值时丢关闭，随后回调新建永不结束Promise。用回调前即建立的完成promise/session.done和latestMessage，确保迟到回调回放最后进度并立即收敛；处理withProgress拒绝，不留unhandled rejection。最小行为测试覆盖延迟回调+快速成功/失败/取消、首次进度可见、一个批量仅一个通知。
4. submissionNoticeTone只读取plan-submit本地行，validate/dry-run可能没有该行；不得缺行即把返回failed/cancelled当succeeded。沿用真实resultStatus/result错误判定，不改变业务成功失败语义；加入单独校验失败、预演失败及批量部分失败的通知断言。
5. 日志入口当前只在终态提供、输出仅reportPlanStage摘要，不足以宣称完整相关日志。复用现有操作日志数据源/查看路径，在操作进行中提供合法可用查看入口（必要最小package命令贡献或面板按钮均可，不猜withProgress按钮），把本次相关完整反馈接入/关联同一入口；不删原日志来源、不拉服务器新请求、不把整段日志逐条弹窗。给明确日志来源→通知/通道的映射和实测断言，包括非reportPlanStage的校验/预演反馈。不得仅隐藏卡片进度却未给通知完整替代。
6. 允许Linux单轮将LOCALAPPDATA以进程环境指向本任务现有证据目录下新建可写隔离cache目录，路径从当前worktree推导，覆盖整个相关测试子进程链。先核目录归node可写且不指真实宿主缓存；记录环境输入变化/原EACCES证据，完整重验受影响测试，禁止改断言、chmod/chown或绕过锁。Windows必验保留。
7. 标准运行版本0.5.408已批准，待上述返修及审核后再同步版本并最终编译；不能用0.5.408-patch。所有新行为回归须纳入最终权威清单；若项目现有check:full已自动发现则核对receipt，不为改清单再造构建流程。源码变化后的必需重验不属于重复，执行器拒绝则提供真实分类/输入身份由主控解决，不把未执行当通过。

## r3 返修复审增量（绑定 evidence r4）
已确认T4 unknown延后状态/await save/恢复上限、T3首次通知与迟到回调生命周期主修复符合指导。仍有需求缺口须小改：postUiCommandStatus写操作日志使用slice(0,400)会永久截断所谓完整反馈，删除通道日志这一截断，通知可短显示但全文日志必须保留；该反馈还须对相关进行中validate/dry-run驱动现有通知progress.report，不能只写日志却通知始终空白。用日志长度>400和校验/预演阶段推进的行为断言验收。回调前阶段缓冲已满8时当前连终态都不接收：保留有界策略但滚动/保留latest与终态，完整历史在通道，不能迟到通知永远回放最早8条而无最终结果。补>8阶段快速完成断言，不新增独立框架。
EACCES不修改全局pi-test-evidence工具：scripts/test-workflow.js已有逐测试隔离SANDBOX_ENV_KEYS的受支持能力。按其现有非最终入口check:dev --only test/features/planPreflightProgressSpeed.test.js（先核真实计划、无重复）经pi-test-evidence直接argv执行即可，不能再环境前缀/包装器。记录输入环境变更原因，若既有入口不支持该文件则给实际拒绝证据，主控安排Windows原生相同测试，不改工具/权限/脚本。最终check:full本来使用同一隔离环境，保留完整覆盖。

## Git与交付
禁再使用 core.logAllRefUpdates=false、不修权限或删除旧日志。仅在无其他本地元数据写入时，允许尝试正常 git branch -m fix-ui-plan-gpu-progress-20261024（不含fix/命名空间）避开已证root属主父目录，原任务仍同worktree/同HEAD/同实例。执行前核目标不存在及实际Git身份，执行后核原基线祖先/新名/默认reflog启用；若失败停Git写入交主控，不加参数绕过。本计划允许分支名必要变化，记录证据；不重建副本、不改指针。
开发按功能块连续实现和受影响验证后集中交GPT审核。仅本任务文件与必要dist生成闭包可提交；先核真实diff/暂存清单。运行版本按项目规定递增补丁并同步manifest/lock/runtime；先交主控确认版本可用，再最终编译。
Linux本地Git由原负责人；Windows与GitHub由主控。完成后精确普通提交并交候选SHA/路径/日志；主控推修复分支开PR，不直接推master；合并必须有审核通过及授权。安装、Release等按项目交付约定独立明确执行，不自动部署Worker。

## 验收与停止条件
开发：按差异及反向调用确定相关测试，现有+新增文件经pi-test-evidence逐文件串行，node --test --test-force-exit --test-timeout 20000 <file>；保留首次失败、完整堆栈/退出码/原始日志。不得并行node/python测试，不改超时/不删断言。T1/T2先转绿后推进其他块。
最终：核scripts/test-workflow实际清单和npm前后钩子去重；必须 npm run build（含node-c门禁）、vm.Script模板剥离检查、node scripts/test-workflow.js check:full，均经要求入口保存真实结果；Windows必验交主控，Windows测试夹具隔离Git定位变量。打包复用同一完整验证产物、真实包清单/包后manifest与runtime校验、秘密排除不可省；同候选阶段输入不得重复跑同文件。没有可靠合法产物复用接口则用项目完整package，说明不可复用原因，不修改脚本开旁路。
输出：证据更新、具体变更/测试域/命令矩阵、完整日志/真实码、当前diff和跨端待办。实现失败若为不确定逻辑/平台/安全或一次机械修复仍失败，补证据交GPT具体指导，不猜修；测试未知/失败/遗漏阻断交付。全部五项目标、强制验收与适用交付完成后停止，不扩大排查范围。

|TODO|状态|
|---|---|
|T1 GPU单位与分段|完成：单位归一+分段物化；需求文件9/9绿(/tmp/pi-test-hddlmm1a)、既有GPU回归14/14绿(/tmp/pi-test-qmllogqe)、compile门禁含node -c绿(/tmp/pi-test-1p3xzc8r)|
|T2 列表同源状态|完成：key纳入活动stage/message+标签并入同源进度；新增4/4绿(/tmp/pi-test-zbua1hyo)、phaseLabel/panelState/frontendChecker 3+5+4全绿；harness多行const自修首失败/tmp/pi-test-s4k6hep8保留|
|T3 通知及提示|r3三缺口已修+验收：全文日志/进行中validate+dryRun推进/滚动缓冲8含终态（生命周期10/10 /tmp/pi-test-jwwniawv；planStopClear 39/39 j1uuw5zh、resultSyncFailureVisibility 14/14 7f2zjvty）；r2返修主体：通知在首阶段前建立+缓冲回放+收敛+reject无害（生命周期7/7 /tmp/pi-test-hf_37r13）；tone按真实result判定；postUiCommandStatus全量反馈入同一通道+package命令面板进行中入口；回归planStopClear 39/39(6h3f0b70)、preflight 22/22(ckynjlh_)、stopRouting 12/12(w3ffn1zw)等，明细evidence §20；F11/F12自修首失败3ma8gu3p/gt382e74保留|
|T4 限流|r2返修完成（待复审）：deferral以unknown状态发布至status/globalState/返回值+到期恢复断言、save awaited且失败显式入消息、load同步throw吸收+24h上限拒远期；pairedUpdateRateLimit 6/6(/tmp/pi-test-g9d2p90b)、client 5/5(c_vkja64)、bootstrap 6/6(63_1geh_)；F10括号笔误d4vzx6yi保留|
|T3/T4 r3旧轮记录|r3轮记录见evidence §16/§17；F07重复方法首失败/tmp/pi-test-4wowpwtk保留|
|T5 最终验收/版本/Windows/PR交付|Linux侧完成待审：0.5.408同步；F13/F14/F15闭环后最终build 209/209绿(p359j90b,validated,run 11-56-41)、差集补齐(6vweh8_s/muagz32e)、vm.Script绿且dist哈希绑定；7任务测试文件已纯追加登记入3既有域(6文件入package，pairedUpdateRateLimit因paired-update域不被package引用仍缺，报主控裁定)；旧build receipt按裁定b声明输入已变；正式闭环=主控Windows npm run package一次(package dry-run 226 jobs ovi5pz7e)；审核包重建含manifest。|

负责人仅可更新TODO状态/事实摘要；不得改有效指导。当前无需用户决定。