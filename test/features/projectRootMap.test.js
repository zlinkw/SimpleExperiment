const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  projectIdentityKey, resolveProjectRootMap, isMachineStateAbsolute,
  machineStateRelativePrefixes, isUnderMachineStatePrefixes,
} = require("../../dist/features/ProjectRootMap");
const { scopeInventoryPathAllowed, collectLocalScopeInventory, hashLocalScopeNames,
  collectSelectedLocalScopeFiles } = require("../../dist/features/SyncScopeStatus.js");
const { classifyCleanupCandidates } = require("../../dist/features/PlanCleanup");

const candidate = relative => ({ nodeId: "local", relativePath: relative, type: "file", category: "产物",
  owners: ["plan-key-1"], evidence: ["任务产物: runner.outputs"], dependencies: [] });

function fixtureTree(spec) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "root-map-"));
  for (const [rel, content] of Object.entries(spec)) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf-8");
  }
  return root;
}

test("project identity is stable across separator and drive-case drift and prefers an explicit id", () => {
  assert.equal(projectIdentityKey({ projectId: " proj-7 " }), "proj-7");
  assert.equal(projectIdentityKey({ projectDir: "D:/Lab/Proj" }), projectIdentityKey({ projectDir: "d:\\Lab\\Proj\\" }));
  assert.notEqual(projectIdentityKey({ projectDir: "/data/a" }), projectIdentityKey({ projectDir: "/data/b" }));
});

test("state root defaults to <installDir>/state, matching the Agent's real default namespace anchor", () => {
  // The Agent's default_agent_state_dir is <install>/state/projects/<ns>; the map
  // default must anchor at the SAME <install>/state (covering the projects
  // namespace), never at a guessed global like <home>/.se or the code root itself.
  const map = resolveProjectRootMap({ projectId: "p", projectDir: "/srv/proj", installDir: "/srv/runtime" });
  assert.equal(map.stateRoot, "/srv/runtime/state");
  assert.ok(isMachineStateAbsolute(map, "/srv/runtime/state/projects/ns7/gpu_frame.json"));
  assert.ok(!isMachineStateAbsolute(map, "/srv/runtime/stateX/gpu_frame.json"));
  assert.ok(!isMachineStateAbsolute(map, "/srv/proj/state/projects/ns7/gpu_frame.json"));
});

test("relative prefixes come from the verified mapping, never from name substrings", (t) => {
  const nested = resolveProjectRootMap({ projectId: "p", projectDir: "/srv/proj",
    installDir: "/srv/runtime", stateDir: "/srv/proj/.se-deploy/zlk_state" });
  assert.deepEqual(machineStateRelativePrefixes(nested), [".se-deploy/zlk_state"]);
  // Outside the code root: relative enumeration cannot reach it → no exclusions.
  const outside = resolveProjectRootMap({ projectId: "p", projectDir: "/srv/proj",
    installDir: "/srv/runtime", stateDir: "/data/zlk_state" });
  assert.deepEqual(machineStateRelativePrefixes(outside), []);
  // A sibling path that merely shares a branch is still outside.
  const sibling = resolveProjectRootMap({ projectId: "p", projectDir: "/srv/proj/deep",
    installDir: "/srv/runtime", stateDir: "/srv/proj/state" });
  assert.deepEqual(machineStateRelativePrefixes(sibling), []);
  // Degenerate equal roots: the WHOLE code root is machine state (callers must obey).
  const equal = resolveProjectRootMap({ projectId: "p", projectDir: "/srv/proj",
    installDir: "/srv/proj", stateDir: "/srv/proj" });
  assert.deepEqual(machineStateRelativePrefixes(equal), [""]);
  const prefixes = machineStateRelativePrefixes(nested);
  assert.ok(isUnderMachineStatePrefixes(".se-deploy/zlk_state/workers/w/gpu_frame.json", prefixes));
  // Legitimate project data that merely CONTAINS state/projects segments stays legal.
  assert.ok(!isUnderMachineStatePrefixes("work_dirs/run/state/projects/x/keep.txt", prefixes));
  assert.ok(!isUnderMachineStatePrefixes("state/projects/x", prefixes));
  // Ancestors: cleanup must also protect a directory whose deletion would take
  // the state root with it; the sync gate (no ancestors) must not over-exclude.
  assert.ok(isUnderMachineStatePrefixes(".se-deploy", prefixes, true));
  assert.ok(!isUnderMachineStatePrefixes(".se-deploy", prefixes, false));
  // Unresolvable traversal fails CLOSED for cleanup and stays open for sync.
  assert.ok(isUnderMachineStatePrefixes(".se-deploy/../zlk_state", prefixes, true));
  assert.ok(!isUnderMachineStatePrefixes("x/../../etc/passwd", prefixes, false));
  // Whole-root prefix covers everything; empty prefix covers nothing.
  assert.ok(isUnderMachineStatePrefixes("src/main.py", [""]));
  assert.ok(!isUnderMachineStatePrefixes("src/main.py", []));
});

test("sync inventory excludes exactly the mapped state tree and keeps look-alike project data", async (t) => {
  const root = fixtureTree({
    "src/main.py": "print(1)\n",
    "run/state/nest/gpu_frame.json": "{}",
    "run/state/loose.bin": "x",
    "work_dirs/run/state/projects/x/keep.txt": "science\n",
    "state/projects/legacy.txt": "unmapped dir named state\n",
  });
  // Fixture KEPT for audit (no recursive deletion of absolute paths from tests).
  console.log("kept root-map fixture at " + root);
  const map = resolveProjectRootMap({ projectId: "p", projectDir: root,
    installDir: path.join(root, "runtime"), stateDir: path.join(root, "run", "state") });
  const prefixes = machineStateRelativePrefixes(map);
  const without = Object.keys(await collectLocalScopeInventory(root, ".", true)).sort();
  assert.ok(without.includes("run/state/nest/gpu_frame.json"), without.join(","));
  const withMap = Object.keys(await collectLocalScopeInventory(root, ".", true, undefined, undefined, prefixes)).sort();
  assert.deepEqual(withMap, ["src/main.py", "state/projects/legacy.txt", "work_dirs/run/state/projects/x/keep.txt"]);
  // The gate itself: mapped paths rejected only WITH the verified prefixes.
  assert.ok(scopeInventoryPathAllowed("run/state/nest/gpu_frame.json", false, []));
  assert.ok(!scopeInventoryPathAllowed("run/state/nest/gpu_frame.json", false, prefixes));
  assert.ok(!scopeInventoryPathAllowed("run/state", true, prefixes));
  assert.ok(scopeInventoryPathAllowed("work_dirs/run/state/projects/x/keep.txt", false, prefixes));
  // Hashing a mapped path is a hard error, not a silent skip.
  await assert.rejects(() => hashLocalScopeNames(root, ["run/state/loose.bin"], undefined, undefined, {}, prefixes),
    /机器状态|排除项/);
  // Selecting the state directory as a source finds nothing to sync (pruned walk).
  await assert.rejects(() => collectSelectedLocalScopeFiles(root, [{ path: "run/state", directory: true }],
    undefined, prefixes), /没有可同步文件/);
  // Without the mapping the same call still works — exclusion is mapping-driven only.
  const selected = await collectSelectedLocalScopeFiles(root, [{ path: "run/state", directory: true }]);
  assert.equal(Object.keys(selected).length, 2);
});

test("default install-internal mapping excludes the state namespace inside the code root", async (t) => {
  const root = fixtureTree({
    "train.py": "x\n",
    "state/projects/ns7/gpu_frame.json": "{}",
    "state/agent/register.json": "{}",
    "work_dirs/exp1/result.json": "{}",
  });
  // Fixture KEPT for audit (no recursive deletion of absolute paths from tests).
  console.log("kept root-map fixture at " + root);
  // No custom stateDir: the default <install>/state with install == code root is
  // exactly the Agent's real layout, so state/projects/<ns>/... is machine state.
  const map = resolveProjectRootMap({ projectId: "p", projectDir: root, installDir: root });
  const prefixes = machineStateRelativePrefixes(map);
  assert.deepEqual(prefixes, ["state"]);
  const keys = Object.keys(await collectLocalScopeInventory(root, ".", true, undefined, undefined, prefixes));
  assert.deepEqual(keys, ["train.py", "work_dirs/exp1/result.json"]);
});

test("cleanup classification protects mapped state paths AND their ancestors, never look-alikes", () => {
  const scope = {
    projectId: "p", planKey: "k", planFile: "plan.json", planHash: "h", runIds: [],
    machineStatePrefixes: ["run/state"],
    candidates: [
      candidate("run/state/nest/gpu_frame.json"),
      candidate("run"),
      candidate("work_dirs/run/state/projects/x/keep.txt"),
      candidate("state/projects/legacy.txt"),
    ],
  };
  const rows = classifyCleanupCandidates(scope);
  const byPath = new Map(rows.map(row => [row.relativePath, row]));
  assert.match(byPath.get("run/state/nest/gpu_frame.json").scopeProtectedReason, /机器状态/);
  assert.match(byPath.get("run").scopeProtectedReason, /机器状态/); // ancestor deletion would take state with it
  assert.equal(byPath.get("work_dirs/run/state/projects/x/keep.txt").scopeProtectedReason, undefined);
  assert.equal(byPath.get("state/projects/legacy.txt").scopeProtectedReason, undefined);
  // Scopes built by older callers (no prefixes) keep their previous semantics.
  const legacyScope = { ...scope, machineStatePrefixes: undefined };
  const legacyRows = classifyCleanupCandidates(legacyScope);
  assert.equal(new Map(legacyRows.map(r => [r.relativePath, r])).get("run/state/nest/gpu_frame.json").scopeProtectedReason, undefined);
});
