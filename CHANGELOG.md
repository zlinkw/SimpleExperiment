# Changelog

## 0.4.11

- Backed upload path confirmations with per-workspace VS Code state in addition to the project-local file, so remembered paths survive extension updates, window restarts, and cleanup of generated UI state.

## 0.4.10

- Tagged single-Worker scheduler stop requests as local Worker scheduler operations so the telemetry client routes them to the owning Worker instead of rejecting them as Hub-only actions.

## 0.4.9

- Declared Worker support for `stop-scheduler-operation` and accepted the existing real-action capability on compatible deployed Agents so stale single-Worker runs can be stopped without a second runtime deployment.

## 0.4.8

- Restored the default `invoke` execution branch so commands such as `stopExperiment` return structured results instead of silently returning null.
- Routed single-Worker run reconciliation evidence through the owning Worker Agent endpoint and recorded checked pid/tmux/activity state before stale marking.
- Required a new active `run-plan` or `reproduce-plan` operation before reporting formal workflow submission success; duplicate guards now return structured blockers.
- Fixed `project.prepare` RPC parameter handling, exposed final roots and effective Worker limits in previews, and preserved existing Worker GPU concurrency during partial setup merges.

## 0.4.7

- Added a paired update entry point that checks GitHub Latest Releases for SimpleExperiment and SimpleSFTP, verifies VSIX sizes and SHA-256 checksums when supplied, installs SimpleSFTP before SimpleExperiment, and asks before download/install or reload.
- Added public user documentation for Xshell local forwarding, Hub/Worker settings, remote roots, scheduling limits, result handling, AI/SKILL API constraints, and troubleshooting.
- Moved internal batch-planning notes out of the published repository; durable architecture boundaries now live in `docs/architecture.md`.
- Added orphan `run-plan` / `reproduce-plan` reconciliation against Worker pid, tmux, scheduler state, traces, and live logs before duplicate-run checks and workflow planning.
- Routed single-Worker `stopExperiment` by operation owner or the sole enabled Worker, including structured matched/terminated/reconciled results when no process matches.
- Refreshed missing or expired Worker availability through a bounded Agent query with atomic snapshot replacement and local-clock TTL checks.
- Deduplicated concurrent result parsing by workspace, Plan file/revision, and owner; added filtering/pagination to `operations.list`.
- Preserved remote-root priority and allowed/denied boundary checks across preparation, preview, upload, scheduling, and runtime paths.
- Kept legacy `zlk_cluster` state read-only and surfaced manual cleanup guidance without blocking uploads or rewriting historical evidence.
- Added automatic local/GitHub provenance snapshots for every formal or Debug Plan submission and propagated them into Agent operation audit events.
- Added structured workflow blockers with operation/server IDs and evidence counts; `autoPrepare` remains behind explicit confirmation.
- Expanded reconciliation evidence to Worker task snapshots, taught single-Worker stops to target synthetic requests, and added bounded SIGKILL escalation.
- Merged concurrent result parsing across host-operation lease conflicts instead of opening a duplicate parse.
