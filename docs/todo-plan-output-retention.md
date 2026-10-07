# Plan outputs by code version

## Scope

Keep the latest verified complete output for identical code and Plan configuration, preserving different versions. Prompt for review above five retained versions. Run replacements in isolated attempts until completion and local formal publication; then use the existing exact-path review and two confirmations for obsolete directories. Do not overwrite a running job, change scheduling, or remove current results on a failed/partial rerun. Protect both pre-existing dirty runtime `.pyc` files.

## Work items

- [x] Read constraints/status and inspect attempt creation, historical artifact mirroring, freshness and deletion boundaries.
- [x] Add a latest-complete retention policy and record the full configured job count independently of missing-job submissions.
- [x] Stop historical runs from being recopied by artifact synchronization.
- [x] After verified full publication, review exact obsolete attempt paths with two confirmations; revalidate all targets and delete only through SimpleSFTP's guarded storage boundary.
- [x] Preserve queue metadata, protect current/incomplete attempts, and pause automatic resurrection of retired paths.
- [x] Add regressions for replacement/failure/partial runs, safe cleanup, cancellation, stale generations and unchanged queue cache behavior.
- [x] Run related tests serially, build and Webview syntax gates; package/install once and commit/push the scoped change.

## Evidence and validation

- Starting HEAD: `f4663b7952fddedc4d4d6c63cc3679c5668c8bbd`; version `0.5.212`; status contains only the two protected `.pyc` files.
- `enqueueDistributedPlan()` creates unique attempt paths; `syncDistributedJobArtifacts()` currently scans and mirrors every historical Plan, including checkpoints, to all online Workers.
- Direct in-place overwrite would destroy the last complete result before a new run succeeds. Replacement therefore happens only after complete, hash-verified publication, with exact-path approval.
- No live remote deletion or experiment is authorized by this code change. Live post-reload verification remains pending.
- Default policy is `simpleExperiment.results.planOutputRetention=latest-complete`; `keep-history` remains available. Cleanup follows manual formal publication, never the 500 ms queue tick or a metrics-only preview.
- Full validation job count survives durable recovery; legacy counts are upgraded only from matching Plan configuration revision. A missing-only 2-job submission cannot retire a prior 6-job complete generation.
- The read-only Worker proof checks all files/directories without following links, rejects mounts/active attempts, and binds hashes, bytes and directory identity to the configured canonical root. Every exact target is reviewed twice, rechecked as a complete batch and immediately before deletion, then verified absent.
- Retired outputs keep run/command/attempt metadata, lose transfer eligibility and gain sync holds; execution history labels their logs as replaced. No result CSV, legacy non-attempt directory, code snapshot, or current/staging output is deleted by this policy.
- New retention regressions: 15/15 pass, including actual Host publication/retirement methods and an extracted Python inspector on an in-memory filesystem. Existing stale VM mocks for validation cache/timing and `buildState` signature were updated without weakening the active guard assertions.
- Passing related serial checks: distributed queue cache 4, distributed queue 23, startup 19, rerun 8, validation payload 19, freshness 5, artifacts 3, pending metrics 26, completeness 16, result tables 17, completion refresh 1, rich logs 5, execution overview 13, cache review 1, duplicate guard 10, selector 11, projection 5, flow control 10, progress 13, render health 12, lifetime recovery 11.
- Release `0.5.213`: `npm run build`, Webview `vm.Script`, VSIX runtime closure (169 modules), and `npm run package` passed. `npm run install:latest` installed exactly once; VS Code reports `simple-local.simple-experiment@0.5.213`, and `simpleex.ps1` resolves to the package's `dist/cli.js` entry. Runtime/lockfile versions match.
- Both protected `.pyc` SHA256 values are unchanged. Live space recovery is unverified: no server files were deleted. Reload the Extension Host and update Worker runtimes before performing the formal-result sync and exact-path cleanup review.
- Scoped changes are synchronized by ordinary fast-forward publication to `origin/master`; no history rewrite or user-file staging is part of this batch.

## 0.5.243 按代码版本保留与审核入口

旧策略在完整发布后会把不同代码版本也选为清理候选；其自动入口还挂在已停用的远端重建之后，因此现在实际可能不再提示清理。当前按代码内容 fingerprint 和 Plan 配置 revision 共同区分版本。同代码/配置重跑仅选择已由最新完整运行替代的旧 attempt；不同版本、身份未知的版本、运行中的目录及最新完整目录保留。代码身份缺失不推定为相同代码。历史文件在本机的原始证据不受服务器目录审核影响。

每个 Plan 超过 5 个代码/配置版本时显示一次可操作提示。按版本计数，不把六个 seed/job 或服务器副本当成六个版本；同版本重复运行不增加版本数。启动/完成状态检查、新 Plan 提交、指标收录后刷新提示；输入未变化时复用本机判定缓存，不增加服务器读取或传输。临时文件审核页新增“Plan 历史产物审核”，可以随时重新进入现有完整路径与两次确认流程。超限时建议较早版本，当前运行继续受保护；取消确认不会删除。

同版本替换仍在新结果完整、正式收录到本机、存在可验证副本并重新核对 SHA256 后才允许清理，避免重跑失败摧毁上一版完整结果。跨版本清理只有用户进入超限审核后才成为候选。审核期间重查版本范围、队列/Worker 身份及每个目录指纹；清理后再确认所有副本不存在。没有增加后台自动删除，也没有绕过 SimpleSFTP 的 canonical 根/父目录、直接子项和删除确认门禁。

### 代码验证

串行回归共 124 项通过：保留/审核 20、临时清理面板 7、结果目录 12、完整结果同步 18、重跑与增量 8、全局同步状态 8、队列缓存 12、指标下载 39。覆盖不同代码/配置保留、未知身份、5/6 版本阈值、重复运行计数、活动目录保护、全部副本审核、超限降到 5 后继续同版本清理、未正式收录的新运行不得替换、通知去重、缓存审核入口及原有两次路径确认。Python 验证只提取只读函数并使用内存文件系统；删除端口采用受控替身，未删除实际服务器目录。

### 现场范围与限制

只读核对 MultiModal 的本机权威队列：32 次 Plan 提交，DRF/DPL 各 5 次，均记录代码与配置身份；按新策略没有超过 5 个不同版本。此项仅为本机队列身份核对，不冒充远端目录存在性、释放空间或可见 UI 验收。后续现场 API 调用发现监听不可用，未猜端口、恢复任务或绕过插件执行服务器命令。0.5.242 的本机结果目录修复已另外实际识别 36 张表，3216 份原件保持不变。

0.5.242、0.5.243 均只完成打包，不进行中途 live install。用户追加审核页内多版本临时对比后，继续下一批；全部修改结束只安装最终版本一次。重载窗口后，可在“缓存回收审核 → Plan 历史产物审核”确认实际服务器路径；本轮未执行远端清理，也未重训。
