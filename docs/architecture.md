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

