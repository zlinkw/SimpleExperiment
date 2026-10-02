# TODO: latest complete Plan outputs

## Scope

Keep one verified complete output generation per Plan. Run a new generation in isolated attempts; retain the previous complete generation until the replacement is complete and published. Do not overwrite a running job, change scheduling, or remove current results on a failed/partial rerun. Protect both pre-existing dirty runtime `.pyc` files.

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
