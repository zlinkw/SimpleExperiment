# evidence.md — plan-state-guard 主证据（修订 r15）

- 任务ID：plan-state-guard（所选PLAN提交 0/1：`nwpu3 机器状态映射未知或代码清单覆盖状态路径，未上传。`）
- r15（plan r13 P11 轮）：新增 E16h（UpdateGate/ownerAlive/reuseIdleRegistry/readRegistry 关键正文逐字 + extra/journal 两份补充宿主证据全文事实）与 F16（新分支 fix-paired-update-legacy-lease@ab2 基线、红灯回归 9 用例首跑 exit 1 [1过/8红=预期证明]、夹具对齐复跑 2/2 绿）；生产码零改动，停等 P12 指导。r14 及以前原样保留。
- r14（F15 宿主证据并入轮，仍只读、不实现）：新增 E16g——运行体实为 405（gate/lease dist 与冻结树逐字节同）、335 目录全量、79 个 1b8acce2~ac3b9836 窗口形状缺 PID 根（76 空/3 含旧 lease/1 choosing/3 ticket，pid 14764 已复用）、可共用 reader 现状与候选接缝；H-A 由形状+时间窗钉死为实际存在。r13 及以前原样保留。
- r13（F15 调查轮，仅证据调查指令；未运行任何验证、未改码/Git/包）：新增 E16（本地"检查更新并安装"报"本地传输租约损坏，已阻止安装"的 UpdateGate/ResourceOperationLease/UpdateTransaction/Bootstrap 定向源码证据、writer 时间线与假设空间）与 F15 调查记录；等待主控宿主租约实取证据与 GPT 详细计划。r12 及以前历史原样保留。
- r12（P9 发行/安装最终事实补证，按 plan.md r12；本实例零操作，仅事实入证）：新增 F14——v0.5.405 Release 发布并回读（target=ab2a1171，Latest，两资产 size/digest 等冻结包）、ReleaseClient 默认公开 fetch 证实 403→405 发现、install:latest 一次 exit 0 装 405、verify-install 417 文件全过（仅安装器 metadata 规范化）、simpleex 身份握手 exit2 明确"需重载"保护边界；P10=用户 Reload Window 后只读验收。r10 及以前历史证据原样保留。
- r10（P8 合并后本机快进同步轮，按 plan.md r10 授权）：新增 F13——PR#7 已合并（merge commit=origin/master=`ab2a11711a7c1f702f7327be81cd829165f3d52e`，mergedAt 2026-10-23T21:13:49Z，主控 GitHubAPI+fetch 核实，日志 fcfd4346），祖先副本 ff-only 同步完成：master/祖先 HEAD/缓存 origin/master 三者==ab2，merge tree==candidate tree==`46e55613`，18 文件实读 sha256 全等最终 receipt，工作树全空；保护指纹前后仅祖先行 HEAD 一处差异（可逆重建证明）。r8 及以前历史证据原样保留。
- r8（P5 通过收口轮，按 plan.md r8 授权）：新增 F12——Windows 完整 package 通过（216 文件/1676 用例/1674 通过/2 Linux 专属 skip）、9 生成物自 Windows 树按 receipt 精确同步、两项 Linux 平台补验（cacheRetentionBatch 1/1、incrementalMetadata 6/6）、18 文件本地提交 candidate=`509dcb03160a59867a070bc8dcbb42ef1cd965d1`、双角色干净祖先副本登记、README 包后门禁首败→ReadmeProcessor 期望修正→终过的完整收据链。r1–r7 全部历史证据原样保留。
- **流程裁定收紧（r5 生效，plan r4 §118）**：预检/验证器失败同样属于验证失败，无"脚手架不算"例外；每次完整尝试失败保留完整唯一日志、更新本证据并通知主控停等新指导，不得自行修好再报告。F08 中被正确运行覆盖的 node 误执行 .py 首跑日志**不再补造**，保留原生会话事件引用（见 F08"过程小错"），本轮起不覆盖任何日志。
- 文档修订历史：r1 初版；r2 仅补证据；r3 P2–P4 实现轮证据（F07）；r4 审查返修轮证据（F08）；r5 R41 收口轮证据（F09）；r6 P5a 版本/清单/交接轮证据（F10）。
- **F07 流程偏差裁定（r4 生效）**：F07 披露的"首轮完整失败后同轮自修"偏差已记入 plan r3；主控裁定**今后无"机械缺陷/夹具调整"豁免**——每次完整实现或测试失败，先补证据（F 编号+完整日志+退出码+输入 hash）通知主控并停等新指导，不得自行修完再报告。
- r3 候选（历史，未通过审查；HEAD 仍 `a7e9c7d3`；node_modules 符号链接未跟踪、不暂存）：

| 文件（r3 候选） | SHA256 |
|---|---|
| src/extension/legacy.ts | bfa02e20c7bb9898d582197d2c33fd48aaae1576a8d53ec27af869f51d1015df |
| src/features/ProjectRootMap.ts（与 r1 候选同字节） | 621bc4abd831dcb8bd536ece3620426a5d7dca5599575c2ac5d558d60ce82f4b |
| test/features/planSubmissionStateGuard.test.js | 5c08d7e5d2c7d700c43370f12fd21793bde4a3da23e8b3abafcaf2572ed6c701 |
| test/features/projectRootMap.test.js | e3e8918eaac9c8f09a318cee9c4e4e970eba98b652668f9ba622767f623fee2c |
| test/features/planPreflightProgressSpeed.test.js（夹具替身+9行） | 2abd0d5c228c69dec94dcaade4f41d497d581fc83ab93999bd5b3490110e68dc |
| package.json（test:plan-run 新文件仅登记一次） | 3486cb29a56b75cde886abe238748fc9e347afed1d7317f783d2a6a7564fea8a |
| dist/extension/legacy.js（本轮 tsc 生成） | 477f843576e91b8f033f200f01619a854d9e8deb246030e92683f807ccfca1ba |
| dist/features/ProjectRootMap.js（与 r1 候选同字节） | c1a3c90c9631bada3aaa904fd71efc104cbbf27163a70c4c49a70f0df58aabf6 |
| dist/panel-build-manifest.json（write-panel-build-manifest 再生成，登记新 dist hash，buildId d2d6f7dc…） | cd4e30d4ffab73d0bedabbf69d503f327ed824da917ad411711a9dcfa378132b |
| dist/runtime/cluster_agent.py（write-agent-runtime 验证未变） | d1a61ee60a6876c4bb863a0bd3457844a1d89d59730f417891fa2a02d89b90de |

- r4 当前候选（HEAD 仍 `a7e9c7d3`；8 文件 M `+524/−31` + 3 项未跟踪；node_modules 符号链接不暂存）：

| 文件（r4 候选） | SHA256 |
|---|---|
| src/extension/legacy.ts（R31+R33） | cbabe06ca6ff8fdae58653c5c48a803fb7c076358a673447c253faa9024bbf5b |
| src/features/ProjectRootMap.ts（未再改） | 621bc4abd831dcb8bd536ece3620426a5d7dca5599575c2ac5d558d60ce82f4b |
| test/features/planSubmissionStateGuard.test.js（R32 删逃生 + 7 新用例 = 22 用例） | 41573efc58d6ee1057cebdb6e7c31864f70d5eb65076242d12700acf62984774 |
| test/features/projectRootMap.test.js（未再改） | e3e8918eaac9c8f09a318cee9c4e4e970eba98b652668f9ba622767f623fee2c |
| test/features/planPreflightProgressSpeed.test.js（未再改，夹具替身+9行） | 2abd0d5c228c69dec94dcaade4f41d497d581fc83ab93999bd5b3490110e68dc |
| package.json（未再改；新文件登记仍恰一次，grep -c=1） | 3486cb29a56b75cde886abe238748fc9e347afed1d7317f783d2a6a7564fea8a |
| dist/extension/legacy.js（tsc-r4 生成，cmp 字节一致核验） | 4b4909e05afc0bb4d21b20c97bdef1090785dfe7bfa30c55f43e245975b7339a |
| dist/features/ProjectRootMap.js（与 r3 同字节） | c1a3c90c9631bada3aaa904fd71efc104cbbf27163a70c4c49a70f0df58aabf6 |
| dist/panel-build-manifest.json（登记 r4 dist hash 与新 buildId） | 3fb91de4e2c585f458c0f2855f098c9c4748ff10eae21e1de3bc066eb4f7a081 |
| dist/runtime/cluster_agent.py（write-agent-runtime kept） | d1a61ee60a6876c4bb863a0bd3457844a1d89d59730f417891fa2a02d89b90de |

- r5 当前候选（HEAD 仍 `a7e9c7d3`；8 文件 M `+564/−31` + 3 项未跟踪；node_modules 符号链接不暂存；其余文件与 r4 表同字节）：

| 文件（r5 候选） | SHA256 |
|---|---|
| src/extension/legacy.ts（R41 收口） | c966021a56831bc77ca86a8c8de0087eb38c939191c9fccc2ba579c17915edce |
| test/features/planSubmissionStateGuard.test.js（26 用例） | 7e3cb2790f4dec781ae0085f86418968c43406bae753e001b997ab7e3622e9b6 |
| dist/extension/legacy.js（tsc-r5 生成，cmp 字节一致） | 8775a82a4d6c5133a032acd2b4860a2160dd868bf8687e8186e0869dfcd90a1d |
| dist/panel-build-manifest.json（登记 r5 dist hash 与新 buildId） | 675fe1b2082467676611deb0f38046618383d6503fcb18e8d6ff8aa8b8a5fe04 |

- r6 版本源增量（P5a；功能源码与测试保持 r5 已审核字节不变；dist 仍为 r5 生成 0.5.404 暂态，见 F10）：

| 文件（r6 版本源） | SHA256 |
|---|---|
| package.json（version 0.5.405；替代 r5 行 `3486cb29…`，该行为 0.5.404 历史 hash） | 3c49393fb358a0a143dc8bd4feeb8dc3a2cf5be7514b6873a4bc860facd15d14 |
| package-lock.json（根 version + packages[''].version = 0.5.405，全文仅此两处 0.5.404→405） | 65945ded0d223b36b7957b8d8f3dd4470be2580327a67b424569175929839afa |
| src/runtime/RuntimeManifest.ts（CURRENT_RUNTIME_VERSION 单行 404→405） | aa30244adcfa47b890d5489473e1e18526a1e83536a51e2a817f3f279e05a6d0 |
- 负责人实例：本千问会话（fix-plan-state-guard 唯一 Linux 实现负责人）
- 采集时间：2026-10-23（Linux 沙箱本地时间约 19:00–19:55 UTC）；宿主 H01/H02 为 2026-10-24T03:35/03:53(+08:00) 时点证据
- 执行端：Linux 沙箱，node 用户(uid1000)，node v24.22.0；`/repos/MCP/zlk-cluster-orchestrator-plan-state-guard` ↔ 宿主 `D:\GitRepo\MCP\...` 同一 worktree

## 1. 仓库/工作区身份

- worktree：`/repos/MCP/zlk-cluster-orchestrator-plan-state-guard`，branch `fix-plan-state-guard`，HEAD `a7e9c7d35eb49a86447e5546b95ad7ababbba98e`（主控 fetch+GitHub API 核实的 origin/master，PR6 合并；本会话经 `git merge --ff-only a7e9c7d3…` 从 6b6d3835 推进，exit 0）
- common-dir：`/repos/MCP/zlk-cluster-orchestrator/.git`（原脏工作区未动）
- 主控只读身份快照：`/host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/linux-bash/3877dbcd-0d66-4948-98ff-b07f41cdc8b6.log`
- 中断命令（`cp /tmp/fix-backup/* → src` 复合链）结果不确定：未重放。以当前字节为准（下表），当前磁盘状态含候选修复（锚点 grep 已核实：候选 src 含 `remoteRootsEqual`/`hostMatchesOrAbsent`；候选 dist 含 `(0, ProjectRootMap_1.remoteRootsEqual)`；src mtime 19:45:43，dist mtime 19:45:50/54 晚于 src，一致性成立）。
- `node_modules` 是指向 `/repos/MCP/zlk-cluster-orchestrator/node_modules`（原仓现有依赖闭包）的未跟踪符号链接，**不得暂存/提交**。

| 文件 | 状态 | SHA256 |
|---|---|---|
| src/extension/legacy.ts（候选） | M | 5a222aa00a63ddd7a95350006e8913fe992499dfa412cd1349b15efb4fe307ac |
| src/features/ProjectRootMap.ts（候选） | M | 621bc4abd831dcb8bd536ece3620426a5d7dca5599575c2ac5d558d60ce82f4b |
| test/features/projectRootMap.test.js（候选） | M | e0db775100d95d37028af2622c58cd583b529a3c361067dad3d7440f469c9a72 |
| test/features/planSubmissionStateGuard.test.js | ?? 新增 | 1e27eacb997b4fca3303a5a9e6d484c59d43545cef64f85d58c28f3c69484a0b |
| dist/extension/legacy.js（候选编译） | M | 5baa4296d351eeac977c7dbdf3484a007a2a2a88d3cdc52c611344d6f337d5ed |
| dist/features/ProjectRootMap.js（候选编译） | M | c1a3c90c9631bada3aaa904fd71efc104cbbf27163a70c4c49a70f0df58aabf6 |
| 基线 src/extension/legacy.ts（git blob a7e9c7d3） | — | b82f78b1c7f1a1cf7f274ac7d8e56b483bdf38b872f367bcc5eaad7d1882c315 |
| 基线 src/features/ProjectRootMap.ts | — | 93724d5d9a4c358dc1ef1dec1acce7e5b2f898ce366bd61af613aa764da2e62c |
| 基线 dist/extension/legacy.js | — | 4c678a5a8fed8657af57b25b2a7e024861b679c47ff3fd279f4b41d1f2c09e5a |
| src/tunnel/XshellTunnelPortProbe.legacy.ts（未改） | — | cbd7f1219ff7c3ba8f3179ddd6da7f4af202d03d988491d7e96c46c920bad6fc |
| dist/runtime/cluster_agent.py（未改，部署体） | — | d1a61ee60a6876c4bb863a0bd3457844a1d89d59730f417891fa2a02d89b90de（与同目录 .sha256 一致） |
| src/clusterAgentRuntime.legacy.ts（runtime 模板源，未改） | — | cf982d4f9735b1c4f59cddd163cb0f8af0499f1405e601316f931a26063afc7a |

包版本：基线 package.json=0.5.404；宿主实际安装运行 0.5.403（H01/H02）。版本递增本轮未做（非目标）。

## 2. 问题与复现

- 期望：面板选择 PLAN `experiments/plans/comparison/tmdc.yaml` 提交 → 代码校验/同步 → 上传 → 派发（1/1）。
- 实际：提交 0/1，错误 `nwpu3 机器状态映射未知或代码清单覆盖状态路径，未上传。`，无任何上传发生；未连接外部服务器写。
- 复现（Linux 沙箱，无需宿主/远端）：`test/features/planSubmissionStateGuard.test.js` 用真实编译 `syncCodeTargets` 体 + 真实 `targetRootGuard`（AST 提取）+ 宿主实证的配置/探测形状，基线代码上 4 项失败（F01），候选代码 7/7 通过（F05）。
- 错误消息由两个不同内部分支产生同一文案（`!guard` 与 `guard.unknown`），单看用户消息无法区分——见 §6 Q1。

## 3. 背景与调用链（边均有下方 E 编号支撑）

```
面板提交/校验 PLAN
  ├─ legacy.ts:6407 (提交) / :2750 (API校验) → ensureWorkerCodeReadyForPlanCheck (E04a)
  │     └─ syncCodeTargets(workerCodeSyncTargets(), "plan-check") (E04a)
  │           ├─ buildLocalCodeManifest + localMachineStateGuard 门禁 (E03)
  │           └─ 每 target: targetRootGuard(target) 门禁 (E02/E03) ← 本次故障点
  ├─ prepareCodeForRun → syncCodeTargets(..., "run") (E04b)
  ├─ 手动同步入口 syncCodeTargets(..., "workers") (E04c)
  └─ 其他 targetRootGuard 消费方: :9491/:9673/:9764/:19864-19867(传输安全)/PlanCleanupNodeGuards.ts:30,48（清理 fail-closed）
targetRootGuard 读取:
  ├─ setupConfig.workerTunnels（配置形状 E09）
  ├─ agentRuntimeDirs/remoteProjectName/expectedWorkerAgentProjectRoot (E08)
  ├─ lastWorkerProbes[id]（写入/清除/合并点 E06；probe 构造 E07）
  └─ resolveProjectRootMap/machineStateGuard/isUnderMachineStatePrefixes (E10)
Agent 侧契约（probe.projectRoot/workerId/状态根默认值的真源）：dist/runtime/cluster_agent.py (E11)
```

## 4. 源码证据（r23 按已验收完成项压缩；完整未压缩原文已归档可取回）

> **归档**：`archive/r23-completed-summary-20261024/`（manifest：evidence.md SHA `caa14956e7101310d33fc233cc9f27017b2c26895549269b7ba6cd498b87826a`/167628B；plan.md SHA `5cdc8900a9132ec4dd8f7a1b9ddf14e58ef5400c48ebe861f3ca00fe1748e37a`/59643B；verify-archive exit 0，2026-10-24T01:25:19Z）。E01–E15 支撑的 P0–P9/P11 已全部验收并合入（candidate 509dcb03 → merge ab2a1171，tree 46e55613），下面仅存章节索引与结论；原文按归档 manifest 逐字节取回。**E16（F15 当前任务证据）按授权保留全量原文于本节末尾，未压缩。**

章节索引（原 §4 标题行，正文见归档 evidence.md 对应章节）：
```text
### E01 基线 legacy.ts（b82f78b1）：类型门禁用物 + import
### E02 基线 legacy.ts L8885-8925：targetRootGuard 全文（含异常出口）
### E03 基线 legacy.ts L9888-9931：syncCodeTargets 的本机/远端两道门禁与后续
### E04 基线 legacy.ts：调用者
### E05 `remotePathKey` 的真实作用域（核心缺陷 1）
### E06 基线 legacy.ts：lastWorkerProbes 的键、全部写入点（完整原文）、清除、失效
### E07 XshellTunnelPortProbe.legacy.ts（cbd7f121）：probe 形状
### E08 基线 legacy.ts：根目录推导
### E09 基线 legacy.ts L10359-10422：同步目标形状（配置类型证据；r2 补全完整返回）
### E10 基线 ProjectRootMap.ts（93724d5d）：映射/谓词（关键函数全文）
### E11 Agent 侧合同（部署体 dist/runtime/cluster_agent.py，d1a61ee6；模板源 src/clusterAgentRuntime.legacy.ts cf982d4f 对应 api_health L6749 起、workerId 行 L6778、main env 行 L15744）
### E12 当前候选（磁盘字节；供 GPT 判断放宽是否正确，勿默认全对）
### E13 新回归 test/features/planSubmissionStateGuard.test.js（1e27eacb，225 行）关键段
### E14 r2 新增：有界只读真探的可复用闭包、探测顺序、异步围栏与远端写清单
### E15 r7 新增：F11 Windows package 并发用例失败——fixture/生产时序/基线对照
```

结论摘要（P0–P9/P11，代码身份=ab2a1171 树 46e55613）：
- E01–E05：基线 targetRootGuard/syncCodeTargets 双门禁、调用者与 remotePathKey 作用域钉死核心缺陷 1 → P2–P3 修复已合并。
- E06：lastWorkerProbes 键/四个写入点/失效路径完整原文与 stampWorkerProbeGeneration 指纹 → 修复已合并（本计划主线交付物）。
- E07–E11：probe 形状、根目录推导、同步目标形状、ProjectRootMap 谓词、Agent 侧 workerId/api_health 合同 → P2–P4 实现依据，验收 26/26+18 批量 192/192+projectRootMap 14/14+planPreflight 隔离 20/20 全 exit 0（r5）。
- E12–E13：候选放宽点判定与 planSubmissionStateGuard 回归演进（22→26 例）→ 已合并。
- E14：有界只读真探闭包/探测顺序/异步围栏/远端写清单 → R31–R34 返修后通过（两道门禁语义已入码）。
- E15：F11 Windows package 唯一失败=既有并发用例竞态（fixture/生产时序/基线对照三证）→ r7 测试侧修复（planJobDeleteRequeue sha 3ed4e6ce…），生产路径逐字节同基线。

### E16 r13 调查轮：本地"检查更新并安装"失败 F15 定向源码证据（只读；行号对应下列 SHA，未运行任何验证）

用户可见失败：`配套更新未完成：本地传输租约损坏，已阻止安装。。已完成：simple-local.simple-experiment；待完成：simple-local.simple-sftp`。文件 SHA256：`src/updates/UpdateGate.ts`=6162380ed055cddc…、`src/core/ResourceOperationLease.ts`=ee2ef98c2a03eb84…、`src/updates/Bootstrap.ts`=3b4055f0c5387c89…、`src/updates/UpdateTransaction.ts`=98f5afd64da5ecd8…、`test/features/pairedUpdateGate.test.js`=558c23e8b1140ecb…；dist：updates/UpdateGate.js=0bb6be30…、core/ResourceOperationLease.js=c7438649…。冻结源码=已验收 405 树字节（本任务合入未触碰这些文件）。

E16a 抛出点唯一：UpdateGate.wait（L20-42）扫描 `defaultHostOperationLeasePath()+".resources-v2"`（= `%LOCALAPPDATA%\SimpleExperiment\host-operation-lease.json.resources-v2`，HostOperationLease.legacy.ts L353-355）下 `^[0-9a-f]{64}\.json$` 全部文件（**每个窗口一个 sha256(owner) 文件，验证不区分归属**）：
- L28 身份检查（非普通文件/符号链接/>8MiB）→ 文案"租约**身份无效**"（与本次不同，排除）。
- L30：`row.schemaVersion !== 2 || !Array.isArray(row.leases) || !Number.isInteger(row.processId) || row.processId <= 0` → **`本地传输租约损坏，已阻止安装。`**——先于活跃判断执行，**即使该文件完全空闲（leases=[]、ticket=0、choosing=false）也抛**。
- L29 `JSON.parse` 为裸读：截断/非法 JSON → SyntaxError 裸传播（另一签名，非本次文案）→ 本次错误 ⇒ 文件可解析但三条件之一不满足。
- L31-32 注释"Expired heartbeat of a live/unknown owner is not an exit proof"：`(leases.length || choosing || ticket) && ownerAlive(processId)` 才 active；ownerAlive=process.kill(pid,0)，仅 ESRCH 证明消失（L10-12）。300 秒超时是另一文案（L35）。`.ownership/.writing` sidecar 不匹配名字过滤，不在扫描内。

E16b 消息组装与"已完成 experiment"推导：UpdateTransaction.run L84 `配套更新未完成：${journal.error}。已完成：…`（双句号因 error 自带句号）。L45-47 `installed(c)=currentVersion(c)>=latestVersion`，`currentVersion`=Bootstrap L43 `vscode.extensions.getExtension(id)?.packageJSON?.version`——VSCode 扩展元数据在磁盘安装后未重载即更新（P9 CLI 已装 405 而运行体 403），故本尝试 experiment 判已完成、pending=[sftp]（components 固定序 [sftp,experiment]，Bootstrap L88-89/L122）；L52-54 `beginGate→saveJournal→waitForTransfers` **首次调用 gate.wait 即抛**（早于任何 prepare/install）⇒ "损坏"文件是**持久存在**的，非瞬时并发。journal.status=failed、installationRequested 未置位（错在 install 之前）→ 未回滚任何组件，sftp 磁盘仍 107。

E16c 读写两口径不一致（核心事实）：
- Registry 类型（ResourceOperationLease.ts L10）声明 `processId?: number` **可选**；`readRegistry`（L144-164，带 O_NOFOLLOW/nlink/尺寸/双 stat 身份校验）验证 `schemaVersion===2 && Array.isArray(leases) && windowId && 每 lease.resources 非空数组`——**不要求 processId**；`reuseIdleRegistry` L127 读取 `row.processId ?? Number(row.windowId.split(":")[1])` 明确容忍缺字段旧文件。
- 当前 writer：pool 注册对象 L101 含 `processId: this.processId`，`write()` L109-117 先 `.ownership` 后主文件（atomicWriteText=固定槽 temp+rename，StateStore L18-29），窗口内串行队列。
- 回收保护（L118-143）：仅当**自身槽位文件不存在**的首次 write 触发、仅扫排序前 512、仅回收 `leases 空 && !choosing && ticket=0 && admission 过期 && oldPid 可解析且 ownerAlive=false` 的槽位，rename 认领；异常/未知一律保留（L141 注释"Contested, damaged or unknown records are never reclaimed"）；设计注释 L76-78：释放与崩溃恢复是逻辑的，**文件从不物理删除** ⇒ 任何旧形状文件可无限期存留并被 gate 扫到。
- `rows()` L165-180：主文件读败先试 `.ownership`，仍败且非双 ENOENT → `RESOURCE_LEASE_OWNER_UNKNOWN`（"不能忽略未知活动锁"）——业务侧同样禁止跳过未知锁。

E16d 版本时间线（git -S/log 证明，本地历史）：
- `1b8acce2`（2026-09-28）引入 schemaVersion 2 registry；`git show` 其 src pools.set 形状 `{schemaVersion:2, windowId, ticket, choosing, admissionExpiresAt, leases}` **无 processId**（94721aa9 2026-10-05 同）。
- `ac3b9836`（2026-10-05 "Complete plugin stability plan…"）writer 起在 registry JSON 内写 `processId`（L101 形状；dist 同步出现 -S 'processId:' 命中）。
- `7bb96599`（2026-10-13，0.5.290）新增 UpdateGate，wait 自始要求正整数 processId。此后 master 未再改 UpdateGate（`git log -- src/updates/UpdateGate.ts` 仅此一提交）⇒ **运行中的 0.5.403 即此严格 gate**（其 dist 字节以宿主实际为准）。
- 推论：2026-09-28~10-05 间构建释放的窗口写出的合法 v2 文件天然缺 processId；gate 上线后这类文件（无论空闲/过期）一律读作"损坏"。

E16e 假设空间（互斥判据，待主控宿主证据裁定）：
- H-A 合法旧格式缺 PID（含子例 A2：owner 已死但 leases 数组留有未清理的过期条目 → reuse 条件 `!row.leases.length` 不满足永不回收；gate L32 本会判 inactive，却在 L30 因缺 processId 先抛）。与"持久性首调即抛"完全一致。**r14 由 E16g 证实为实际存在：79 个此类文件（形状+09-28~10-05 时间窗+缺 ownership 侧车三重吻合），任一即足以让 gate.wait 首调抛错；其余假设针对"是否另有触发文件"仍未完全排除，由更新日志/journal 收尾**。
- H-B 截断/真损坏：截断→SyntaxError 另一签名；仅当文件恰为可解析 JSON 且三条件之一坏（如手改/外部工具写坏）才产本消息——宿主文件实读可判。
- H-C 活跃并发：403 时代 writer 必写 processId → 只走 wait/300 秒文案，不可能产本消息。**r14 排除为本消息来源**（运行体即 405，其 writer 恒写 processId，256 个带 pid 根形状正常）；但 256 根中 47 个 leaseCount>0 的实际忙闲仍属"等待"路径的正常对象，修复不得触碰（E16g）。
- H-D 外部/人为修改或第三方程序写入该目录：宿主 mtime/内容可判。
- 已排除：旧版全局锁（legacyGuard 文案不同，L190）；sidecar 文件（不在过滤式内）；"身份无效"分支（L28 文案不同）。

E16f 可复现接缝与测试域（修复计划归 GPT，本实例未实现）：`new UpdateGate(leasePath, ownerAlive)` 构造注入 + mkdtemp 目录即确定性复现——写 `{schemaVersion:2, windowId:"host:1:u", ticket:0, choosing:false, admissionExpiresAt:0, leases:[]}`（缺 processId）或加过期 leases+`ownerAlive:()=>false` 变体，现行为均立即抛"损坏"。既有域：`test/features/pairedUpdateGate.test.js`（2 用例：drain/取消+过期活跃回执仍阻断——修复不得弱化该断言）、`pairedUpdateTransaction.test.js`、`pairedUpdateBootstrap.test.js`、`test/core/hostOperationLease.test.js`、`hostOperationLeaseReadOnlyView.test.js`。既定边界（plan/指令钉死）：不得跳过未知活跃锁、不得以删除租约或重装 Experiment 绕过、不得回滚已完成组件、不得动 journal 批次指纹（L41-42 mixed 指纹保护）。

未知项（待主控 host_windows 证据后补结论）：目录实际文件清单（名字/windowId 前缀/是否含 processId/leases 内容/admissionExpiresAt/mtime/size）；各 windowId pid 是否存活或曾被回收（Windows pid 复用会使死主读作活）；更新日志中本次错误是"损坏"文案还是 SyntaxError；journal 实际内容（status/completed/installationRequested/fingerprint）；extensions.json 中 experiment 磁盘版本读值；是否有其它窗口正持有管理器。（r14 更新：目录清单/ownership/进程与安装身份已由 E16g 回答；更新持久化日志与 journal 内容仍待主控定向收。）

E16g r14 宿主实取事实（主控 host_windows 集中采集，采集时点 2026-10-24T00:39:15.688Z；快照 `/host/c/Users/ZLK/AppData/Local/Temp/paired-update-lease-hUR29v/host-evidence.json`（679KB，本实例只读定向提取）；执行日志 `host-windows/cc31e34f-6988-4f0f-a9e6-34966be37492-stdout.log`(445KB，未整读)；短摘要 `linux-bash/2c97a86b-e126-454f-a73f-80552526b275.log`）：
- **运行身份翻转（修正旧 403 前提）**：discovery `%APPDATA%\SimpleExperiment\api.json` name=SimpleExperiment **version=0.5.405**、pid 68892、startedAt 2026-10-24T00:33:18Z、status running；installed 列表 experiment registry/manifest=**405**（root `…simple-experiment-0.5.405`），其 `updateGate` 文件 sha256=`0bb6be305f…211220`、`leaseImplementation` sha256=`c7438649a6…86aee`——**与本任务冻结树 dist 字节逐字节同**（本地 sha256sum 复算相等）。sftp registry/manifest=0.2.107。故抛"损坏"的 gate 就是已验收 405 代码本身，与是否重载无关；legacyLease（v1 全局锁，schema1）processId=68892 ownerAlive=true=更新流程 gate.begin 自持，属正常。
- **目录全量**：335 个 64hex.json（bounded=false，无 512 截断问题）。**79 根缺 processId（processIdType=undefined），全部 schemaVersion 2，键序精确=[schemaVersion,windowId,ticket,choosing,admissionExpiresAt,leases]——即 1b8acce2/94721aa9 的 pools.set 形状；修改时间全部落在 2026-09-28T05:55:52Z .. 2026-10-05T06:30:56Z**，恰为 E16d 的"无 processId writer"窗口（1b8acce2 部署~ac3b9836 部署）→ **H-A 由形状+时间窗钉死为实际存在**。其余 256 根 PID 正常且 **256/256 带 .ownership**；79 缺 PID 根仅 2 个带 ownership（e1822567/f7848852，mtime 10-05 06:11/06:30，ac3b9836 部署当日过渡态），快照 errors[] 79 条即其中缺 sidecar 的 ENOENT 采集记录。
- **79 根内部构成**：76 条 leases 空；**3 条 leases 非空**（各 1 lease，内层含 processId：14764@09-28 `queue-write`、27292@10-01 `queue-write`、39696@10-05 SFTP `指标文件分发`）；1 条 choosing=true（26afd7ff：ticket 0、leases[]、admissionExpiresAt=1790783894226=2026-09-30T15:58:14Z 已过期、mtime 15:57:44Z——writer 崩溃于 admission 中段）；3 条 ticket=1 且 admissionExpiresAt 同为 09-30 过期值；根 ownerAlive 采集为 null（无 pid 不可判）。
- **PID 复用警示（主控明示，计划必须处理）**：内层 14764 已被 2026-10-24 新 Code 进程复用——`process.kill(14764,0)` 现返回存活 → 任何"从 lease 内层/windowId 取 pid 判活跃"的方案都会把 09-28 的死租约读成活跃（gate 300 秒阻塞）；反之**也不得把全部未知 owner 锁武断判无效**（L31 注释与 rows() 的 RESOURCE_LEASE_OWNER_UNKNOWN 语义要求保留保护）。
- **gate 语义与本目录的实际相互作用（源码推论+快照事实）**：L30 在三条件上先抛 → 79 根中即使 76 条完全空闲也已被证实必然触发本次失败；即便放宽 pid，L32 的 `leases.length || choosing || ticket` 不看 admissionExpiresAt/lease.expiresAt 过期与否，26afd7ff(choosing=true) 与 3 条 ticket=1 仍会落入"活跃待判"而 pid 缺失 → 需要明确的兼容分类学，不能只删一个条件。
- **可共用非写入解析/忙闲判定接口现状（回答主控问题）**：当前**没有已导出的共享 reader**。兼容语义全部封在 ResourceOperationLeaseManager 私有方法内：`readRegistry`（L144-164 严格身份读，容忍缺 pid）、`rows()`（L165-180 ownership 回退+未知归属硬错）、`reuseIdleRegistry`（L118-143 唯一"空闲且死主可回收"完整判定：leases 空&&!choosing&&!ticket&&admission 过期&&`row.processId ?? Number(windowId.split(":")[1])` 可解析且 ESRCH）、`ownerAlive`（L283-288 仅 ESRCH 证死）；公开面仅 `inspect()`（L289-293，需 manager 实例，只返回当前未过期且 ownerAlive 的 lease 记录，不给出根级 忙/闲/未知 分类）。UpdateGate 是独立裸 JSON.parse 循环（无身份校验、无 ownership 回退、无过期过滤）；legacy 模块只有 `parseHostOperationLeaseRecord`（v1 全局锁专用）。**候选接缝（待 GPT 计划裁定，本实例不实现）**：把上述私有兼容判定抽成导出纯函数（如 classifyRegistryRecord(text)→{idle|active|unknownLive|unknownUnverifiable}，含 pid 来源优先级、过期语义、pid 复用的时间佐证约束），gate 与 manager 共用，两侧不再各自解读。
- **首触时间线解释**：79 文件自 9/28–10/5 已存在；此前从未触发是因为该 profile 的 403→405 走 P9 CLI `install:latest`（不经 UpdateGate），0.5.290 gate 上线后本地"检查更新并安装"首次真实执行 wait() 即命中——与"持久文件+首调即抛"一致（E16b）。

E16h r15 增补（按主控要求嵌关键原函数正文；两份补充宿主证据；SHA 见 E16 头部）：
- **UpdateGate 全文（src/updates/UpdateGate.ts L8-43，sha `6162380e…`；dist 0bb6be30… 同语义）**：
```ts
export const UPDATE_ACTION = "paired-plugin-update";
export class UpdateGate {
  private held: any;
  constructor(private leasePath = defaultHostOperationLeasePath(), private ownerAlive: (pid: number) => boolean = pid => {
    try { process.kill(pid, 0); return true; } catch (error: any) { return error.code !== "ESRCH"; }
  }) {}
  async begin(storagePath: string): Promise<void> { /* LegacyHostOperationLeaseManager.acquire(全局锁) … */ }
  async wait(signal?: AbortSignal): Promise<void> {
    const directory = this.leasePath + ".resources-v2", started = Date.now();
    for (;;) {
      signal?.throwIfAborted(); await this.held?.assertHeld();
      const names = await fs.readdir(directory).catch(error => error.code === "ENOENT" ? [] : Promise.reject(error));
      let active = false;
      for (const name of names.filter(n => /^[0-9a-f]{64}\.json$/.test(n))) {
        const file = path.join(directory, name), stat = await fs.lstat(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8 * 1024 * 1024) throw new Error("本地传输租约身份无效，已阻止安装。");
        const row = JSON.parse(await fs.readFile(file, "utf8"));
        if (row.schemaVersion !== 2 || !Array.isArray(row.leases) || !Number.isInteger(row.processId) || row.processId <= 0) throw new Error("本地传输租约损坏，已阻止安装。");
        // Expired heartbeat of a live/unknown owner is not an exit proof.
        if ((row.leases.length || row.choosing || row.ticket) && this.ownerAlive(row.processId)) active = true;
      }
      if (!active) return;
      if (Date.now() - started >= 300000) throw new Error("本地操作尚未结束；停止更新等待，现有传输继续运行。请稍后重试。");
      await new Promise<void>(/* 250ms abortable sleep */);
    }
  }
}
```
  （begin/end 非等待路径语义从略；wait 全文完整。三处关键条件=L28 身份、L30 损坏、L32 活跃，逐字如上。）
- **manager 兼容判定原语（ResourceOperationLease.ts `ee2ef98c…`，均私有）**：`ownerAlive` L283-288 逐字：
```ts
private ownerAlive(record: any): boolean {
  if (this.options.ownerAlive) return this.options.ownerAlive(record) !== false;
  // Only ESRCH proves disappearance; Windows permission/probe failures are not proof.
  try { process.kill(record.processId, 0); return true; }
  catch (error: any) { return error.code !== "ESRCH"; }
}
```
  `reuseIdleRegistry` 回收条件逐字（L127-130）：
```ts
const oldPid = row.processId ?? Number(row.windowId.split(":")[1]);
// Released registries only. Unknown or live owners and recovery records stay protected.
if (!Number.isInteger(oldPid) || oldPid <= 0 || oldPid === this.processId || row.leases.length || row.choosing || row.ticket ||
  row.admissionExpiresAt > this.now() || this.ownerAlive({ processId: oldPid })) continue;
```
  `readRegistry` 校验条件逐字（L161）：`if (row.schemaVersion !== 2 || !Array.isArray(row.leases) || !row.windowId || row.leases.some((lease: any) => !Array.isArray(lease.resources) || !lease.resources.length)) throw new Error("资源锁记录损坏。");`（身份读段 O_NOFOLLOW/nlink/双 stat 见 E16c；全文已在源文件，此处嵌判定条件——两套"损坏"语义不同，仅 gate 版要求 processId。）
- **补充宿主证据 1**（`paired-update-extra-jVwtW7/evidence.json`，00:41:40Z，日志 21ed43bc-38c8-421a-989d-d00003c1d1ac exit 0）：7 样本完整身份——3 条非空旧根 windowId=`宿舍:14764:abbcee98…`/`宿舍:27292:6f2c7cfe…`/`宿舍:39696:214ba0f4…`（lease 内层 pid 与 windowId 一致；createdAt=heartbeatAt=mtime±20ms，expiresAt=+30s：09-28T17:59:26Z/10-01T06:57:41Z/10-05T05:32:46Z，全部远早于当前）；4 条 admission 崩溃/残留（choosing=true@`宿舍:32908`、ticket=1@`宿舍:20936`/`宿舍:4060`、空闲@`宿舍:31340`）。windowId 首段是**非 ASCII 主机名**（脱敏"宿舍"）——PID 段解析必须容忍任意非 `:` 主机名字符。exthost.log(20261024T083257) 24 匹配行含激活序列（simple-experiment 08:33:08 激活=405 运行体）。
- **补充宿主证据 2（journal 实读，`paired-update-journal-phngXn/evidence.json`，00:43:07Z，SQLite readOnly，日志 4791339d-65b4-490c-b043-ac89d09023cd exit 0，未改库）**：`simpleExperiment.update.transaction.v1` = `{schemaVersion:1, status:"failed", error:"本地传输租约损坏，已阻止安装。", completed:["simple-local.simple-experiment"], installationRequested:false, components:[sftp 0.2.107→0.2.108 asset simple-sftp-0.2.108.vsix size 216684 digest sha256:ef6c561e8804e00437aa349a2fb605561569cc3db1d45d0d4dc20fdd27dc09ac, experiment currentVersion:"0.5.405"→0.5.405 asset sha256:0c150404…（=冻结405包）]}`——**逐字段证实 E16b 推导**（磁盘 405 使 installed() 自动判完成；installationRequested=false ⇒ finally 正常 endGate，无批次锁死）；状态 key 同步记录 error 文案与 405/107 版本对。后续计划的事务测试基线=此冻结 405+108 组合（只补 SFTP，失败不回滚/不重复安装/不换批）。

## 5. 验证记录（F；全部 Linux，单测试进程串行，`node --test --test-force-exit --test-timeout 20000 <单文件>`）

- **F01–F14（P0–P9/P11 已验收记录，r23 压缩；每条完整命令/退出码/日志/堆栈原文在归档 evidence.md §5）**：
  - F01–F03：早期实现轮过程性失败与修复（F01④为 spec 缺失失败，非产品 bug；仅历史引用）。
  - F04–F08：目标域/批量/projectRootMap/planPreflight 隔离验证全绿记录 + R31–R34 返修与 warm 隔离重验（r4–r5，全 exit 0）。
  - F09：r5 P5a 审核通过留痕。
  - F10：405 三源版本+inventory 216 唯一/0 重复+只读 master 登记缺项（后由 F13 闭合祖先线）。
  - F11：Windows package exit 1 唯一失败=planJobDeleteRequeue 并发竞态 → 测试修复后第二轮 216 文件/1676 通过/1674 断言/0 失败/2 skip exit 0（r7/r8）。
  - F12：9 生成物按 final receipt 同步（README 首败→期望修正→终过链）、精确 stage 18 文件、candidate 提交 509dcb03（parent a7e9c7d3，+1270/-60，未 push 时点）。
  - F13：PR#7 合并 ab2a1171；祖先副本 ff-only；三一致 + tree 46e55613 相等 + 18 文件 hash 全等；保护指纹不变。
  - F14：Release v0.5.405（Latest，tag→ab2a1171；VSIX 0c150404…/2603277B）、install:latest exit 0、verify-install 417/417 exit 0、simpleex 握手 exit 2=需重载保护（当时不得称运行 405）；P10 用户重载线悬置中。
- F15（r13 新增，交付失败调查轮——**无验证运行**，纯只读源码调查）：
  - 范围与方法：按指令仅读 `src/updates/{UpdateGate,Bootstrap,UpdateTransaction}.ts`、`src/core/{ResourceOperationLease,HostOperationLease.legacy}.ts` 关键函数与 `git log/show -S` 时间线、既有 update/lease 测试文件清单；未运行测试/build/API，未读取宿主路径（宿主租约/ownership/进程/日志由主控 host_windows 集中实取），业务代码与 Git 只读。全部事实、行号、SHA 与假设判据见 E16。
  - 当前结论强度：**仅到"抛出点与三条件唯一确定（UpdateGate.ts L30），writer/reader 对 processId 口径不一致已被 git 历史钉死（1b8acce2/94721aa9 无 → ac3b9836 有 → 7bb96599 起 gate 强制）"**；具体宿主命中哪个文件/哪条假设（H-A 缺 PID 旧格式 / H-B 真损坏 / H-D 外改）标未知，待宿主实取证据裁定。不将 0.5.405 既有验收证据用作本问题任何结论。
  - 停点：等待主控实际 Windows 租约/ownership/进程/更新日志证据 + GPT 详细计划后再实现；已列复现接缝与测试域（E16f），实现边界（不跳未知锁/不删租约/不重装绕过/不回滚已完成组件/不坏 mixed 批次指纹）已钉。
- **r14 并入（宿主证据到达，仍不实现）**：目录/ownership/进程/安装身份类未知项已由 E16g 收口——运行体即 405（gate dist `0bb6be30…`、lease dist `c7438649…` 与冻结树逐字节同），79 个缺 PID 旧形状文件三重吻合（键序=1b8acce2/94721aa9 pools.set、mtime 全落 09-28~10-05、缺 ownership 侧车）→ H-A 证实存在、H-C 排除为本消息来源；pid 14764 复用与"未知锁不得武断判无效"两约束已写入 E16g 供计划引用。仍待主控定向收：更新持久化/失败日志、journal 内容、3 条非空旧 lease 的 expiresAt 与窗主身份、租约 windowId 旧 owner 身份。

- F16（r15 新增，plan r13 P11 基线+正确接缝红灯回归轮；**生产码零改动**，红灯为预期证明，按 §5 停等）：
  - **P11 基线**：node v24.22.0/git 2.39.5；tracked 全净（仅本机证据/node_modules 未跟踪）；509 分支、master==origin==ab2、原脏树指纹 `c6ac7d38…` 不变、祖先副本正常；目标分支不存在确认后，同 worktree `git switch -c fix-paired-update-legacy-lease ab2a11711a7c1f702f7327be81cd829165f3d52e` 成功（tree(ab2)==tree(509)==46e55613 ⇒ 文件零扰动），新分支 HEAD=ab2、509 与 a7 冻结身份原样；无 reset/rebase/repair。
  - **红灯回归（新文件 `test/features/pairedUpdateLegacyLease.test.js`，sha `633702120de73710…`）**：9 用例=旧v2空闲缺PID/choosing 崩溃/admission 过期残留/3 非空旧 lease 死主放行（对应宿主 3dda869b/5fe9c397/a6fec7cc）/PID 复用 StartTime 有界证明放行/复用证明不成立仍阻断/StartTime 缺失保守等待/显式非法 PID 不回退（区分"损坏"文案）/根-内层 PID 矛盾拒绝 + 全程只读守卫。夹具字段逐一取自 E16g/extra 快照（windowId 支持非 ASCII 主机名段）。接缝=计划 §3/§4 的构造注入 `(leasePath, ownerAlive, {processStartedAt})`。
  - **首次执行（pi-test-evidence、单文件、20s、隔离 `/tmp/psg-p11-LdUbkl`）**：**exit 1，1 通过/8 失败**——8 红全部因生产未修（4 例抛"损坏"文案实测入日志、2 例 LIVE 无界等待 pending、非法/矛盾 PID 未被区分拒绝），只读守卫绿；日志 `/tmp/plan-state-guard-logs/p11-red-pairedUpdateLegacyLease.log`，证据目录 `/tmp/pi-test-nrrpr5nv`（000/001/002.raw.log）。**红灯按 plan r13 §5 保存并报 GPT，未修生产**。
  - **既有夹具对齐（plan r13 §5"expired-live 夹具补齐真实 schema，不删断言"）**：`test/features/pairedUpdateGate.test.js` 第 2 例夹具补 windowId/完整 lease 形状（断言两条原文未动）→ 新 sha `0ea4f5edad9d9e55…`，整文件复跑 **exit 0，2/2**（`p11-pairedUpdateGate-fixture.log`，`/tmp/pi-test-910o7xm5`）。
  - 停点：红灯证明已存，等待 GPT 对 P12 生产实现（安全 reader 共用/兼容分类/有界 StartTime 批量）的指导；406 版本与完整重验在 P13+。

- F17（r16 新增，plan r13+r14 授权的 P12 生产实现 + P13 开发域 + 406 三源同步 + 交接更新；未执行 Windows 构建/安装/GitHub）：
  - **分支/HEAD 身份**：`fix-paired-update-legacy-lease`@`ab2a1171` 不变；index 全程为空（`git diff --cached --name-only`=0 行），本轮按 r16 授权**不 commit**；原 509/a7/脏树/祖先冻结身份未触碰。
  - **生产改动 1——`src/core/ResourceOperationLease.ts`（sha `f79dde71…`）**：仅按 r14"核心 manager 只抽等价 reader"执行——新导出 `readResourceLeaseRegistrySecure(file)→{record,mtimeMs}`（原私有安全读逐字迁移+捕获 before.mtimeMs）与 `readResourceLeaseRegistryWithOwnership(file)`（与 rows() 等价的 main→.ownership 恢复、双 ENOENT=undefined、否则 RESOURCE_LEASE_OWNER_UNKNOWN 抛，孤侧车纳入）；manager 私有 `readRegistry`/`rows()` 改为一行等价委托。**admission/TTL/冲突/回收协议零改动**（开发域 hostOperationLease 14/14、ReadOnlyView 5/5、syncScopeWriteLease 9/9 直接守护，见下）。
  - **生产改动 2——`src/updates/UpdateGate.ts` 整文件重写（sha `4848993554…`前缀 `48489935`）**：begin/end 与全局批次锁语义原样保留；wait 改用共享安全 reader；分类学：形状坏→"损坏"、**显式非法 PID→"字段无效"（区分文案，不回退 windowId）**、根/内层 pid 或 windowId 矛盾→"身份字段矛盾"拒绝、缺 PID 旧记录从 windowId 严格正整数段恢复；显式记录维持现行 `flags && ownerAlive`（空闲已释放永不阻断=正常新根可排除）；旧记录：PID 不可导出→等待、ESRCH 死主→放行、活/未知→即使空闲也等待，除非一次有界批量 StartTime 证明 `start > max(mtime,全部lease时间,admissionExpiresAt)+5s` 复用不成立。批量探测**每次 wait 至多一次**（记忆化），deps.processStartedAt 同步接缝优先、未决才批量；win32 默认 `execFile powershell Get-Process -Id <校验整数csv>` timeout 8s/maxBuffer 1MB/signal 透传/windowsHide；**非 win32 一律 unknown 不 spawn**；异常/超时/垃圾输出全部 unknown→继续等待，绝不冒充退出证明；300s 总预算与 250ms 可中止轮询不变（探测时间计入预算内）。
  - **测试**：`test/features/pairedUpdateLegacyLease.test.js` 重写为 **19 用例安全矩阵**（sha `62c47ca60459…`）——原 9 项语义保留 + r14 纪律（pending 用例 finally abort 后 await 原 wait 结算、只读守卫直接 await 不吞错）+ 新增非 ASCII 主机名"宿舍:PID:UUID"例、windowId 无 PID 段保守等待、批量恰一次+信号透传、探测抛异常/垃圾输出→等待、非 win32 默认不 spawn、侧车矩阵（主损坏+侧车可用放行/主损坏无侧车拒"无法核实"/双损坏拒且字节不变/孤侧车与临时槽名忽略）。单文件隔离执行 **exit 0，19/19**（`/tmp/plan-state-guard-logs/p12-legacy-lease.log`，`/tmp/pi-test-hnu9t3jj`）。
  - **测试（既有对）**：`pairedUpdateGate.test.js` 原 2 断言不动 **exit 0，2/2**（`p12-gate.log`）；`pairedUpdateTransaction.test.js` 增 F15 两例（sha `b3dd1020…`，8/8 exit 0 `p12-transaction.log`）——wait 阶段抛"损坏"时 journal 保 completed=[experiment] 不装不回滚、未请求安装释放准入不锁死；重试仅补 SFTP 不重复下载/安装 Experiment；重试下载失败保 journal 且 mixed 批保持准入关闭；指纹不符批次在任何 IO 前拒绝。
  - **开发域（r13 P13，读共享 reader 的全部文件+gate.wait 唯一生产调用方，串行单文件）**：hostOperationLease 14/14、hostOperationLeaseReadOnlyView 5/5、cleanupActivity 2/2、manifestStagingLifetime 4/4、syncScopeWriteLease 9/9、pairedUpdateBootstrap 6/6——**全 exit 0**，日志 `/tmp/plan-state-guard-logs/p12-dev-*.log`，各自隔离 LOCALAPPDATA=USERPROFILE=/tmp/psg-p12-*。
  - **构建**：`tsc -p .` 首跑 exit 2（`TS1005` 泛型少一个 `>`，UpdateGate.ts L39——已修，记录保留 `tsc 输出于会话`）；复跑 **exit 0**（`p12-tsc-406.log`），write-agent-runtime **exit 0**（`p12-write-agent-runtime.log`）、write-panel-build-manifest **exit 0**（`p12-write-panel-manifest.log`）、`node -c dist/extension.js dist/runtime/RuntimeManifest.js` OK。dist 变更 9 文件（UpdateGate.js `faf6d0b8…`、ResourceOperationLease.js `fa77df46…`、RuntimeManifest.js/.json、panel-build-manifest.json、cluster_agent.py(+sha256)、cluster_scheduler.py(+sha256)），Windows package 将按源码重生成。
  - **406 三源同步**：package.json `564fc9d4…`、package-lock.json `c0fec08a…`（全文恰 2 处）、`src/runtime/RuntimeManifest.ts` `2a1eccd4…`；dist/runtime/RuntimeManifest.js 含 0.5.406。
  - **inventory 重生成**：217 唯一测试文件/217 调用点/0 重复/缺盘 0；`pairedUpdateLegacyLease.test.js` 在 `test:paired-update` 链登记**恰一次**（pairedUpdateGate 之后；inventory 中 1 处 path 条目+1 处对应 argv）；sourcePackageSha256=`564fc9d4…`==实际 package.json。artifact sha `12c2b90e…`。
  - 交接：`host-handoff.json` 增量更新（f15P12 节+gitIdentity/inventory 条目刷新）；Windows package/安装/GitHub 归主控，复用原 native 验收树。

- F18（r19 新增，plan r15 R51–R58 返修轮——**目标域执行出现完整失败，已按新纪律停等**）：
  - **返修实现**（UpdateGate 整文件重写 `619ca280…`，测试矩阵 29 例重写 `cba9cc74…`，dist `19cfdd9d…`）：R51 默认命令改显式 `[DateTimeOffset]$_.StartTime).ToUnixTimeMilliseconds()` + 显式 epoch/ISO/`/Date(ms)/` 三路解析 + `parseProcessStartMs/parseStartTimesOutput/startTimesCommand` 导出边界单测 + 真实 Node PID+真实解析正向放行（原生执行仅 win32，Linux 按平台不跑）；R52 explicit/legacy 全部"活/未知持有根"统一走 StartTime 复用证明（宿主 6397137…/PID35152 Edge 复用形状有正/反两例），显式已释放空闲根不阻断；R53 扫描主槽+合法 64hex.json.ownership 去重并集（活跃活主孤侧车等待/损坏孤侧车拒绝/死主可过；原"忽略孤侧车"错误断言与注释已纠正）；R54 `hasOwnProperty` 判显式（null=显式拒绝），PID 安全范围校验，内层缺/非法/矛盾一律拒绝，`proofBoundMs` 任一引用时间缺失/非法→不可证明→等待，未来/超范围 start 不可信，5s 边界 +5000 等/+5001 放两例；R55 reader/proof await 后与 return 前重核 abort+预算，探测 timeout=min(8s,剩余)，外挂起探测按原 reason 及时结算；R56 onPoll 进入点闩替代 900ms 盲等（全文件 600ms 完成），symlink/多硬链/超8MiB 经 gate 真实拒绝断言（读取中变化复用核心 ReadOnlyView 5/5 同字节既有证据，不重复声称）；R57 批量去重+数值排序断言 `[31337,31338]`。
  - **执行结果（完整失败）**：pi-test-evidence 单文件隔离（`/tmp/pi-test-xl57ax1n`）**exit 1，28 通过/1 失败**（`/tmp/plan-state-guard-logs/r19-legacy-lease.log`，599.7ms）。唯一失败=R51 解析边界例：`parseProcessStartMs('/Date(1792803730983)/', now)` 返回 undefined，期望 `1792803730983`——**生产缺陷被测试捕获**：src L46 收尾转义次序写反 `/^\/Date\((-?[0-9]+)\/\)$/`（要求 `…/)`），真实宿主 JSON 形为 `…)/`；直接正则复现 `re.exec('/Date(1792803730983)/')===null` 钉死。epoch 数字/字符串/ISO/未来拒绝/单对象/空输出各断言全过，R51 正向真实 PID 例绿。
  - **拟定修复（待 GPT 确认后执行，本轮未动）**：正则改为 `/^\/Date\((-?[0-9]+)\)\/$/`（`)` 在前 `/` 在后）；其余 28 例与实现按现 SHA 保留。
  - 候选差异已按 R58 存 `docs/agent-tasks/plan-state-guard/diffs/r19-candidate-partial.diff`（91416 字节，含新测试正文；index 空未 commit）。停等中，未继续执行其余目标/开发域。

- F19（r20 新增，plan r16 批准的 R51 修复 + R59–R62 同轮返修——**受影响域全绿**）：
  - **批准修复**：`/Date(ms)/` 正则改 `/^\/Date\((-?[0-9]+)\)\/$/`（宿主实证形 `…)/`）；同轮补 R59（内层 PID 与根 PID 直接相等校验）、R60（注入正向例如实改名 + win32-only 原生正向 `new UpdateGate(leasePath)` 当前 PID+旧快照、Linux skip；"非win32默认"例加 win32 skip 防 fake PID 复用赌局）、R61（缺 admission 不再当 0：`proofBoundMs` 必检键；显式 idle 快道仅限完整 shape [windowId/ticket/choosing/admissionExpiresAt 齐备]；secure reader 读取中真实变更直测=patched handle.stat 第二次返回新 mtime → 拒 /变化/，statCalls≥2；Windows file-symlink 提权前置用"目录占位槽"退级夹具+如实平台注释——junction 对文件槽无同语义故弃）、R62（恢复每轮 readdir 前+reader 后+探测后+return 前三处 `this.held?.assertHeld()`，回归=begin 后接管 v1 锁 → 下一轮拒绝，非取消/损坏/无效文案）。`processStartedAt` 时间助手改 `Number.isSafeInteger`（1e21/20位字符串拒）。
  - **SHA**：`src/updates/UpdateGate.ts` `94ef318f…`；`test/features/pairedUpdateLegacyLease.test.js` `a2fd22f5…`（35 例，注释修正后复跑 r20b 仍 34/0/1skip exit 0，日志 r20b-legacy-lease.log）；`dist/updates/UpdateGate.js` `a39df875…`；其余文件同 F17 记录未变。
  - **执行（r20，pi-test-evidence 隔离，日志 `/tmp/plan-state-guard-logs/`）**：`tsc -p .` exit 0（`r20-tsc.log`）；legacy 矩阵 **exit 0，34 通过/0 失败/1 win32-only skip**（`r20-legacy-lease.log`，863ms——latch/probeEntered 替代全部盲等）；gate **exit 0，2/2**（`r20-gate.log`）；bootstrap **exit 0，6/6**（`r20-bootstrap.log`，覆盖 R62 后 gate.wait 唯一生产调用方）。transaction 8/8 与开发域 5 文件（14/5/2/4/9）自 F17 绿后文件未变，按 r15/r16 复用规则不重跑（日志 `p12-*.log` 保留）。
  - R56"读取中变化"覆盖纠偏：承认 F17 所称"复用 ReadOnlyView 5/5"不实（该文件无此覆盖），改由本轮 reader 直测真实覆盖。
  - **最终候选**：完整 diff `docs/agent-tasks/plan-state-guard/diffs/r20-candidate-final.diff`（100504 字节，sha `63f73814…`，含新测试正文与全部跟踪文件变更；r19 partial 保留）；index 空未 commit；406 三源与 inventory（`564fc9d4…`/`12c2b90e…`）一致性未变；handoff `f15P12` 节已更新为 r20 SHA+reworkTrail。真实租约/journal/已装 405 零触碰；未执行 Windows/package/commit/GitHub。

- F20（r21 新增，plan r17 两处准确修正轮——**执行出现完整失败，保留后停等**）：
  - **实现（与 r17 表达式逐字对齐）**：idle 快道改严格值/型判定 `hasExplicit && leases.length===0 && choosing===false && Number.isSafeInteger(ticket) && ticket===0 && typeof admissionExpiresAt==="number" && admissionExpiresAt===0 && typeof windowId==="string" && windowId.length>0`（UpdateGate.ts 内联，替代 every(hasOwnProperty)）；`proofBoundMs` admission 仅非负安全整数（0 合法），负/字符串/非整数/缺值→无退出证明；`tsc` 首跑 exit 0（`r21-tsc.log`）。
  - **新反例组全绿**：choosing=null/ticket=null/admission=null 三例走不了快道（LIVE+unknown→等待）；admission=-5/'0'/1.5 三例即使 sync 时间"足够晚"也不造证明（latch 等待）；正常完整 idle 正例保留未动（r20 例仍在文件内）。
  - **失败（测试夹具算 bug，非生产回归）**：`R61(r17) secure reader…真实utimes` 例 **exit 1，34 过/1 失败/1 skip**（`/tmp/plan-state-guard-logs/r21-legacy-lease.log`，`/tmp/pi-test-4_n6zxed`）。核心断言 `assert.rejects(/变化/)` 与 `statCalls>=2` **均通过**（生产 reader 对真实 utimes 变更正确拒绝）；失败在附加佐证断言：`Math.round(statSync.mtimeMs)===originalMtimeMs+5000`——原 mtime 带小数 `…477.347`，`Date(+5000)` 亚毫秒截断后 statSync 返回 `…477`，`round(actual)=1792804708477 ≠ 1792804708477.347`。拟定修复（未动）：佐证断言改 `Math.abs(statSync.mtimeMs - (Math.round(originalMtimeMs) + 5000)) <= 1`，生产/其余断言不变。
  - 测试文件当前 sha `f39602fa…`；UpdateGate.ts 本轮改动未记新候选 SHA（冻结推迟至该断言修复重验后）。停等中。

- F21（r22 新增，plan r18 批准的 1 行测试修复——**全绿冻结，交 Windows**）：
  - 批准修改仅测试 L337 一行：`assert.ok(Math.abs(fs.statSync(file).mtimeMs - (Math.round(originalMtimeMs) + 5000)) <= 1, '文件mtime必须被真实修改（容忍Date/文件系统亚毫秒精度差）')`；生产文件本轮零改动（tsc 未重跑必要——生产源与 dist 自 r21 后未变）。
  - **串行重验（pi-test-evidence 隔离）**：legacy **exit 0，35 通过/0 失败/1 win32-only skip**（`r22-legacy-lease.log`，1032ms）；gate **exit 0，2/2**（`r22-gate.log`）。其余域按范围复用（transaction 8/8、开发域 14/5/2/4/9、bootstrap 6/6、F19 记录）。
  - **冻结 8 输入 SHA**：src/core/ResourceOperationLease.ts `f79dde71…`；src/updates/UpdateGate.ts `d5479982…`；src/runtime/RuntimeManifest.ts `2a1eccd4…`；package.json `564fc9d4…`；package-lock.json `c0fec08a…`；test/pairedUpdateGate `0ea4f5ed…`；test/pairedUpdateTransaction `b3dd1020…`；test/pairedUpdateLegacyLease `31fbde72…`（36 例）。生成物 Linux 过渡：dist/updates/UpdateGate.js `9fbe46e4…`、dist/core/ResourceOperationLease.js `fa77df46…`（Windows package 以 receipt 为准）。
  - 完整候选 diff：`docs/agent-tasks/plan-state-guard/diffs/r22-candidate-frozen.diff`（102296 字节，sha `dc340575…`，含新测试正文）。406 三源一致；inventory `12c2b90e…` 未变仍有效；index 空未 commit；`git diff --check` exit 0。源码写入自此停止，Windows 完整 package 归主控 native 验收树立即执行。

## 6. 原因证据与定向问答（事实/假设/未知分开）

**Q1 未绑定 remotePathKey 与旧 probe 缺字段是否各自真实原因？——均为真实缺陷，但对 nwpu3 的因果层不同。**
- 事实（代码+编译+短路语义）：基线下两种 probe 走**两条不同**阻断路径——
  - 旧形状缓存 probe（H01/H02：status ok、workerId/protocol 缺失）：workerId 分支 `!probe.workerId && !probe.gpuCollectorProtocol` 为真 → 求值到 `remotePathKey(…)` → ReferenceError → `catch{return null}` → `!guard` → 抛错。此为**宿主实际命中的主因——已由 H04 钉死**：安装版 0.5.403 的 `dist/extension/legacy.js`（SHA `90c5e79f752099b77f8a59c7db13ab69f71df02183817bbba0b54c61186f8bab`）L9146 即存在未绑定 `remotePathKey` 裸调用且 catch 返回 null → nwpu3 命中 ReferenceError→null（`!guard`）分支；H02 证明该缓存形状仍在、pid 未变=同进程。
  - 当前代码重探测后的新 probe（workerId 非空记录值时基线 workerId 分支 `probe.workerId === target?.id` 大小写敏感全等；hosts 记录值与 config 逐字段比较）：一旦 workerId 不等或 host 拼写不等 → false → 短路（不再触发 ReferenceError）→ observed=null → 无配置 workerStateDir → `unknown=true` → 同一文案。F01 的 ①②两条失败分别对应这两条路径。**H03 补充：当前 nwpu3 Agent 实时报 workerId='nwpu3'、protocol 1、状态根齐全、projectRoot 一致、status ok——在当前代码下重探测得到该形状后，隧道 id 'nwpu3' 与记录 id 大小写敏感全等成立、状态根在代码根外→prefixes 空且不 unknown；唯 host 比较存在 E14a 的两层配置不同源风险（base 值未知，§7-5），若两层同为 'localhost' 则全绑定可通过。即对当前宿主，修掉 ReferenceError 后无需要 workerId 放宽即可绑定。**
- 因此**只修 ReferenceError 不够**（重载+重探测后被 host 比对/workerId 比对挡住），**只放宽比对也不够**（ReferenceError 使所有 ok-probe 端点恒 null）。
**Q2 worker 默认 id "worker"/大小写规则是否真实合同？（r2 按 H03 修正）**
- 事实：Agent 端合同 `workerId = env SIMPLE_EXPERIMENT_WORKER_ID or "worker"`（E11）；扩展 src 无该 env/`--worker-id` 注入点（E11 grep）。**H03 实测当前 nwpu3 Agent 报 workerId='nwpu3'——非默认值**：该部署存在某个使 worker id='nwpu3' 的注入来源（具体机制未读，r2 后无需追查，父裁定以实测为准）。
- 结论修正：真实网络中 Agent id 与隧道 id 精确（大小写敏感）全等有实证（H03 'nwpu3'≡'nwpu3'）；"Agent 默认报 'worker' 导致永失配"在**本宿主不成立**。候选的 `'worker'` 中性化与大小写不敏感放宽均无本宿主依据；父裁定方向（待正式 plan）：仅允许 Agent 合同保留值 'worker' 且要求端点完整绑定，其他 id 大小写敏感精确全等。
**Q3 缺 transport 字段放行是否可能误认“配置切换后的旧 probe”？未知/异端点/机器状态保护如何保留？**
- 风险事实面：`lastWorkerProbes` 是内存态、按端点 id 键、每轮探测整表替换（E06）；配置变更后旧 probe 在同一宿主进程内仍可残留（配置切换不主动清空，仅项目切换/探测异常/端点删除清）。缺字段中性化后，绑定仅剩：端点键 + projectRoot==codeRoot + probe 已记录字段相等。若用户在同 id 下换了 host/project 而 projectRoot 恰好同拼写，旧 probe 会按配置默认映射放行——该场景未构造用例，属**已知残留风险**。
- r2 补充：`statusGeneration` **不能**作为该风险的缓解基础——E06e 完整签名证实指纹仅含 status/版本/能力布尔，不含任何端点配置字段（确认父核对结论）。现有可复用替代模式是 `submissionWorkerProbes`（E06d）：对缓存不可绑定端点做一次有界（8s）只读真探 + 双侧 root/client/generation 围栏（E14c）+ 失败在任何写入前抛"尚未提交"；父裁定方向（待正式 plan）即沿此模式在两道门禁前刷新、"配置/项目不变才接收"、重跑原 guard、失败仍 unknown 阻断；缺 host/port 一概中性化**不被接受**，旧/缺失/异配置 probe 不能直接放行。
- 保护保留（候选逐项可测）：未知→阻断不变（无 probe 且无配置状态目录、protocol1 缺状态目录，E02 后段两条规则未动）；记录值不符→阻断（F05 控制组）；机器状态路径/祖先→阻断（嵌套用例）；兄弟文件不阻断与谓词语义一致（E10/F03）；清理消费方 PlanCleanupNodeGuards fail-closed 未动。
- “不要先假定当前候选放宽全部正确”：三个放宽点已在 E12d 明示，等待 plan 修订裁定。

**变更→调用者→测试域**：
| 变更文件/函数 | 调用者（E 编号） | 测试域（现有登记） |
|---|---|---|
| legacy.ts targetRootGuard | E03/E04 全部；传输安全 19864-19867；清理 PlanCleanupNodeGuards | projectRootMap.test.js（已登记 test:latest-artifacts）；planSubmissionStateGuard.test.js（未登记）；planPreflight*/workerPreparationPipeline 等间接触碰 syncCodeTargets 的文件 |
| ProjectRootMap.ts 新增导出 | 仅新增，无既有调用者行为变化 | projectRootMap.test.js（直接 import） |
| projectRootMap.test.js 沙箱注入 | — | 同上 |
| dist/extension/legacy.js、dist/features/ProjectRootMap.js | 生成物（tsc） | build 门禁 `node -c`；package verify |

**命令与嵌套去重（最终验收待 plan 授权后执行）**：候选最终验收=`npm run build`（typecheck→bundle→`node -c`×2→14 个单文件测试→17 个嵌套 `test:*` 链）。展开后同文件重复登记（按文件身份去重、保留全部断言与参数）：`planCleanup.test.js` 出现于 test:failed-job-review 与 test:windows-flow（build 未含后者）；`planCleanupPanelBridge.test.js` 仅 build；`windowsWorkflowContract/localApiClientContract/resultOwnershipScope` 同现 test:mac-parity 与 test:windows-flow（build 仅经 test:paired-update→test:mac-parity 路径）。与基线相比本次受影响登记文件仅 `projectRootMap.test.js`（build→test:latest-artifacts 域）+ 未登记新文件；建议 plan 决定新文件注册位置。宿主侧（package/install/Release、Windows）由主控 host_windows 执行。

## 7. 宿主时点证据与缺口

- H01（03:35+08:00，退出0，只读）：`/host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/9d3ffa54-e423-40cd-9c1f-f9a101f5dbb3-stdout.log`。已安装且活动 SimpleExperiment=0.5.403、SFTP=0.2.107、Extension Host pid 65452。nwpu3：enabled、agentProjectDir=`/data/qgking/zlk`、agentInstallDir/agentStateDir/workerStateDir=null、localForwardHost='localhost'、localForwardPort=18767、remoteAgentHost='localhost'、remoteAgentPort=remoteTelemetryPort=18765。缓存 probe：status='ok'、projectRoot=`/data/qgking/zlk/MultiModal`、ports 18767/18765、message='Worker Telemetry API 可用。'，workerId/agentStateDir/workerStateDir/gpuCollectorProtocol/localForwardHost/remoteAgentHost 均 null。当时最近 3 个 VSCode 日志目录无匹配目标日志（不证明不存在）。
- H02（03:53+08:00，退出0，只读；**晚于用户重载声明**）：`/host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/fb6ef270-5fc6-4771-92e6-611f2dcec3b0-stdout.log`。安装仍 0.5.403/SFTP 0.2.107；pid 仍 65452（startedAt 2026-10-23T12:57:33Z，workspace.root=`d:\GitRepo\MultiModal`）→ **未发生扩展宿主重启**；配置同 H01；缓存 probe 仍旧形状（updatedAt/checkedAt null）。仅证明此次查询时点，不能宣称 probe 新鲜或版本变化。
- H03（采集 2026-10-23T19:58:48Z，退出 0，只读 GET）：`/host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/0a455061-b1f2-4cd4-a5a3-9d86562d5152-stdout.log`。按当前配置 `GET localhost:18767/api/health` HTTP 200：`workerId='nwpu3'`、`gpuCollectorProtocol=1`、`agentInstallDir=/data/qgking/zlk/simple_agent`、`agentStateDir=/data/qgking/zlk/simple_agent/state/projects/MultiModal.39490353939b4066`、`workerStateDir=/home/qgking/.simple-cluster/worker-state`、`projectRoot=/data/qgking/zlk/MultiModal`、status ok。含义：真实 Agent id 非默认 'worker' 且与隧道 id 精确全等；状态根在代码根（/data/qgking/zlk/MultiModal）之外；无需再读启动命令/env 猜测。
- H04（安装版真实文件只读取证）：`/host/c/Users/ZLK/.vscode/extensions/simple-local.simple-experiment-0.5.403/dist/extension/legacy.js` SHA256 `90c5e79f752099b77f8a59c7db13ab69f71df02183817bbba0b54c61186f8bab`，L9146 存在未绑定 `remotePathKey` 裸调用（且所在方法 catch 返回 null）。完整只读片段/hash 日志：`/host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/linux-bash/1afa2e69-b312-4fc8-85e0-9b0388f9648b.log`。先前宿主 `Get-FileHash` cmdlet 缺失（exit 1）日志保留于 `/host/d/.../host-windows/af679797-30d5-46d2-b85e-5c4f2dd3de5a-{stdout,stderr}.log`，后仅补独立只读取证，未重放任何业务写入。含义：钉死用户命中 `!guard`（ReferenceError）分支（§6 Q1）。
- 远程服务器：本任务只读边界，未连接。
- 宿主事实状态（r2 更新）：
  1. ~~nwpu3 /api/health 实时值~~ → **已由 H03 回答**。
  2. ~~Agent 启动命令是否注入 worker id~~ → **H03 后无需**（父裁定：以实测 workerId='nwpu3' 为准，不追机制）。
  3. ~~安装版 legacy.js 是否含裸 remotePathKey~~ → **已由 H04 回答**。
  4. （仍缺，可选）用户工作区 `experiments/plans/comparison/tmdc.yaml` 是否仍待提交（影响回归 fixture manifest 形状；非必需）。
  5. （r2 新增，E14a 风险所需）nwpu3 配置两层对照：全局（base）`localForwardHost/remoteAgentHost/localForwardPort/remoteAgentPort` 值 vs worker 级覆盖值（H01/H02 仅给 worker 级 'localhost'/18767/18765）；判断"probe 记录（base 组装）与 guard 期望（worker 优先）不同源"是否会实际误伤。

## 8. 变更索引与裁定状态

- r1：新增本文档。r2（本轮）：仅增量修订本文档——E06 全重写（四个写入点完整原文 + stampWorkerProbeGeneration 完整指纹原文）、E09 省略号补全、新增 E14（只读探测闭包/探测顺序/围栏/远端写清单）、F04/F05 src↔dist 一致性断言降级为"待生成验证"、§6 按 H03/H04 修正、§7 并入 H03/H04 并更新缺口。未改 src/test/dist/版本；未运行新的测试/编译；未重放中断命令；tsc/test 记录均为中断前已发生事实（F 节）。
- plan.md r1 已存在（GPT 维护，SHA `9f24ee4120c130eb2b84bd5822507bfba85b60d1d0e089608479a04ab6a76550`，本实例不覆盖）；本轮按主控指令完成后停等 r2 计划，不实现。
- 父方向裁定（r2 随附，待正式 plan 固化）：①不接受缺 host/port 一概中性化，旧/缺失/异配置 probe 不得直接放行；②方向=两道门禁前对不可绑定端点做一次有界只读真探（复用 E14a 闭包/E06d 模式），配置/项目不变才接收、重跑原 guard、失败仍 unknown 阻断；③保持完整记录的地址/端口/项目一致性与原配置状态根保护；④默认 workerId 仅允许 Agent 合同保留值 'worker' 且端点完整绑定，其他 id 大小写敏感精确全等（撤候选无依据大小写放宽）；⑤须证明不重试写入/不重复 PLAN/不放宽清理（证据面见 E14d 末段）。
- 已交证据支撑的待裁定项（r2 时）：E14a 两层配置 host 组装不同源风险（宿主缺口 §7-5，仍可选）；E06c 无围栏写缓存的反例是否纳入本任务（plan r2 已裁定不扩修旁支）；新测试登记位置（r3 已按 §71 登记 test:plan-run 一次）；F06 版本/登记（登记已闭合，版本归 P5）。
- r3 状态（历史）：曾报"P2–P4 完成"，主控审查**未通过**（R31–R34，见 plan r3/F08）；该行的完成表述自 r4 起作废，planPreflight 2 例环境失败的处置以 F08/R34 为准。
- r4 状态（历史）：R31–R33 返修 + R34 隔离重验；主控审核确认主漏洞与 warm 隔离已修复，enabled 语义按 `enabled !== false` 惯例批准（F08 开放点①已裁定），余三锚点按 R41 收口。
- r5 状态（历史）：R41 收口完成并**已通过开发阶段审核**（目标 26/26、18 批量 192/192、projectRootMap 14/14、planPreflight 隔离 20/20，全 exit 0）。
- r6 状态（历史）：P5a 准备完成；主控创建 Windows 原生验收树并单次 `npm run package` → exit 1（唯一失败=既有并发用例竞态，见 E15/F11），由 r7 处置。版本三源 0.5.405、inventory/host-handoff 落盘、只读 master 登记缺项已报（F10）。
- r7 状态（历史）：F11 修复完成；主控覆新测试重跑完整 Windows package → 第二轮 exit 0（216/1676/1674/0/2 skip），由 r8 收口。
- r8 状态（历史）：P5 收口+P6 本地提交 509dcb03；随后 PR#7 已审核合并（见 F13），由 r10 完成本机同步。9 生成物已按 final receipt 同步（VSIX `0c150404…`/419 项/417 字节等全过，README 首败→期望修正→终过收据链在 F12）；两项 Linux 平台补验绿（1/1、6/6）；本地提交 candidate=`509dcb03160a59867a070bc8dcbb42ef1cd965d1`（parent a7e9c7d3，18 文件，未 push）；`/repos/MCP/zlk-cluster-orchestrator-master-ancestor` 已创建并登记为双角色干净副本（master@a7e9c7d3 干净，未推进）。合并后主控给精确远端 SHA，由本实例在该副本 `merge --ff-only`。docs/agent-tasks、node_modules、日志保持本机未暂存。
- **r10（当前）状态：PR#7 合并后本机快进同步完成（P8 闭合）、Linux 侧无活动写入，原实例停等发行/安装结果回传**。祖先副本 ff-only 至 `ab2a1171`：master/祖先 HEAD/缓存 origin/master 三一致、merge tree==candidate tree==`46e55613`、18 文件实读 sha256 全等最终 receipt、工作树全空；同树同输入按授权复用 Windows 完整验收与 Linux 补验，未重跑测试；保护指纹前后仅祖先行 HEAD 一处差异（F13）。
- r10 状态（历史）：P8 本机快进同步完成（ab2a1171 三一致）。
- **r12（当前）状态：P9 发行/安装最终事实已入证（F14）、任务侧源码/Git/包/测试零操作，等待 P10——用户 VSCode Reload Window（约 1 分钟）后的只读运行验收**。Release v0.5.405（Latest，target ab2a1171）、install:latest 一次 exit 0、verify-install 417/417、simpleex 握手 exit 2 明示需重载——当前运行仍 403 属保护而非缺陷；不得提前称运行 405。原实例保留待命。
- r13 状态（历史）：F15 源码调查完成（E16/F15）。
- r14 状态（历史）：宿主证据并入完成（E16g）。
- **r23（当前）状态：新版 SKILL 失败分流/压缩两节与 references/documents.md 已实读；archive+verify-archive 成功（`archive/r23-completed-summary-20261024`，evidence caa14956…/plan 5cdc8900…，原文可逐字节取回）；已按授权压缩 P0–P9/P11–P13 完成项（§4 E01–E15、§5 F01–F14→结论+归档锚点），E16/F15–F21/P10/P14–17/有效指导与验收标准全量保留；业务源码/测试/Git 零写入，新规机械自修与逻辑升级尚无自然触发=未验证。**
- r22 状态（历史）：r18 批准的 1 行测试修复落地，legacy 35/35+1skip、gate 2/2 全 exit 0；8 输入/406 冻结（F21），diff/handoff/evidence 已同步，源码写入停止，交主控 Windows 完整 package。index 空未 commit。
- r21 状态（历史）：r17 两处准确修正实现完成（严格idle式+admission非负安全整数），tsc 首跑 exit 0、新反例组全绿，但 utimes 佐证断言因原mtime小数+Date亚毫秒截断出现完整失败（34/1/1skip，exit 1；生产拒绝断言本身通过），F20 保留后停等；拟修复佐证比较式为 ±1ms 容差，冻结与交接随之顺延一步。**
- r20 状态（历史）：R51 批准修复 + R59–R62 完成（F19），受影响域全绿（34+1skip / 2/2 / 6/6 全 exit 0，transaction 与开发域按未变复用），候选 diff/handoff/inventory/406 一致性齐备；index 空未 commit，停主控下一步（Windows 完整 package 归宿主）。**
- r19 状态（历史）：R51–R58 返修实现完成，但目标域首跑完整失败（28/29，exit 1，唯一失败=R51 `/Date(ms)/` 收尾转义次序的生产正则缺陷，测试捕获），保留 F18/log/exit 停等；修复经 plan r16 批准并在 r20 落地。partial diff 保留。
- r16 状态（历史）：P12 生产实现 + P13 开发域 + 406 三源 + inventory/handoff 更新（F17，后经 r15 审核 R51–R58 返修）。分支 `fix-paired-update-legacy-lease`@ab2；目标域 19/19+2/2+8/8、开发域 14/5/2/4/9/6 全 exit 0；tsc/生成脚本全 exit 0；0.5.405 验收证据未复用于新代码。P10 用户重载线仍并行悬置。
- r15 状态（历史）：P11 基线+红灯回归完成（F16），生产码零改动，停等指导。分支 `fix-paired-update-legacy-lease`@ab2（原 509/a7/脏树/祖先原样）；红灯 exit 1（8 红=修复前预期证明，含"损坏"文案实测），夹具对齐 2/2 绿。P10 用户重载线并行悬置；406/完整重验在 P13+；0.5.405 验收证据不复用于新代码。
- 历史失效项：无。F02 各行是过程记录非缺陷证据；F01 的④是 spec 缺失失败，勿引用为产品 bug。F01–F05 按 plan r2 §63 仅作历史保留。

- r24（P14→P15交接，本轮新增事实）：Windows完整package exit0（217唯一文件/1714用例=1711过/0败/3平台skip，R60原生正向267ms；host-windows/c324ece4-bec8-4b63-b27c-4c728782e713-{stdout,stderr}.log）；包门禁全过（paired-update-win-KbNMce receipt；c6588e75-…日志）；VSIX 2607385B SHA=9f4ed70bff35b91c15226147cd302e45704de927ddfc2011ceb99c29b13a3a81。Linux侧：9生成物按receipt逐文件同步（cp自 /repos/MCP/zlk-cluster-orchestrator-plan-state-guard-win，前后哈希记录，仅 panel-build-manifest.json/RuntimeManifest.json 与过渡字节不同，未运行生成器）；cacheRetentionBatch.test.js 1/1 exit0（/tmp/plan-state-guard-logs/r24-cacheRetentionBatch.log，证据目录 /tmp/pi-test-eio07crg）、incrementalMetadata.test.js 6/6 exit0（r24-incrementalMetadata.log，/tmp/pi-test-eo975ejz），均隔离LOCALAPPDATA单文件20秒串行。commit 8b47a6c3d7cc6766cbebe3a7f7ae9e0e9f09e0b6（parent=ab2a1171，17文件，committed blob=冻结8+receipt9全匹配；index现空；保护：旧509分支509dcb03、master-ancestor ab2a1171、原脏树worktree列表指纹不变）。停等宿主push/PR审核合并。

### F22（2026-10-24，原生406实景门禁未过——跨平台语义升级，plan r20 已给方向）

- 场景：native 406 对实际租约目录只读 `wait(12s)`，不 begin/end；超时 **exit 1**，未写用户数据。完整 stderr：`host-windows/0eadac7e-d1a6-44f5-8c07-84278fa29002-stderr.log`。暂不 push/Release/安装；旧 8b47 提交保留，不 reset/amend。
- 定向一次非重试诊断 `/host/c/Users/ZLK/AppData/Local/Temp/paired-update-win-KbNMce/real-lease-unresolved.json`（collectedAt 2026-10-24T01:45:10Z）：337 槽无读取错。5 候选：PID 14764/20936/35152 的 StartMs 均证实 PID 复用（reuseProof=true）；**25244/42872 被 Node `process.kill(pid,0)` 报 EPERM 且旧批量 `Get-Process -Id` 缺行**。旧批量命令 exit1 且 stdout 已含 3 个有效 epoch（1792801976672/1792558114484/1792738129915），但 catch 将整批置 unknown → 保守等待 12s 超时。
- 反证枚举：完整 `[System.Diagnostics.Process]::GetProcesses()` 枚举 **exit0、540 PID、查询自 PID 56524 在表**（日志 `host-windows/0ae908cb-3f33-4f87-a4cd-7b6070b15159-stdout.log`），确认 25244/42872 均不在场=真实死主；定向数据日志 `7a2445d1-71ba-4bdd-b521-e9599899fb52-stdout.log`。
- 根因：`Get-Process -Id a,b,c` 任一 PID 不存在即 exit1，catch 吞掉全部有效行；EPERM≠存在证明，缺行+失败批量≠退出证明。旧设计把"活/未知→时间证明"之外的"EPERM+缺行"永远困在等待。
- 修复方向（plan r20，本轮实现 R63）：默认 Windows provider 改一次有界完整 GetProcesses 枚举信封 `{schemaVersion:1,complete:true,queryPid,processIds,rows:[{Id,StartMs}]}`；仅 exit0+信封完整+全集 ID 合法（允许 PID0）+queryPid 在场时，请求 PID 不在全集才生成 `exited` 退出证明（同 ESRCH）；空表/缺自 PID/坏 ID/失败/超时/截断/非零退出+部分 stdout 一律 unknown。foreach 不用只读变量 $PID。Map 观察类型扩为 `number|"unknown"|"exited"`。时间复用证明、schema/身份/idle/侧车/assertHeld/预算/取消保护全保留。改动仅 UpdateGate 默认观察/解析/类型及回归；406 不变；核心协议/真实租约/journal 不动；先不 commit，待新 Windows 权威生成物后普通追加。
- r25（R63实现轮）：UpdateGate.ts 9c7b2bf407675c26f206e2d673be5fbea22d76507560834b936460a3f7769e6d、legacy测试 ac1d61560e2e1adc93f0d13889576eb2e18b8beaa4b6ccbe8a1026734033287b、dist过渡 f0ed599cc97cd2dda0cf847ab2d2efc05feef3f5c9a96623eb53fec64241db2d（Windows重生成为准）；其余6输入不变。tsc exit0（r25-tsc.log）；legacy首跑 exit1（2项新用例自身机械缺陷：断言正则漏::、注入时间低于行bound；首次完整日志 r25-legacy-lease.log 保留）→同失败链一次最小自修→复验 exit0 39过/0败/2 win32-skip（r25-legacy-lease-retry.log）；gate 2/2、transaction 8/8、bootstrap 6/6 exit0（r25-*.log，隔离LOCALAPPDATA）。未commit（待新Windows权威字节后普通追加）；diff diffs/r25-candidate.diff。

## 包耗时/收包范围调查（2026-10-24 r26，用户新问"本轮 package 6分52秒、以前很快"；只证据与建议，未改任何构建/门禁/排除）

### 链结构与耗时构成（时长分解由主控从既有 Windows 日志执行，本机未跑探针）
- `package` = `build` + `test:windows-flow-incremental` + `compact:plan`(第2次) + `verify:package-runtime` + `vsce package --no-dependencies`。`build` = `compact:plan` + 全量 `tsc -p .` + bundle-semver + write-agent-runtime + write-panel-build-manifest + `node -c`×2 + 12 内联单文件测试 + 17 个 test:* 域链（inventory 非测试步骤13项：/tmp 及 docs/agent-tasks/plan-state-guard/package-test-inventory.json nonTestSteps）。
- 测试执行面：**217 唯一文件、每文件一个独立 `node --test --test-force-exit --test-timeout 20000` 串行进程**（inventory：features 178/cli 14/tunnel 12/agent 6/ui 4/core 3，duplicates 0）+ prepare-wsl-tests ×3 + compact:plan ×2 + 全量 tsc + 3 生成脚本 + vsce ls（verify 内 spawn，30s 帽）+ vsce package。Windows 冷启动/杀软下单进程固定开销 ×217 是第一嫌疑，全量 tsc 第二，vsce ls+package 第三；具体占比待主控日志分解证实/排除（假设，非结论）。
- 用例增长：405 轮 216文件/1676用例 → 406 轮 217文件/1714用例（F15/F22 任务净增）。
- **本地 Git 历史锚点（-S package.json，首轮进入 build/package 链）**：test:preflight-stages 3e48dca9、test:execution-shell 21f294f1、test:failed-job-review 1802054c、test:terminal-history+agent-lifecycle 5ce9bafd（均10-13）；test:tmux-lifecycle 00c01ae1、worker-mode 2761e438、plan-run a83da8b9、latest-artifacts 53d45bb0、submission-truth b268a7d0（10-14）；fresh-results cc22e406（10-15）；sync-gpu 3e07e864、runtime-diagnostics 6c07a1c、plan-code-scope 7456bf08（10-16）；host-lease 6642f978、windows-flow-incremental 4e8cb70e（10-21）；test:paired-update 7bb96599（10-13）。"以前很快"的结构性锚即 10-13~10-21 各任务把域链累积进 build/package——耗时与链上进程数线性相关，非本轮突变。

### 收包范围（真实 ZIP 419 项直接读取，/host/c/…/f22-preserved-original-package/simple-experiment-0.5.406.vsix，SHA 9f4ed70b…同 final receipt）
- 419项=417 extension 文件+2 容器元数据；**JS 395、无空/微 JS、无 test//docs//src/ 泄漏**（.vscodeignore 已排除且实际清单证实；scripts/** 仅 check-static.js 按 spawn 证据保留）。测试/文档早已不入包，测试链读取 test 文件属强制门禁运行，非"无谓扫描"；写包扫描仅 vsce 文件清单级。
- 闭包：生产 `runtime-closure.js`（入口 main=dist/updates/Bootstrap.js + bin/simpleex.cjs + spawn 候选 scripts/check-static.js）= **255 模块，与主控闭包报告一致**。ZIP JS 按其静态 require 边 + 14 个已证实动态锚（dist/extension.js←PanelBuildIdentity/plugins 字符串、dist/cli.js←simpleex.cmd+bin/simpleex.cjs、dist/panel.js←package.json、其余 shim）重算可达 309。
- **排除候选清单=84 JS（88 不可达 − 4 有动态证据/噪声），仅线索不得直接删**：旧架构 core/{CommandBus,OperationQueue,ClusterController,DomainTypes,ErrorModel,factories/*}、diagnostics/*4、state/*4、services/*6、cluster/StateMerge、config/Migrations、limits/RateLimiter；旧 UI ui/sections/*12+types、ui/styles/*3、ui/{UiStateMapper,WebviewBridge,WebviewRenderState,WebviewRenderState.legacy}、ui/renderState/*3；features 旧块 Comparison(+legacy)、SmallScale(+legacy)、ResultAnomaly(+legacy)、ExperimentConfigRecovery(+legacy)、Anomaly/DatasetInspector/GpuScore/Notifications/RecycleBin/SearchTags/SmartScheduler、Results/{EvidenceCollector,ResultParser}、PlanBuilder/MatrixGenerator、factories/{PlanBuilderFactory,QualityFactory,ResultsFactory}；agent/*3、extension/Provider*3、tunnel 旧块7+factories/*2、tensorboard/ScalarViewerHtml、results/{ProjectResultPublication,ResultDirectoryRebuild}。分析脚本与完整输出：/tmp/psg-pack-probe3.py、/tmp/psg-pack-probe3.out。
- 关键语义核实（不凭名字排除）：①`.legacy.js` **全部**是对应主模块 `export * from "./X.legacy"` 的运行部件（如 Comparison.js L22 `__exportStar(require("./Comparison.legacy"))`），与主模块同进退，非残留；②`dist/results/ProjectResultCatalogWorker.js` 被 extension/legacy.ts `new Worker(path.join(...))` 动态加载——保留；③`dist/clusterAgentRuntime.js/clusterSchedulerRuntime.js(+legacy)` 是 scripts/write-agent-runtime.js L48 的**生成输入**（嵌入 cluster_agent.py 校验）——JS 本体是否须入包交 GPT 裁定；④`dist/{extension,factories,ui/sections}/index.js` barrel 在 TS 侧无任何 import（KEEP-REVIEW 的"index.js 字符串命中"系通用名噪声）；⑤ZIP 中 JS 全部有 src 对应 .ts（残留=0）；⑥NONJS 24 项逐一必要：runtime py×2+sha×2、project-adapter 模板11、LICENSE.txt+vendor semver LICENSE/package.json、readme.md（vsce 强制）、simpleex.cmd→dist/cli.js、bin/simpleex.cjs、panel-build-manifest.json、RuntimeManifest.json、容器元数据。
- 差额纪律：395−255=140 仅线索；其中 ~54 属动态锚/spawn/Worker/工具链输入，84 为无引用候选，其余含 shim 转发链。任何磁盘/test/dist 删除、门禁关闭或 bundler 盲装均未做亦不建议未经 GPT 计划执行。

### 建议（待 GPT 更新计划后实施，本轮未动）
- 耗时验证优先项：tsc `--incremental`（tsbuildinfo 已被 ignore 面外）、217 单进程串行的批合并可行性（`node --test` 支持多文件但改变每文件隔离语义，属验收语义需 GPT/用户裁决）、vsce ls 与 package 复用一次枚举。
- 范围优化仅在内容策略单源（scripts/package-content-policy.json + .vscodeignore）追加 84 候选交集，且须先由 GPT 逐项复核动态/测试反向依赖；不凭名字删、不以缩包宣称加速比例（vsce 段非主要耗时时收益有限）。
- r27（r21 交集排除+R63收紧轮）：AST 补查证明 require(id) 别名唯二调用点为固定字面量('../extension','../api/LocalApiServer')，dist/extension/index.js 系动态真实命中→保留；new Worker 仅字面 path.join；无 eval/createRequire 动态。排除集=84候选−5个*.legacy运行部件=79 exact paths（KEEP-REVIEW 4 本不在候选）。policy 单源 unused-compiled 规则+JS/Py exact 分类+.vscodeignore 生成块+测试扩展10/10；vsce ls 实测 339 项、79 排除零泄漏、保留锚全在；verify-vsix-runtime exit0/255。R63 queryPid/members 收紧 validPid 域(+PID0 成员)，legacy 41 用例 39过/2win32-skip exit0；gate 2/2；tsc exit0。SHA 全表见 handoff r27ExcludeR63；未 commit。分析脚本 /tmp/psg-alias-{scan,ctx,2}.js。


## r28 构建/测试/打包脚本重构（plan r22/r22-T，Linux 实现与验证）

### 先补主证据（改造前，脚本级）
- npm pre/post/prepack/prepare/vscode:prepublish 钩子：**0 个**（package.json 全 51 脚本递归扫描）。全部脚本正文仅含 `&&` 顺序语义，无管道/引号/子 shell。
- 旧 `package` 链递归展开：**217 次文件启动 = 217 唯一（链内 0 重复启动）**；重复的是门禁步骤：`compact:plan` ×2、`prepare-wsl-tests` ×3（幂等 WSL 预热，新链批前一次）。
- 旧 `npm test` = build(208 文件) + `node --test test/*.test.js test/**/*.test.js`：盘上 798 唯一测试文件，glob 展开 820 槽（根级 22 文件被 `**` 零段二次匹配）；即旧 npm test 真实启动 1028 槽。**原 npm test/features 覆盖严格大于 package 217，新链未收缩**（dry-run 对账 test=208+盘上数、test:features=208+features 数）。
- 旧 `acceptance.js`：build→lint→npm test(→build 再跑)→test:features(→build 再跑)→syntax→CLI status→package(→build 再跑+全套)，即**完整 build 链执行 4 次**；完整输出 `compactOutput` 截断 8000 字符仅存 `simple_cluster/reports/acceptance/latest.{json,md}`（无逐子项独占日志）；`node dist/cli.js status` 已在 src/cli/index.ts:17 REMOVED_ENTRIES 明确退役（"old status stub removed: use simpleex project status"），不得在真实用户实例执行；其原意（CLI 存活冒烟）由已证明的隔离契约 test/cli/simpleCli.test.js（project status，隔离 cwd/apiFile）在新链 fullCheck 内覆盖。`smoke` 同样退役该步并保留其余门禁。
- 证据脚本/输出：/tmp/psg-r22-expand.js → /tmp/psg-r22-expand.json、/tmp/psg-r22-summary.json（36 个测试域逐字展开、来源链、重复计数）。

### 实现（唯一清单 + 单一 runner）
- `scripts/test-workflow.json`：36 domains（`sourceScript` **逐字保留改造前 npm 正文**，planner 运行时递归展开+环检+未知 shell 语义拒绝）；44 entries（旧→新对应表+phase 组合+来源）；classification：720 parallel 白名单 / 78 exclusive（后经 result-writer 闭包规则收紧为 **717/82**）；batchDefaults maxParallel=2、killGrace 30s。
- `scripts/test-workflow.js`：文件+argv 矩阵去重（参数矩阵保留行）；全局上限 2、默认未知=exclusive 串行、exclusive 全池独占、声明共享组互斥；每文件独立 `node --test` 进程与 20s 内层预算保留（旧 glob 入口保持原无超时 argv，不新增收紧）；outer kill=timeout+grace（Linux 进程组 SIGKILL / Windows taskkill /T）；同根 `.test-workflow-batch.lock`（owner pid 存活→**exit 3 拒绝**；ESRCH 证据下才回收）；逐子项独占完整 out/err 日志、真实 pid/时刻/退出码；失败全文回显；取消→杀自有子进程树、全部已启动子项结算、overall=cancelled 非零；单调时钟 phase 墙钟（compile/prereq/fullCheck/post/assemble/TOTAL）+实际文件数+maxParallel+maxObservedConcurrent+去重计数入 receipt 与汇总行；默认无任何复用；`--reuse-receipt` 需完整输入指纹（src/scripts/test 内容哈希+package/lock/tsconfig/.vscodeignore+node/platform）+fullCheck 计划哈希+整批 passed；`package:assemble` 强制校验 package receipt，缺失/失败/未知拒绝（非绕过入口）；npm 自动钩子不重复执行（钩子为 0，未来新增会被未知步骤拒绝）。
- `scripts/test-workflow-classify.js`（再生能力）：spawn 外部二进制字面/固定端口/端口常量/用户目录/Worker/共享写目标 + **LatestResultExport 反向静态闭包**规则。
- `scripts/acceptance.js` 重写为 runner 薄封装（entry=acceptance：compile+原全覆盖并集+lint/语法/依赖/文档全部门禁；latest 报告只作摘要并引用完整日志，不再截断）；`scripts/acceptance-checks.js` 迁出 no-db/docs 审计；`package.json` 42 个 npm 入口映射 runner 名称/compile/check:dev/check:full/package:assemble 新增；`.vscodeignore` 既有 scripts/**、test/** 覆盖新文件，包内容零变化。

### 验证（Linux，日志 /tmp/plan-state-guard-logs/）
- `testWorkflowRunner.test.js` 夹具 10/10 exit0（r28-workflow-runner5.log）：独立重叠≥2 且 ≤2、exclusive 与任何作业零重叠、同根第二批 exit3 拒绝、内层 exit1→外层非零+日志全文可取回、超时=timeout 非通过、取消=cancelled+已启动全部结算+子进程树被杀、同文件同 argv 仅一次/不同 argv 矩阵各一次、输入漂移使复用与 assemble 失效、失败 receipt 拒绝组装 exit1、真实仓库对账（package 218=217+新回归、build 208、test=208+盘上 799、白名单路径全在盘）。
- 真实批次：`compile` exit0（r28-compile.log，含全量 tsc）；`test:host-lease` 4/4 maxObserved=2（r28-host-lease.log）；`check:dev --domains` 修复后 files=1 pass（r28-checkdev2.log）；`npm run compile` exit0（npm 层链路验证）；42 个 npm 映射入口 dry-run 全可解析。
- 完整 `package`（218 文件，r28-package-full2.log exit1）：**215 过 + 3 个失败（原文保留；“Linux 平台固有”表述已被 r29 证据推翻，见下方 r29 节——实为测试子进程未隔离触碰真实用户目录的 EACCES）**——planPreflightProgressSpeed / automaticScopeContent / localCodeManifestCache 以**与旧链完全相同参数串行复跑同样 exit1**（r28-serial-*.log 对照），文件与 src 未动，Windows 406 receipt 中三者全过；非 r22 回归。resultCollectionPerformance 首跑并行失败、串行过；根因=`src/results/LatestResultExport.ts` 在 POSIX 绑定 `49152+digest%16384` 固定端口（src 内计算，逐文件端口扫描不可见）→ 分类器加反向闭包规则（6 文件转串行）后**并行复跑通过**（full2 job-210 pass）。
- `package:assemble` 对 overall=failed 的 receipt 正确拒绝 exit1（r28-assemble-refuse.log）。
- 计时（r22-T，Linux 新 runner，单调墙钟）：compile 段 11.7–13.1s；fullCheck 段 218.863s（218 文件，maxParallel=2，maxObserved=2，dedupRemoved=200）；TOTAL 235.227s——**该 Linux 运行因 3 个失败（后证实为环境隔离缺口）未达 post/assemble 段**；与旧 Windows `6m52` 工具外层或 `399.782s` 旧命令记录**口径不同且有输入差异（+1 文件、Linux/Windows、段边界），不可宣称严格提速比**；Windows 权威数字由主控正常完整 package 采集。
- 过渡产物：compile 重新生成 `dist/panel-build-manifest.json`（buildId 更新、UpdateGate.js 条目对齐过渡 d059975d；tsc 再生 `dist/updates/UpdateGate.js` 仍=d059975d 哈希稳定）。406/8b47/冻结祖先/全部既有候选保留；本轮未 commit。

### 剩余（主控 Windows）
源码冻结→必要编译（compile）+默认 provider 对真实 337 槽只读最小核验→通过后**最后候选完整 `npm run package`**（同一 receipt 采集分段墙钟/文件数/并行上限）→权威生成物回来后再追加 commit。3 个原“平台固有”失败已在 Linux 经沙箱隔离修复后本地通过（r29），Windows 预期同样通过（406 receipt 佐证）。

## r29 —— R29 八项返修（Linux，同一实例；2026-10-24）

### #1 隔离而非“平台固有”（根因改判）
- r28 三个失败的原始断言原样保留（r28-serial-*.log、full2 job-017/134/140）：localCodeManifestCache 与 planPreflightProgressSpeed 明文 EACCES `/home/node/AppData/Local/SimpleExperiment/host-operation-lease.json.resources-v2/<sha>.json.ownership.writing`（测试子进程以 `env:process.env` 直写真实用户目录）；automaticScopeContent 仅 `child.status=2` 无 stderr。
- v2 runner 为每测试作业建独立沙箱：HOME/USERPROFILE/APPDATA/LOCALAPPDATA/TMP/TEMP/TMPDIR/XDG_{CONFIG,CACHE,DATA}_HOME 全指向每文件目录；测试子孙剥离 GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE/GIT_PREFIX/GIT_COMMON_DIR/GIT_OBJECT_DIRECTORY 六项；非测试编译门禁保留规范环境；未做任何 chown/chmod/用户目录清理。
- 三域经隔离复验全部通过（r29-eacces-reverify-3.log，exit=0×3；automatic 的 probe 子进程在沙箱内正常，原 exit 2 即用户目录 EACCES 的子进程表现）。夹具“env 隔离+Git 变量剥离”反例常驻 testWorkflowRunner 套件。
- 隔离初版把沙箱根放仓库日志目录下引发第二层问题：`/repos` 是 9p(drvfs, `mount` 实锤)——tmux socket `<TMPDIR>/…/tmux-1000/default` 超 AF_UNIX ~104 字节（“File name too long”，agentLifecycle/tmuxTaskLifecycle/gpuMemoryAdmission/schedulerRuntimeUpdate/manualTmuxAdmission/agentLegacyMigration 等），Python fixture（planCodeScope）在 9p 上 mkdtemp+写风暴 20s+ 挂死，pairedUpdateLegacyLease 的 mtime/4s 时序断言同样被 9p 慢 I/O 击穿（以上首败日志全文保留于 r29-package-full-v2-1 批目录）。修复=沙箱根改短路径 `/tmp/psg-env/p<pid>/job-<n>`（Windows 用 os.tmpdir()），隔离语义不变；12 项定点复验 20/20 job 过（r29-failed12-reverify-1.log，唯一残余 testWorkflowRunner 自身 argv 预算问题按下方 argv 行处理）。

### #2 已证白名单
- classification 迁移为 `mode:"attested-whitelist"`：parallel 条目=basis{platform, closure:[文件本体+静态 require 闭包逐文件 sha256], evidence:"batch:<id> overall=… overlap-pass"}；由 `--attest-overlap simple_cluster/.../last-package.json`（full2 真实凭据）生成 185 条（passed 且与另一 passed 作业区间真实重叠；批次 overall=failed 如实记入 evidence 字段）；`--verify` 逐条重验，任何漂移/缺失/平台不符降级 exclusive，从不提权；runner 计划时同规则重验，未知/未登记=串行。当前 184 并行/34 串行（本回归文件本体漂移后按实处理）。
- `--max-parallel` 超全局 2 一律拒绝（final 与非 final 同规则）。

### #3 真实身份与 hook 图
- job 身份=realpath（win32 忽略大小写）+argv；同文件矩阵行同组互斥（夹具证明两行零重叠）；symlink 别名归并（夹具）。
- 启动前核验 package.json 实际 hook 图：任何 pre/post 对或保留钩子存在即阻断（夹具 prebuild 反例）；当前 repo 实测 hooksVerified:"zero" 并记入每次 run receipt（packageJsonSha 绑定）。不再声称“未来会拒绝”。

### #4 最终验收不可缩减
- `package/check:full/build/acceptance/smoke` 标 `final:true`：`--only` 直接拒绝；`--reuse-receipt` 从 runner 整体移除，出现即拒绝（夹具断言）。反例入夹具。

### #5 receipt 强校验
- 输入/输出分离：批目录 `run.json` 独占 wx（重放/覆盖被拒，夹具证明原字节不变）；`last-<entry>.json` 仅为指针+摘要。
- assemble 按**当前**计划逐项重算对账：schemaVersion、entry∈[package,check:full]、overall=passed、jobs/gates 非空、inputFingerprint=endFingerprint=当前指纹、fullCheckPlanHash=当前矩阵哈希、artifactFingerprint=当前 dist 哈希、每 job identity+argv+file 逐行 passed/exit0/日志在盘、requiredGates 全部有证据；任一不满足拒绝（夹具覆盖空 jobs、缺 gate 证据、identity 不覆盖、file 不匹配、过期指纹五类反例 + package/check:full 双正向）。
- 运行中输入漂移：结束时重算（无缓存 fresh 哈希），不同则 overall=invalidated 非零，绝不产出 passed 凭据（夹具活体漂移证明）。

### #6 vsce 经 bin 元数据
- resolveStepCommand 读 `node_modules/@vscode/vsce/package.json` 的 `bin` 字段 → `process.execPath + <cli js>`（同 npm-command 模式）；任何未识别命令拒绝执行而非猜 shim；真实仓库与合成包夹具各有断言（R29 #6）。

### #7 进程/日志/锁结算
- 先 wx 打开独占日志再 spawn（日志冲突→spawnError 结算，不产生半程子进程）；POSIX 以进程组 SIGKILL、Windows taskkill /T /F 并等待+错误捕获；tree 退出未确认 ⇒ treeStatus=unknown 且不得 passed；cancel 后 gate 记 skippedAfterCancel、不再启动任何新步骤（夹具断言 post gate 文件不存在）；全部出口走 writeReceiptAndRelease 统一结算。
- 锁：EEXIST 一律拒绝（exit3），未知/坏 owner 永不自动回收（夹具用假 owner 证明目录原样保留）；释放前须 owner.json 的 pid+batchId 与本批一致，并留 `lock-release.json` 记录（夹具）。r28 的 ESRCH 自动回收路径已删除。

### #8 闭包 preflight 接线
- `scripts/test-workflow-preflight.js`：类别 src/test/scripts/bin/lock/config 逐文件 sha 快照存 `simple_cluster/reports/test-workflow/closure-state.json`；无记录→初始化并绑定 r26/r27 84/79 归档证明；无变化→直接复用（不重做调查）；仅 test 变化→放行注记；其余变化→完整 compile/fullCheck 链按“本运行即增量核”放行并在通过后按覆盖范围自动回写 attestation（package/acceptance=all，其余=src,test,scripts，refs=run.json 路径），非完整入口无匹配 attestation 一律 exit1 阻断。main 在 compile/assemble 类入口运行前调用并把结论+变化摘要记入 receipt（closurePreflight）。真实首链：init→changed(test,scripts)→放行→attested（r29-eacces-reverify-3.log 三段实况）。

### 回归与对账
- `testWorkflowRunner.test.js` v2 夹具 **19/19 exit0**（r29-runner-regression-v2-6.log）：新增 R29 全部反例；真实仓库对账保留（218=217+1、build 208、test=208+盘上、CLI 与内存 planner 结果一致），CLI dry-run 保留一次实进程。
- 包政策 `packageContentPolicy.test.js` 10/10（r29-package-content-policy-1.log）。
- 本回归文件的 extraFiles 行 `--test-timeout` 由 20000 调至 60000：该文件本身是批测元测试（夹具内含真实等待），20s 会击穿 reconcile 单项（24–29s 实测）；此 argv 行是 r22 新增自定参数而非旧 npm 正文，调整如实记录。
- **r29LinuxFullPackage（Linux 完整必需覆盖达成，非三败）**：`npm run package` **EXIT=0，overall=passed，218/218 文件**（r29-package-full-v2-3.log；批目录 `simple_cluster/reports/test-workflow/2026-10-24T03-38-32-635Z-786951-package/`，run.json 为事实文件）。单调墙钟分段：compile 12756ms / prereq 36ms / fullCheck 226491ms（maxParallel=2，maxObserved=2，dedupRemoved=200）/ post 8438ms / assemble 9234ms / **TOTAL 263326ms**（≈4m23s；与旧 Windows 6m52 外层/399.782s 旧命令口径不可严格比较，Windows 权威数字仍由主控采集）。产物 `simple-experiment-0.5.406.vsix`（2502015 字节，341 文件）；vsce 步骤经 bin 元数据 execPath 执行 exit0（gate-11）；closure 自动回写 `categories=all` attestation（closureKey 304081fb…，refs=run.json）。
- 事后以该 passed 批次重新 attest 白名单：184 条 basis 全部刷新（`batch … overall=passed overlap-pass`），verify 零降级（r29 attest/verify 输出）。check:full→package:assemble 真实链路结果见下一节。

### check:full 首跑新失败与保守处置（待主控复核）
- `check:full`（r29-checkfull-v2-1.log EXIT=1，217/218）唯一失败 `planIsolatedLedgerLock.test.js` job-130：`Error: IPC timeout: error`（测试项 2290ms，全文日志在批目录 2026-10-24T03-44-38-230Z-795398-check_full/job-130-*）；同时窗邻居 planIsolatedReviewLifecycle/latestJobArtifacts/syncScopeLocalIndex 均 pass（run.json 区间对账）。
- 复验：同参数串行 2/2 过（r29-ledgerlock-serial-1.log）；受控并发复现（同批邻居原样并行加载）target 2/2 过、load 全过（r29-ledgerlock-contention-1.log）；该文件在 passed package 批次通过（1.88s）。
- 定性：未复现的批载下偶发计时超时（IPC 子进程通信预算 ~s 级，9p 上进程创建风暴期抖动）；非逻辑回归、非环境隔离问题。处置：classification 转 exclusive（basis 内嵌上述证据路径），业务代码零改动；check:full 复跑结果与 package:assemble 正向链路见下。
- check:full 复跑（r29-checkfull-v2-2.log EXIT=0）：**218/218 passed**，TOTAL 252312ms（compile 12.4s/fullCheck 段内同前口径），ledger-lock 转 exclusive 后无新失败。
- **check:full→package:assemble 真实链路正向**（r29-assemble-real-1.log EXIT=0）：`package:assemble --receipt …/2026-10-24T03-51-46-885Z-804971-check_full/run.json` → `assemble credential validated … jobs=218 gates=8 逐项对账通过` → lint/语法/依赖门 + vsce（bin 元数据 execPath）exit0 → `simple-experiment-0.5.406.vsix` 再生（2502022 字节）。
- 事后对照：package 批次凭据在 manifest/白名单再编辑后被指纹正确拒绝（输入漂移即失效语义在真实仓库二次实证）。
- 回归收口：夹具 19/19（r29-runner-regression-v2-final.log）、政策 10/10、三 EACCES 域 exit0×3、白名单 183 parallel/35 exclusive（全部 basis 来自 passed 批次证据或如实失败记录）。工作区 18 项未 commit（等 Windows 权威生成物）。

## r24 —— 构建缓存/候选状态机/生命周期清单（Linux，同一实例；2026-10-24）

### #1 npm 下载缓存（配置+可写证明；本轮无下载，不称命中）
- 默认 npm cache `/home/node/.npm` 在沙箱不可写（EACCES 实测）；runGate 对 npm 门注入 `npm_config_cache=<root>/simple_cluster/cache/npm`（不加 .npmrc，避免包内容变化）。
- 可写证明：`scripts.cachecheck` 门打印 process.env.npm_config_cache 且该目录创建成功（夹具断言末行 endsWith simple_cluster/cache/npm；r24-fixtures-3.log 3/3）。npm 11.19.1 实际使用该环境变量。
- 本轮 package 无网络下载 ⇒ 无命中证据，如实记 0 命中；命中与否以 `npm cache ls`/日志为准，不推断。

### #2 tsc 原生 incremental + 分区缓存（scripts/tsc-cached.js）
- 分区键=`平台-架构-sha16(root realpath+platform+arch+node+tsc+argv+有效options+fileCount+工具链markers sha+逐输入文件sha)`；Linux/Windows 树天然不同分区，无共享、无新 worktree。
- 实测（r24-compile-cold-2/warm-3.log）：冷 mode=cold missReason=no-state wall=10172ms emitted=378；热 mode=incremental wall=3049ms emitted=0（tsc 原生 up-to-date，真实启动+发射计数）；package compile 段 13913→7010ms。
- 完整输入/输出校验：state.outputs 逐文件 sha 复核；**tsbuildinfo 存在但 JS 丢失/同长度翻转字节 → missReason=output-drift(...)，整分区封存 `.stale-<iso>`（不删）后同名分区冷重建**——夹具 r9/r10 实证不被原生 up-to-date 漏产物（r24-fixtures-3.log：stale 目录数=1、重建产物字节与冷编译一致）。
- 失败增量：state.status=failed+证据文件，下次 previous-failed→rebuild（有界一次）。旧缓存/失败证据保留。
- 缓存目录 simple_cluster/cache/tsc/**：不在输入指纹类别、.vscodeignore 排除、非发行内容；同根批锁（R29 #7）覆盖写入协调。

### #3 候选状态机 compiled→validated→packaged
- compile 门全过⇒compiled；overall=passed 且 plan.phases.fullCheck 存在⇒validated（compile-only 入口只到 compiled，测试 cmp 断言）；assemble 全门通过且 vsce 门日志定位包+sha256Fresh+bytes⇒packaged（receipt candidate.packaged.path/sha256）。
- validateReceiptForAssemble 拒绝 candidate.state!=="validated"（含 compiled 不可组装、缺 candidate、file-mismatch、聚合 refusalReasons）；check:full→package:assemble 真实消费 validated 凭据，不重编译不全量重跑（assemble 阶段 phaseWalls 无 compile，夹具 asmRun2 实证）；package 旧入口保持 compile→完整 check→assemble。绝不恢复 --reuse-receipt/--only 绕过（R29 #5 不变）。
- 输入 receipt（批次 run.json）与输出 receipt（candidate.packaged，不可变）分离；last-<entry>.json 仅指针。

### #4 重复转译复用
- 现成共用 helper 检查：测试内 `compiledSource` 读取模式各文件语义对象不同（断言源码文本/vm 执行/切片探测），无安全共用点；强行共用会改变测试对象 ⇒ 复用=0，证据=test/features 中 3 处 dist 读取语义各异（planCodeScope/queueStartup 切片、hostOperationLease vm）。未加依赖/未换框架/未猴补丁。

### #5 夹具验证（r24-fixtures-3.log 3/3；runner 全套 21/21 r25-runner-regress-1.log exit=0）
- 冷/热/漂移失效/缺输出损坏拒绝/compiled 不可组装/真正 check:full→assemble（不增编译启动）/错候选拒绝/空漏失败日志拒绝（R29 #5 套件保留）。收益证据=tsc 真实启动与发射数、分段墙钟，不以"入口能加载/tsbuildinfo 存在"充当。

### #6 测试生命周期待审清单（本轮只出清单；未批准不删测/断言/停跑，未装 FlakeGate；84 旧模块候选非退役清单）
| 文件/测试ID | 原行为与独有边界 | 替代覆盖/缺口 | 观测耗时 | 建议 |
|---|---|---|---|---|
| test/features/planIsolatedLedgerLock.test.js（全文件） | 计划账本锁 IPC 超时边界；批次内 job-130 失败一次（2290ms），串行 2/2 过、受控邻居并发 2/2 过、完整 package ×2 过 | 串并行负载条件不同 ⇒ 非同输入矛盾证据；根因未定位，不声称已修 | ~1.9–2.3s | 保持 exclusive 串行；待审是否立项查根因 |
| test/features/resultCollectionPerformance.test.js | r28-full1 曾观测并行竞争失败一次；同输入复跑未再复现 | 边界独有（采集计时阈值）；缺口=复现条件未知 | 数秒 | 保持现分类；仅记录观测，不删不停跑 |
| r29 首轮 package 12 失败项（tmux/python fixture 系） | 沙箱 TMPDIR 落 9p 挂载所致环境失败（复现：repo 内 TMPDIR 20s 挂死 vs /tmp 0.14s） | 环境判定成立 ⇒ 非 flake，不入 flake 清单；runner 已固定 /tmp 沙箱根 | — | 无删除动作；留档防止误判 |
| testWorkflowRunner.test.js "real-repo plan reconciles" | 全仓展开对账唯一权威 | 无替代 | 24.6s（全仓最慢单项） | 保留；不隔离 |
- 拟隔离项字段：平台=linux(暂无法可靠估算是否平台特有)、范围=runner 调度域、负责人=主控 GPT 审核、起止/退出条件=待批准后排期（未知项如实标未知）。

## r25 —— vsix 泄漏处置 + 并行独立性正证（Linux，同一实例；2026-10-24）

### R25-A 开发锁泄漏旧包处置与三重排除
- 旧包证据复核：341 项/2502022B/SHA 67fc467d270dc3d809b1b061e0ee68927dbde370a952ba76d6c413aaf987b85e；泄漏条目 `.test-workflow-batch.lock/owner.json`（verify-vsix-manifest 实测 `LEAK … <category:dev-lock>`，日志 r25-a-manifest-old.log）。
- 独占保全：原字节以 `open(...,"xb")` 不可变保留于 reports/2026-10-24T03-56-15-222Z-813319-package_assemble/artifact-0.5.406-2502022-devlock-leak.vsix（SHA 复核一致）；根目录旧副本其后 rename 至同目录 original-root-copy-devlock-leak.vsix（非删除非覆盖，移动前 SHA 双份一致）。
- 排除修复：.vscodeignore 增 `.test-workflow-batch.lock/**`（既有 simple_cluster/**、*.tsbuildinfo 保留）；package-content-policy.json 前置 dev-lock/workflow-cache/compile-metadata 三规则（单源，JS/Python 等价矩阵过）；scripts/verify-vsix-manifest.js 纯 ZIP 中央目录解析复用同一 classify/REQUIRED，挂入 package/package:assemble/smoke 的 assemble.gates（vsce 之后）。
- 回归：packageContentPolicy 10/10 exit=0（r25-policy-1.log；含实际泄漏路径、extension/ 前缀版、simple_cluster/cache|reports、*.tsbuildinfo、及 dist/panel-build-manifest.json 防误排=undefined）。

### R25-B 并行独立性正证（classifier v3）
- 规则（analyzeIndependence，有界；未知/不可解析⇒FAIL⇒exclusive）：写目标必须绑定本文件 mkdtemp/tmpdir 派生变量链（跨行传播）；驱动路径/相对字面量作为写首参⇒FAIL；listen(非0)⇒FAIL；外部字面命令需 -S/socket/HOME/TMPDIR 绑定；spawn/exec 裸调用首参非 process.execPath 且非字面命令⇒spawn-target-unresolved；方法调用(.spawn/.exec)与整行注释不误伤；动态 require/静态引用缺失/GIT_ 定位变量写⇒FAIL。结构性正证：runner 十键沙箱+六 GIT 变量剥离（PASS 字段中记名）。
- 演进如实记录：v1 报 56 降级——复核发现两处规则误伤（fixture 字符串 `"C:/project"` 被当绝对写；注释/方法调用误判 spawn）与一处漏报（三元 `'python'/'python3'` 首参逃逸，FAIL→PASS 方向，必须堵）；v2 收紧驱动写=写首参字面量+spawn 目标必可判定；v3 修方法/注释误伤后到不动点。
- 结果（r25-attest-indep-2/-3/-4.log、r25-verify-2.log）：**parallel=124（全部含 independence.verdict=PASS + basis 闭包 sha）；exclusive=61（59 条 independence-fail 原因内嵌命中行）；--verify downgraded=0**。--attest-overlap 重放 03-38-32 批次：184 个重叠-passed 文件中 124 已有独立性正证者仅刷新观测 basis，60 个无正证者明确 skip"重叠只是观测，不单独提权"（stderr 逐条）。runner classify 无 independence 条目 fail-closed 判 exclusive。
- 数量如实：124 < 184 不是目标问题；183 亦非目标。ledger-lock basis 按 R25-B 措辞改写（不同负载条件≠同输入矛盾；根因未定位不声称已修）。

## r26 —— 计数对账 / typecheck 重编译修正 / 三项有界评价（Linux，同一实例；2026-10-24）

### 计数对账（主控令：以实际 receipt 为准）
- 04:12:30 package 批 run.json：**launchedCount=218，jobs=218，files=218；dedup.requestedSlots=418，duplicatesRemoved=200**（矩阵槽位 418 去重后实际启动 218 个文件作业，每文件一次含 argv 矩阵去重）。范围未扩大（package=217 基线文件+本 runner 回归文件）。
- 我此前口头"约838作业"**不是任何 receipt 计数**，系执行中口头误估（约为 requestedSlots 与并行子项的混淆），以本条 receipt 数字为准。
- gates=13 全过：compile 7（gate-02=tsc-cached mode=incremental missReason=none emitted=0 wall=5385ms 含 gate 包装）+ prereq 1 + fullCheck 1（gate-09）+ post 2 + assemble 2（含 verify-vsix-manifest leakHits=0 missingRequired=0 entries=340）。

### gate-09 同输入重复编译：证实并修正
- 证实：gate-09 `npm run typecheck`=`node node_modules/typescript/bin/tsc -p . --pretty false`（fullCheck build 域 sourceScript 展开），与 gate-02 tsc-cached 同输入同配置，wall=10448ms，**且非 --noEmit（重复发射）**——真实启动数+有效命令为证。
- 根因：r24 把 compileGates[1] 换成 tsc-cached 后，build 域 sourceScript 内旧 `npm run typecheck` 与新 cmd 不再同串，跨阶段 gate 去重失效。
- 最小修正（保留旧门禁语义）：tsc-cached 新增 `--verify-only`（纯只读：state.status=complete+inputHash==当前+tsbuildinfo 在+outputs sha 全匹配 ⇒ 上次含完整类型检查的 tsc 正对这组字节，结论绑定当前输入；任何漂移 exit1 要求完整编译）；build 域 sourceScript 该步替换；`npm run typecheck` 脚本本体保留可独立使用。
- 矩阵实测：ok=exit0；对 dist/extension.js 追加字节 → exit1 且**逐点报 output-drift:dist/extension.js、不封存**（首版 verify 块位于 mode 判定后曾误触发封存——属自身缺陷，已移至 mode 判定前并以 stale 计数不变证明只读）；字节还原 → exit0。
- 该次自伤封存的分区按设计冷重建：emitted=378，377 个产物 sha 与封存前 state **零差异**（tsc 字节确定，已组装 vsix 内容等价成立）。回归 21/21（r26-runner-regress-1/2.log）。

### r26 #1 文件系统/缓存 —— 结论：保持（现状注入为唯一可用路径）
- 挂载事实复核（绑定主控 evidence.json capturedAt 04:13:58 + 本地实测）：/home/node=持久 docker ext4 卷（可写）；/repos=9p bind（D:\GitRepo）；node_modules→基仓共享 bind（evidence: ABI137 linux x64, TS5.9.3）。
- 原生 npm 默认缓存 /home/node/.npm 存在但 **root:root drwxr-xr-x，node(uid1000) 不可写**（touch 实测 Permission denied；/home/node 本身可写）。npm config get cache=/home/node/.npm。
- ⇒ 未特权 chown/chmod（禁区）前无法改用原生路径；当前 gate 仍注入 npm_config_cache=<root>/simple_cluster/cache/npm（test-workflow.js L396 复核在位）——这是回退路径而非"把原生缓存迁到 bind"，本轮 0 下载 0 命中如实。待验证项（交主控决策）：容器侧修复 /home/node/.npm 属主后可撤注入，属收益需配对实测再定。
- 编译状态缓存 simple_cluster/cache/tsc/** 亦在 9p bind：候选改进=迁移到 /home/node 持久卷，**待验证**——check:dev 批次占用 9p 期间不做配对（避免争用失真），空档再测 ≥3 对冷暖交替；无稳定实收益不改默认路径。依赖未迁移、未动 node_modules 指针、临时目录维持 /tmp（容器本地，非 bind）。

### r26 #2 TypeScript 7 —— 静态结论：保持 5.9.3（静态与速度实测分列；无速度声明）
- 配置事实：tsconfig 无 extends，module=CommonJS、moduleResolution=Node（node10 语义）、target/lib ES2022；实际固定 bin=node_modules/typescript 5.9.3（evidence.json 同绑定）；nativePreviewPackage MODULE_NOT_FOUND（未安装任何 TS7 预览）。
- API 依赖（全仓扫描）：test/_helpers/registerTsRequire.js 用 ts.transpileModule+ModuleKind/ScriptTarget（多测试经该 require 钩子）；scripts/tsc-cached.js 用 readConfigFile/parseJsonConfigFileContent；多处 ts.version。TS7 原生端口移除 node/node10 resolution 与旧 JS API 语义并非无缝替换，CommonJS+node10 组合需先重映射并验证 API 等价——非本块可证稳定收益 ⇒ 按令保留 5.9.3，不硬做 7、不 ESM/屏蔽诊断伪等价、不未固定 npx 下载。速度实测未做（无候选可测），不虚报。

### r26 #3 慢测热点 —— 结论：采用（planner 结论缓存 + 预算恢复）
- 复用正常 check_full receipt top 榜（38971/27706 等）+ 本会话 CPU profile：热点=9p stat 风暴（existsSync 6.4s/lstat 3.5s/stat 1.9s），非哈希/转译/真等待；来源=classify() 对同文件多 argv 行×闭包逐项 existsSync 重复验证（sha 读已有缓存，stat 无）。
- 修正：classifyVerdicts WeakMap 按 (manifest 对象, 文件) 缓存 basis 校验结论——首次仍逐文件全量 sha 验证；同文件多行/多入口复用同一冻结输入结论（跨进程/新 manifest 必重验）；未删任何入口/断言，classification 计数逐入口复核不变（package excl=94=218-124）。
- 实测：inmem 四入口 20.96s→11.72s；reconcile 单项 21.5s→**14.38/14.57/14.98s 三对配对（中位 14.57s，波动±0.3s）**；全套 21/21（r26-runner-regress-2.log）。
- 预算：testWorkflowRunner 三处 extraFiles 行 --test-timeout 60000→**恢复 20000**（原预算），依据=上列配对+全套通过；未缩任何安全期限。
- 其余 top（gpuCollectorFrame 10680/simpleCli 6760/executionShellPreflight 6481/formalJobPreflightFailure 6455）：均 <20s 预算内且含真实 tmux/python/CLI 子进程等待（R26-3"不是看到 sleep 就无效"），不动。

### r26 增补 —— check:dev 域批、两项自伤漂移修正、既有失败升级件、tsc 缓存位置配对
- check:dev --domains test:features（04:32:15 批，EXIT=1，完整日志 r26-checkdev-2.log + reports/…check_dev/）：631 过 / **5 失败 / overall=invalidated**。域是我选的（636 文件含 614 未登记默认串行面），package/check:full 验收面（218）不含这 5 项——非范围扩大，是开发域暴露。
- **5 项既有不一致（升级 GPT，非本块引入，未改测试）**：
  1. publicCliAliases：断言 bin.simpleex='./dist/cli.js'，HEAD 已提交 './bin/simpleex.cjs'（cc11fa9d "Publish simpleex as the sole CLI command"）；runner 外直接复跑同样失败（pass0/fail1）⇒ 与 runner 无关的陈旧断言。
  2. releaseAcceptanceWorkflow：断言匹配旧 acceptance.js 文本 /runNpm\("build", \["run", "build"\]\)/，r22 重写后该文件不再含此形态（断言对象是已改写的实现文本）。
  3. vsixRuntimeClosure：同型，/function runNpm/ 匹配旧 acceptance.js。
  4. syncResolution：断言 PowerShell 字面 Set-Location -LiteralPath 'D:\project\results'，Linux 下实现输出 join 成 '/repos/…/D:\project\results'——Windows 语义测试在 POSIX 域执行的平台归属问题（该文件在 614 未登记面）。
  5. manualDistributedResultSync：108!==1 Worker 批次数断言 ×2（job-410 完整堆栈在批日志）。
  建议：1-3 由 GPT 裁定更新断言至当前契约或恢复被删契约；4 归 Windows 域/显式跳过需批准；5 需根因。均为断言 vs 已改写实现/平台语义 ⇒ 方向类，不自修。
- **自伤漂移 A（invalidated 根因）**：测试子进程 python 在 test/_helpers/__pycache__ 生成 .pyc，落入 inputFingerprint 的 test/ 面 ⇒ 首轮含 python 的批必自 drift。修正=hashTree 跳过 `__pycache__`/`*.pyc`（.py 源仍哈希，输入覆盖不减）；实测含真实 Python 的 planCodeScope 6/6 前后指纹 70aeb5e2… 相等。runner 全套 21/21 复验。
- **自伤漂移 B（排除）**：closure re-attest 写回发生在 endFingerprint 之后（L602 vs L650 顺序复核），非本批 drift 源；re-attest 目标 closure-state.json 本就不在指纹面。
- **tsc 缓存位置配对（R26 #1，冷暖分开各 3 对，空档无争用）**：warm bind 2863/3113/3060 vs /home/node 持久卷 3464/2973/3082（中位 3060=3060）；cold bind 9184/9427/9747 vs 9269/9487/10227（中位 9427 vs 9487，bind 略优）⇒ **无稳定收益，保持默认 simple_cluster/cache/tsc 路径**。评估钩子 PSG_TSC_CACHE_ROOT 保留（默认行为不变）；候选副本 /home/node/.psg-tsc-eval 留置未清。npm 缓存结论不变（原生 .npm root:root 不可写，注入为回退；容器侧修属主为待验证外部前置）。
- 最终候选（classify 缓存+hashTree 修正+verify-only 门+20s 预算恢复后）完整 package 验收：EXIT=0，218/218，TOTAL 319773ms（compile 7475/prereq 33/fullCheck 284271/post 11802/assemble 10689），vsix SHA dbb6151b…2501678B，verify-only 1653ms 替代 10448ms 重复编译，清单门 340 条目 0 泄漏（r26-final-package-1.log）。无 invalidated（pycache 修正生效）。

## r27 —— 升级件裁定实施（Linux，同一实例；2026-10-24）

### 必须返修 1：releaseAcceptanceWorkflow（同 testID"release acceptance command has an executable report workflow"）旧→新逐项映射
| 旧断言（形状） | 新断言（当前真实执行器行为） |
|---|---|
| scripts.acceptance==="node scripts/acceptance.js" | 原样保留 |
| runNpm("build",["run","build"]) | planEntry("acceptance").jobs ⊇ planEntry("build").jobs（文件+argv 身份，同一 planner 真实输出） |
| runNpm("unit tests",["test"]) | 盘上全部 *.test.js（原 npm test glob 对象）∈ acceptance 作业文件并集（不缩水棘轮） |
| scripts["test:scenarios"]==="npm run test:features" | 现 npm 面=node scripts/test-workflow.js test:scenarios + manifest aliasOf:"test:features" + planEntry("test:scenarios").entry==="test:features"（planner 真实解析到同一执行器） |
| runNpm("feature regression tests",…) | 全部 test/features/*.test.js ∈ acceptance 并集 + features 非空存在断言 |
| doesNotMatch /shell\s*:/ | 保留且扩至 runner（无 shell:true） |
| /overall=\\${overall}/ 打印 | 隔离 ws 内 report:"acceptance" 入口真实完整跑一次：stdout [acceptance] overall=passed |
| path.join(root,…,"reports","acceptance") | 同次真实运行 latest.json/latest.md 落于 simple_cluster/reports/acceptance，overall+logDir+runReceipt 引用均实存 |
| （runNpm 聚合语义） | final 入口 --only 被拒 → 薄入口原样非零透传（status!==0 + final profile 原因可见） |
目标回归：直接 exit0（r27-raw-target-1.log，21692ms——两文件在 test:features 域为 glob 行无 20s 预算行，经复核不构成预算冲突，域内运行经 check:dev --only 显式目标批 exit0）。

### 必须返修 2：vsixRuntimeClosure（同 testID"tooling uses pinned local VSCE and npm-cli without shell argument concatenation"）
- 保留原样：helper command:process.execPath、verifier require.resolve("@vscode/vsce/vsce")/spawnSync(execPath)/timeout:30000/无 npmCommand·"exec"/无 shell、acceptance 无 shell；**第一项（实际闭包验证 255 模块 + DEP0190 stderr 约束）未动**。
- /function runNpm/（旧实现形状）→ 薄入口 spawnSync(process.execPath,[test-workflow.js,"acceptance",…]) 委托 + **真实调用 resolveStepCommand**：npm→[npm-cli.js 绝对路径]（command=execPath）、vsce→node_modules/@vscode/vsce 锁定本地 bin（command=execPath 且解析目标实存）+ runner 源无 shell:true。
- 真实首发失败留档：第一项直跑 10014ms 被旧 10s spawn 预算掐死（verifier 冷实测 9558ms，r27-vvr-time.txt）→ 外层预算对齐 verifier 自身 30000ms 既有契约（断言与 DEP0190 约束不变），修后 2/2 exit0（r27-vsix-target-3.log，第一项 10336ms 真实闭包验证过）。

### 必须返修 3（R27 增补，已证 Windows 阻塞）：tsc-cached 自产 ISO 归档名冒号
- 根因：state-complete-${completedAt}/stash() 后缀=toISOString() 含冒号，Windows 非法文件名字符；冷→暖完整 package 必经该备份分支（EINVAL/ENOENT）。
- 最小修：三处（stash 拼名、成功备份、prior 备份本已规范）统一既有 replace(/[:.]/g,"-")；不改状态/输出/编译语义；旧 Linux 含冒号证据未删。
- 回归扩例 r10：complete state 二次正常编译 → 备份真实生成、basename 无冒号、dist 字节不变（testWorkflowRunner r24 套件内）；全套 21/21 exit0（r27-runner-regress-1.log）。Windows 实际冷→暖由主控正常验证。

### manualDistributedResultSync 定向裁定：基线既有缺陷（非本轮回归，非阻塞记录）
- blob 核：test 文件 + 其 7 个 dist 依赖（extension/legacy、DistributedPlanQueue、DistributedJobArtifacts、NativeResultManifest、SafeRequestRetry、PlanRunFreshness、PlanOutputRetention）git diff 8b47a6c3 全空（--stat 无输出）。
- 三场景一致复现同 3 失败（108→1、2→1、bulk scope）：runner 批（job-410）/正常环境直接单文件（r27-mdirect-1.log）/双文件共享进程 glob 型（r27-mdirect-pair.log，排除顺序依赖；生产内 Map 均函数局部无模块级缓存）⇒ R29 十键隔离、Git 变量剥离、入口拆分全部排除为诱因。
- 判定满足"原基线同契约既有问题"：同 test blob+同生产 blob+与 runner 无关。不修业务、不放宽 108/2/20 对 1 批处理断言。未知如实：基线前 legacy npm test 全量历史日志缺失，无法出示当年绿证。

### publicCliAliases / syncResolution（裁定执行）
- publicCliAliases：cc11fa9d 已提交 bin=./bin/simpleex.cjs vs 断言 ./dist/cli.js，明确基线不一致——非阻塞记录在案，CLI 与测试均未动。
- syncResolution：未 skip 未挪出；失败信息保留（POSIX join 输出 vs Windows 字面路径）；平台归属交 Windows 用原文件/原参数实际验证（windows-input-inventory.json 已含其 sha）——当前状态=未知，不称已通过。

### 冻结材料（Windows 交接）
- docs/agent-tasks/plan-state-guard/windows-input-inventory.json：inputs 1323（src 379/test 899/scripts+bin/根配置，逐文件 sha256）、dist 生成物 419 另表、changedVsBaseline 18、vsix 340 条目 SHA dbb6151b…、Native overlay 2 文件、工具链不变依据（package-lock 无 diff；node_modules=基仓共享 bind ABI137/TS5.9.3）、Git/环境冻结身份（HEAD 8b47a6c3/分支/规范 cwd/node v24.22.0）、目标证据日志清单、Linux 两包不可变路径+全 SHA+receipt。
- package-test-inventory.json v2：当前包 SHA/218 唯一文件/argv/identity/sources/envDir（十键沙箱目录逐作业在案）/parallel 124/exclusive 94/门禁 13 条含日志路径/requestedSlots 418/duplicatesRemoved 200。

### r27 补充：双包并存脚本回归最小修（必修，主控边界令）
- 现状输入：Native 根 0.5.405+0.5.406 并存；旧默认目录唯一性规则会在昂贵全量后误阻断。未删移任何包。
- 修（runner 单点）：runGate 内 assemble 阶段 `verify-vsix-manifest` 无 --vsix 时注入本批同阶段最近 passed vsce 门日志的 Packaged 确切路径，basename 必须绑定 package.json 的 name-version；无前置 vsce 门/路径不可解析/绑定不符 ⇒ 门直接 failed（refusal 字段记原因，不运行脚本、绝不分扫回退）。独立手动无参调用唯一性规则原样保留（standalone exit0 实证）。
- 夹具 3 例（testWorkflowRunner 新 suite "r27 assemble verify gate…"）：旧包(带 dev-lock 泄漏)+当前合规包并存正向通过且门 command 含 --vsix 当前路径、leakHits=0；错当前包（实存但 basename 不符）refusal /does not bind current name-version/；无 Packaged 行 refusal /unresolvable/。exit=0（r27-inj-fixture-3.log）。
- REQUIRED/policy/包后门禁全未减（政策套件 10/10）；全套 22/22 exit0。
- timeout 如实清单（无自动改动）：本轮唯一 timeout 变更=已裁定批准的 vsixRuntimeClosure 第一项 10000→30000；releaseAcceptanceWorkflow 新增两处 spawnSync timeout=30000 为新调用自身字段（非既有预算变更）；reconcile dry-run 既有 timeout:60000 未动；testWorkflowRunner 三行 extraFiles 已于 r26 依令恢复 20000。其他未审 timeout：无。
- 首报失误记录：r27-vsix-target-1 曾以 tail 截尾引用首发失败证据——按新规则本条改引完整落盘日志 r27-vsix-target-2/-3.log；此前"从启动完整落盘+原码捕获"在多数批日志已按 {time…}>log 方式执行，个别直跑命令未先落盘，已列入执行纪律。

## r28 — Windows 全量真实失败的定向修复与两个未知项取证（2026-10-24）

### E-r28-1 Windows 失败对账（非猜测，逐条读全量日志）
- 批次 receipts：…-win/simple_cluster/reports/test-workflow/2026-10-24T05-41-01-418Z-54752-package/run.json：overall=failed，218 files/218 launched/去重 200，12 failed，exit1，wall 343980ms（compile 2878/prereq 289/fullCheck 339165），assemble 未启动，maxObserved=1。
- 10 个 Python 家族失败（job-006~011,016,017,081,209）异常完全一致：`AttributeError: 'NoneType' object has no attribute 'safe_dump'`（各 job out 日志 grep 均同）；根因链：dist/runtime/cluster_scheduler.py L32-36 捕获 ModuleNotFoundError 后 yaml=None ⇒ 十键隔离重定向 APPDATA/USERPROFILE 后，实际用户站点（Roaming Python314 site-packages 内 PyYAML 6.0.3，host python-dependency-readonly.json 已证）对子孙不可见。support.cjs 无任何 process.env 写点（全文件 0 命中），tests 的 python 子进程继承 runner job env ⇒ isolatedTestEnv 注入是唯一正确杠杆。

### F-r28-A 授权修复：批内一次的既有依赖只读搜索根（已实施，Linux 契约证实）
- scripts/test-workflow.js（新 sha256 16c42507edf7a30d9d9258c67940b434f98231ddb580ed5174f7e01b57f1369b）：
  - `resolvePythonDependencyRoot()`：每批一次（模块级 memo，批=runner 进程），在构造任何覆盖 env 之前 spawnSync(实际 python, ["-B","-c","import site; print(site.getusersitepackages())"])，继承 runner 真实 env、无 shell、15s；目录实际存在才注入；命令缺失/非零/目录不存在/异常 ⇒ 本批一律不注入并打一行降级日志（仅路径，无秘密）。win32 命令名 "python"，否则 "python3"；无硬编码绝对路径、零安装、零全局改动。
  - isolatedTestEnv：十键隔离与六项 Git 清除原样；PYTHONPATH 保留既有值仅按 path.delimiter 追加已解析根（已含则不重复）；`PYTHONPYCACHEPREFIX=job envDir`（无条件，旧 Python 忽略）——字节码缓存落每 job 隔离目录，不再回写共享源码树。
- 契约夹具（testWorkflowRunner.test.js，新 sha256 c441b7a379b3f8fcf97709fbb810813524b19a67d1aa0d207869f10d1e4f5f87，套件 22→24）：PYTHONUSERBASE 让真实 Python 指向 fixture 站点（合法机制）；模块名 r28dep 全局唯一（Linux 系统 dist-packages 含真 yaml，故必须用唯一名证明可见性来自注入而非系统包）。正例断言：作业内 python 继承链导入成功且 `dep` 落在注入根、`PYTHONPATH === 原marker + pathsep + usersite`（保留+追加）、`PYTHONPYCACHEPREFIX === TMP`（=job 隔离目录）、`HOME === TMP`（十键隔离未动）、2 作业批 stdout "batch-once" 恰 1 次。负例：PYTHONUSERBASE 指向不存在目录 ⇒ stdout 恰 1 条降级行、无 batch-once 行、PYTHONPATH 恰为原 marker、r28dep ModuleNotFoundError。

### V-r28 Linux 验证（全部完整落盘、真实退出码）
- r28-pyvis-runner-1.log EXIT=1：24 tests 23 pass 1 fail——唯一失败为夹具自身引用笔误（负例 receipt 入口名写成 pyvisn，实际入口 pyvis；job 本体已 passed），机械错误一次自修。
- r28-pyvis-runner-2.log EXIT=0：24/24 pass 0 skip。
- r28-target-packageContentPolicy-1 EXIT=0 10/10；r28-target-releaseAcceptanceWorkflow-1 EXIT=0 1/1；r28-target-vsixRuntimeClosure-1 EXIT=0 2/2。
- r28-ledger-viabatch-1.log EXIT=0：真实 runner 批模式跑 planIsolatedBatchLedgerLifecycle（check:dev --only，argv 矩阵 2 行均 passed）——Linux 沙箱用户站点目录实测不存在（site.getusersitepackages() → /home/node/.local/lib/python3.11/site-packages，isdir=False）⇒ 真实批走降级路径（stdout 1 条 unresolved 行、无注入），行为正确无回归。Windows 正路径由主控常规复验，124 parallel 平台佐证仍按既有事实不外推。

### U-r28-B 两个未知项：证据+建议，未做任何修复/调 timeout/静音断言（交主控裁定）
- U1 job-107 planIsolatedBatchLedgerLifecycle「真实进程互斥」：out 日志全量显示同文件其余 6 项全过，唯此项 4497.7ms 死于 support.cjs:60 `IPC timeout done [object Object]`（wait 固定 3000ms）。机制：lockChild.cjs 在 withIsolatedBatchLedger 返回后发 'done'；父侧 wait 只认 'done'，子侧 'error' 事件会被推入 events 但 wait 永不匹配 ⇒ 超时报错掩盖真因；stdout 诊断串用 `p.stdout.toString?.()` ⇒ Socket.toString()=[object Object]（子进程 stdio pipe 父侧从不读取，非背压主因，输出量小）。假设 H1：Windows 锁排队/回收路径（rename/EPERM 重试退避）在 release 后超过 3s；H2：子进程走了 'error'（锁等待异常）被静默。Linux 同测试稳定通过，属 Windows 首见平台差异。最小宿主取证需求（主控执行）：Windows 单跑该文件，临时排空两子进程 stdout/stderr 到临时文件、记录 fork→entered→release→done 各事件时间戳、确认是否出现 'error' 事件及消息；不修代码不改 3000ms。建议（若裁定为预算/诊断问题再二选一）：(a) 诊断增强——support.cjs wait 超时消息附带子 stderr 缓冲与已收事件清单（非断言弱化）；(b) 若证实为锁重试慢，timeout 变更需主控先裁。
- U2 job-218 testWorkflowRunner「cancellation」：out 日志 20 pass/1 fail/1 skip（symlink POSIX 专用 skip 属既有设计）；失败于 testWorkflowRunner.test.js:322 `receipt(ws,"one")` ENOENT last-one.json（186ms）。根因机制已证（代码级，非猜测）：runner 取消语义依赖 `process.on("SIGTERM", onCancel)` ⇒ 置位 cancelled ⇒ writeReceiptAndRelease 写 run.json+指针+overall=cancelled（test-workflow.js:655-660,676,771）；Windows 上 `child.kill("SIGTERM")` 是 TerminateProcess——立即终止、JS 处理器不执行 ⇒ 取消凭据文件从未写出。POSIX 语义依赖在测试本体，不是 runner 缺陷。禁止项照单：SIGTERM-as-mechanical-fix 不成立；不得 assert 静音/skip。建议（择一，待裁）：(a) 推荐——跨平台取消触发：runner 监听已管道的 stdin（测试已 stdio:"pipe"）收到 "cancel\n" 即走同一 onCancel，信号处理器保留给用户 Ctrl+C；测试改发 stdin，取消后凭据断言在两平台同强；(b) 平台分叉断言（Windows 只断非零退出+无 gate 启动）——弱化取消凭据契约，不推荐。
- 首证据/旧 timeout/已知正常耗时全部原样保留：job-107 4497ms、job-218 186ms、support.cjs 3000ms、Linux 各文件正常耗时见 r26/r27 审计表；本文件未做任何 timeout 改动。

### R-r28-C syncResolution 闭环（主控宿主补证，2026-10-24，仅记录）
- 已按实际 test:features 原 glob 参数（Node --test，无额外 argv）在原 Native 树跑 3/3 pass、0 skip，job exit0/173ms，tree confirmed；复用 check:dev --domains test:features --only 精确一个文件，非最终入口、未替代 package 全量；恰为原待平台归属项且不在 package 218 内。代码只生成 PS 字符串未执行删除。receipt：…-win/…/2026-10-24T05-54-15-131Z-50612-check_dev/run.json；原日志同目录 job-001-syncResolution.test.{out,err}.log；宿主外层 /host/c/Users/ZLK/AppData/Local/Temp/paired-update-win-JBf8ss/sync-resolution-run.json、host-windows/ccd05f7e-…-{stdout,stderr}.log，outer exit0/5135ms。首次预启动域名错（features≠test:features）在任何测试/写入前被拒，核实际 manifest 后一次机械参数修复；原 7e5a8e63-stderr 完整保留并入 outer receipt，不算测试失败，不再重测。结论：Linux 原先的 D:\ 路径期望在 Windows 真实通过，原测试未 skip/删/弱化，该待判项闭环。

### U-r28-D U2 实施：--cancel-stdin 合作取消入口（主控 R28 后续裁定 2)，Linux 证实）
- 裁定要点：Windows 强杀不承诺 JS finally 收据，不得弱断言/skip；批准最小 opt-in CLI 入口 --cancel-stdin（默认不读/不抢 stdin），精确一行 "cancel" 触发既有 onCancel，支持分块/EOF，收尾解除监听；保留 SIGINT/SIGTERM；非未来功能。
- 实现（scripts/test-workflow.js，sha f71e97584017886e04829fa201a668617bd7c1823dbf28dfef9c450508850ec7）：parseArgs 新 flag；onCancel 信号注册之后接线 stdin（仅 flag 时）：utf8 行缓冲、剥 \r、逐完整行恰等 "cancel" 触发，EOF/其他内容不触发、无任意命令接口；detachCancelStdin 在唯一收口 writeReceiptAndRelease 与 planFail 早退两处解除监听（main 的 catch 对应 stdin 接线之后的 try，无 TDZ）；runner 以 process.exitCode 退出，监听解除后事件 loop 自然结束不挂住。
- 测试（testWorkflowRunner.test.js，sha 60ceb11b6ec98a95810459631fa99a2bdcb6249c69b95208a4bd8cd464fd1efc，套件 24→26，未新增任何验收期限常量）：
  1) 原取消 testID 保留全部断言（非零/receipt cancelled/已启动树结算/post 门不跑）：POSIX 仍走 SIGTERM 信号路径；win32 分支以真实管道 "cancel\n"+stdin.end() 合作取消（两端真实进程，无 process.emit 冒充）。
  2) 新 test：两平台共同路径 "can"|"cel\n" 分块 + EOF 收尾 ⇒ 非零、overall=cancelled、job status=cancelled、treeStatus==="confirmed"、树未跑完、post 门未启动。
  3) 新 test：不加 flag 时向 stdin 写 "cancel\n" ⇒ 批照常 exit0 overall=passed（默认绝不读取/抢占 stdin 的正向契约）。
- Linux 验证（完整落盘）：r28u2-runner-1.log EXIT=0 26/26 pass 0 skip；r28u2-target-packageContentPolicy-1/-releaseAcceptanceWorkflow-1/-vsixRuntimeClosure-1 全 EXIT=0（10/10、1/1、2/2）。Windows 两分支由主控最终全量真实执行验证（POSIX 分支语义在 win32 由 stdin 分支承担，信号处理器代码路径保留未改）。
- 主控已裁事实（记录）：Windows Python 正路径已验证——原 package 参数精确 10 文件/10 启动全 pass，outer0/66880ms，user-site batch-once 恰 1 次，十键未恢复（Native 2026-10-24T06-04-34-884Z-14808-check_dev/run.json、4nYvWX/python-target-run.json、host-windows/a4d043a6-…）；16c/c441 完整快照在 4nYvWX，Native 与 Linux 源返修并行隔离；1325 冻结增量已核。新探测预算批准范围如实记录：仅 site 解析 15s（缺失不跳测试）与 releaseAcceptance 两处既有新调用 30s（依据 21.692s 真实冷 planner 证据）；今后新探测/新预算一律先裁，不再以"新字段"豁免。U1 由主控接手宿主取证（临时 require hook 捕获 fork 全量 stdio/IPC/时间戳），我不碰 ledger/超时/断言。Windows max1 保守分类维持，未获跨平台正证不改 platform/不泛放并行；旧 343980ms 为失败样本不得冒用。

### U-r28-E U1 最小返修实施（主控 R28-U1 后续批准 2)，Linux 证实；生产 ledger 未动）
- 主控取证事实（记录）：observational preload 一次复现原 case exit0——B entered586/A fork588/父 release 1006·1007/A entered1074/B done1108/A done1189，收尾 send 才有 EPIPE⇒done 后 EPIPE≠业务失败；此次通过≠首次原因已确定。原 job-107 物理夹具只读核证：events 仅 ENTER/LEAVE(B) 两行、无 A 事件、无残锁；首次 A 的具体 error 已被旧 helper 吞掉——不可编造，标未追回。源码常量实证 LOCK_WAIT_MS=600（获取上限）/LOCK_RETRY_MS=20/TTL=15000，dist 调用形态 node_fs_1.promises.open(lockPath,"wx") 调用时取属性⇒require 前包装 fsp.open 可观测。
- 变更（仅 test helper/lockChild/lifecycle 夹具，生产 PlanIsolatedBatchLedger 零改动）：
  1. support.cjs spawnChild：完整 drain+保留子 stdout/stderr；done 之前 IPC error/退出/传输故障即时拒绝全部 pending wait 并附诊断（实际事件清单+exitCode/signal+stdio）；done 之后清理 EPIPE 不推翻结果；waiter 携带 {resolve,reject,timer}，超时/结算均清 timer，failure 后新 wait 即时拒绝；3000ms 预算原样。旧缺陷（吞 error、Socket.toString→[object Object]、伪装超时）即首因伪装层。
  2. lockChild.cjs：新增 contender 模式——仅包裹真实 fsp.open 对 file+'.lock' 的首次真实 EEXIST 发一次 contended 事件后原样 rethrow，生产 20ms/600ms 逻辑原样继续，零伪造零延长；新增 boom 反例模式（即时 error+exit1）。
  3. lifecycle 互斥用例：固定 400ms 睡眠⇒真实争锁握手（await contended 后验 A 未 entered/B 原锁在位，再释放 B）——两个真实 PID/原位活锁/严格四行物理顺序/无残留断言全部保留。【已批验收时序变化·plan 记录】旧=400ms 固定等待（窄于实测 fork→entered 486ms 窗口，且不证明 A 实际尝试锁）；新=A 真实 EEXIST 后 contended 握手；依据=preload 观测时间线+源码 20ms 重试余量。
- 反例夹具：新 test「helper 即时上报子错误」——断 message 含 fixture-boom、不含 IPC timeout、含 events=/stdout=|stderr= 诊断，且后续 wait 即时拒绝不吊满预算。未新增工具/期限。
- Linux 验证（完整落盘）：r28u1-target-planIsolatedBatchLedgerLifecycle-1 EXIT=0 8/8（7 原+1 反例，contended 握手实际触发⇒非绿灯自证）；r28u1-target-planIsolatedBatchLedger-1 EXIT=0 5/5；r28u1-target-planIsolatedBatchLedgerDispatch-1 EXIT=0 5/5。Windows 由主控以原 package 参数对应文件复跑后进入最终全量。
- U2 宿主事实（记录，不改源）：主控临时 manifest 误用 killGraceMs=2000（项目 batchDefaults=30000）⇒26 项误杀于 20s 总 watchdog，属宿主定向参数机械错误，非 U2 源码缺陷/新超时许可；裁定=仅恢复整份原 manifest batchDefaults(30000) 一次复验，Windows 正确预期 25 pass/1 既有 symlink skip/0 fail，不强称 26pass；首次 ea78cb5e… 日志与 r28u2-native-dDk4an/runner-native-run.json 保留。
- U2 Windows 正向闭环（主控 2026-10-24，仅记录勿重查）：临时 manifest 恢复原 batchDefaults(max2/killGrace30000)+原 argv20000 未变后 26 总=25pass/1 原 POSIX symlink skip/0fail，job33008ms tree confirmed 无 timeout，outer0/33991ms；receipt Native/…2026-10-24T06-15-36-554Z-58488-r28_runner_native/run.json、4nYvWX→dDk4an/runner-native-original-defaults-run.json、host-windows/deb59cbf-…-{stdout,stderr}.log；首次预算错 ea78 与原 manifest/receipt 全保留；该链属宿主定向参数机械修复（额度已用且成功），不计源码返修。

## W — Windows 最终完整验收与实际归档通过（主控 2026-10-24，权威当前状态）
- 事实全量见 windows-input-inventory.finalWindowsAcceptance / host-handoff.r28FinalWindowsAcceptance（同消息记录，不双写细节）：U1 Native 三文件原 package 参数 3/3 pass outer0/13086ms；1325 冻结输入两树一致+compile0 后 337 槽默认 provider 实时只读门禁 0/410ms；npm run package exit0 外层 399115ms（runner397846：compile2867/prereq213/fullCheck388974/post2416/assemble2836；218/218 启动、去重200、13 gates 全 0、1750 用例=1746pass/4既有skip/0fail/0cancel；maxObserved=1 保守串行如实）；编译分区 win32-x64-bdf77cb6d511779b 冷8541/暖1595/最终1483 仅编译观察不称全包提速（399782 旧覆盖不同，399115 基本持平）；VSIX sha256 52589290…、2501678B、340 条目/338 逐字节全等、闭包 255/2、Zip leak0/missing0、秘密0；双包并存新门显式 --vsix 本次未泛扫，原 405/原 9f/Linux dbb 全保留；归档六件在 paired-update-win-AKjxiJ（复用既有 archive-check-staged-sha/ReadmeProcessor/vsce ls）；419 生成物与 Linux 逐个 SHA 全等 changedVersusLinux=[]。
- 全程失败/自修/审批台账索引（详情各节保留，失败未因更新消失）：R24 无失败轮；R25 vsix 泄漏门（夹具 python 控制字节一次自修、分类器两轮误判修正）；R26 check:dev 5 失败升级+__pycache__ 指纹修复、"约838"口头误估作废（对账 218）；R27 vsixRuntimeClosure 超时首失败（timeout 10000→30000 主控追认）、--verify-only 首版密封违只读（移动位置自修一次）、tsc-cached ISO 冒号 Windows 必修、截尾日志批评→新日志纪律；R27b 双 vsix 泛扫必修（注入门+3 夹具）；R28 Windows 12 失败=10×PyYAML（授权修复）+U1（首因伪装层已修，首次 A error 未追回）+U2（SIGTERM 语义→--cancel-stdin 批准接口）；U2 宿主 killGraceMs=2000 定向参数机械错误一次（宿主额度已用且成功，非源码返修）；本轮 Linux 侧夹具入口名笔误一次自修（r28-pyvis-runner-1→2）。全部 timeout 变更均经主控裁定或为主控明示批准；4 项生命周期/退役/隔离仅既有待审清单未实施。
- 停止条件核对：本任务块必需验收——Linux runner/契约/夹具全绿 + Windows 原参数目标复跑 + 最终完整 package + 实际归档清单/闭包/Zip 门禁——均已满足；最终完整交付确认归主控（PR 整合后）。GitHub 认证/fetch/push/PR/审核合并由主控执行，Linux 本地 Git 归本负责人。
