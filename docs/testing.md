# Testing

Commands:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:scenarios`
- `npm run build`
- `npm run package`
- `npm run smoke`
- `npm run acceptance`

Scenario tests use `src/testing/FakeClusterRuntime.ts` and `src/testing/ScenarioRunner.ts`.

Final fake/mock acceptance:

- `npm run acceptance` runs build, typecheck, lint, unit tests, scenario tests, JS syntax checks, CLI status, package, database dependency check, documentation check, and scenario coverage check.
- It writes reports under `simple_cluster/reports/acceptance/`.
- It does not require real SSH servers. Use `docs/manual-acceptance-checklist.md` for optional real cluster checks.

Scenarios live under `scenarios/` and cover:

- run plan success
- worker offline during run
- Agent restart recovery
- stream journal gap
- delete sync race
- runtime upgrade rollback
