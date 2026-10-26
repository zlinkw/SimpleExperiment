# evidence —— tsc-cache-and-test-prep-20261026（2026-10-26，全部为实测记录）

## 候选提交（本地，未 push）
- 本切片候选（返修前）：`8fee3f7695714688059b76675e3a5162d9271ca9`（branch perf-tsc-cache-and-test-prep-20261026，基线 origin/master `bcf09551…` 重新 fetch 核实；common-dir `/repos/MCP/zlk-cluster-orchestrator/.git`）
  - `scripts/tsc-cached.js` sha256 `8682e0c480f9845093f89f7f4e40991dd3d497e8e664257dbf657bd139fe7cd6`
  - `test/project/branchProjectRegistry.test.js` sha256 `e2de1b90e30c77a9ccd5b8d3660114ce6c25a5a3daa72d2aaf8ac7151135d012`
  - diff：2 files, +74/−7；文档随后单独提交（本文件所在提交），候选内容以 8fee3f76 为准。
- **返修提交（主控 2026-10-26 裁定，候选 SHA 见返修提交条目）**：应主控指令“夹具零清理、留证优先”，移除首版新增的全部删除逻辑——原 8fee3f76 版 :52-61 `removeTreeBestEffort`（递归 chmod+rmSync 删除执行器）、:63-65 after() 模板删除、:95 makeRepo `fs.rmSync(dir)` 逐条删除；模板改经既有 tempDir() 进入 tempDirs 留证集合（与其他夹具同命运，运行后保留）；clone 目标为 mkdtemp 刚建的既有空目录，不预删。文件内 :1008 `fs.rmSync(scratch.txt)` 为既有用例被测行为，未动。本套件现零删除/零 chmod 新增路径。
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

## 片 4 定向回归（等待主控排 Windows 宿主；未开始，不得预写结果）
①跨真实源码变更复用（冷→改一 src 文件→incremental+inputDrift+dist 更新+真实退出码）；②诊断非零传播（注入类型错误 exit≠0+state-failed→复原 rebuild）；③输出缺失/篡改（.stale 封存；verify-only output-drift 非零）；④配置/工具链失效（argv 变/@types 变→新分区）；⑤worktree 隔离（两副本 cacheDir 分离）。三态（冷/无改/有改）完整日志+退出码回填本文件。分区公式变化后的首编译为**一次性冷编译**，如实记录，不写成“缓存失效已修”。

## 耗时事实（仅报告，不写入任何断言/门禁）
branchProjectRegistry 宿主实测 123,817ms（约 23 仓 × 5-6 git spawn + commitFile 3 次/处 主导）；本切片后每仓 spawn 5-6→1（clone）+1（remote remove）。testWorkflowRunner 45,653ms 保持。改进效果以宿主三态实测为准，Linux 不产出任何产品耗时数。
