# evidence —— tsc-cache-and-test-prep-20261026（2026-10-26，全部为实测记录）
## 冻结声明（用户收口指令 2026-10-26）
**frozen candidate = `d7f00adcf6b6481daacb26d065616848224ca30b`**（分支 perf-tsc-cache-and-test-prep-20261026）。已证的路径解析修复（d7f5c711）与 TS7 实际启动接入（d7f00adc）均含于其中；自冻结起不再追加任何功能/建议性改动（后续想法只入 plan.md「后续候选」段），不再触碰 tsc-cached/test-selection 的任何键（COMPAT_VERSION、分区键、发现逻辑）。
冻结身份（sha256 实测；**验证期间这些输入文件不变**）：
- scripts/tsc-cached.js `682ab82830ce4f38f1c605d515017078318460767c91e2c6ae0fdbc796179025`
- scripts/test-selection.js `59980c0d69b0bab91466cd0d1280800450c33dd8bbd00ef44a0c7f0650bbe86f`
- scripts/test-workflow.json `0151bdb3f126e35b691ba8426722d99bd9195e0ccdfe9159d068af56d1ba3847`
- scripts/test-workflow.js `618b528060333bb80bb9ad42e03a9b32f435df3d9f3fb8655087e027d5ae19ab`
- test/project/branchProjectRegistry.test.js `eb0a19bc11a1ee62764b38ef8c078706705d9a3f06eca4c54d24cef6bec797d3`
本笔冻结记录为 docs-only（不改上述任何文件）。本树存在**非本切片负责人写入**的工作区项（冻结时点原样，未提交未回滚，交主控裁定）：dist/** 12 文件（15:30 宿主重编译痕迹）、src/features/DispatchWake.ts 修改、未跟踪 test/中文空格 probe钉对.ts、未跟踪 node_modules/——**宿主按 d7f00adc 验证时须以该提交的文件内容为准（检出或校验上述 sha），勿把这批工作区噪音当候选输入**。


## 候选提交（本地，未 push）
- 本切片候选（返修前）：`8fee3f7695714688059b76675e3a5162d9271ca9`（branch perf-tsc-cache-and-test-prep-20261026，基线 origin/master `bcf09551…` 重新 fetch 核实；common-dir `/repos/MCP/zlk-cluster-orchestrator/.git`）
  - `scripts/tsc-cached.js` sha256 `8682e0c480f9845093f89f7f4e40991dd3d497e8e664257dbf657bd139fe7cd6`
  - `test/project/branchProjectRegistry.test.js` sha256 `e2de1b90e30c77a9ccd5b8d3660114ce6c25a5a3daa72d2aaf8ac7151135d012`
  - diff：2 files, +74/−7；文档随后单独提交（本文件所在提交），候选内容以 8fee3f76 为准。
- **返修提交（主控 2026-10-26 裁定）＝现行候选：`2046593d0bed5dfdccf8f34bef5de81c56607b98`**（返修后 `test/project/branchProjectRegistry.test.js` sha256 `eb0a19bc11a1ee62764b38ef8c078706705d9a3f06eca4c54d24cef6bec797d3`；`scripts/tsc-cached.js` 未再改动，仍为 `8682e0c4…fe7cd6`；提交后 porcelain 0，用例数复核 39）：应主控指令“夹具零清理、留证优先”，移除首版新增的全部删除逻辑——原 8fee3f76 版 :52-61 `removeTreeBestEffort`（递归 chmod+rmSync 删除执行器）、:63-65 after() 模板删除、:95 makeRepo `fs.rmSync(dir)` 逐条删除；模板改经既有 tempDir() 进入 tempDirs 留证集合（与其他夹具同命运，运行后保留）；clone 目标为 mkdtemp 刚建的既有空目录，不预删。文件内 :1008 `fs.rmSync(scratch.txt)` 为既有用例被测行为，未动。本套件现零删除/零 chmod 新增路径。
- **clone 进既有空目录实测（主控点名事实）**：Linux git 2.39.5，私有临时探针（/tmp/se-clone-probe-*，不触交付仓）：`git clone -q --no-hardlinks <模板> <已存在空目录>` **exit 0，stderr 为空**，克隆后 HEAD/工作树/历史正常。Windows 宿主 git 版本以宿主首跑为准（空目录克隆为 git 长期既有行为）。
- 0.5.415 主线（另一棵树，互不阻塞）：源码 `e4dceca1847b450fd42b05e4549d2c1319a489ec` + dist 回写 `b1b470985ff45fedbc69f0561062cfc61d580f56`（恰 5 文件：legacy.js / LocalCodeManifestCache.js / PlanIsolatedBatchLedger.js / PlanIsolatedReview.js / panel-build-manifest.json，+117/−261）。提交前逐字核对 5 个 sha256 与用户提供的主机实测值全部一致；提交后 porcelain 0；版本三处均 0.5.415（package.json:5、package-lock.json:3、:9）。`write-agent-runtime.js` 后 `git diff --stat src/runtime/RuntimeManifest.ts` 为空的门禁按主控指示留待打包轮宿主实测。**宿主编译已完成退出（用户确认，无并发）；7 套件结果与终审未回——此线未完成，push/终审由主控按长期授权执行。**

## Linux 静态自查（真实退出码）
| 检查 | 命令 | 结果 |
|---|---|---|
| 改动脚本语法 | `node --check scripts/tsc-cached.js` | exit 0（补丁前基线亦 exit 0） |
| 测试文件语法 | `node --check test/project/branchProjectRegistry.test.js` | **PreToolUse 钩子拒绝**（PI_NATIVE_PLATFORM_REQUIRED），按主控裁定未换形态重试 ⇒ **测试文件语法由宿主首跑兜底** |
| 项目 tsc --noEmit | 未能在本 worktree 执行 | 新 worktree 无 node_modules（untracked，按约不复制）；且 tsconfig `include:["src/**/*.ts"]` ⇒ 本切片两个 JS 文件均在类型程序之外，类型结论不受本改动影响。同一未变程序的 tsc exit 0 证据在 415 树（e4dceca1，程序输入与本 worktree 的 src/** 相同，两文件均为 JS 且不在程序内）。 |
| 用例零变化 | `grep -c "test("` 改前/改后 = 39/39；`git diff -U0` 中 test() 增删行 = 0 | 通过（断言、用例名、用例数零变化的机器佐证） |
| 工作区 | 提交后 `git status --porcelain` = 0 行 | 通过 |

## 手测退役裁定表（本轮退役清单＝空；退役前后自动清单条数 0 → 0）
| 文件:行 | 用例 | 退役? | 依据（按实际断言与入口，非按耗时） |
|---|---|---|---|
| test/project/branchProjectRegistry.test.js:1273 | C4-R6 真实互斥：两独立 cwd 同仓同引用并发创建只有一个可进入 | 否 | 锁/互斥类，边界明文不退役 |
| :1382 | C4-R6 UI 真实入口 alreadyMerged 恢复…零 merge 零 ff | 否 | 面板可见仅 info/warn 告知顺序；核心是 pr merge 零调用、冻结 SHA/cwd/target 传参、OPEN 即零写——全部“人眼看不到”的拒绝/零写入断言 |
| :1415 | C4-R6 UI 真实入口合并顺序…确认后撤证零 merge；取消零写入 | 否 | 确认弹窗证据（plan.id/40 位 SHA/摘要）人眼可验，但同用例混缠撤证复核拦停=模块未调用、pr view/merge 零计数、dirty 门零查询隐藏断言；拆分=改用例，越界 |
| :1483 | C4-R6 UI 真实入口祖先 ff：fork B 漂移拦停 | 否 | blocked 状态、原因不回显 raw 地址、fetch 前拦停、B 仓零接触——全部隐藏拒绝/零写入类 |
无空列掩盖缺口：无安全退役项，也不新写无法机器复现的手测项。testWorkflowRunner.test.js（45,653ms）无可安全复用点——耗时即被测行为（真实进程编排：重叠窗口/最大并行/互斥/锁所有权/取消树/树漂移/超时非通过），保留原样。

## 片 5 旧测试按需选择（用户核准 2026-10-26；候选=本分支包含本文件的最新一笔提交，回报含实测 SHA）
- 单一实现：`scripts/test-selection.js`（唯一规则集 R1-R4，STRATEGY_VERSION=ondemand-old-tests-v1）；test-workflow.js 十处接线全部经同一 buildSelection（planEntry/dry-run/receipt/组装核对/验收报告/恢复入口 `--include-ondemand`），无第二份规则拷贝；每轮流程开始现算，无缓存。
- **只读推算数字（一次性 /tmp 脚本按同规则推算；权威以宿主 `--dry-run` 单命令产出为准）**：check:full 原总文件槽 902、去重文件 238、组数 N=28（含 4 个无 domain 归属的保护伪组 + build 组时间 unknown⇒默认执行）、cap=floor(28×0.6)=16、旧候选内关键类保护恢复 6（test:local-stop-control、test:terminal-history、test:host-lease、test:sync-gpu、test:isolated-ledger-lock、test:rerun-scheduler-contract，均 R2 命中）、干净基线实际按需 10 组/62 文件（mac-parity、execution-shell、worker-mode、runtime-diagnostics、plan-code-scope、agent-lifecycle、preflight-stages、windows-flow-incremental、cli-contract、local-dispatch）。**当前性能切片树本身 scripts/** 有改动⇒R3 scope-unknown⇒全保护、实际按需 0（保守路径按设计工作）。**生效边界**：本模块宿主实跑前不得称已生效；合并后合并前的历史 receipt 因无 selection 字段一律不可用于组装（需重跑完整验收）。
- **同包复用实测结论（读源码核得，无需补齐）**：`npm run package`＝单入口顺序链 compile→fullCheck→post→assemble，测试失败在 test-workflow.js:842 早退绝不触组装；组装仅一次 vsce；最终 .vsix 由 verify-vsix-manifest.js 实际解包核 entries/leak/required（单一规则源 package-content-policy.json，脚本 :4-5、:98）+README 唯一性与内容一致（:76-93）；包 SHA/字节 candidate.packaged 现算绑定 receipt（test-workflow.js:734）；package:assemble 只核对（逐项+指纹+planHash+新增决策 hash），不重复测试/组装。测试通过不替代组装完整性检查——后者独立对最终归档内容执行。
- **Linux 静态自查（本片，真实记录）**：`node --check scripts/test-selection.js`、`node --check scripts/test-workflow.js`、`node scripts/test-workflow.js check:full --dry-run` 三次均被 PreToolUse 钩子前置拒绝（PI_NATIVE_PLATFORM_REQUIRED，未执行；未换形态重试）⇒ 语法与决策数字由宿主首跑/dry-run 兜底；test-workflow.js 十处接线 grep 回读＋编辑区人工回审通过（作用域/括号完整）。tsc：两文件均在类型程序外（include=src/**/*.ts），同前口径。

## 默认流程与验证口径（用户 2026-10-26 覆盖裁定）
默认链＝必要编译→本轮规定测试（含按需/保护策略）→组装包，完成即报包路径+真实状态；独立 acceptance/归档审计/包后冒烟安装**不默认**、缺 receipt 不拦打包、不换名插回，用户另行触发。vsce/verify-vsix-manifest/verify:package-runtime（组装前 vsce ls+版本+闭包工具门）属打包器自带，照常。新策略验证=dry-run 数字+受影响套件（branchProjectRegistry、testWorkflowRunner 属受影响回归——selection 改动所在 runner 的既有回归套件），**不需重跑整轮约 12 分钟 package 全验收**；原任务已做的 7 套件结果（415 线，另一树同一 runner 基线）与新切片受影响回归分开记，不混成新一轮全量。

## 主控返修记录（2026-10-26 源码审阅，STRATEGY_VERSION→ondemand-old-tests-v2）
- **changedFiles 路径 bug 修复**：原实现把 status 与 diff 输出统一 `line.slice(3)`，diff --name-only 无 XY 前缀⇒`src/extension.ts` 被截成 `/extension.ts`（主控离线复现证实）。v2 两种输出分开解析并全程 `-z`：status --porcelain=v1 -z（含未跟踪，R/C 条目消费后随原路径字段）+ diff --name-status -z（R/C 取 old,new 双路径）；`-c core.quotePath=false`（非 ASCII 不被引号+八进制转义——-z 不隐含该设置，离线复现第二条发现）。行号：test-selection.js :34 版本、:47-72 firstAddedTimes（浅克隆边界排除 :52-53/:60/:68）、:73-99 changedFiles、:36-38 RUNNER_OWN/排除表。
- **浅历史**：depth 1 浅根提交的 A 记录＝浅抓取假象，v2 以 rev-list --max-parents=0 边界集排除（批量与 --follow 两路），拿不到可靠首加入⇒成员计入组 unknownMembers⇒组不判旧；summary 输出 unknownMembers/shallowRepo/changedFilesCount。
- **离线复现结果（node /tmp/se-selection-verify.cjs，4/4 PASS exit 0）**：①注入 diff 输出 `src/extension.ts` ⇒ changedFiles 返回完整路径（旧 bug 截断路径已消失）；②-z 解析：空格/中文路径、status+diff rename 新旧双记、未跟踪新增计入、docs 排除；③真实临时 git 仓：CJK/空格名 status -z 原样、未跟踪新增、depth-1 浅克隆对浅边界文件不再给出伪首加入时间；④buildSelection 端到端：closure 定域保护（changed-mapped-closure）/干净基线按需/`--include-ondemand all` 恢复/无 domain 伪组保护/unattested 成员保护。
- **保护分类改依据制**：非关键候选组要求**全成员**在 manifest 既有 attested whitelist（classification.parallel[].basis.closure，124 文件→408 条非测试映射）且改动未命中其 closure；有未 attested 成员⇒保护（unattested-members）。src 变更经 closure 定域（命中⇒护组；不命中且全 attested⇒可证实无关），不再"任意 src 变更永远全保护"；runner/清单自身改动⇒全保护。判定依据表＝summary.protectedRestored[].reason ∈ {runner-or-manifest-change, change-scope-unprovable(git), critical-class, changed-this-round, changed-mapped-closure, unattested-members}。
- **真实现数字（唯一实现 planEntry 计算，替代旧推算；权威仍=宿主 dry-run）**：check:full N=28、cap=16；当前树（scripts/** 在提交差内）保护恢复 16（全部 runner-or-manifest-change）、实际按需 0、执行作业 237；干净基线模拟（status/diff 置空 mock、其余真实 git）保护恢复 15（unattested-members 9 + critical-class 6）、**实际按需 1 组/6 文件（test:local-dispatch）**、执行 231。v1 推算的 10 组/62 文件作废——v1 未强制成员 attested；60% 为上限非目标，可静默面随 whitelist 覆盖（124/238）扩大。
- **默认链审计移出**：test-workflow.json package :306/:312、package:assemble :331/:337 删除 verify:package-runtime 与 verify-vsix-manifest 两门；acceptance post :496 后追加为显式验收入口保留；smoke（显式冒烟）原样保留。新默认步骤：prereq→compile→fullCheck(按需)→post(readme+plan 压缩)→assemble(一次 vsce)→报包路径+SHA+状态。
- **耗时口径更正**：最新真实 compile 总 **16.9 秒**（2026-10-26 15:01:39 批次），此前“十几分钟/12 分钟”表述作废（那类数字是历史整轮 package 口径，与 compile 无关，不再引用）。
- **TS7 共享 CLI**：仅获“可继续核兼容切换”授权；本轮未动模块语义/锁文件，等待同一代码在 TS7 CLI 与 5.9.3 API 下的诊断集+产物差异真实证据，无证据不切换。
- **本树非我写入项（如实报备，未提交未回滚）**：2026-10-26 15:30 本 worktree dist/** 12 文件被重新编译修改 + 未跟踪 node_modules 目录出现（宿主侧行为痕迹）；本切片提交严格显式路径，node_modules 已加入变更判定的执行无关排除表。

## TS7 共享 CLI 接入（用户核准"继续加速编译"，证据先行；tsc-cached.js 改动见本切片提交）
- 既有证据（主控 .pi-build-cache-followup-20261026-225840/，一对隔离 emit，非中位数非端到端）：5.9.3=13,787ms vs 7.0.2=2,879ms，双方 exit 0、源码前后 SHA 相同（c5585c07…）、各 387 文件、385 逐字节相同；候选配置仅隔离覆盖 module=Node16/moduleResolution=Node16，源码未动、无 type:module（CJS 目标不变）。
- **两处输出差异核实（不猜）**：
  - extension/legacy.js＝纯换行排版差：token 流比较 300,274 vs 300,274 **完全相同**（first_diff=-1），双方 vm.Script 解析通过；换行位置在逗号后（零 ASI 歧义）⇒ **等价，无兼容问题**。
  - tunnel/XshellSessionPatcher.js＝真实语义差：TS5 把动态 import 降级为 Promise.resolve().then(()=>require("fs"))，TS7 保留原生 `await import("fs")`（Node 24 支持）。**必须**由既有测试确认 COPYFILE_EXCL/备份行为后才可启用：test/tunnel/xshellSessionPatcher.test.js:18 `xshell login command update creates backup`（真实执行 updateXshellSessionLoginCommand({backup:true})→dist :77 分支断言 backupPath+内容）与 :12（替换语义）；test/tunnel/independentAgent.test.js（直接 require 该模块的 4 用例）。
- **实现要点**：discoverSharedTsc7()＝env PSG_TSC7_BIN 显式声明或 npm root -g 实际布局（无硬编码用户路径）→ bin 存在 + 读包内 package.json **字段**校验 name==typescript && version==7.0.2（不加载其 API、绝不 npx/下载）；发现不到/版本不符⇒回退项目 5.9.3 CLI 并逐条原因打印+入 state；PSG_TSC7_DISABLE=1 显式禁用开关（真实回退阀门）。项目 5.9.3 JS API 保留（仅 tsconfig 解析），旧 API 路径零 require 全局 7；旧包/全部现有工具与测试未动；锁文件/tsconfig/业务语义未改。
- **缓存诚实性**：COMPAT_VERSION→v3（判据 d 键构成变化）；compatHash/inputHash 均记录 {kind,version,realpath bin}+compilerOverrides+有效选项（含 Node16 覆盖）；toolchain state 存实际执行编译器（kind+version），日志 compiler=ts7-global@7.0.2 [overrides] api=5.9.3——不再冒报 ts.version。v3 新分区首编译＝一次性冷启动，如实记录。
- **待宿主（Linux 禁跑产品编译/测试；精确命令）**：三对交替（复用隔离输出目录）：每对 = `node scripts/tsc-cached.js`（自动发现应报 ts7-global@7.0.2）与 `PSG_TSC7_DISABLE=1 node scripts/tsc-cached.js` 交替，记录耗时/exit/输出文件数/逐字节一致数（vs ts5-current-output 基线）；回归 `node --test test/tunnel/xshellSessionPatcher.test.js test/tunnel/independentAgent.test.js`（Windows，经既有 runner 单入口亦可）。**采用判据**：三对稳定加速 + 两套件全过 + 差异仅 legacy.js 排版 ⇒ 启用；任一失败 ⇒ PSG_TSC7_DISABLE=1 回退并报具体原因，不伪造兼容。
- 验证：node --check scripts/tsc-cached.js exit 0；token 等价比较与 vm 解析为离线只读检查（读证据目录输出件）。

## 片 4 定向回归（等待主控排 Windows 宿主；未开始，不得预写结果）
①跨真实源码变更复用（冷→改一 src 文件→incremental+inputDrift+dist 更新+真实退出码）；②诊断非零传播（注入类型错误 exit≠0+state-failed→复原 rebuild）；③输出缺失/篡改（.stale 封存；verify-only output-drift 非零）；④配置/工具链失效（argv 变/@types 变→新分区）；⑤worktree 隔离（两副本 cacheDir 分离）。三态（冷/无改/有改）完整日志+退出码回填本文件。分区公式变化后的首编译为**一次性冷编译**，如实记录，不写成“缓存失效已修”。

## 耗时事实（仅报告，不写入任何断言/门禁）
branchProjectRegistry 宿主实测 123,817ms（约 23 仓 × 5-6 git spawn + commitFile 3 次/处 主导）；本切片后每仓 spawn 5-6→1（clone）+1（remote remove）。testWorkflowRunner 45,653ms 保持。改进效果以宿主三态实测为准，Linux 不产出任何产品耗时数。
