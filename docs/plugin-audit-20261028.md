# SimpleExperiment 全面排查与修复交付

候选版本：0.5.423。基线：`7a6062fa10441cc5852166a34138781a2604d9e9`。独立分支：`codex/plugin-audit-20261028`。原目录和其他开发分支未修改。

## 已确认问题与修复

优先级表示影响及修复顺序，不表示已经发生过真实服务器事故。所有远端行为证据均来自隔离替身或私有本机 tmux；未操作真实 Worker。

| 编号 | 优先级 / 类别 | 触发条件与影响 | 最小修复 / 验收证据 |
| --- | --- | --- | --- |
| A14 | P0 / 精确停止保护 | 初次清单与关闭窗口之间，原 windowId 的任务身份变化，旧快照仍可能用于关闭。未认定发生过真实误停。 | 关闭前重新核对 commandId、projectId、workerId；变化即拒绝。`TmuxTaskLifecycle.ts:1046,1175`；`taskIdentityBoundary` 的窗口替换负例。 |
| A01 | P1 / 停止状态 | Scheduler 取消围栏未确认，但精确窗口关闭后旧实现仍返回完成，本机可能丢失停止意图，晚到请求缺少可靠拒绝依据。 | 只有 `cancelled:true` 才确认围栏；否则返回 `TASK_CANCEL_UNCONFIRMED` 并保留原停止意图。`TmuxTaskLifecycle.ts:1166`；提取真实函数的断言及 `localStopControl`、`pulledTaskControl`。 |
| A13 | P1 / 重复派发身份 | 同一 commandId 改变 Worker、任务索引、结果路径等字段，旧重复请求比较只覆盖部分身份，可能错误采用已有任务。 | 按完整稳定身份比较；保持初次接收的 root-over-options 参数优先级。`TmuxTaskLifecycle.ts:1002`；冲突负例及合法 nested-options/root 优先级正例。 |
| A12 | P1 / 状态原子写 | 两个独立模块/进程共用 `.writing` 文件，一方发布后另一方仍可能修改同一 inode，破坏已发布 JSON。 | 每个 writer 使用 PID＋随机身份的独立暂存槽，保留队列、inode、fsync、发布前校验。`StateStore.ts:6,38`；真实文件系统双 writer 交错回归。 |
| A11 | P1 / 多实例发现文件 | B 已发布默认 API discovery 后，旧 A 退出仍覆盖为 stopped，使客户端误判当前实例不可用。 | 复用跨进程资源租约串行化比较与发布；仅当前 pid/startedAt 的拥有者更新默认记录，各实例记录仍独立。`LocalApiServer.legacy.ts:795`；A/B 退出顺序回归及 API 现有覆盖。 |
| A02 | P1 / 受跟踪产物 | 基线缺少被运行链 require 的 `dist/features/DispatchHandoffGate.js`，直接加载未重建 dist 会报缺模块。未据此推断历史已发布 VSIX 同样缺文件。 | 在独立副本编译并补齐受跟踪产物；实际 runtime 闭包检查和相关 submission/workspace 回归。 |
| A04 | P1 / 构建门禁 | 相对 require 无法解析时旧闭包扫描静默跳过，且动态启动的 CLI 入口未显式纳入，可能把不完整运行包判为通过。 | 缺失入口/依赖直接失败并给出导入链；支持 cjs，显式纳入 `dist/cli.js`。`scripts/runtime-closure.js`、manifest/VSIX 验证器；6 条闭包回归包含真实缺失负例。 |
| A05 | P1 / API 方法边界 | 持有合法 API 凭据的调用者可指定原型继承方法，旧方法查找未限制为已注册自有方法。不是无凭据认证绕过。 | `Object.hasOwn` 限定路由；能力及 OpenAPI 只列 callable 自有方法。`LocalApiServer.legacy.ts:450,671,724`；API 32 项覆盖含继承方法拒绝。 |
| A06 | P1 / 更新完整性 | 旁车仅含裸 hash 时，旧解析接受未绑定文件名的校验清单，缺少精确资产绑定。 | 必须同时匹配 SHA256 和精确 VSIX 文件名；保留 GitHub 资产自身 digest。`ReleaseClient.ts:123`；更新客户端 5 项覆盖含裸 hash 拒绝。 |
| A03 | P1 / 删除规则、构建互斥 | 构建完成自动递归删除锁目录，违反项目的目录删除确认规则；不能为了保留目录而取消互斥。 | Windows 使用进程持有的系统 Mutex，其他平台保留有界进程锁；结束自动释放占用，旧目录保留。未确认子树退出时保留阻断记录。`scripts/build-process-lock.js`；链接拒绝、并发拒绝、正常释放、未知子树及旧锁保护回归。 |
| A10 | P1 / 发行规范 | SimpleSFTP 0.2.114 稳定 Release 缺少文件名绑定的 SHA256 旁车，不满足现行交付规范；在没有资产直接 digest 的分支也无法校验。 | 核验既有 VSIX 原字节后，仅补发旁车；未覆盖 VSIX、tag 或旧资产。真实 Latest 与资产元数据已复核。 |
| A08 | P2 / 构建依赖 | 锁文件的 qs 版本包含已报告依赖安全问题；这是开发/打包工具依赖，不等于已证实扩展运行时可利用。 | 兼容升级至 6.17.0，并核实实际 node_modules 已更新。Azure/MSAL 跨主版本升级按计划暂缓，保留剩余告警，不能把 npm audit 说成全绿。 |
| A07 | P2 / 面板正确性与易用性 | 活动提交 stage/message 每次改变都会影响结构 key，导致列表重建；同时旧回归强制 key 改变，与原地更新契约冲突。 | 用稳定 operationId 更新展开/折叠卡的状态、计数、说明；状态转换仍改变结构。`PanelHtml.legacy.ts:14851,15312`；真实渲染脚本、原地 DOM 与进度可见性回归。 |
| A09 | P2 / 文档过期 | README/架构说明把退役 Hub 描述为当前运行目标，与 Worker-only 规则冲突，容易误导配置。 | 更新现行拓扑说明；不把历史文档矛盾当成运行代码缺陷。README 与 `docs/architecture.md` 已同步，Worker-only 回归保留。 |

## 额外确认的测试问题

- T01：旧复合套件及两条分支场景超过本轮 20 秒边界。拆分为独立场景；342 条原分支断言经 AST 比对保留。
- T02：虚拟时钟把真实 Python/AST 启动耗时放大，且就绪标记可串到后续子进程。改为逐子进程真实就绪后推进虚拟时间，原截止与拒绝断言保留。
- T03：旧面板回归把“必须重绘”当成需求，误拒绝正确的原地文字更新。改为驱动真实渲染函数，验证展开/折叠文字及时更新，状态及版本断言保留。
- T04：部分夹具自动删除或使用固定临时 worktree 名，与保留规则冲突，也会在保留旧数据后撞路径。改为精确保留原字节或安全模拟，使用唯一私有路径。
- T05：执行器解析丢失 `--test`，两项额外登记还没有期限。项目清单显式启用统一参数；独有名称/参数矩阵保留，执行器自身模拟超时的专用夹具不改变语义。

原生长组合出现退出码未知及 WSL 冷启动超时属于已观察现象，根因未完全证明，不计入“确认产品缺陷”数量。最终保留原始连续组合为必跑回归；Windows WSL 启动器保留等待 shell 父进程，按精确状态返回 Python 结果。33 条原 Python 断言保留，仍要求真实整数退出码；未添加返回码兜底或跳过失败。历史上游记录仅作为启动上下文问题的线索，不声称证明了本机内核的具体根因。

## 覆盖与限制

| 模块 | 已验证范围 | 限制 |
| --- | --- | --- |
| 激活、安装与入口 | TypeScript 编译、实际 dist 导入闭包、CLI 动态入口、VSIX 门禁 | Extension Host 实际加载状态需安装后由用户 Reload Window 验证。 |
| 配置、连接、准备 | Worker-only、动态隧道端点、生命周期及项目隔离的现有本地测试 | 未连接真实 Worker，未更新远端 Agent；macOS 未做原生实测，非 Windows 构建锁仅静态审查。 |
| 同步、计划、派发 | 同步范围、前置检查、错误回传、重复接收身份、队列恢复、取消围栏 | 不把替身测试当成服务器端到端实测。 |
| Scheduler、状态、结果 | 函数提取回归、私有原生 tmux、状态原子写、完成确认/结果查询现有测试 | 本机 tmux 3.4 直接启动的长组合曾出现退出码未知，原失败保留；修正 WSL 启动边界后原组合恢复必跑，未据此改写真实 Worker 退出状态。 |
| UI/API/CLI | 真实 HTML 内层脚本解析、DOM 更新、API 方法边界、CLI 契约 | 未在安装后操作正在运行的面板；真实 UI 验收需重载。 |
| 删除与清理 | 路径/父目录/类型/指纹及双确认现有测试；私有夹具最终删除改为保留或安全模拟 | 无真实用户文件永久删除，无生产清理；不声称真实破坏性操作验收。 |
| 构建与测试维护 | 全部原断言保留，复合场景分组，Node 20 秒/Python 10 秒边界 | 原始失败、取消、超时均保留，不计为通过；没有新增压测或性能阈值。 |
| 依赖与更新源 | qs 实际版本、校验清单绑定、配套 SFTP 旁车 | Azure/MSAL 告警尚存，需在单独兼容性批次处理。 |

本轮完整回归指统一 `package` 清单及定向补充检查；未纳入该清单的其他仓库测试未运行，不能表述为全仓所有测试通过。

## 交付状态

本轮规定验证与 `npm run package -- --max-parallel 1 --cancel-stdin` 已通过：304 个作业、241 个唯一文件，全部实际串行执行，按需未运行 0，构建锁正常释放。原始连续 tmux 场景为必跑项并通过。实际包通过 302 项运行文件哈希、ZIP 身份/版本/平台/engine、运行闭包、内容策略和秘密排除检查。

- 已验证构建提交：`205b00b3fecee58b14610254fa456d1a9078a47f`。后续本报告补记不改变运行输入和包字节。
- 确定包：`simple-experiment-0.5.423.vsix`，2680899 字节，universal，VS Code engine `^1.100.0`。
- SHA256：`800772953f36289ec68bdb9dbc59be7923ed0c33f39aad7ef8362c7eed452c36`。后续上传与安装复用这个确定包。
- 源码审阅：[PR #26](https://github.com/zlinkw/SimpleExperiment/pull/26)。发行信息以 [v0.5.423](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.423) 的真实元数据与本轮交付回执为准；本报告不把尚未发生的发布或安装记成完成。
- 安装后仍需用户 Reload Window；运行中的 Extension Host 和真实面板验收不在磁盘版本核对中冒充完成。真实 Worker 未部署，相关远端 runtime 修复需后续主动准备 Worker 才能生效。

## 分批证据

下方保留每批实现、回归与首次失败记录；相同项目的后续条目可更新早期状态，但不抹去旧失败。

### 历史执行记录

Base: 7a6062fa10441cc5852166a34138781a2604d9e9
Branch: codex/plugin-audit-20261028
Original workspace and other development worktrees are protected.

B1 build lock: passed (2 targeted tests, node --check). npm run build compiled successfully and passed 19 suites before explicitly cancelled: it expands unrelated legacy suites; cancellation exit 1 retained, not a passing build. Process tree 1652 terminated with taskkill /T, exit 0. No publication/installation. B2 closure: passed. Closure 6/6; workspace isolation 19/19; submission guard 26/26. Missing DispatchHandoffGate generated by the isolated compiler; required imports now fail with chains and CLI is explicit. B3 task identity: passed. Extracted-handler regression 1/1, pulled control 5/5, local stop 3/3; scheduler contract checked separately. Cancellation failure now retains intent and native window ownership is rechecked. No real Worker invocation. B4 state/discovery: passed. Isolation regression 2/2, queue stability 19/19, local API 32/32. Initial targeted API failure (missing lease pluginId) fixed; subsequent complete suite passed. Each writer owns a unique staging slot; existing cross-process resource leases guard default record compare/publication. B5 API/checksum: passed. localApi 32/32 including inherited method refusals; pairedUpdateClient 5/5 including nameless checksum refusal. B6 dependency/release: passed with explicit Azure deferral. qs lock updated to compatible 6.17.0; lock-only audit exit 1 now lists only Azure identity/MSAL (2 package reports, one advisory), qs absent. Installed build-tool dependency tree has not been refreshed. SimpleSFTP v0.2.114 original VSIX downloaded and SHA256 verified d6fe7f339acd3644b90422ef55db65a3b2b73fb5b462423b7d2d3aa9f0abd571; added filename-bound sidecar only. Latest re-read: stable tag unchanged, assets 235482/91 bytes. Sidecar digest 36c9481e631dc47dc55b890a90b53a8d4d71bb1f68fa05e9da45898d6a6250bc. B7 panel/docs: passed. panelRenderHealth 12/12 with current-stage text assertion; rendered script health 5/5 and Worker topology 4/4. Active progress updates patch cards and folded summaries; current topology docs corrected.

Only isolated fixtures; no live Worker operations. Existing legacy locks are retained. Each batch keeps real commands and results.


Delivery boundary: runtime fixes and targeted checks are complete; full build/package are NOT passed. Full build was cancelled after 19 passing suites. Package dry-run expands 238 existing jobs, including direct filesystem removals in testWorkflowRunner/resultSyncFailureVisibility and other fixtures, and a legacy 60000ms runner override conflicting with this task's 20000ms rule. These suites were not silently removed or marked passed. The old runner suite was interrupted; two obsolete directory-lock assertions were adapted to process ownership and both targeted cases now pass. Remaining fixture deletion scenarios are retained unchanged and unexecuted.

B1 follow-up: metadata links rejected; owner file opened without truncation before inode checks. Legacy exit code 3 and release receipts preserved. Three new regression suites explicitly registered for package coverage.

No SimpleExperiment package, release, install, merge, or remote Agent update has been performed. Azure/MSAL upgrade remains deferred per plan.

Windows lock correction: a real EACCES on reserved port 50523 invalidated the hashed-TCP-only approach. Windows now uses a named OS mutex held by hidden pwsh.exe with stdin lifetime; no fixed tunnel endpoint or directory deletion. Unix keeps bounded same-root TCP exclusion. Link escape regression and the two adapted real runner cases pass. Full historic runner suite remains unverified.

Authorized test maintenance C1: user approved preserving all assertions, splitting the legacy 60s suite into <=20s groups, and retaining/safely simulating cleanup. Setup guide 12/12, package policy 10/10, result-sync visibility 32/32, runner missing-output/user-site cases 2/2 passed. Missing-file races now retain exact fixture bytes under clean_dir with fingerprints and manifest; terminal cleanup leaves fixture roots intact. C2 native cleanup simulation and full matrix execution pending.

Authorized maintenance C2: paired legacy leases 40 pass / 1 platform skip, native cache panel 10/10, delete/requeue coverage 29/29, changed branch-identity cases 2/2. Native PowerShell keeps original parent/type/fingerprint guards; only the final fixture deletion action calls the retaining helper. Distinct fresh worlds preserve rejected symlink/hardlink fixtures. Branch worktree path was fixed to a unique fixture parent after a retained-directory collision. Full branch suite and runner matrix pending.

Authorized maintenance C3: dynamic planning enumerates every literal registered test name for the two large suites, rejects dynamic/duplicate registrations, normalizes each case to 20000ms and preserves per-case argv identity. Independent lexical plan oracle agrees. Matrix evidence: audit-case-matrix/1793162264680 indices 0..42 exit 0; old composite ff case 43 exceeded the outer 20s cap and was stopped, not retried. It was split into five isolated scenarios retaining its assertions (previous explicit 30s override removed). Delta audit-case-matrix/1793162556252 all 13 groups exit 0; missing-merge group separately exit 0. Combined: all 57 current groups covered (one platform-specific skip), no original assertion removed. Full updated plan reconciliation passed.

Authorized maintenance C4: additional selected test backends now retain exact removed inputs, including archived-review fixtures inside a private outer scope. pluginLogRetention 15/15, projectStatePaths 19/19, planJobDeleteRequeueProduction 8/8, planBatchPhysicalPipeline 2/2, isolated-review suites 5/5 + 5/5 + 5/5. Production deletion actions and all existing assertions remain unchanged; only private fixture filesystem effects are simulated by retaining their bytes.

Candidate 0.5.422: package/lock/source runtime versions synchronized; fresh compiler succeeded. Actual installed tooling qs verified 6.17.0 after invalidating npm hidden-lock directory timestamp (lock-only update had left actual files at 6.16.0). Private WSL tmux lifecycle suite 3/3 passed; it uses newly created private TMUX_TMPDIR or socket and extracts functions only, no production Worker operations. Final package run pending. Aborted owned build 1652 journal retained in reports and logically released after its previously confirmed whole-tree termination.

C5 admission compatibility follow-up: negative regression proved the stricter duplicate guard rejected a legally admitted nested-options request. Stable identity comparison now uses the exact same root-over-options precedence as initial admission, without repeating source/environment probes. Both nested and root-precedence positive cases pass alongside conflict and stop negatives. Candidate package run 2026-10-28T04-49-07-766Z-24204-package was cancelled and its owned tree terminated successfully; it is not passing delivery evidence.

C6 test observability/stability: first package attempt also recorded a real virtual-deadline assertion failure in formalJobPreflightFailure (not hidden). The three inactivity variants now advance their controlled virtual clock only after the real private probe emits its ready marker; interpreter/AST startup and reader teardown remain bounded by the unchanged outer 10s limit and are retained as wall-time diagnostics. The <90 virtual deadline, no-training, and rejection assertions are preserved, with a ready assertion preventing false startup-only passes. Failure suite passes; seven related preflight consumers pass with complete logs under audit-preflight-88b39ee0d27a4c3f985d65092ff5ccdb.

Native tmux previously produced a dead pane without an integer exit code; the strict fixture failed and its original assertions were not relaxed. Per-poll raw native exit/signal fields are now retained for timeout diagnostics using the same query, with no extra post-deadline query. A diagnostic-string escaping error was corrected before acceptance. The full private native suite subsequently passed 3/3 (16s); final package verification remains required.

Final candidate advanced to 0.5.423 because open PR #25 independently prepares 0.5.422; no other branch was modified or merged. Private native tmux subcases also use case-group planning, keeping each WSL child within its unchanged 10s bound instead of accumulating cold-start costs into one Node file budget. Source assertions remain unchanged.

C7 final-package feedback: package run 2026-10-28T05-04-49-615Z-73980-package completed with real exit 1, 298 scheduled jobs, 293 passed and 5 failed; no on-demand omissions, max concurrency 1, lockReleased=true. It did not assemble a package. Failures: grow startup virtual-clock race, strict private native tmux exit observation, an obsolete UI key-must-change assertion, and two composite branch-case 20s timeouts. No unchanged timed-out case was retried. All original failure logs remain.

C7 corrected test boundaries: all synthetic CPU progress variants now use per-subprocess ready markers, so one phase cannot advance the next phase clock before it starts. Unchanged 10s/20s budgets and all correctness/deadline assertions remain. Progress and failure suites passed, followed by all six additional shared-fixture consumers (audit-preflight-delta-1793165223126). The UI regression now drives the actual rendered key-hit DOM patch path and verifies current expanded/folded status, count and note text; status/revision safeguards remain, 4/4 passed. Fresh compile-generated formatting and manifest outputs are retained; full package is still pending.

C8 authorized bounded-case maintenance: the two failed branch composites were split into eight independent scenarios with fresh private worlds. All original assertion call texts/multiplicities are preserved (AST comparison), all eight groups passed under the same 20s cap (audit-delta-1793165016848). The runner plan oracle and both affected user-site cases passed (audit-delta-1793165151791); their Python lookup caps now obey the project 10s child requirement, with no widened budget. Full package must still revalidate the frozen final plan.

C9 native fixture isolation: the long composite retained a dead pane with no native status/signal; a private verbose diagnostic also showed an unreaped child. This is observed local tmux 3.4/WSL evidence, not proof of a production-code cause. The minimal real negative-exit scenario returned integer 7. Separate recovery and failure/binding/rerun worlds now keep every original Python assert (33 via AST comparison); the original all-scenario fixture remains callable. Immediate WSL readiness also avoids charging cold-start work to the unchanged Python 10s limit; the Node 20s limit remains. An initial split missed the local controller variable and failed; it was corrected, not suppressed. Four native groups passed across audit-delta-1793165421138 and audit-delta-1793165440869; final independent plan reconciliation passed (audit-delta-1793165487323). No product exit-code fallback, PID signal, user tmux server, test skip, or wider deadline was added. The earlier combined native failures/timeouts remain non-passing evidence; final package must pass the newly bounded plan.

C10 execution-boundary correction: inspection of real receipts exposed parseNodeTest stripping --test, and two extra files had empty argv with no timeout. The 65996 package was cooperatively cancelled (211 passed, one cancelled, lockReleased=true), not certified. The repository now explicitly enables boundedNodeTests: every planned job receives --test --test-force-exit --test-timeout 20000 while unique name/parameter matrices remain; deliberate runner-fixture timeout matrices retain their original semantics when the policy is absent. Independent plan reconciliation and expanded grouping checks passed (audit-delta-1793165985244); the previously empty-argv API 32/32 and unified admission 15/15 passed with prescribed flags. Actual exported planner verification confirms all 305 jobs have those flags, zero on-demand omissions, with complete argv retained in audit-bounded-actual-jobs.json. The earlier PowerShell inspection mistakenly read the CLI summary jobs count as a job array; it failed and was replaced by inspecting the actual exported planner result. No prior receipt was edited into a passing result.

C11 full-scenario correction: 69376 package passed all 305 planned jobs (241 unique files, zero on-demand omissions, max concurrency 1, lock released). Its exact VSIX passed 302 runtime hashes/identity, archive policy/secret patterns, platform universal and engine ^1.100.0; 2680899 bytes, SHA256 541dc58350d36519916c3c765130589f60fd54a450865a5e965772fe26e57cb6. However, an additional run of the retained original sequential native scenario failed at a dead pane with no native status. Separate cases are therefore not accepted as equivalent sequential coverage. Publication and installation remained blocked.

C11 diagnosis: the unchanged source passed through a pure exec launcher, and a waiting-shell WSL launcher passed the original complete sequence. Targeted probes with extra native fields and with the synthetic missing-status block removed also passed; those minimised/instrumented results do not certify the original direct launch. A historical upstream report (https://github.com/microsoft/WSL/issues/4138) describes similar parent-context reaping symptoms; it is supporting context, not proof that the old upstream cause exactly matches this modern machine. The Windows native scenario launcher now retains a non-exec shell parent and returns the exact Python status via quoted positional arguments. The original combined test title/sequence is restored as mandatory, replacing the two temporary split registrations; all 33 Python asserts remain. Product runtime, native exit-code checks, 10s Python and 20s Node budgets are unchanged. The old validated VSIX/receipt are copied to audit-package-e39f9c83 before any rebuild. Fresh original-chain and full-plan verification remain required.

C11 targeted acceptance: all three native groups including the restored original combined sequence passed under the unchanged 10s/20s bounds (audit-delta-1793167960210). Independent final-plan reconciliation also passed. The combined chain is mandatory again; split-only evidence is not used to waive it.

C12 final verification: 640-package completed with overall=passed, 304 jobs/241 files, zero on-demand omissions and max concurrency 1, lockReleased=true. Every actual receipt argv includes --test --test-force-exit --test-timeout 20000; all exit codes are 0 and owned trees confirmed. The original complete native chain passed. Actual VSIX: 2680899 bytes, SHA256 800772953f36289ec68bdb9dbc59be7923ed0c33f39aad7ef8362c7eed452c36. Runtime/identity 302 hashes, closure 302 modules/2 entries, archive 351 entries with zero leaks/missing/readme violations, engine ^1.100.0/universal, and vm.Script passed. Publication/install remain separate subsequent actions.
