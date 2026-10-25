# batch-isolation-coordination-20261025 — 同批隔离机械 I/O 互挡（单问题）

## 故障与已证事实（Owner: qwen bf1588a2，SE 02847ee1=fresh origin/master，r70b-github 背书）
- r69 现场：runAllPlans 3 Plan 并发，plan3b019da9 六 job 于 17:48:24–17:49:08 全被"暂不能安全隔离"暂停；r70 回执（r70a3-receipt-brief.json + r70-snapshot-3b019da9.json，mtime 17:49:08.724Z）busy 数组实锤：新实例 63892 内 `files.cleanup.execute running/hashing readOnlyObserver=false selfAttempt=false` 与 `files.cleanup.status`（非 observer）在忙，uploadOperations=[]、queue=0 —— **同批另两 Plan 的隔离执行机械段与该 Plan 的预检重叠造成全局忙**；非旧 109 内存、非远程锁/ledger。
- SFTP 侧（extension.js:276-303，reader 04a0a702 已证）：`currentTransferBusySnapshot` 忽略 node/root 全实例计忙；preview/inspect 属生产证明 observer 不互相阻挡，execute 与其 status 跟踪计忙。SFTP 110 不改。
- SE 侧并发契约（SelectedPlanBatchHost.ts:112-124、PlanRunReplacement.ts:18-20、planBatchDispatchFirst.test.js 接线钉）：≤4 lane 并发完整提交链；跨 PLAN 仅对话确认道单页与 failed 停启动。**禁止的是机械链占对话道/整条提交塞慢链；未规定本批资源真实互斥时机械段可无序互撞**——r69 即该缺口。

## 方案（父 r70 裁定方向，本任务唯一改动面）
复用现有 `PlanSubmissionBatch`（memo/serial/once、close、check）为**同一活批**的隔离机械 I/O 增加小范围读写协调：
- 只读预检彼此可并行（多读者）；隔离 execute 及其 status 跟踪/核验等**在 SFTP 计忙的机械段**与其他 Plan 预检/执行互斥（单写者）。
- 等待仅限本批已知自有隔离临界段；**不**等待任意外部传输（外部 busy 照旧即时 fail-closed 拒绝）、不跨批共享豁免、不按客户端自报 operation 名豁免任何 guard、无轮询/盲重试。
- 对话确认仍走既有 confirmGateLocal 单页道，绝不进机械临界区（不产生"等用户占资源"死锁）。批次 check/current/失败/取消必释放队列并重新核输入；close 原生结算保留。单 Plan/非 batch 入口零新语义。
- 路由闭包（实施时按实际调用核全）：ports.preview 整个实际观察链属读者；beforeDelete/preflightConfirmed/execute/status/verify 中计忙或改索引段属写者；PlanRunHost 前置读/worker 快照若与同批执行重叠按实际读取闭包归类。
- 实施位置：现有类内短小读写队列原语（PlanSubmissionBatch + PlanRunHost.replace ports 接线 + PlanRunReplacement 调用点），不另文件/新框架。

## 非目标
不改 SFTP 110/科研/通知/产物同步/旧 state；不做全局调度框架或整 Plan 全串行；不放宽 SFTP 全局守卫/unknown/failclosed；不改版本；不删既有用例断言。

## 待父裁定的既有断言冲突（协调方案的必然红，未授权前不动）
`test/features/planBatchDispatchFirst.test.js` 现契约"B 完全不等待 A 的隔离"与新协调"本批机械段互斥"直接冲突（行号为 r71b 冻结版 fb983626 当前文件）：
- :144 `assert.ok(done,'B 的确认与提交不得排在 A 的隔离执行之后（当前批次慢的根因）')` 与 :145 `preview:plans/clean.yaml 必须在 A 隔离未完时已进行`（用例 1，done 判定 :143）；
- :166/:169 `done`/`'B 的确认与隔离不得排在 A 的隔离执行之后'`（用例 2，含 secondExisting 双产物）；
- :183-184 `assert.ok(done,'B 不受 A 慢隔离影响')`（用例 3，在 failAExecute 之前判 done）。
maxDialog=1（:143）、ask 计数（:144）、codeSync/isolatedDeletes 钉（:123-124 等）与接线钉用例 4 不冲突。建议改判方向：B 的提交在 A 临界段结束后**立即**完成、对话不被饿死、单页保持；精确新措辞待父裁定。

## 父裁定（r71b 后，仅供红后生产阶段；不现在修改）
定性：原 stub 未模拟 SFTP 全球写互斥，"A 真实 execute 在途时 B 也完成另一次隔离/新预检"是与实际资源保护冲突的 **fixture 期待**，不能拿它要求绕过 guard。允许修正这些不可能的期待，但不退役测试/不减少业务覆盖；不以"fixture 无真实 guard 的假世界"放行；原场景本体与可实现性能目标保留，若要放弃真实原需求则停报，不擅降标准。4 条旧期待 → 业务边界与新断言覆盖映射：
1. `:144`（done："确认与提交不得排在 A 隔离之后"）与 `:145`（预检必须在 A 隔离未完时已进行）→ 边界：B 的**新预检/写机械 I/O** 只要求排在 A 自有临界段结束后正确、及时继续；严格断言 B 新预检不与 A execute/status 冲撞；读读仍重叠；不得整 Plan 或 4 lane 全串行。→ 覆盖：红①（忙窗后 B 成功、全程无 busy-reject、enqueue 达成）+ 护栏③（barrier 读读重叠）；`:145` 的字面"忙窗内已预检"由"及时继续+不冲撞"替代。
2. `:166/:169`（双产物 done/确认不得排队）→ 边界："慢隔离不占对话道"意图必须保留：用**已完成预检的 B**/可控 barrier 证明 A 计忙期间 B 的确认仍可推进且 maxDialog=1；ask 不持隔离 IO 锁；confirmGate 不包整链。→ 覆盖：护栏⑥（phase2 人工确认挂起不持机械资源）已钉 ask 侧；生产阶段将本用例改为"B 预检先于 A execute 完成，随后其对话在 A 计忙期间推进、maxDialog=1"（调整启动 barrier + 真实 busyLedger 模型，场景本体保留）。
3. `:183-184`（failAExecute 前判 done"不受影响"）→ 边界：A 失败保留原细节且释放临界段、不取消 B、B 随后独立成功。→ 覆盖：红②（失败释放后 B 成功、忙账清空）+ 本用例保留的 `ISOLATE_TARGET_CONFLICT` 细节与 `isolatedDeletes==0`；done 判定时点移到失败释放之后。
4. 全量保留件（不动）：`codeSync==1`、无永久删除、声明范围围栏、单 Plan 外部 busy 即时拒（新护栏④承载同语义）、跨批不共享（护栏⑤）、上下文取消 check 语义。
另（生产闭包裁定）：legacy.ts:12445 现仅注入 `body.confirmGateLocal`，body 并非必然等同 WeakMap 绑定 message——新隔离读写协调**必须由真实 batch 生产入口接线**；必要时最小修改 legacy 同一批接线块属本根因范围（不开新模块/支路），生产 pendingWrites 因此含 `src/extension/legacy.ts`；测试 drivePlan 必须按真实接线调用既有 batch/端口（现与 legacy 现状一致），生产块若改接线则同步 drivePlan 与现有 VM/最小夹具依赖，不得只给测试 body 塞新 gate 而生产缺线。

## 步骤与验收
A（本块，已授权）：仅本 docs + 扩 `planBatchDispatchFirst.test.js`（opt-in 世界参数，不动既有用例行）复现旧码红 + 过度修正护栏；node --check；report_stage 冻结后交 host 旧码红跑。
B（红后待授权）：生产最小实现（上节范围），同套件转绿 + 上述冲突断言按父裁定文本调整。
C：受影响域 → 完整 Native 验收（tag 413 常规闭环）。停止条件：协调面需要触碰对话道、跨批共享、外部 busy 等待或 SFTP 语义任一 → 停报父。

## 状态（r72d，随块更新）
- A 完成：host 旧码红复核确认新前 2 用例真红、其余 8 绿；case10 首次超时=夹具收尾死锁（非产品），按父指令补一行显式 `releaseAExecute()` 收尾释放，修后 test=`285c12c8…` **字节冻结**至父确认 host 复验完成。
- B 实现+返修+套件更新（r75，待 Native）：src 生命周期/粒度（r74）+ 排队窗口 freshness 契约接线（获准后 batch.verify(body)，r75 父补）+ 套件解冻更新（drivePlan 真实接线、四条旧期待按裁定改写、生命周期与 freshness 两个新用例、接线钉×2），明细见 evidence r75；r73 旧复验 8p/2f/0c、首败保留、r72 计数已订正（7p/2f/1c）。r75b：父裁定 case2"不可确定构造"不成立，已按其预检后本地 save seam 重写为"A execute 挂起计忙期间 B 完成两段确认、B 写段排 A 释放后"的确定时序覆盖（test=945a1f28…），受影响域与输入闭包已列 evidence。
- r76-green/r77b（父回报）：功能域目标 12/12 绿、受影响域 check:dev+定向 8 job+独立 isolateRerun 13/13、编译 387/388（artifactFingerprint=69ed432f…）——**开发局部绿，非 final candidate validated**；C 的完整验收仍待父调度。
- r77 打包合规（本任务内并行块，已授权最小交付修正）：发行包 extension/readme.md 由完整指南改为官方 `vsce package/ls --readme-path` 指向的确定性最小 README（scripts/package-minimal-readme.js 单源），源根 README.md 由 .vscodeignore 实际排除，包内正文由 verify-vsix-manifest.js 逐字节核验（缺失/重复/不匹配拒绝），listing 仅映射该唯一声明生成文件；组装树 fallback 作废。锚点/取证/实施明细见 evidence r77；Native 实测（官方 ls、真实打包 ZIP、受影响套件）待父调度。

