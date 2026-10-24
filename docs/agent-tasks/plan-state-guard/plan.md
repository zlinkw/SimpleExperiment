# plan-state-guard 详细计划与 TODO

修订：r23（R29集中审核返修；r28全量失败不作为完成，先修隔离/覆盖/复用/平台执行，再原生最小核验与完整验收。）
前一阶段摘要：r19-s（r19完成项归档摘要版：主控r19串行交接授权，已验收P0–P9、P11及Linux开发域P12–13详情摘要为结论+归档引用；原文完整保存于 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a），逐字节可取回。目标/非目标/保护、待做P10/P14–17、当前E16/R51–62相关及r13–r19有效指导/授权/完整验收标准逐字未变。新版失败分流已读，本轮无自然触发标未验证。原r19修订正文见同归档。）
负责人：原 CLI 实例 `7d56b783-e8d6-424b-85cb-229863476bcc`；原生 Claude 会话 `7ad89ea3-7db0-49e4-98b1-9081b618c1ab`。
适用版本：worktree `zlk-cluster-orchestrator-plan-state-guard`，分支 `fix-plan-state-guard`，冻结基线 `a7e9c7d35eb49a86447e5546b95ad7ababbba98e`；候选身份见 evidence.md r1 §1 SHA 表。

## 目标、非目标与保护

修复所选 PLAN 提交在 nwpu3 的代码同步前被机器状态映射门禁误拒绝。保留独立端点、实际项目、机器状态目录及祖先保护、未知状态拒绝、批次不回滚和不重复提交。
不修改科研 PLAN/数据/环境、不派发实验、不写外部服务器、不自动部署 Agent、不改清理授权。原脏工作区、其他任务、副本、日志和祖先保留；node_modules 链接不暂存。仅原负责人实现与本地 Git；主控维护本计划、做宿主取证/Windows验收/GitHub操作及最终审核。

## 已确认依据与当前裁定（已验收，摘要）

结论：plan-state-guard 缺陷链（remotePathKey 未绑定被 catch 掩盖 + 旧内存 probe 缺绑定字段致误拒）已闭环修复，经 509dcb03→PR7 merge ab2a1171→v0.5.405 发行；"不接受无条件缺字段放行/Worker id 大小写放宽、remoteRootsEqual 严格绝对路径规范化、有界只读补探测不重放写入、statusGeneration 不充当配置代际证明"等裁定全部落入已审核代码与回归。原1–5条详情取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §已确认依据与当前裁定（关联 evidence 归档 caa14956e710…87826a 的 E01/E02/E05/E07/H01–H04）。

## P0/P1 已裁定（已验收，摘要）

结论：不调用 submissionWorkerProbes 现成内核；新探测按 E14 从目标实际 localForwardHost/localForwardPort/remoteAgentPort 与对应 Worker 配置组装（token 仅现有 header、禁日志），与 targetRootGuard 同有效值来源，只影响本次代码同步准备路径。mtime 重编译不证明 src/dist 一致，F04/F05 后经 P4 编译生成字节比对闭合。原文取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §P0/P1 已裁定（evidence r2 E06/E14）。

## r2 具体接口与执行顺序（已验收，摘要）

结论：codeSyncRootProbeConfig、targetRootGuard(probeOverride)、prepareCodeSyncRootGuards 返回 guards+assertBindingsCurrent 的双重门禁结构、每端点一次有界 GET（boundedPromise 总预算、并发≤2）、syncCodeTargets 写前调用顺序，均按最终实现落地并经 R31/R41 收紧，随 509dcb03 提交、PR7 审核合并。原7步逐字取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §r2 具体接口与执行顺序。

## 实现要求与边界（已验收，摘要）

结论：remoteRootsEqual 双侧 canonical 才比较、targetRootGuard 真实导入+fail-closed、只读补探测先于远端确认/写入、同步 guard 不变为隐式刷新、回归必须执行真实编译 guard/入口且 VM 不注入自由变量——全部实现并经主控 diff 审核（509dcb03，PR7 远端18 blob 逐一相同）。原文取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §实现要求与边界。

## TODO

| ID | 依赖 | 动作 | 验收与证据 | 状态 |
|---|---|---|---|---|
| P0 | evidence r1 | 补 r2 指定源码、异步围栏及 H03/H04；保留完整失败历史 | 结论：r2 E06/E14+H03/H04 采集并哈希复核，exit0；原文 evidence 归档 §4/§5 与 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P0 | 已验证 |
| P1 | P0、GPT r2 | 落定 helper、精确文件/接口及失败分支，更新本计划 | 结论：r2 接口/顺序落定并实施（见 §r2 摘要）；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P1 | 已验证 |
| P2 | P1 | 收紧现候选并加一次只读旧缓存补探测 | 结论：源码 c966021a56831bc7，R31–R41 边界闭合、真实入口回归通过；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P2 | 已验证 |
| P3 | P2 | 补真实调用链回归并登记新测试 | 结论：目标测试 7e3cb2790f4dec78，26/26 exit0，原断言保留（日志见 evidence 归档）；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P3 | 已验证 |
| P4 | P3 | 必需生成/编译与开发域单文件串行验证 | 结论：批18文件192/192、rootMap 14/14、隔离warm 20/20，编译生成字节比对 exit0；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P4 | 已验证 |
| P5 | P4 | 核远端版本后同步唯一 patch/lock/runtime；完整交付验收与打包 | 结论：Windows 完整package exit0（216文件/1676用例，1674过2 Linux-skip），419包项/秘密/平台/版本过，Linux补验过；日志 host-windows/8fccc9e2-…；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P5 | 已验证 |
| P6 | P5 | 主控审核真实 diff，原负责人精确暂存/提交 | 结论：509dcb03160a59867a070bc8dcbb42ef1cd965d1，parent=a7e9c7d3，18文件hash逐一核实，docs/node_modules 未入提交；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P6 | 已验证 |
| P7 | P6 | 主控推任务分支、PR审核通过后合并 | 结论：PR7 远端18blob=509dcb03，MERGEABLE/CLEAN 普通merge，merge=ab2a1171，API/fetch核最新包含；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P7 | 已验证 |
| P8 | P7 | 原负责人参与已登记本机 master/干净祖先仅快进同步 | 结论：master-ancestor 仅ff到 ab2a1171，三SHA一致、tree=509candidate、18实际文件hash同receipt，保护指纹不变；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P8 | 已验证 |
| P9 | P8 | 按项目完成必要发行、一次安装与实际版本校验 | 结论：405 Release/两资产digest/公开发现/一次安装exit0/verify-install 417文件 exit0；运行生效属P10未闭合；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P9 | 已验证 |
| P10 | P9、用户重载 | 确认405运行与最终CLI；最终功能验收转P17 | 00:39Z宿主已证安装/运行405；新配套更新失败F15须修复，不能宣称配套完成 | 待做 |
| P11 | evidence r15/E16h/F16、宿主快照及journal | 冻结新主线身份/保护指纹，原副本创建返修分支 | 结论：fix-paired-update-legacy-lease@ab2a1171，四保护已核，红灯日志 p11-red-pairedUpdateLegacyLease 完整；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P11 | 已验证 |
| P12 | P11、GPT r14–18 | 旧v2兼容、安全读取与PID复用判断；补真实失败回归 | 结论（Linux域）：r22 八输入冻结（UpdateGate d5479982…、legacy测试 31fbde72…），缺根/现代PID复用、侧车并集、严格idle/时间类型、持有证明源码闭合，用户文件不改；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P12 | 已验证（Linux开发域；Windows属P14） |
| P13 | P12 | 开发编译与目标域串行单文件验收 | 结论：tsc exit0（/tmp/plan-state-guard-logs/r21-tsc.log），legacy 35过/0败/1 win32-skip exit0（r22-legacy-lease.log），gate 2过 exit0（r22-gate.log），事务/Bootstrap/未变域按证据复用；原文 archive/r23-completed-summary-20261024/plan.md（sha256=5cdc8900a913…48e37a） §TODO P13 | 已验证（Linux；Windows原生R60属P14） |
| P14 | P13 | 406声明同步、Windows完整package、Linux专属补验、包门禁 | r25 F22返修 Linux域已绿；r27 完成 r21 交集排除79路径（policy单源/双端分类/ignore块/测试10/10、vsce ls 339项零泄漏、verify 255 exit0）与R63 PID域收紧（tsc/legacy39过2skip/gate全绿）；SHA见handoff r27ExcludeR63；待主控原生最小typecheck+默认provider真实目录有界只读复现，再新唯一receipt完整package；未commit | 返修完成待原生最小核验与完整验收 |
| P15 | P14 | GPT审核真实diff，原负责人提交；宿主PR/审核合并 | Linux侧已完成：17文件（冻结8+receipt9）精确暂存并commit 8b47a6c3d7cc6766cbebe3a7f7ae9e0e9f09e0b6，parent=ab2a1171，committed blob逐一等于冻结/receipt SHA；diff存 diffs/r24-candidate-commit.diff；docs/node_modules未暂存；待主控push/PR/审核合并 ；8b47未push，返修不得改历史 | 进行中（暂缓推送） |
| P16 | P15 | 原负责人仅ff同步已登记干净master/祖先 | 冻结/脏副本不动，真实代码与候选核验 | 待做 |
| P17 | P16 | 稳定406发行/公开更新发现/安全安装与用户重载验收 | 保留原冻结405+SFTP108事务，不重复安装405或跳锁；安装/运行/重载分别报告 | 待做 |

## 失败指导与旧证据处置（历史，摘要）

结论：F01–F08 均为已闭合历史失败（F03 为测试夹具误认祖先、保护断言保留；F04/F05 经 P4 生成比对闭合；F07 促成 R31–R33 返修）；旧 shell echo/grep 顶层退出从未充当验收。"每次完整失败停等GPT"流程自 r19 起由新版失败分流替代。完整失败名称/堆栈/退出码/日志取回 evidence 归档（caa14956e710…87826a）§5 及 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §失败指导与旧证据处置。

## r2 测试与交付细则（已验收，摘要）

结论：planSubmissionStateGuard.test.js 真实入口回归 26/26 exit0、projectRootMap 边界、r3 取消硬失败矩阵等全部落地；开发域 18文件192/192、rootMap 14/14、隔离 warm 20/20；测试经 pi-test-evidence 单文件20秒串行、完整日志/真实退出码。"完整失败停等"由 r19 分流替代。原细则逐字取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §r2 测试与交付细则。

## r3 审查与F07后的具体返修指导（已验收，摘要）

结论：R31（全体目标绑定快照+assertBindingsCurrent 遍历全体、resolved 零GET仍围栏、map缺项fail-closed、probe.status==='ok' 才登记）、R32（删除 SENTINEL continue 逃生分支）、R33（端口首声明+Number.isInteger 1..65535、非法不下移不回退）、R34（LOCALAPPDATA 合法进程局部隔离整文件重跑 warm 20/20，不 chmod/chown）全部实现并通过（Linux exit0，隔离环境证据入 evidence r5/r6）。原R31–R34细则与执行批次取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §r3 审查与F07后的具体返修指导。

## r4 收口指导 R41（已验收，摘要）

结论：三项小改（targetFields 快照纳入 enabled 并拒绝 target.enabled===false、所有目标在 guard 冻结前要求 effective 有效、探测回执单独验证 status==='ok'）与空白端口断言均已由 evidence r5 闭合（22条回归）。原文逐字取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §r4 收口指导 R41。

## r5 P5a：唯一版本、真实命令清单与Windows冻结交接（已验收，摘要）

结论：0.5.405 唯一版本同步（package.json/package-lock/RuntimeManifest.ts，未手改生成物、未 npm version）；package 链展开为 package-test-inventory.json 216唯一文件/0重复；host-handoff.json 冻结交接；干净祖先副本缺失如实上报后由 r8 授权登记。主控回执 df5fb544-…receipt.json、日志 host-windows/8fd20d79f2bc5…。原授权细节取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §r5 P5a。

## r6 / F11：Windows完整验收失败后的具体指导（已验收，摘要）

结论：F11（planJobDeleteRequeue.test.js:158 并发双击用例，首轮 Windows package exit1，真实日志 host-windows/bc349c92-d20d-4638-8f72-805bfb693739-{stdout,stderr}.log，1270行）确认为 fixture setImmediate 同步缺口；按批准仅加 previewEntered 一次性 latch（新测试 SHA256=3ed4e6ce58cc93dabd445c868a6eba6792e449a6d8f38973a012d2c6ba72a6f5，7断言全保留），Linux 修复域 exit0（/tmp/pi-test-4ob6eiar），r7 审核通过、r8 Windows 重跑通过。原指导全文取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §r6 / F11。

## r8：P5 Windows通过，P6与本机祖先登记授权（已验收，摘要）

结论：Windows 完整 package 第二轮 exit0（216文件/1676用例：1674过/0败/2 Linux-skip，日志 host-windows/8fccc9e2-923b-44d8-b436-78cde9d998be-{stdout,stderr}.log）；VSIX 2603277B SHA256=0c1504047112a7978ec6e296d483b674547a633af752a4ebdb919e446d9a8db9；内容策略419项、README 链接重写工具链期望修正（期望文件 SHA 17abaf61…，未放宽任何门禁，首次失败 140846a2… 保留）；9生成物同步回任务副本、Linux 专属 cacheRetentionBatch/incrementalMetadata 补验过；18文件精确提交 509dcb03160a59867a070bc8dcbb42ef1cd965d1（parent=a7e9c7d3，未push）；/repos/MCP/zlk-cluster-orchestrator-master-ancestor 双角色登记完成。原授权细节取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §r8。

## r10 P8：已合并后的本机快进同步（已验收，摘要）

结论：PR7 于 MERGEABLE/CLEAN 普通 merge=ab2a11711a7c1f702f7327be81cd829165f3d52e，GitHub 实际18 blob 与 509dcb03 逐一相同（issuecomment-6374857534）；master-ancestor 副本 git merge --ff-only 后 refs/heads/master、副本HEAD、origin/master 三SHA=ab2a1171，diff/cached/porcelain 全空，18文件实际 hash 与 receipt/handoff 一致，原脏树/他任务指纹前后不变；日志 host-windows/fcfd4346-7df6-4de6-8a51-39246ce9b13e-{stdout,stderr}.log。原文取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §r10 P8。

## r12 P9最终事实与P10用户重载边界（P9已验收摘要；P10未闭合事实保留）

结论：v0.5.405 Release 已发布回读验证（tag=ab2a1171，draft/prerelease=false，VSIX digest=sha256:0c150404…、.sha256 资产 97B digest=fe509736e707c0ed780de345d3fca8e732f7d18fb0f37662579ac2ed4125b46b，日志 host-windows/bbb0d6d9-…，receipt /host/c/Users/ZLK/AppData/Local/Temp/plan-state-win-6m6MEH/release-receipt.json）；ReleaseClient 默认公开 fetch 发现 405 精确资产 status=update_available（93d862de-…）；install:latest 一次 exit0 安装405未重载（f5438d45-…）；simpleex --help 身份握手 exit2 证明运行仍403（af68c96c-…stderr），未改源码/绕握手/重装。**未闭合（属P10）**：用户尚未 Reload Window，不得声称运行已405或CLI功能正常；固定 verify-install exit0、417文件对冻结VSIX通过（delivery-check/73975034-…/receipt.json，日志 eb2c5d48-…）。原文逐字取回 archive/r23-completed-summary-20261024/plan.md（原SHA 5cdc8900a913…48e37a） §r12 P9最终事实与P10用户重载边界。

## r13 F15 返修实施计划（以本节为当前授权）

依据evidence r14/E16及宿主00:39Z全335记录：79个合法旧v2根无processId；其中3条有旧lease，14764已被新Code复用。补证 `/host/c/Users/ZLK/AppData/Local/Temp/paired-update-extra-jVwtW7/evidence.json` 含旧windowId/三条lease时间；`paired-update-journal-phngXn/evidence.json` 证实journal failed、installationRequested=false、completed=[experiment]，冻结SFTP108的SHA ef6c561e8804e00437aa349a2fb605561569cc3db1d45d0d4dc20fdd27dc09ac；不改数据库或journal。两文件同在 `/host/c/Users/ZLK/AppData/Local/Temp/`。宿主fetch/API日志7a652b22-7a11-4e79-b15c-6fc3bd613688确认最新master=ab2a1171、Latest405；本机509分支/索引未动，宿主Git阶段已结束。

1. 原负责人先核Linux node/Git定位、原脏树/祖先及当前509指纹，确认tracked干净，保留未跟踪证据。在同一原任务worktree创建不存在的 `fix-paired-update-legacy-lease`，从完整ab2a11711a7c1f702f7327be81cd829165f3d52e起步；旧fix分支509和原a7冻结身份不改，独占元数据写入。无reset/rebase/repair。新基线/分支写证据。
2. 安全reader：优先将ResourceOperationLease私有readRegistry现有完整安全读取原样抽成可复用导出（或独立core模块），返回record+mtimeMs供gate使用，manager协调/写入/过期/冲突语义不得变化。保留无链接/多硬链/大小/句柄身份/读取中变化检查及有效lease.resources约束。gate读取主文件；损坏时仅按现有ownership恢复规则取可信侧车，双缺失仅处理已被原子消费的空槽；未知记录阻断。扫描不可忽略可能活跃的ownership孤槽。禁止清理或改写任何用户租约。
3. UpdateGate兼容：保留构造第二参数ownerAlive注入，新增可选依赖供测试。显式有效根PID优先；仅根字段确实缺失时，从历史windowId的严格正整数PID段恢复，核对非空lease的PID/windowId一致。非法显式PID/未知身份/矛盾字段拒绝，不能任意fallback。正确理解choosing/ticket/admission及非空leases；真正已释放的空闲记录不阻断。活主即使心跳过期仍等待，不能仅凭expiresAt或mtime超时放行。
4. PID复用：只在已获退出证明时判旧主不存在。默认ESRCH可证退出；活/权限未知时，Windows以一次有界异步批量Get-Process读取所需PID的真实StartTime（纯正整数参数、timeout/输出上限、无命令注入、不安装工具）。仅当该进程启动明确晚于此快照的文件mtime、所有有效lease时间、admissionExpiresAt的最大界限并留精度余量时，证明其不可能是旧主。记录含缺失/非法时间或探测失败不冒充退出。其他平台无可靠时间来源则保守等待；注入map覆盖跨平台单测。只有明确的旧主退出证明可缓存，其他探测不无界重试；取消信号贯穿读取/探测/等待，原300秒总预算不扩大。
5. 回归先补正确接缝：旧v2空闲/choosing崩溃/3条非空旧lease；PID真死、复用真新、仍为原主、未知/拒绝访问；非法/冲突PID、坏JSON/链接/硬链/过大、读取变更/侧车异常；断言不修改用户文件，活主过期仍阻断、取消不中断传输、新入场被关闭。既有expired-live夹具若不符合真实schema，补齐windowId/resources等，不删断言。事务测冻结405+108、Experiment已405或更高时只补SFTP，失败不回滚/不重复安装、不替换批次。原失败红灯作为预期证明必须先保存并报GPT，等新指导再改生产码。
6. 新原生进程时间 helper只供更新gate，不扩改远端Agent/队列/业务锁规则。开发使用已有tsc+目标域、单文件20秒串行证据入口；遇完整失败先F编号/日志/退出码并停等指导。完成P13交精确diff、SHA、映射/清单及Windowshandoff，主控接宿主验证，原实例保留返修。版本目标406，package/lock/runtime一次同步后最终验收与打包；新代码不能复用405通过证据。最终发行/安装前另核公开Latest、原冻结事务与真实租约安全状态；不自动重载活动窗口，不重提PLAN，不写服务器。

主控最终审核与合并授权沿用。无需用户额外操作；运行生效/配套安装事实未确认前不得报告全部完成。

## r14 F16红灯后的具体指导

主控已精读新9项回归、原gate夹具与完整红灯日志；F16是预期证明，允许现在修生产，不重复跑原样红灯。P11分支/基线与保护满足计划。按r13连续完成P12/P13；无新失败无需逐步请示。完成后同步406的package/lock/runtime并准备精确Windows交接，Linux不运行Windows package/安装/远程Git。

- 构造第三参数沿本轮测试接缝 `{processStartedAt(pid):number|undefined}`，可另增批量provider注入；生产默认必须先收集候选PID再一次有界异步Get-Process批量查询，不能每文件spawn或读取主控历史快照充生产依据。Windows首轮探测、异常/未知/取消/输出越界都须测试；未知时间不能伪装成退出；3e5ms等待总预算包含探测时间。复用证明用实时快照有效mtime/租约时间/admission上界+精度余量，非单个日期/过期即退场。
- 明确保守规则：根PID缺失的旧记录即使leases空且flags为零，在ownerAlive仍活/未知且无可靠复用证明时继续等待（9项第6例）；可验证已释放的正常新根不阻断。缺字段不再等于损坏；显式非法值与字段矛盾明确拒绝，不能fallback掩盖。根与内层PID/windowId一致性、严格历史PID段、schema/resources安全读取、侧车及未知活动保护保持r13。
- 新回归异步收尾：LIVE/pending用例必须在finally取消并await原wait Promise结算后才结束；不能靠after移除目录令等待意外成功，或让force-exit掩盖悬空任务。只读守卫在修复后也断言gate成功而非catch吞错。补至少一例非ASCII测试主机名（不硬编码真实宿主身份）；保留原两项断言。当前F16夹具的只读守卫不承担功能通过证明。
- 除原9项绿灯，补计划r13安全边界（尤其孤ownership、损坏双槽/读取变化/链接/多硬链/大文件、探测失败、原主晚心跳与PID复用反例）及事务405已完成/更高406时只补108且不重复安装的回归。不得为了绿灯删断言、修改实际协议或跳过未知锁。新增测试在npm链只登记一次，展开嵌套去重。
- 新抽reader若改ResourceOperationLease，仅语义等价委托，不修改其admission/TTL/冲突/回收；根据实际反向调用者扩展host/resource lease域。reader/StartTime/helper平台命令的精确接口、bounds、测试清单与diff均入证。每次完整验证失败保留退出码/完整日志，先通知GPT等新指导。

P12–13交付须带：当前branch/HEAD/common-dir/index/活动写入者、基线ab2、所有变更/新增/必要生成物精确路径和SHA、开发测试文件清单/命令/退出码/日志；版本406全部声明一致；沿用现有host-handoff与package-test-inventory脚本，增量更新而非另写整套验证程序。Windows阶段仍由主控在原独立native验收树中执行，失败回原实例。

## r15 R51–58：F17候选审核返修（完整package尚未开始）

主控已精读两生产文件及全部新19例/原gate/交接。F17的tsc首跑TS1005 exit2虽已保留，但应失败即停等GPT；以后不得自行修后继续。当前已完成证据按实际内容复用，不为流程惩罚重跑无关域。Linux stage/commit仍由本实例在后续明确授权后执行，不转给主控；主控仅Windows/GitHub与审核。

R51 必修：defaultStartTimes当前Get-Process Select-Object Id,StartTime转JSON在本机返回 `/Date(1792803730983)/`，Date.parse=NaN（宿主真实只读日志985ce89f-65e7-4af9-b95d-1f97d5ad555a-stdout.log）。改PowerShell显式输出可信epoch毫秒（例如DateTimeOffset.ToUnixTimeMilliseconds）或明确ISO UTC再解析；不能只测注入Map。加默认命令/解析真实格式边界单测，Windows默认provider正向测试用本测试Node进程PID与足够旧合法快照，必须真实放行；Linux按平台明确不执行原生Windows项。

R52 必修：当前explicit分支直接continue，256个有根PID的旧记录仍遇PID复用。宿主6397137489...json根PID35152/ticket1已由新Edge identity_helper复用；不能只修79个根缺PID。统一对所有有持有迹象、owner活/未知的可信记录使用相同StartTime退出证明；正常有显式PID的已释放空闲记录不阻断。补现代根+旧lease/choosing/ticket的PID复用放行、原主不放反例。严格区别真正ESRCH与权限/未知。

R53 必修：gate仍只枚举64hex.json，新增测试反而宣称忽略孤ownership，与r13/r14相反。扫描主名与合法64hex.json.ownership的去重并集，传基准主路径给安全reader；活跃/未知孤侧车必须等待，损坏孤侧车必须拒绝，死主可信孤侧车可过。writing与无关名字仍不当完整声明。修正helper注释与错误测试，不改变manager原协调遍历语义。

R54 必修：`explicit = processId!==undefined && processId!==null`把显式null偷变旧格式；只在根key确实缺失时恢复。显式值须安全范围正整数；内层存在但非法/缺PID/windowId、与根恢复PID矛盾一律未知/拒绝，不是best-effort忽略。复用证明的时间不得`Date.parse(...)||0`：活动lease缺失/非法时间、非法admission、未来StartTime、超范围数都不能用不完整上界证明退出。补null/string/负数/零/超大PID、内层非法、坏/缺时间、未来时间及边界5s反例。owner确定ESRCH的完整合法旧记录继续可过，不扩宽未知路径。

R55 必修：取消信号在await reader/probe后及return/注册等待前重核，防已取消时仍放行或丢中止。probe timeout取8秒与300秒剩余预算的较小值，探测耗尽总预算不得另加8秒；默认异常保持unknown，外部取消必须按原reason及时结算。等候预算检查覆盖读取/探测。mock不要真等300秒。

R56 补原计划未完成安全门禁：链接/多硬链/过大/读取中变化、孤侧车、探测输出异常/超时/中止的真实断言不能靠Map注入绿灯替代。可复用核心已有同范围、同字节、完整日志证据，不能声称没有执行的覆盖通过。新文件20秒总预算，pending先进入点闩后短时观察并finally abort+await，避免新增许多900ms等待把Windows单文件拖过20秒。

R57 现批量测试随机hash文件顺序却断言PID数组固定[31337,31338]，存在偶发失败。生产批量去重后按数值排序，或测试比较集合；必须验证一次覆盖所有候选、不依赖目录顺序。F17 readonly/pending收尾改进保留。

R58 原实例将真实git diff（含新文件正文/精确SHA）保存任务证据目录可供主控审核，不提交证据。按上述修后编译+相关gate/legacy/transaction/Bootstrap及实际改动波及域重验；core未变化的有效原记录可按范围复用。更新handoff和inventory、版本406仍一致，Linux过渡生成物不可称最终包。完整失败照规范更新F并停等GPT；成功才交原native Windows验收，勿再将本轮候选称全部完成。

## r16 F18指导与R59–62（原负责人继续，不新建实现者）

已读r19完整UpdateGate、29项日志及关键测试：唯一已执行失败为/Date(ms)/正则转义次序，现有保存正确。批准将 `/^\/Date\((-?[0-9]+)\/\)$/` 改为 `/^\/Date\((-?[0-9]+)\)\/$/`，保留断言，不再跑原样失败。在同轮修完下列已读源码确定的问题后再编译/验证；不必制造额外预期红灯。

R59：现循环只验证lease.processId合法，却没将其数值与rootPid直接比较，旧反例碰巧被windowId推导挡住。必须显式比较 `lease.processId !== rootPid`；补root/windowId都31337而lease.processId=41000且lease.windowId保持同根的两例（根有PID与历史缺PID），ownerAlive=false也必须拒绝。不得拿windowId比较代替真实数值比较。

R60：当前所谓“Windows默认provider正向”实为注入自行JSON.stringify的StartMs并根本未spawn，不是原生测试。将其如实命名为注入解析测试；另加真正仅win32执行、非win32 t.skip的测试：真实process.pid+旧快照，`new UpdateGate(leasePath)`不传provider，让默认powershell完成StartTime正向。非win32默认分支测试也仅在对应平台执行，不能让Windows依赖fake PID31337恰不存在。安全链接夹具Windows若缺file-symlink权限，采用不提权的隔离目录junction拒绝验证，并保留Linux真实file-symlink覆盖；不可让权限前置失败拖进全量。明确平台覆盖，不模拟Windows通过。

R61：proofBoundMs不能把缺admissionExpiresAt注释成默认0，活动choosing/ticket记录缺该值应无退出时间证明；负数/无效类型同样unknown/拒绝。只有字段完整可信的正常explicit released idle才可以快速跳过（choosing布尔、ticket非负安全整数、admission合法）；坏/缺形状不得当已释放。现安全测试说hostOperationLeaseReadOnlyView覆盖读取中变更不属实：主控已读该文件，5项是UI只读不占写锁，没有这项断言。补共享secure reader实际读取过程中字段/mtime变化的定向测试（可在隔离夹具通过handle.read闩触发真实文件变化；不影响其他用例），纠正覆盖说明。

R62：r19 wait循环移除了原 `await this.held?.assertHeld()`！必须恢复每轮入场及最终放行前的持有证明，探测后亦核当前升级门仍归本次；否则升级锁被换后仍可能继续安装。加真实临时gate.begin、丢失/替换其v1租约后wait拒绝且不安装的回归，原传输继续/取消保护保留。可选deps/onPoll仅测试观察不能成为绕过held检查的路径。

顺便消除R55测试“60ms内必须探测”墙钟假设：用probeEntered闩确认进入，finally取消并await，不留悬空Promise。时间helper接受值须安全整数epoch、<=当前时间；probe运行前后/注册sleep前取消与预算保持。真实Windows完整package尚未开始，Linuxcore未改且证明输入不变的已过域仍按边界复用。修后tsc→legacy/gate/transaction/bootstrap受影响域→handoff/inventory+真实diff；任一完整失败照F流程停等。

## r17 R61最后两处准确修正（其余r20逻辑保留）

主控已核r20 gate原文/身份/持有证明/35项及8输入handoff；native验收树只读预检通过c93fe6fb...，尚未复制或执行package。为避免模糊“完整shape”再遗漏，具体定义正常已释放explicit idle：`record.leases.length === 0 && record.choosing === false && Number.isSafeInteger(record.ticket) && record.ticket === 0 && typeof record.admissionExpiresAt === 'number' && record.admissionExpiresAt === 0 && typeof record.windowId === 'string' && record.windowId.length > 0`，加hasExplicit。现仅every(hasOwnProperty)仍会把choosing=null、ticket=null、admission=null等当正常并跳过。原式替换为上述严格判断，未知类型不经idle快道；proofBoundMs的admission亦只接受非负安全整数epoch（0合法），负数/字符串/缺值都无退出证明。补坏类型及负admission成组反例，原正常explicit idle正例保留。

现名“读取中真实变更”测试只是返回Object.assign伪造stat，不是实际文件变化。无需改production reader；在测试patched handle.stat第2次先对该隔离file执行真实utimes（例如mtime加5秒），再调用原realStat，确保读取前后真正不同且reader拒绝。测试隔离/恢复patch不变，文案/证据如实。

只动UpdateGate及legacy测试，版本/核心reader/事务/Bootstrap不扩改；tsc+legacy/gate两文件串行重验（相关输入改变所需重验），有效其他域记录复用，更新handoff/diff/evidence后立即停止源码写入交宿主。失败仍F流程。Linux后续提交仍待主控Windows成功后的精确授权，不替主控安装/远程Git。

## r18 F20指导

主控已精读r21全失败日志与L317–338：mtime保留亚毫秒，而Date截断亚毫秒造成附加佐证相差0.347ms；`assert.rejects(/变化/)`和statCalls>=2已通过，生产不再改。批准仅把佐证改成 `assert.ok(Math.abs(fs.statSync(file).mtimeMs - (Math.round(originalMtimeMs) + 5000)) <= 1, '文件mtime必须被真实修改（容忍Date/文件系统亚毫秒精度差）')`。1ms容差仅属fixture时间取整，不放宽生产读取中变化/五秒PID证明等断言。重跑legacy+gate两文件串行，失败仍完整F停等；绿后冻结8输入SHA、handoff/inventory/diff/evidence交宿主立即完整package。

## r19 当前交接与新版规则

用户本轮明确批准仅对继续中的原任务应用新版调度；主控已完整读取新版SKILL及references/documents.md。原实例/原生会话/模型强度/并发3不变，不重启、不迁会话、不测速。自本节起失败按新版分流：证据唯一明确的机械语法/拼写/已核参数或映射错误，同一失败链允许一次最小自修并受影响复验；成功并入正常交付且不单独唤醒主控。原因不明、一次自修仍败、逻辑/安全/跨平台语义/接口范围改变先报证据+建议等GPT指导。保留首次错误/完整日志/真实退出码；无断言/门禁降低、无盲装、无未知写入重放。旧节“任何失败均等GPT”在此前时间有效，自本节起由新版替代，不重做过去尝试。

主控本次明确交出plan.md r19的状态/完成项维护权：此后不并发写该文件，待原实例归档/摘要报告后再明确接回或通过send更新事实。可摘要已完整验收的P0–P9、P11，以及仅Linux开发验收完成的P12–13；P10最终运行/CLI未闭合、P14–17待办、当前相关E16/R51–62原文和有效指导/授权/验收标准必须保留。先用当前技能code_evidence.py archive保存当前evidence/plan/存在元数据到唯一修订，再verify-archive；成功方可摘要完成项，留任务/代码与版本/测试命令与平台/退出码/风险/完整日志+精确归档章节及文档SHA。不能把Windows未执行写成已验。摘要结束核原文能按manifest取回，原文件/日志历史不删；归档失败停下仅保留结果，不覆盖活动文档。

业务源码/测试/版本/冻结8输入、handoff/inventory不再改，Linux索引仍空。该文档整理不读取native正在生成的产物，也不执行任何测试/Git写入，不影响宿主原native完整package；Windows/GitHub仍主控。记录实际新规则已读、归档校验及活动指导保留；本轮尚未出现新规下机械自修或逻辑升级的自然触发，先标未验证，不制造错误或新验证任务。

## r20 F22真实Windows持有者判定返修

实景只读wait(12秒)超时exit1，未begin/end或写用户数据：日志host-windows/0eadac7e-d1a6-44f5-8c07-84278fa29002-stderr.log。定向证据 /host/c/Users/ZLK/AppData/Local/Temp/paired-update-win-KbNMce/real-lease-unresolved.json：337槽无读取错；3个PID StartMs证实复用，另25244/42872被Node报EPERM且Get-Process缺行；原批量exit1虽有3个有效epoch，catch整批unknown。完整System.Diagnostics.Process.GetProcesses枚举exit0、540 PID且查询自PID56524在表，确认两PID均不在场；日志0ae908cb-3f33-4f87-a4cd-7b6070b15159-stdout.log。不能将EPERM、单目标缺行或失败查询直接当退出。

1. 原负责人仅改UpdateGate默认Windows观察/解析/依赖类型及回归；版本406、核心协调/TTL/用户文件/冻结批次不改，保留8b47历史。一次有界异步PowerShell完整GetProcesses快照，校验非空且含查询$PID；逐在场目标读取StartTime，单项拒绝只令该项unknown。foreach不用只读变量$PID。保留防注入整数、单批、1MB、min(8秒,剩余预算)、取消/持有证明。
2. 信封如{schemaVersion:1,complete:true,queryPid,processIds,rows:[{Id,StartMs}]}。仅命令exit0且信封完整、全集ID合法(允许系统PID0)、queryPid在表，才将请求PID不在全集生成'exited'。空表/缺自PID/坏ID/失败/超时/截断/非零退出+部分stdout均无退出证明。旧数组/单对象只能提供时间，不能凭缺行断死。
3. Map类型可扩number|'unknown'|'exited'；可信exited同ESRCH，仍在场却无StartTime必须等；时间复用保持全部上界+5秒，原schema/身份/idle/侧车/assertHeld保护全留。
4. 回归含一批3有效时间+2 EPERM但成功枚举缺席可过；在表却无时间/枚举异常或伪完整都必须等。真实win32例可spawn短命Node(10秒内、status0)记录退出PID，再用旧快照、ownerAlive注入true模拟EPERM但不注入provider，验证默认枚举；若PID已复用则新StartMs应正确证明。非win32明确skip，原R60活PID正向保留。接口断言因本节批准语义更新，不删覆盖。
5. Linux编译+实际影响legacy/gate/transaction/bootstrap；更新测试域/唯一清单/handoff。新输入须主控重新完整Windows package/归档/真实目录验收；旧通过不能充新证据。旧VSIX/SHA由主控先独占留存，未发布406不加号、不覆盖历史证据。当前先不提交新修改，待新Windows权威生成物后普通追加commit，不amend/reset/rebase/push。

新规则照常：机械唯一修正同链一次；逻辑/安全/跨平台/自修仍败先证据建议。F22属正常任务自然发生的跨平台升级。主控首次文档写前UID断言即停(未改文件)，现用已核node降权写入，uid/gid/mode/inode保留；不chown/chmod。你摘要中的字面量“+ARC+”未展开，请机械填实为archive/r23-completed-summary-20261024/plan.md及原SHA/章节，不改有效指导或重做归档。仅原实例继续实现，成功交接前冻结代码；无新Windows/远端授权给千问。

## r21 正常交接：最小原生核验前置与收包范围

已读新版SKILL“GPT详细计划与执行”的真实平台故障顺序。r25 F22源码9c7b2bf4/test ac1d6156及tsc、legacy39过2原生skip、gate/事务/Bootstrap全绿可作当前Linux证据。新增包调查见evidence“包耗时/收包范围”与/tmp/psg-pack-probe3.{py,out}，未改包规则。

### 耗时结论（既有日志，不测速）

217个单文件串行测试报告duration_ms合计342.947秒；setup→package-run记录399.782秒，余56.835秒含编译/npm/生成/打包，测试段占85.78%。工具总约6分52是更大边界，不能混算。旧405的216个文件测试报告347.007秒，当前并非新增明显测试时长突变；更早“很快”缺同环境同入口完整时序证据。原日志没有分段timestamp，不能断言杀软、启动或zip单项占比，也不承诺缩包后提速比例。依据host-windows/c324ece4…、8fccc9e2…及诊断linux-bash/9800028b-a6a5-4830-9d67-a37969d50f4e.log。请将调查中的“启动开销第一嫌疑/线性相关”保持假设，不当已证结论。

### 本轮范围与具体修改

1. 不合并217测试进程、不删测试/改断言/去强制域，不加增量tsc缓存或bundler，不改package/build命令。减包目标是运行文件闭包，不把source test运行误称入包扫描；现docs/test/src已实证不入包。
2. 84候选只批准排除“静态入口+已证动态锚全传递闭包之外，且无计算路径加载可能”的交集。现probe3仅require字面量+basename含.js字符串扫描，尚不能证明require(name)/module.require/createRequire别名、拼接路径、Worker/spawn/目录枚举等；先定向检查可达JS中的这些非字面量点（可用已安装TS AST），按源函数/参数归属证实是外部项目路径还是本插件dist路径。不能定界的目录/候选保留并报告；不凭未搜到文件名删。固定保留4个KEEP-REVIEW、所有legacy运行部件、CLI/shim、Worker、生成输入JS、24非JS、法律/工具链README/模板。已证候选以/tmp/psg-pack-probe3.out逐项清单为上限，不额外扩大。
3. 内容数据单源：scripts/package-content-policy.json新增精确paths规则（建议forbidden_ordered category=unused-compiled，paths为原大小写真实相对路径）。JS与Python分类器仅新增规范化后的exact paths相等判断，不用basename/宽泛目录前缀。把同一数据列表生成到.vscodeignore独立标记块（本次生成静态配置，不新增npm钩子）；测试强制该块与JSON列表一致，防两处漂移。源码与磁盘dist保留，只改变发行选择。
4. 扩现有packageContentPolicy.test.js，不新登记重复文件：所有排除路径及大小写/extension前缀/反斜杠规范化JS/Python等价；相邻合法名字不误拒；ignore块与单源一致；静态闭包、动态保留锚/Worker/CLI/必要资源不得与排除列表相交。生产verify-vsix-runtime与实际vsce ls/最终ZIP门禁保持。更新handoff精确新增变更输入，package-test-inventory按实际package SHA核零重复；不改版本406或现有217测试入口。
5. R63解析成员顺带收紧到已声明合法PID域（成员允许0，否则validPid；queryPid用validPid），避免Number.isInteger(1e20)被当OS合法PID。保留其他已通过逻辑，补过大/非安全整数拒绝信封，不改退出证明规则。

### 执行/验收顺序（不可倒置）

原负责人连续完成补查→上述已证交集排除→Linux必要编译/影响域（gate legacy、包策略及实际反向调用者）与材料。通过后冻结输入，由主控先同步到原native树、只运行必要typecheck，不跑完整build；用既有最小原生默认provider/实际337槽目录wait有界只读入口覆盖3个复用+2个EPERM退出组合。成功再跑新候选完整npm run package；未知/仍有真实持有者则停报，不改锁/清理/忽略失败。该顺序调整不另造装饰检查，不重复F22调查。

旧VSIX/SHA已独占留存 /host/c/Users/ZLK/AppData/Local/Temp/paired-update-win-KbNMce/f22-preserved-original-package/（sha9f4ed70b…），下一完整候选使用新唯一receipt/日志；旧通过不可冒充新完整验收。新代码后按项目完整门禁仍重跑。当前不commit；原8b47保留，等新Windows最终生成物同步后普通追加commit。材料冻结时给可复用当前事实/未验范围与执行清单，不再生成长报告。新失败分流/原实例/并发/权限和科研边界不变。

## r22 构建/测试执行改造（最新用户授权，覆盖r21不改命令的旧范围）

保留8b47、当前F22/79项收包候选、原worktree/分支/祖先，不新建副本或写者。406版本保留不再递增；P17发行/安装本轮暂停。全局build-test-delivery适用于所有开发项目，具体79/84清单仅留本任务，不巡改其他仓库。已读新版SKILL与引用。当前无活动测试，原实例idle/r27完成，允许自然续接。

### 先补主证据，再按以下计划连续实现

复用r26/r27与217去重清单；只补现有acceptance.js/npm-command.js/prepare-wsl-tests及npm脚本、钩子、原test与features的glob覆盖/参数、资源分类、已见外层退出码掩盖证据。acceptance现重复build→test→features→package，完整输出仅compact到latest且旧CLI status已退役；保留有效lint/语法/依赖/文档/CLI门禁，不忽略旧失败。找不到的run-windows-flow-incremental.js不是已核入口，不猜接口。关键正文/版本/退出码留证。

### 原命令→新入口与覆盖

- typecheck保留原tsc；新增compile=必要tsc/现有生成/语法，无全量测试。
- build保留“编译+原build覆盖”；原test:*、npm test/test:features/test:scenarios保留名称、glob与必要参数，但递归展开后每实际文件仅一次，不能把npm test的更大覆盖缩成package子集。
- check:dev=compile+显式影响域；check:full=compile+原package全部217及新增runner回归；package保留完整验收+原包门禁+组装，不降级。package:assemble可单独组装，但须校验当前完整通过receipt与全部输入/产物匹配，缺失/失败/未知拒绝，不是绕过门禁入口。
- acceptance改为同一清单的原全覆盖并集+全部有效非测试门禁，非重复串套入口；已退役CLI检查须据原意迁移成有明确证明的合法隔离契约，不在用户实际实例试旧命令；不确定则升级主控。

### 单一清单与调度接口

建议scripts/test-workflow.{js,json}（可复用实际已有模块），package各入口使用同一个planner/runner。清单含规范真实path、argv/必要矩阵、原npm与pre/post来源、profile、资源组、独立性依据、输入指纹；参数差异保留在同一文件条目的矩阵。递归npm/glob/hook、环/缺文件/未知shell语义均显式判定，不能猜或漏覆盖。当前相关pre/post/vscode:prepublish为空；执行器不得把npm已执行的自动钩子再执行一遍，新增未知钩子要阻断而非隐式绕过。保存改造前后文件/参数集合对应表。

初始全局最多2个文件作业，默认未知=exclusive串行。仅源码/夹具证实不共享目录/产物/AppData/端口/数据库/服务/Git/可写缓存的白名单并行；Python/多进程夹具、实际系统状态及项目强制项先exclusive，独立性扩大需实际证据。保留每文件Node进程隔离与20秒预算，不用isolation=none。原P0手工入口串行不放宽；本任务用户批准的白名单仅在受控runner内部max2，说明依据与实测，其他条款不改。多批次同工作副本不得各开2倍增；建立安全的同根协调，另一批拒绝或排队而非放大，不碰真实AppData租约。跨端由现有交接串行，不同时在两端开测试批。每个子项记录真实spawn/完成/资源占用与独占日志，等待全部已启动子项结算。

### 证据/复用/排除

stdin/stdout/stderr与cwd/argv/平台/工具链/输入哈希/实际启动次数完整独占留存；内层、聚合与提供的外层入口均保真实非零，禁止尾echo/grep变0。失败/超时/取消/输入漂移/未知都非通过；只终止自己确认拥有的测试树，清理未知先停，不能释放未知资源后启动下一批。

不默认启用增量缓存或新依赖；可实现受控receipt复用，但键含源码/测试及依赖闭包、脚本/lock/配置/版本/生成输入/参数/平台工具链和相关环境、产物哈希。缺口即重跑，最终强制覆盖仍执行；真实进程/租约/网络/安装状态永不缓存。稳定块立即目标回归，后台仅稳定隔离输入/产物且确有独立工作，不裸后台/轮询/新代理。

复用现有79项打包排除与原84候选证据，每轮compile/package前按入口/引用/锁/配置/生成规则变化增量核闭包；同输入不全仓重扫。增补测试依赖/平台/兼容/注册证据以区分compile与package适用范围；未证编译可排除就保留原类型检查/编译，不能因未入包就不生成测试所需模块。源码/test/旧入口不删，未知保留；实际vsce/ZIP闭包门禁照旧。

### 验收与交接

原负责人补证据后连续实现，不逐步骤请示。必要脚本/清单/配置与说明、原有包策略可改；业务逻辑不再扩大。用正常runner回归夹具证明：去重+必要参数矩阵、两独立文件真实有界重叠、共享/exclusive互斥、多批不能倍增、并行全部结算、子失败及聚合/外层均非零、超时/取消/未知非通过、日志全可取回、输入变化失效。这不是模型测速，不生成测速任务。新增测试登记一次。

Linux目标域过后冻结精确全部输入交主控；Windows先必要编译+已有默认provider/真实337槽目录有界只读核验（3复用+2EPERM组合），未知/持有停报不改锁，通过后最后候选完整执行原package覆盖及所有门禁。新脚本真实文件启动计数与npm内部无重复必须对账。原负责人Linux Git/交付材料不转主控，Windows仍主控host_windows；Git/PR最终审核流程保留，不发行/安装，不代替千问实现。失败按同链一次机械修复/语义升级规则处理。当前计划维护状态权交原实例，主控此后不并发写。

### r22-T 交付计时（用户最新要求）
最终报告优化后的成功完整npm run package实际墙钟时间，包含编译/完整规定测试/包门禁/组装，不只报vsce或测试耗时之和。新runner按单调时钟记录总起止与compile/检查/组装阶段，标明实际文件数、并行上限及覆盖；并行子项duration之和不能冒充墙钟。主控Windows正常最终验证采集完整日志/真实退出码，不额外测速。旧约6分52为工具外层边界，399.782秒为旧命令记录边界；只有口径一致才算变化，有输入差异则明确不可严格比较，不承诺比例。

### r28 执行状态（2026-10-24，原实例维护）
上述 r22/r22-T 已在 Linux 全部实现并目标验证完成（详见 evidence.md r28 节）：单一清单/runner、max2 白名单并行、同根第二批拒绝、真实退出码/独占日志/单调分段墙钟、assemble receipt 强制校验、acceptance 并集重写、79+84 排除沿用未动、npm test/features 覆盖保持盘上并集。夹具 10/10；真实 package 215/218（3 个 Linux 平台固有失败有旧参数串行对照证据）。发现并保守处置一个 src 内计算固定端口的并行竞争类（LatestResultExport，分类闭包，业务代码未动）。未 commit；下一步按 r22 顺序：Windows compile → 337 槽只读核验 → 完整 package 采集计时。

## r23 / R29 集中返修（r28源码与真实日志为依据）

r28总表尚未批准Windows全量。原候选、负责人、历史、版本406不动；本轮仍不发行安装。脚本实现由原实例连续返修，主控不代写。以下为一份合并返修清单；先把相关原文与失败并入evidence，不重复已可靠r27调查。

1. **隔离而非“平台固有”**。/tmp/plan-state-guard-logs/r28-serial-{localCodeManifestCache,planPreflightProgressSpeed}.test.log明确EACCES：/home/node/AppData/Local/SimpleExperiment/...json.ownership.writing；automaticScopeContent只有2!==0，不足证明平台限制。spawnCaptured L254 env:process.env未隔离，测试碰实际用户状态。每文件独立sandbox HOME/USERPROFILE/APPDATA/LOCALAPPDATA/TMP/TEMP/TMPDIR，子孙继承；测试子进程清六项Git定位变量，不靠chown/chmod/清理用户目录修测试。保留全部首次日志/断言，查automatic子进程原错，三项须隔离复验通过；环境差异/输入漂移不能当平台skip。非测试编译所需规范Git上下文按既有跨环境规则保留。
2. **并行必须正证据**。classify.js L23–42“单文件无正则命中就parallel”不是证明，单靠LatestResultExport一条反向闭包不能覆盖其他依赖/动态加载/未知写入；r28已真实触发端口争用。改成明确、可绑定源/助手/生产依赖hash与平台的已证白名单；缺证/新增/变更/未解析依赖一律exclusive。先给可复核的小集合，允许逐项有证扩展，不为717数字补空洞理由；分类器只收紧/核对，不自动将扫描未命中者升级parallel。CLI --max-parallel不可越过本任务全局2上限。共享/多进程/实际系统状态继续exclusive；记录证明与实际重叠/互斥，单批协调继续保留。
3. **真实文件+矩阵与hook**。planEntry L164只按原file字符串+argv拼key，没有realpath/平台大小写/真实文件身份。统一规范化，保留原来源与不同必要参数，按一个文件条目列矩阵，禁止同identity/同argv重跑；同文件矩阵不竞争共享资源。expandDomain L95从未处理pre/post，当前package实际钩子也未校验，不能声称未来会拒绝。实际npm脚本映射/hook图要启动前核；支持的递归展开去重，新增未知/无法避免自动钩子重复的语义明确阻断，不暗跑或忽略；当前零hook可绑定并复用。补alias/链接/Win大小写及真实嵌套/hook夹具对账，旧全部argv/覆盖保留。
4. **禁止缩减最终验收**。--only现对package/check:full/build/acceptance通用，会只测一文件仍组装；最终profile拒绝此类过滤（仅明确开发入口可选域/文件）。--reuse-receipt直接跳过整个fullCheck与compile/lint，包含真实租约/进程/网络，且未有完整依赖环境证据。当前移除/拒绝测试结果复用功能，默认所有测试新跑；不以显式flag作为绕过最终门禁许可。新增回归证明package/check:full/acceptance无法only/reuse绕过。
5. **receipt不可信头+空数组不能过**。validateReceipt L524只信overall及数组无失败，零job/漏job/漏gate可过；assemble未验当前计划与产物，parseArgs写receiptPath却读取opts.receipt。分清输入receipt与输出位置；check:full成功应能作为拆分组装的完整凭据，而非只能依赖已组装过的package receipt。按当前计划重算完整文件矩阵/必要gate集合逐项对账，要求实际启动、真实0退出、无取消超时未知、日志存在；记录并核运行配置/相关环境/工具链/源码/锁/入口资源/bin/生成输入及编译产物完整hash。运行前后相关输入变化标invalidated非零，不能产生passed凭据。仅完整稳定输入+实物匹配的编译/归档可复用，不缓存外部状态，原包后检查保留。补漏项/空数组/过滤凭据/源与产物及环境变更/真check:full→assemble正向与反例。
6. **Windows实际CLI**。resolveStepCommand L238选择.bin/vsce.cmd却spawn shell=false，Windows会EINVAL/不可执行；使用已安装@vscode/vsce包bin元数据解析真实JS+process.execPath，与既有npm-command模式一致，不盲猜路径/拼shell。为真实Win命令解析/带空格argv/非零传播加正常回归，先小测后全量。
7. **进程/日志/锁全结算**。spawnCaptured先spawn后open(wx)，日志打开失败可遗失运行子进程；应先独占日志并记录spawn事件。Windows taskkill子进程未等待、未捕获error，取消/超时不能证明树清完就释放资源。建立有界、可核的自有树退出结算（不杀未知PID），失败/未知保留状态并阻断后续。所有异常走统一try/finally，等待已启项，完整非零receipt，不留未报告孤儿。cancel后不要再启动下一gate。未知/外平台/读坏owner锁不自动rm；ESRCH不能证明另一平台/后代均退出，停止自动回收未知批锁，正常只释放自己确认所有权的锁并留完整记录。唯一run receipt独占写；last-*.json仅可作指针/摘要，不是唯一事实文件；显式--receipt不可覆盖原凭据/旧证据。外层脚本/工具出口必须与内层一致非零。
8. **每轮闭包检查要真正调用**。当前main无compile/package前旧模块增量核对，不能只文档宣称。接入确定性前置检查：沿用84候选/79package-only排除证明，校验相关入口/源码加载边/平台兼容/资源/锁/配置/生成器/测试依赖变化；输入不变复用已有证明，相关变化增量核查，未知保留或明确阻断，不盲从编译剔除测试所需模块、不绕过类型检查、不周期扫描。将证明/适用范围/变化摘要记receipt。

复验：先必要语法/runner回归/包策略与三个EACCES域，稳定块即验证；同一候选/阶段矩阵去重，既有可靠覆盖按完整输入范围复用。新增正常回归覆盖本表反例，不做测速。资源争用、未知语义、安全和平台契约失败不是机械额度；遇新完整失败先更新证据与具体建议按规则升级，不连跑全量自判“平台固有”。Linux完整必需覆盖不能仍以三败交付；最后输入冻结交Windows，先必要compile+实际默认provider/真实目录只读门禁，再完整原package覆盖与归档门禁；最终成功完整用时按r22-T记录。当前不commit，等最终Windows权威生成物。主控此后不并发写plan，状态维护权交原实例。


## r24 —— R29 八项返修实施状态（原实例维护，2026-10-24；对应 plan r23/R29 sha 1b13013b…）
1. #1 隔离：v2 每测试作业十键沙箱 + 六项 Git 定位变量剥离；三 EACCES 域隔离复验 exit0×3（r29-eacces-reverify-3.log）。首轮完整 package 因沙箱根置于 /repos（9p/drvfs）出 12 项连带失败（socket 104 上限/9p 慢 I/O），根因与修复、复验 20/20 全部记录 evidence.md r29 节；沙箱根改为 /tmp（Windows=os.tmpdir()）。
2. #2 attested-whitelist：--attest-overlap 真实重叠证据 185 条→verify 后 184；basis=file+闭包 sha+平台+批次；runner 计划时逐条重验、漂移降级 exclusive、未知=串行；--max-parallel>2 拒绝。
3. #3 realpath+argv 身份、同文件矩阵互斥、symlink 归并、hook 图零钩子阻断（hooksVerified+packageJsonSha 入 receipt）均有夹具反例。
4. #4 final:true 五入口拒 --only；--reuse-receipt 移除（出现即拒绝）；反例入夹具。
5. #5 run.json wx + last-*.json 仅指针；assemble 按当前计划逐项重算对账（指纹/矩阵/dist 产物 hash/job 行/gates/日志在盘）；漂移=invalidated；五类反例+package/check:full 双正向入夹具。
6. #6 vsce 经 @vscode/vsce bin 元数据→execPath+cli.js；未知命令拒绝；真实/合成夹具断言。
7. #7 先日志后 spawn、tree kill 确认（unknown 不得 passed）、cancel 后零新 gate、统一 finally 结算；锁 EEXIST 一律拒绝、坏 owner 不回收、释放留 lock-release.json（ESRCH 自动回收已删）。
8. #8 scripts/test-workflow-preflight.js 接入 main（compile/assemble 前）：无记录绑定 84/79 归档证明；无变化复用；变化由完整链增量核并自动回写分级 attestation；非完整入口无覆盖=阻断；结论入 receipt。
回归：夹具 19/19、政策 10/10、三 EACCES 域过、dry-run 对账 218/208/4 段。完整 package 通过 EXIT=0（218/218，TOTAL 263326ms）；check:full 复跑 218/218 且凭据经 package:assemble 逐项对账正向可用；check:full 首跑 1 例未复现 IPC timeout 按证据转 exclusive（待主控复核）；细节与全部日志路径见 evidence.md r29 节与 host-handoff.json r29LinuxFullPackage。未 commit，等 Windows 权威生成物。


## r24 补充（GPT 制定，run0b5464e0 非中断授权 2026-10-24；原样附入；r23/R29 八项安全返修全保留，新计划仅覆盖“默认不启新编译缓存”限制，不恢复测试成功复用或 --only 最终覆盖绕过）
【r24授权与具体步骤】
1 优先实际落地持久下载/编译缓存。先核现npm cache配置、实际可写/持久位置并显式沿用/配置到现有可写持久目录；保留锁文件/现依赖安装策略，不为验证换npm ci/安装依赖或重建Docker/扩挂载。下载缓存配置/可写证明与真实命中分列，没有本轮下载就不声称命中。
2 用已安装tsc原生incremental+显式tsBuildInfoFile，缓存分区绑定规范worktree/平台/架构/工具链/有效编译配置；匹配输出与状态跨正常构建持久保留。本任务已有Linux源树与独立Windows验收树，各自dist/可写增量状态沿用不共享，不建新worktree。原生跟踪加完整输入/输出校验：源/依赖闭包、lock/配置/版本/生成输入、有效argv/相关环境、工具链；缺失输出/损坏或失败增量信息/错平台/部分写入/漂移不能命中，按现有有界流程重建（旧缓存/失败证据保留，不删别人的缓存）。特别验证“tsbuildinfo存在但JS丢失/被改”不能因原生认为up-to-date而漏产物。缓存目录排除自指纹和发行包。R29同根协调覆盖缓存与输出写入。
3 同一候选输出只标compiled；目标域不冒充validated。最后完整fullCheck实际读取同一输出，所有规定文件/参数/gates/日志/真实码完整逐项核且无漂移才validated。check:full→package:assemble真实消费该validated产物与输入receipt，不隐含再编译/再全量；package旧入口仍compile→完整check→assemble，钩子全展开去重。组装核实物/包后门禁再packaged，交付同包路径+SHA。输入receipt与本次不可变输出receipt分离，last仅指针。源码/锁/配置/工具链/生成输入或输出变化失效，完整候选仍最终规定验收。真实Windows进程/租约/安装与强制最终检查现场执行，绝不恢复--reuse-receipt测试成功缓存/最终--only绕过。发布交接传同一包身份，本轮不实际发行/安装、不递增406。
4 重复转译如有现成共用helper且不改变测试对象，可复用同候选已核输出/原API原参数的缓存；验证源变换/抽取/VM特定变换的用例不强改成dist。没有安全适用处记录具体证据，不加依赖/换框架/全局猴补丁。
5 先补必要缓存契约/receipt修复，再在正常目标回归夹具验证冷构建/后续命中/源及配置工具链变化失效/缺输出损坏拒绝/compiled不可组装/真正checkfull→assemble且编译启动数不增加/错候选及空漏失败日志拒绝。用当前正常开发compile与最终Windows流程采实际缓存路径、hit/miss原因、真实tsc启动/发射数量、阶段单调墙钟、文件启动/资源互斥和完整子项/聚合退出码，不额外真实任务或模型测速。不要把入口能加载或tsbuildinfo存在当收益。
6 测试生命周期本轮只出具体待审清单，放现有清单/证据不另建体系。依既有报告列实际file/testID/参数/绑定版本、原行为及独有边界、替代覆盖/缺口或同输入可比矛盾日志、既有耗时、建议及理由；拟隔离项另列适用平台版本/拟阻断范围/负责人/开始与到期/修复退出条件，缺项未知。未批准不删测/断言/停跑/改失败阻断，不安装/启用FlakeGate；84旧模块候选不是退役测试。EACCES与并行资源竞争不能伪装同输入偶发证据；无有效候选如实写无证据，不额外跑来造证。
【续行边界】原R29输入隔离、正证白名单max2、规范真实身份/矩阵去重、完整receipt/进程树结算、旧模块增量preflight均是上述前置，不重查未变化块。每个完整功能块交一次实差异和必要证据供high审核，块内不逐文件交接；遇需GPT的新安全/语义失败按既定规则。Windows继续由原主控处理，Linux实现/测试/Git仍你原责任；原候选/分支/祖先不变。最终记录优化后成功完整package墙钟及阶段，不用并行子项之和。此次只补充本run新授权，交付时报告r24落实/正常构建缓存证据及待审清单即可，不为确认收到单独模型轮次。


## r25 补充（GPT 审核发现，run 续接授权 2026-10-24；并入 r24 同一功能块）
R25-A 实际Linux VSIX含开发锁元数据：/repos/MCP/zlk-cluster-orchestrator-plan-state-guard/simple-experiment-0.5.406.vsix，341项/2502022B，SHA67fc467d270dc3d809b1b061e0ee68927dbde370a952ba76d6c413aaf987b85e；实际外部条目 extension/.test-workflow-batch.lock/owner.json。读取时文件稳定，证据 /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/linux-bash/13cb99dc-af67-4a50-b3e8-9cd3449b2335.log。不能把此包当已合规交付。原包先独占保存到对应旧run证据中，不删或覆盖；修.vscodeignore真实收包排除+单源package-content-policy精确开发锁/实际新增缓存及receipt路径规则，必要资源如dist/panel-build-manifest.json不能误排。现有packageContentPolicy回归扩实际路径，最终vsce ls与ZIP均核无锁/缓存/日志/编译元信息泄漏；新artifact用唯一输出保存，若保留兼容根文件须保证旧字节先已不可变保留。后续发布交接仍是同一已核包，不实际发行安装。
R25-B R29 evidence L435表明--attest-overlap主要以passed且真实重叠+静态闭包SHA生成白名单。成功重叠是观测，文件/闭包hash只绑定版本，不能单独证明彼此不共享资源；不得因一次passed自动把未知提为parallel（183也不能成为目标）。保留R29全部工程实现和观测证据，但每parallel项还要有明确源码/夹具资源独立性依据及未知依赖处理：写目标确归当前job沙箱/无共享写、端口或外部服务/缓存/Git/子进程资源归属、静态和动态依赖能界定；无法证明的exclusive，不重做不变原调查，不为扩大数量杜撰证明。--attest-overlap仅补充已有独立性证明的运行观测，不能作为唯一提权条件。若现实现已有这些正证，请在主证据给精确字段/判断函数原文与适用范围；缺失就在当前块收紧再验证。
planIsolatedLedgerLock IPC timeout按r24生命周期只给真实对照/参数/版本/环境/并发和待审建议；串并行条件不同不能冒充同输入偶发矛盾，不启FlakeGate或放行失败。因独立性未知降为exclusive且仍全执行/失败照阻断可保留，但不声称未知根因已修。后续正常完整候选验证一次，未知新失败按规定先升级，不循环跑绿。R24编译缓存/同validated产物流优先级、用户要求最终Windows成功全流程墙钟、R29所有安全要求均不变。完成合并交付，不为确认该消息另起模型轮次。

## r24+r25 实施状态（原实例，2026-10-24；详细证据 evidence.md r24/r25 节）
- r24 #1 npm 下载缓存：npm_config_cache=simple_cluster/cache/npm 注入 npm 门；配置+可写证明有、本轮 0 下载 0 命中（如实）。#2 tsc 分区 incremental：冷 10172ms/emitted378、热 3049ms/emitted0、output-drift 封存重建夹具实证（含 tsbuildinfo 在但 JS 被改）。#3 候选 compiled→validated→packaged + assemble 强校验 validated。#4 无安全共用转译点（证据在案）。#5 夹具 3/3、runner 全套 21/21。#6 生命周期待审清单已列 evidence.md（未删测/未停跑/未装 FlakeGate）。
- R25-A：旧包 SHA 67fc467d… 已 xb 独占保全（根副本 SHA 复核后 rename 同目录，未删未覆盖）；.vscodeignore+政策 JSON+verify-vsix-manifest ZIP 门禁三重排除，政策回归 10/10（含防误排 panel-build-manifest）。
- R25-B：classifier v3 analyzeIndependence（规则与演进误伤修正全程留档）；parallel=124 全部 independence PASS+闭包 sha 绑定，59 文件 independence-fail 降 exclusive（原因内嵌命中行）；--attest-overlap 仅对已有正证者刷新观测、60 个无正证重叠文件逐条拒绝提权；runner 无正证 fail-closed；ledger-lock 措辞按令改写。
- 最终一次正常完整 package 验收：见本文件下一节回填（运行中，日志 /tmp/plan-state-guard-logs/r25-final-package-1.log）。Windows 全流程墙钟仍由主控 host_windows 出数。

## r26 补充（GPT 制定，run 续接授权 2026-10-24；原样附入，三项有界评价）
读取全局 build-test-delivery/references/three-speed-evaluations.md（镜像 /host/d/OpenChamber-AgentConfig/OpenChamberProjectSandbox/skills/build-test-delivery/），原证据只增量三项结论，三项各标采用/保持/待验证。已核只读事实 /repos/.pi-three-speed-eval-20261024-041357/evidence.json，源码在变先绑定当前 hash，勿重做同一全仓查找。
1 文件系统/cache：/home/node 是持久 Linux 卷；/repos 为 Windows bind，当前 node_modules 指原基仓同 bind，Linux x64 ABI137/TS5.9.3。默认 npm cache=/home/node/.npm 已原生持久；核当前 gate 是否仍把 npm_config_cache 覆盖到 root/simple_cluster/cache/npm（旧 sha2f4db1… L394/396），不要把现成原生缓存反迁到 bind。分别核依赖/下载 cache/编译状态/临时目录与有效 env，不输出 .npmrc/完整环境。沿用已授权隔离目录评估实际热点；不直接改共享基仓 node_modules 指针、不搬源码/新挂载/重建停容器，Windows 缓存独立，保留 R29 测试 env 隔离。只有稳定实收益且结果一致才最小改路径；默认已持久事实不冒充命中/提速，未证明不迁移依赖。
2 TS7 先静态：现 CommonJS+moduleResolution Node；7 移除 node/node10，原配置不是无缝替换，现大量 transpileModule 等 API 依赖。用当前配置/extends/API/实际固定版本 bin 选项及官方资料作兼容结论；不先升级全仓或未固定 npx 下载，不以 ESM/屏蔽诊断伪等价。候选 CLI 与旧 API 如需隔离并存，方向/接口变化带具体方案升级；现无等价稳定收益证据就保留 5.9.3，不必硬做 7。静态结论与速度实测分列。
3 慢测：复用 evidence 中的正常 check_full receipt（03:51:46→03:56:10Z，218 文件 252312ms），top testWorkflowRunner 38971ms/其中 real-repo reconcile 27706ms，gpuCollectorFrame 10680/simpleCli 6760/executionShellPreflight 6481/formalJobPreflightFailure 6455。先按已给日志/hash/代码位置区分清单闭包扫描/转译/进程启动/真正等待；不是看到 sleep 就无效。优先看 real-repo planner 是否对 42 入口重复读/指纹/启动，评估一次冻结输入/同一 planner 复用但保留所有入口/覆盖断言；纯时间逻辑才考虑原生 MockTimers/已有完成事件。真实进程后代、锁/租约/心跳/并发一致性保持真实，不缩 deadline/去断言。当前新增 runner 文件 60000 参数与原 20 秒预算差异须明确依据，优先靠实际热点优化回原预算，不静默扩大/缩短安全期限。
采用门槛：先等现有 fullCheck 结束；只有原任务空档、相关输入冻结/隔离输出且无争用才做必要小范围离线配对（通常至少 3 对交替基线/候选，冷暖分开），留原值/中位数/波动、诊断/产物/断言/真实子项聚合码。不得重复全量 package 链测速/额外模型请求/为造偶发证据重跑。无稳定收益或不可比就保持/待验证，不改生产路径/编译器/测试行为。若最终只补结论无相关输入变化，按完整范围复用可靠已有验收，不无谓全量重跑；采用代码后最后候选仍完整规定验收。测试退役/隔离放行依旧仅具体清单待审，原 R29/R24/R25 安全和同 validated 产物契约全保留。
计数澄清（主控指令）：用实际 plan/receipt 对账 requestedSlots/矩阵与实际文件启动数，解释"约838"是否范围扩大；gate02 tsc-cached 与 gate09 npm run typecheck 是否重复编译以真实启动数/有效命令说明，确属同输入重复则后续最小修正并保留旧门禁语义，不把重跑编译称一次。

## r26 实施状态（原实例，2026-10-24；详细证据 evidence.md r26 节）
- 计数对账：receipt 实数 launchedCount=218/files=218/requestedSlots=418/duplicatesRemoved=200；口头"约838"作废（误估）。
- gate-09 typecheck 同输入重复编译证实（10448ms、非 noEmit、真实启动+命令为证）→ build 域 sourceScript 改 tsc-cached --verify-only（只读、绑定输入哈希、矩阵实测 ok/漂移/还原）；typecheck 脚本本体保留。
- 三项评价结论：#1 保持（原生 npm 缓存 root 属主不可写=外部前置；tsc 缓存位置冷暖 3 对无稳定收益不改默认；评估钩子保留）；#2 保持 5.9.3（静态结论与速度实测分列，无实测不虚报）；#3 采用（planner 结论缓存 reconcile 21.5→~14.6s，--test-timeout 恢复 20000 原预算，全套 21/21）。
- 自伤漂移修正：__pycache__/*.pyc 移出指纹面（.py 仍哈希）；re-attest 顺序复核排除。check:dev 暴露 5 项既有断言不一致已带完整证据升级（不自行改测）。
- 最终候选完整 package 验收：运行中，日志 r26-final-package-1.log，数字回填于下。
- 【回填】最终候选完整 package（2026-10-24T04:47:26 批，EXIT=0，218/218，无 invalidated）：TOTAL 319773ms（compile 7475 / prereq 33 / fullCheck 284271 / post 11802 / assemble 10689），npm 墙钟 5m40.4s；gate-02 tsc-cached incremental missReason=none；gate-09 verify-only 1653ms（替代 10448ms 重复编译）；gate-13 清单门 340 条目 leakHits=0 missingRequired=0；同包身份 simple-experiment-0.5.406.vsix 2501678B SHA dbb6151bf1a95ad0b5f4f1502ac8a2f49100c8dabd1fe61e466362b1c3b7e8e7（=receipt candidate.packaged）。fullCheck 较 r29(226491ms) +57.8s 系 R25-B exclusive 35→61 收紧的串行代价，verify-only 已抵 8.8s；如实呈报。

## r27 —— R26 升级件裁定（GPT 详细裁定，run 续接 2026-10-24；原样附入后连续执行）
纠偏：Linux 完整包 319773ms/218 过是阶段证据，契约未全部满足——Windows 真实目录/最终完整候选及适用 PR 整合未完成。
【必须返修 2 项（本轮重写 scripts/acceptance.js 直接触发的真实相关回归）】releaseAcceptanceWorkflow.test.js L12–18 与 vsixRuntimeClosure.test.js L31：保留两文件/现有逻辑 testID 及所有原保护目的，不退役/删断言/写无调用空壳 runNpm 迎合正则。把旧实现形状断言迁移到当前真实单一 manifest/planner/薄入口的等价行为验证：acceptance 仍可执行、含原 build+unit+features 完整并集及必要参数、scenarios→features 等价映射、无 shell 拼接、实际统一聚合非零、报告仍落原 acceptance 目录且有 overall/完整日志引用；VSCE 与 npm 仍是锁定本地 CLI、Node 原生无 shell 及原超时、现 acceptance 委托到同一正确执行器。特别保留 vsixRuntimeClosure 第一项实际闭包验证及 stderr/Deprecation 约束。若现有 planner 无公共接口，复用现成可信 dry-run/夹具，不为测试加通用框架。通过条件：原 testID 全部断言目的逐项旧→新对应、两文件目标回归 exit0、相关源码/约束真实验证（不只新文本自证）；新旧映射与真实失败保留主证据。
【其他 3 项】publicCliAliases：cc11fa9d 已提交 bin 与旧断言的明确基线不一致，记已有非阻塞，不改 CLI/不移测试。syncResolution：不未经批准 skip/挪出覆盖；源码未改，保留失败信息，交 Windows 用原文件/原参数实际验证平台归属（未知不能说已通过）。manualDistributedResultSync：108/2/20 对 1 失败仅"源未改"不足判断——定向核该测试调用生产/助手与本轮变更交集、基线 8b47a6c3 对应 blob/已有日志、runner 十键隔离及 Git 环境是否改变隐含夹具输入；可靠证明为原基线同契约既有问题⇒列已有缺陷非本轮阻塞，不扩业务修复；若本轮脚本隔离/入口/排除造成⇒相关回归须修脚本或正确夹具并保持批处理断言，不放宽期望；缺证只补这条调用链并给判断，不假设已排除；不另造副本/全量或多次跑绿。
【验收/交接顺序】先两项必要语法/目标回归；开发域用现有 check:dev 显式选择，不再整 636 无关文件；package 原规定 217+runner=218 不擅自扩大。两项实际影响域另记必需目标证据与平台范围。相关代码最后修改后的最终候选仍执行规定覆盖，但先交全部冻结输入给主控做 Windows 必要 compile+已有默认 provider 真实目录只读最小核验，通过后再昂贵最终验收。未变独立块不重审/不重跑。
【材料】现有 handoff 字段内给完整精确当前输入清单 {path,sha256}（含新增 scripts/修改配置及测试；dist 生成物另表，不只描述字符串）；更新 package-test-inventory 为当前 package SHA/真实 218 文件及必要 argv/实际 identity 去重/来源；列 Native overlay 所需所有文件、依赖/工具链不变依据、完整唯一日志、Linux 包不可变路径/全 SHA 与已有 receipt。源代码冻结，材料就绪后原实例等待 Windows 结果，不自停/不 commit；Windows 权威生成物与最终证据回传后原负责人追加普通 commit，GitHub/PR 主控按原授权。本轮仍不发行/安装。
非阻塞备注保持：/home/node/.npm 属主、无稳定收益迁移、TS7 保持、评估残留——不改不清理不再测速；生命周期待审清单不执行退役/隔离放行。

## r27 实施状态（原实例，2026-10-24；详细 evidence.md r27 节）
- 两项文本回归迁移完成（旧→新映射逐项表在主证据；两目标文件 exit0 + check:dev --only 目标批 exit0）；tsc-cached ISO 冒号增补修完成（r10 回归 21/21）；manual=基线既有缺陷三场景实证；public/sync 按裁定未动。冻结输入包/生成物表/inventory v2/两 Linux 包不可变保全就绪（windows-input-inventory.json、package-test-inventory.json）。源冻结，等待主控 Windows 最小真实核验→通过后最终完整候选；本侧不再跑昂贵 Linux 完整、不 commit。

## r27 补充裁定与规则（主控 2026-10-24 边界消息，原样附入）
- 正式技术裁定（追认）：vsixRuntimeClosure 第一项 spawnSync 验证器 timeout 10000→30000 经主控批准，依据=冷验证器实测 9558ms、旧 10014ms 超时、改后 10336ms 通过、验证器内部 VSCE 既有 30000ms 契约；仅该外层字段，闭包/无shell/DEP0190/真实非零断言不变，不扩大其他预算。r27-vsix-target-1 截尾标证据不足，不声称完整首次日志；后续完整失败/通过日志(r27-vsix-target-2/-3.log)保留引用，不为此重跑。其他未审 timeout 如实列出（见 evidence），不自动改/回滚。今后所有验收 timeout 增减/移除先主控技术裁定。
- 规则更新：交接只报本人阶段完成+跨端/待裁定，最终由主控核全阶段；完整 stdout/stderr 从启动落盘并捕获原码再读片段；日志失败/取消/超时/未知≠通过；不得先 tail/grep 再 tee 或以 echo EXIT 冒充传播。
- 宿主事实（已完成，勿重查）：1323+README/LICENSE=1325 输入 SHA 全匹配同步 Native 树（Git a7 detached/index 净）；Native compile exit0 wall16497ms（JBf8ss/minimal-compile.json）；默认 provider+ownerAlive 337 槽只读 wait exit0/458ms 零记录变化（real-default-gate.json）；F22 实际最小门禁通过。
- 必修（真实脚本回归，源负责人实现）：Native 根 0.5.405/0.5.406 双包并存，verify-vsix-manifest 默认根唯一 *.vsix 会在昂贵全量后误阻断。修=package/assemble 验证门显式消费本批 vsce 成功输出确切路径（复用 --vsix 接口+runner 既有 Packaged 解析），绑定当前 name/version 与同包 SHA，解析/路径未知明确非零；单独无参检查保留唯一性规则；夹具扩"旧+当前并存"正向与错误当前包反例；不删移旧包、REQUIRED/泄漏/包后门禁不减、不新造工具。修后只目标回归+更新冻结输入/清单 delta；主控增量同步 Native→暖编译→最终完整 package/实际归档+syncResolution 原参数验证。仍不 commit/发行。
- r27b 必修完成：注入式确切路径验证门+3 夹具例（22/22、10/10、standalone 保留）；冻结清单 delta 已写（deltaR27Inject）。等待主控 Native 增量同步→暖编译→最终完整 package+syncResolution。

## r28（主控 2026-10-24 消息，原样要点+状态）
- 事实：Windows 全量候选真实失败（218/218/去重200，12 failed，exit1，wall343980ms，assemble 未启动，maxObserved=1）；124 parallel 全部 attest-drift（platform linux!=win32）⇒exclusive 是当前事实，不得称 Windows 并行已验证，不得为变绿改 platform 字段。10 个 Python 家族失败根因已证（十键隔离遮蔽实际用户站点 PyYAML）；job107/job218 为逻辑/平台未知项：只取证+具体建议+最小宿主取证需求交主控，禁修/禁调 timeout/禁 skip/禁静音断言，Windows SIGTERM 非 POSIX 信号不构成机械修复；首证据/旧 timeout/正常耗时保留；不盲重跑。syncResolution 当时仍待 Windows。
- 状态：授权修复已实施并 Linux 契约证实（24/24+10/10+1/1+2/2 全 exit0，真实批降级路径无回归；见 evidence F-r28-A/V-r28）。两未知项证据+机制+建议已成文交裁定（U-r28-B），未动任何代码/预算。syncResolution 已由主控宿主补证闭环（R-r28-C，3/3 pass exit0，不再重测）。冻结清单 delta=deltaR28PythonVisibility（两文件）。待主控：Native 增量同步→暖编译→最终完整 package/归档（Windows 注入正路径以该全量为准）。Linux 阶段完成，不 commit/发行/安装；最终全阶段验收归主控。

## r28 后续裁定（主控 2026-10-24，原样要点+状态；不改已有验收）
- 裁定记录：①Python 修复两文件已审核同步，Windows 实际正路径已验证（精确 10 文件全 pass，outer0/66880ms，batch-once 恰 1 次，十键不恢复；receipt 2026-10-24T06-04-34-884Z-14808-check_dev 等）；1325 冻结增量已核，16c/c441 快照在 4nYvWX 隔离；site 探测 15s 与 releaseAcceptance 两处 30s 为明确技术批准（新探测预算一律先裁，不再凭"新字段"豁免）。②U2 批准 --cancel-stdin 最小合作取消接口。③U1 主控接手一次最小宿主取证（3000ms 保留、不写项目、临时 require hook 独占证据），返证据前不修 ledger/超时/断言。④Windows max1 保守分类维持；最终完整 package 成功时间尚未产生，旧 343980ms 为失败样本不得冒用；仍不 commit/发行/安装。
- 状态：U2 已实现并 Linux 证实（evidence U-r28-D：26/26 exit0+三套全过；接口/分块/EOF/双路径解监听/默认零抢占全部有夹具锚定；未新增期限常量）。delta=deltaR28U2CancelStdin（取代 deltaR28PythonVisibility 同名两文件）。待主控：Native 增量同步→最终完整 package/归档（含 Windows 取消 stdin 分支真实执行）+U1 取证后裁定。Linux 阶段完成；不再全量 Linux 包/不重跑 10 项 Python/U1。

## r28-U1 后续（主控 2026-10-24 取证返还+唯一最小返修批准，原样要点+状态）
- 记录：preload 复现 exit0（正常时间线见 evidence），done 后清理 EPIPE≠业务失败，此次通过≠首次原因确定；原 job-107 物理夹具仅存 B 两行事件，首次 A error 已丢——标未追回；批准范围=helper/lockChild/lifecycle 三夹具（即时诊断+drain、contender 真实握手替代 400ms【验收时序变化：旧 400ms<实测 486ms 窗口且不证真实争锁；新=真实 EEXIST 后 contended；依据 preload 时间线+20ms 重试余量】、boom 反例），生产 ledger/全部既有期限不动；U2 宿主 killGraceMs=2000 为定向参数机械错误，仅恢复 batchDefaults=30000 复验，Windows 正确预期 25pass/1skip/0fail。
- 状态：三夹具返修完成并 Linux 证实（8/8+5/5+5/5 全 exit0，evidence U-r28-E）；冻结 delta=deltaR28U1Fixtures（三文件）。待主控：Native 三文件原 package 参数复跑→最终全量 package/归档。Linux 阶段完成；不再全量/不重跑其他闭环；不 commit/发行/安装。

## W — 最终 Windows 验收通过与 Linux 收尾（主控 2026-10-24）
- 记录：Windows 最终完整 package exit0/399115ms 与实际归档通过（细节 inventory.finalWindowsAcceptance；419 生成物 changedVersusLinux=[]；首次 A error 未追回、max1 串行等如实项保持如实）。
- 收尾状态：evidence W 节+inventory final 块+handoff final 键已写；Linux 本地 Git=以 8b47a6c3 为父的普通追加 commit（精确暂存授权源码/生成物/文档，排除日志/cache/VSIX/node_modules），不 amend/rebase/reset/强推；提交后交回主控做 GitHub/PR/审核合并；4 项待审清单不转 TODO；不发行安装。最终完整交付由主控在 PR 整合后确认。

## W-补（主控 2026-10-24 审核口径补正，仅资料）
- 1325 冻结快照=1323 应交付源/资源+2 非交付 cp311 pycache 缓存快照（正确未提交，禁搬运/删除/重建）；e889 blob 核 1742=1323+419 全等。原 SHA 表/历史原样；whitespace 如实=仅 5 个归档 diff 内部保真告警，其余 0。以文档最小补正+普通追加 commit 记录，保留 e889，不 amend/不重测/不改业务或生成物。合并后 Linux ff 同步归本负责人，远程归主控。
