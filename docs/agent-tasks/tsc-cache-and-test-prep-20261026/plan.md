# tsc 缓存分区修正＋最慢测试准备复用（perf-tsc-cache-and-test-prep-20261026）

状态：两片实现完成、Linux 静态自查完成、本地提交（未 push）；定向回归需 Windows，等待主控排宿主。**本文件不构成任何验收结论。**

## 两条线实际坐标（2026-10-26 实测）
| 线 | 目录 | 分支 | HEAD | 进度 |
|---|---|---|---|---|
| 性能切片（本文件所在） | /repos/MCP/zlk-cluster-orchestrator-perf-tsc-cache-20261026 | perf-tsc-cache-and-test-prep-20261026 | 见 evidence.md「候选提交」 | 实现+静态自查+本地提交完成；宿主定向回归未开始 |
| 0.5.415 主线（CAS 账本+可见性） | /repos/MCP/zlk-cluster-orchestrator-isolated-ledger-lock-20261026 | fix-isolated-ledger-orphan-lock-20261026 | b1b47098（dist 回写后；源码 e4dceca1） | 宿主编译已完成并退出（用户确认）；7 套件结果未回——不得写成已完成 |

基线：本 worktree 自重新 fetch 核实的 origin/master `bcf0955165559055ab06aa2e8438c227664a6a30` 创建；common-dir `/repos/MCP/zlk-cluster-orchestrator/.git`。不触碰 415 候选树、`.win-se-*`、`.win-sftp-*`、Root。

## 片 1：scripts/tsc-cached.js —— 兼容分区与完整输入身份分离
病根（原文件实测）：partition=`platform-arch-inputHash[0:16]`，而 inputHash 含全部源码内容哈希与 fileCount 及项目 package.json/package-lock 全文哈希 ⇒ 任一源码字节或版本号变化即换新 tsbuildinfo 目录从零冷启动；复用判定本身只看 toolchain 四项+输出完整性+buildinfo 在位，不看 inputHash。

改法（已实施，最小）：
1. `COMPAT_VERSION="v2"` + `compatHash` 作分区键：compatVersion、realpath(root)（worktree/dist 位置隔离，不跨副本共享可写 buildinfo）、platform/arch/node 精确版、ts.version + typescript/@types/node/@types/vscode 三个包体 package.json 哈希（package-lock 换 @types 由此类捕获）、规范化 parsed.options、透传 argv。脚本注释内写明 compatVersion **人工升位判据**（TS 大版本变化 / 本脚本 buildinfo/state 格式语义变化 / 输出目录与发射语义变化 / 键构成变化；其余一律不自动动）。
2. 明确排除于分区：源码内容、fileCount、项目版本字段、lock 全文——由 tsbuildinfo 原生增量跟踪（incremental 的职责）。
3. inputHash 语义逐字保留，继续写 state 并驱动 verify-only 门禁；state 新增 previousInputHash/inputDrift/compatHash/compatVersion（只增不减，失败证据字段同增）。
4. 模式选择新增 `state.compatHash!==compatHash ⇒ cold(compat-formula-mismatch)` 防御；verify-only、.stale 封存、失败证据、同副本串行语义未动；旧分区目录不触碰不清理（新公式目录名含 `compat v2`，天然不碰撞）。
5. 公式升级或分区变更后的**首编译是一次性冷启动，如实记录为冷编译，不表述为“缓存失效已修”**。
6. 未改 tsconfig、未换编译器（项目锁定 TS 5.9.3；全局官方 TS 7.0.2 已装但本任务不采用）、未动锁文件。

## 片 2：test/project/branchProjectRegistry.test.js —— 建仓准备复用
成本结构（Windows）：makeRepo 每仓 5-6 次 git spawn × ≈23 仓 + commitFile 3 次/处 ⇒ 该套件 123,817ms 由 spawn 主导。
已实施：模块级懒建**一个模板仓**（init+base 空提交+tracked.txt "base" 提交，与原 makeRepo 骨架构建逐条同构命令），模板落在本套件私有随机临时目录 `os.tmpdir()/se-branch-template-XXXXXX`（mkdtemp，每次运行独立，不落宿主全局固定位置/项目目录/缓存目录）；makeRepo 改为 `git clone -q --no-hardlinks <模板> <dir>`（克隆进 mkdtemp 刚建的既有空目录，不预删目标）+ `git remote remove origin`（用例自 add origin、独立仓分类读 remote 列表，残留模板 origin 会破坏两处）——每用例仍持独占可写真实 Git 副本（独立 .git/refs/工作树、真实历史），隔离/互斥/真实 ff/worktree 语义不变，无 mock。夹具生命周期（主控 2026-10-26 返修裁定）：模板同样进入既有 tempDirs 留证集合，与其他夹具同命运——运行后保留、由人工/既有清理流程处置；套件内零删除、零 chmod 路径（首版曾加 after() 删模板与 removeTreeBestEffort，已按裁定整体移除，见 evidence.md 返修记录）。
断言对应表：不触碰任何断言/用例名/用例数（39→39，diff 零 test() 增删行）——每条“原断言→仍覆盖用例”均＝原用例本体不变，仅仓骨架构建方式替换，夹具内容逐字节相同。

## testWorkflowRunner.test.js（45,653ms）裁定
逐用例核读：45.6s 由**被测行为本身**构成——每用例须真实拉起 runner 进程与作业子进程以证明重叠窗口/最大并行/互斥/锁所有权/取消树/树漂移/超时非通过；准备与 fixture 成本可忽略。无可安全复用点 ⇒ 保留原样并写明原因，不改 mock、不退役。

## 手测退役裁定（本轮）
**退役清单＝空；退役前后自动清单条数 0 → 0。** 逐条依据表在 evidence.md（:1273 互斥类不退役；:1382/:1415/:1483 均混缠人眼看不到的零写入/拒绝/冻结参数断言，拆分＝改用例，越界）。不存在空列掩盖覆盖缺口：无安全退役项，也不新写无法机器复现的手测项。范围隔离：本清单只落本性能切片分支，0.5.415 候选树与宿主验收树测试清单未动。

## 片 4 定向回归（全部宿主 Windows 执行；Linux 不跑产品编译/测试）
①真实源码变更跨编译复用：冷编译→改一个 src 文件→再编译：mode=incremental、state.previousInputHash/inputDrift 在位、dist 更新、真实退出码；②诊断非零：注入类型错误→exit≠0+state-failed 证据→复原→mode=rebuild；③输出完整性：删一个 dist 文件→.stale 封存+冷编译；verify-only 同场景 output-drift 非零；④配置/工具链失效：passthrough 参数变→新分区目录；@types marker 变→新分区（临时改哈希输入复验）；⑤worktree 隔离：两 worktree 各编译→cacheDir 分离（realpath 键）。三态（冷/无改/有改）完整日志+退出码入 evidence.md。不新增性能阈值断言，不重跑无影响全量。

## 片 5（用户核准 2026-10-26）：旧测试最多 60% 按需
单一实现收口：`scripts/test-selection.js`＝唯一选择实现＋唯一规则集（STRATEGY_VERSION=ondemand-old-tests-v1）；开发/交付清单、package、package:assemble 的 receipt 核对全部经 test-workflow.js 调用同一 buildSelection，每轮流程开始现算、生成【本轮唯一决策】（selectionHash 绑定 HEAD+组清单+候选+保护+用户恢复），无第二份规则拷贝。
- **单位与分组**：单位=当前真实测试文件；组=manifest 既有 domain（唯一分组依据；绝不按 helper/import 连组；参数矩阵 job 同组但逐个保留）。extraFiles/glob 等无 domain 归属文件⇒各自保护伪组，永不按需（R1）。
- **组时间**：max(成员首次进入 Git 时间)（`git log --reverse --diff-filter=A` 一次批量；未命中者逐文件 `git log --follow --diff-filter=A` 追认重命名原加入记录）；任一成员历史不可得⇒组 unknown⇒永不判旧。
- **每轮重算与选择**：N=本轮计划全部组数；cap=floor(N×0.6)；known 组按组时间升序（同时间按组名字典序）取最旧 cap 为旧候选。
- **保护规则 v2（判据来源=脚本内规则集 R1-R4，主控返修裁定版）**：非关键判定必须有可检查依据＝manifest 既有 domain 归属（R1，无归属⇒保护伪组）；关键类正向判据（R2 正则命中组键/成员路径⇒保护）；本轮改动定域（R3）复用**项目里实际存在**的映射——`test-workflow.json classification.parallel[].basis.closure`（124 个 attested 测试文件→408 条非测试路径，含 src/**.ts 与 dist/**.js）：改动命中组成员⇒护组（changed-this-round）；命中成员 closure⇒护组（changed-mapped-closure）；runner/清单自身（RUNNER_OWN_FILES）或 git 不可用⇒全保护；其余组**全成员 attested**⇒可证实无关、保留候选；有成员未 attested⇒保守护（unattested-members）。不建全仓代码图；任意 src 变更不再一律全保护。保护项恢复执行、不向后补齐⇒实际按需≤60%。变更解析全程 `-z` NUL（空格/中文安全；status 含未跟踪新增；diff rename 新旧路径都记）+ `core.quotePath=false`；浅克隆边界提交的 A 记录不算可靠首加入（unknown⇒不判旧；unknownMembers/shallowRepo 字段如实输出）。
- **按需=不默认启动**：文件、断言、恢复入口全保留；决策/receipt 中按需项状态 on_demand_not_run，验收报告显式列“按需（未运行）清单：**未运行，不是通过**”。恢复入口：`node scripts/test-workflow.js <entry> --include-ondemand all`（或组名/文件子串，可重复）；组装核对端到端同参重算，决策 hash 不一致即拒（禁止组装环节隐式扩跑/缩跑）。
- **绑定与核对**：receipt 记录 selection 全量＋onDemandJobs；validateReceiptForAssemble 增决策 hash 一致性＋按需文件不得出现在当前执行计划。**生效边界（如实）**：本改动合并后，合并前产生的历史 receipt 因无 selection 字段一律不可再用于组装（decision missing 拒绝），需按新策略重跑完整验收；本模块未在宿主实跑通过前不得称已生效。
- **同包复用实测结论（不补齐，已满足）**：`npm run package`（package.json:961）单入口按 compile→fullCheck→post→assemble 顺序执行，任一测试失败即止（test-workflow.js:842 早退，不触组装）；组装仅一次 vsce，随后 verify-vsix-manifest.js 打开最终 .vsix 实测 entries/leak/required（单一规则源 package-content-policy.json，:4-5、:98）＋README 唯一性与内容一致（:76-93）；包 SHA+字节绑定 receipt candidate.packaged（test-workflow.js:734，sha256Fresh 现算）；后续 package:assemble 只凭 receipt 逐项+指纹+planHash+决策核对，不再重复测试/组装。测试通过不替代组装完整性——后者由最终归档实际内容检查独立承担。

## 默认流程（用户 2026-10-26 覆盖裁定，立即生效）
默认入口 `npm run package`（package.json:961）＝恰好三段：**① 必要编译（compile gates）→ ② 本轮规定测试（fullCheck：分组/按需/保护策略，片5）→ ③ 组装包（post/assemble 工具门 + 一次 vsce）**。完成即报告包路径与 receipt candidate.packaged 真实状态（test-workflow.js:734 SHA 绑定）。
- 默认**不做**：独立 acceptance 阶段（acceptance/check:full 为另设入口）、归档内容审计、包后冒烟/安装验收；缺这些 receipt **不拦打包**，也不得以任何别名（“交付检查”“包完整性核对”等）插回默认链。**用户要验收时另行明确触发。**
- **自制归档审计已移出默认链（主控 2026-10-26 更正裁定）**：`node scripts/verify-vsix-manifest.js`（解包 entries/leak/required/README＝自制归档审计）与 `npm run verify:package-runtime`（自制包内容闭包/扫描门）从 package 与 package:assemble 的 post/assemble 链删除；仅保留在显式验收入口 acceptance（post 追加）与显式冒烟入口 smoke。vsce 自身必需的 manifest 处理与真实报错照常、包路径/版本/SHA 记录保留（candidate.packaged）。
- **新默认步骤清单（package 入口，逐段）**：①prereq prepare-wsl-tests（夹具准备）→ ②compile gates（含 tsc-cached）→ ③fullCheck：domainGates + 按需选择后的测试作业（保护/按需照旧）→ ④post：package-minimal-readme（vsce 输入准备）+ compact-target-mode-plan → ⑤assemble：一次 vsce package → 报告 vsix 路径+SHA256+字节+真实状态。独立验收/归档审计由用户另行明确触发（acceptance/smoke 入口）。
- 测试是核心不删不减：按需仅不默认启动，保护照旧；真实失败/退出码/完整日志保留（fullCheck 失败 :842 早退非零）。
- 新策略验证口径：现有清单上的计算结果（dry-run）＋受影响套件即可，不为证明策略重跑整轮整轮 package 全验收；区分“原任务已做的测试”与“新改动的受影响回归”。

## 明确不做
不采用全局 TS7（项目 moduleResolution:Node 与 tsc-cached require TS API 兼容阻塞）、不装项目本地 TS7、不改业务模块/tsconfig/锁文件/模块语义、不清理旧缓存、不跨 worktree 共享可写状态、不为凑数量做无价值拆分。

## 后续候选（冻结后想法一律登记于此，不落码）
- attested whitelist 覆盖 124/238 是当前按需静默面的上限约束（干净基线仅 1 组/6 文件可静默）；扩展 whitelist 需逐文件补 independence basis，属下一候选，不在本切片。
- 浅克隆/浅历史仓库的组时间可靠性（当前保守为不判旧）如需支持，需带完整历史或 graft 感知的替代来源，属下一候选。
