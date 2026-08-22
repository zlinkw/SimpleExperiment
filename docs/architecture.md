# Architecture

The extension is moving toward layered internals:

- `core`: command bus, operation queue, error model, shared domain types.
- `services`: SSH, Hub Agent, runtime, scheduler, sync, GPU, artifact, live output orchestration.
- `state`: `ClusterStore`, reducer, selectors, migrations.
- `ui`: Webview bridge and UI state mapping.
- `testing`: fake runtime and scenario runner.

`extension.ts` remains the VS Code lifecycle and compatibility shell while logic moves out in small compiled steps.

## OperationQueue

All long or risky work should enter `OperationQueue`.

- `user_blocking` and `manual` outrank `background` and `realtime`.
- Write operations share exclusive keys such as `sync-write` or `runtime`.
- Refresh operations use `coalesceKey`.
- Queue records feed diagnostics, audit, and UI loading.

## State

`ClusterStore` is the domain state source for new code. Reducers keep terminal states from being overwritten by old running updates and preserve lastKnownGood.

Existing compatibility fields in `extension.ts` remain until all services migrate.

## Experiment Platform Features

Feature modules live under `src/features/`.

- `PlanBuilder`: matrix dry-run and plan YAML generation.
- `SmartScheduler`: resource policy dry-run with explainable decisions.
- `Lifecycle`: experiment timeline and retry attempts.
- `Metrics`: metrics parsing, leaderboard, Markdown export.
- `Comparison`: config/metric/runtime diff reports.
- `Anomaly`: stalled run, NaN loss, low disk, GPU idle detection.
- `Notifications`: rule based throttling.
- `SearchTags`: local experiment search and tags.
- `RecycleBin`: deleted/delete_failed audit view helpers.

All command entry points should use `OperationQueue` and write audit records.

## Operational Boundaries

SimpleExperiment owns plans, Agent lifecycle, run state, task control, result-analysis entry points, and experiment operations. SimpleSFTP owns real file transfer. The PPT add-in owns rendering. One component must not take over another component's authority.

Three topologies are supported:

- `single_worker`: one Worker schedules locally and stores its own state.
- `worker_pool`: multiple Workers schedule deterministic shards without a Hub.
- `hub_worker`: a Hub coordinates global state while Workers execute.

No-Hub modes never create a Hub automatically and never rely on cross-node backup. Worker-local state is authoritative for that mode.

Runtime caches under `simple_cluster` are operational state. Plans, final results, archive manifests, deletion tombstones, transfer records, and user confirmations are project state and must survive runtime reloads.

Final analysis sources are archived results only. `metrics_summary.csv`, statistics, paper evidence, and PPT plotting must not treat temporary preview rows as accepted evidence. PPT destination confirmation precedes automation.

Long-lived Webview payloads stay bounded. Scheduler states and experiment traces have explicit record limits; request budgets preserve per-request timeout fields, pending keys, sequence numbers, and heartbeat timestamps instead of dropping them silently.

The transport boundary is Xshell local forwarding plus optional Hub/Worker Agents plus SimpleSFTP. No plugin code path uses direct SSH, SCP, or RSYNC as a substitute for those boundaries.
