# ZLK Cluster Acceptance Report

generatedAt=2026-07-03T17:31:17.239Z
overall=failed

| Check | Status | ms | Notes |
| --- | --- | ---: | --- |
| build | passed | 3116 | > zlk-cluster-orchestrator@0.1.58 build<br>> npm run typecheck && node scripts/write-agent-runtime.js<br><br><br>> zlk-cluster-orchestrator@0.1.58 typecheck<br>> ..\local-chatgpt-bridge\node_modules\.bin\tsc.cmd -p . --pretty false<br><br>[agent-runtime] wrote dist\runtime\cluster_agent.py<br>[agent-runtime] wrote dist\runtime\cluster_scheduler.py<br>[agent-runtime] wrote dist\templates\project-adapter |
| typecheck | passed | 2679 | > zlk-cluster-orchestrator@0.1.58 typecheck<br>> ..\local-chatgpt-bridge\node_modules\.bin\tsc.cmd -p . --pretty false |
| lint | passed | 541 | > zlk-cluster-orchestrator@0.1.58 lint<br>> node scripts/lint-smoke.js<br><br>[lint-smoke] ok |
| unit_tests | failed | 7789 | 鉁?queued task progress cards do not duplicate the full task card list (0.2897ms)<br>鉁?webview action commands use strict allowlist and fixed tunnel action map (2.1127ms)<br>鉁?publish and code sync commands are accepted by getSafeCommand (1.0677ms)<br>鉁?all visible webview button commands are accepted by extension allowlist (3.5591ms)<br>鉁?all visible panel commands have extension handlers (3.4774ms)<br>鉁?webview state exposes realtime fields as first class fields (2.0492ms)<br>鉁?panel html has primary realtime sections (4.8896ms)<br>鉁?panel renders editable server management cards before endpoint details (2.5229ms)<br>鈩?tests 287<br>鈩?suites 0<br>鈩?pass 286<br>鈩?fail 1<br>鈩?cancelled 0<br>鈩?skipped 0<br>鈩?todo 0<br>鈩?duration_ms 4371.3842<br><br>鉁?failing tests:<br><br>test at test\agent\resultRuntimeActions.test.js:59:1<br>鉁?hub agent dry-run plan previews schedulable and queued jobs (419.7849ms)<br>  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:<br>  <br>  undefined !== 2<br>  <br>      at TestContext.<anonymous> (D:\GitRepo\MCP\zlk-cluster-orchestrator\test\agent\resultRuntimeActions.test.js:100:10)<br>      at Test.runInAsyncScope (node:async_hooks:227:14)<br>      at Test.run (node:internal/test_runner/test:1306:25)<br>      at Test.processPendingSubtests (node:internal/test_runner/test:897:18)<br>      at Test.postRun (node:internal/test_runner/test:1447:19)<br>      at Test.run (node:internal/test_runner/test:1372:12)<br>      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:385:3) {<br>    generatedMessage: true,<br>    code: 'ERR_ASSERTION',<br>    actual: undefined,<br>    expected: 2,<br>    operator: 'strictEqual',<br>    diff: 'simple'<br>  } |
| no_external_database_dependency | passed | 0 | No database dependency found. |
| acceptance_docs | passed | 0 | Found: docs/acceptance-matrix.md, docs/manual-acceptance-checklist.md, docs/feature-coverage.md |
| scenario_coverage | passed | 0 | 122 scenario files. |



